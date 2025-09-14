import { MongoClient, Db, Collection } from "mongodb"
// Load .env for local development (ensures MONGODB_URI is available when running `next dev` or node scripts)
try {
  // Use require here so it works in both ESM and CJS runtime used by Next
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config()
} catch (e) {
  // ignore if dotenv is not installed in production
}

// We'll use MONGODB_URI instead of DATABASE_URL
const MONGO_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || ""

// Persist client and db across module reloads (important in Next dev server)
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      _mongoClient?: MongoClient
      _mongoDb?: Db
    }
  }
}

let client: MongoClient | null = (global as any)._mongoClient ?? null
let db: Db | null = (global as any)._mongoDb ?? null
let initError: string | null = null

async function connect() {
  if (db) return db
  if (initError) throw new Error(initError)
  if (!MONGO_URI) {
    initError = "MONGODB_URI (or DATABASE_URL) environment variable is not set"
    throw new Error(initError)
  }

  try {
    // parse the URI safely to extract host/db for logs (don't log credentials)
    let hostInfo = "(unknown)"
    try {
      const url = new URL(MONGO_URI)
      const pathname = url.pathname.replace(/^\//, "")
      hostInfo = `${url.protocol}//${url.host}/${pathname || "(default)"}`
    } catch (parseErr) {
      // If parsing fails, continue; MongoClient will validate
      hostInfo = "(invalid-uri)"
    }

  console.log("[db] Connecting to MongoDB:", hostInfo)
  // Configure client with reasonable timeouts and appName for easier monitoring
  client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000, appName: "dekord-sims" })
  await client.connect()
    // default DB name from URI or fallback to 'appdb'
    const url = new URL(MONGO_URI)
    const pathname = url.pathname.replace(/^\//, "")
    const dbName = pathname || "appdb"
    db = client.db(dbName)
    // persist to global so hot reloads reuse the same connection
    try {
      ;(global as any)._mongoClient = client
      ;(global as any)._mongoDb = db
    } catch (e) {
      // ignore if cannot write to global
    }
    // Ensure counters collection exists for auto-increment ids
  const counters = db.collection<any>("counters")
  await counters.updateOne({ _id: "productId" }, { $setOnInsert: { seq: 0 } }, { upsert: true })
  await counters.updateOne({ _id: "inventoryId" }, { $setOnInsert: { seq: 0 } }, { upsert: true })
  await counters.updateOne({ _id: "rawMaterialId" }, { $setOnInsert: { seq: 0 } }, { upsert: true })
  await counters.updateOne({ _id: "productionBatchId" }, { $setOnInsert: { seq: 0 } }, { upsert: true })
  await counters.updateOne({ _id: "distributionId" }, { $setOnInsert: { seq: 0 } }, { upsert: true })
  await counters.updateOne({ _id: "financialTransactionId" }, { $setOnInsert: { seq: 0 } }, { upsert: true })
    return db
  } catch (err: any) {
    initError = err?.message || String(err)
    console.error("[db] Failed to initialize MongoDB client:", initError)
    throw err
  }
}

async function getNextSequence(name: string) {
  const database = await connect()
  const counters = database.collection<any>("counters")
  const result = await counters.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true },
  )
  if (!result.value) throw new Error("Failed to get sequence value for " + name)
  return result.value.seq
}

function nowISO() {
  return new Date().toISOString()
}

export class DatabaseClient {
  static checkInitialization() {
    if (initError) {
      return { initialized: false, error: initError }
    }
    if (!db) {
      try {
        // attempt to connect synchronously-ish
        // Note: callers should call async methods which will connect
        // Here we just report not-initialized
        return { initialized: false, error: "MongoDB client not initialized. Call a DB method to initialize." }
      } catch (err: any) {
        return { initialized: false, error: err.message }
      }
    }
    return { initialized: true, error: null }
  }

  static async checkDatabaseSetup() {
    try {
      await connect()
      // Check for required collections
      const required = [
        "products",
        "inventory",
        "raw_materials",
        "production_batches",
        "distributions",
        "financial_transactions",
      ]
      const collections = await db!.listCollections().toArray()
      const existing = collections.map((c) => c.name)
      const missing = required.filter((r) => !existing.includes(r))
      return { isSetup: missing.length === 0, existingTables: existing, missingTables: missing, connected: true }
    } catch (err: any) {
      console.error("MongoDB connection error:", err)
      return {
        isSetup: false,
        existingTables: [],
        missingTables: [
          "products",
          "inventory",
          "raw_materials",
          "production_batches",
          "distributions",
          "financial_transactions",
        ],
        connected: false,
        error: err.message || String(err),
      }
    }
  }

  // Products
  static async getProducts() {
    await connect()
    const productsColl = db!.collection("products")
    const inventoryColl = db!.collection("inventory")

    const products = await productsColl.find().sort({ name: 1 }).toArray()
    // join inventory
    const items = await Promise.all(
      products.map(async (p: any) => {
        const inv = await inventoryColl.findOne({ product_id: p.id })
        return {
          ...p,
          current_stock: inv?.quantity ?? 0,
          minimum_stock: inv?.minimum_stock ?? 0,
          location: inv?.location ?? "Not Set",
        }
      }),
    )
    return items
  }

  static async createProduct(product: any) {
    await connect()
    const productsColl = db!.collection("products")
    const inventoryColl = db!.collection("inventory")
    const id = await getNextSequence("productId")
    const doc = {
      id,
      name: product.name,
      description: product.description ?? null,
      category: product.category ?? null,
      unit_price: product.unit_price,
      cost_price: product.cost_price,
      barcode: product.barcode ?? null,
      created_at: nowISO(),
      updated_at: nowISO(),
    }
    await productsColl.insertOne(doc)
    // create corresponding inventory
    await inventoryColl.insertOne({ product_id: id, quantity: 0, minimum_stock: 10, maximum_stock: 500, location: "Warehouse A", last_updated: nowISO() })
    return doc
  }

  static async updateProduct(id: number, updates: any) {
    await connect()
    const productsColl = db!.collection("products")
    const updateDoc: any = { updated_at: nowISO() }
    if (updates.name !== undefined) updateDoc.name = updates.name
    if (updates.description !== undefined) updateDoc.description = updates.description
    if (updates.category !== undefined) updateDoc.category = updates.category
    if (updates.unit_price !== undefined) updateDoc.unit_price = updates.unit_price
    if (updates.cost_price !== undefined) updateDoc.cost_price = updates.cost_price
    if (updates.barcode !== undefined) updateDoc.barcode = updates.barcode
    await productsColl.updateOne({ id }, { $set: updateDoc })
    return await productsColl.findOne({ id })
  }

  static async deleteProduct(id: number) {
    await connect()
    const productsColl = db!.collection("products")
    await productsColl.deleteOne({ id })
    return { success: true }
  }

  // Inventory
  static async getInventory() {
    await connect()
    const productsColl = db!.collection("products")
    const inventoryColl = db!.collection("inventory")

    const products = await productsColl.find().sort({ name: 1 }).toArray()
    const inventory = await Promise.all(
      products.map(async (p: any) => {
        const i = await inventoryColl.findOne({ product_id: p.id })
        const quantity = i?.quantity ?? 0
        const minimum_stock = i?.minimum_stock ?? 0
        const maximum_stock = i?.maximum_stock ?? 0
        const location = i?.location ?? "Not Set"
        const inventory_value = quantity * (p.cost_price ?? 0)
        let stock_status = "Normal"
        if (quantity <= minimum_stock) stock_status = "Low Stock"
        if (maximum_stock && quantity >= maximum_stock) stock_status = "Overstock"
        return {
          product_id: p.id,
          product_name: p.name,
          category: p.category,
          unit_price: p.unit_price,
          cost_price: p.cost_price,
          current_stock: quantity,
          minimum_stock,
          maximum_stock,
          location,
          inventory_value,
          stock_status,
          last_updated: i?.last_updated,
        }
      }),
    )
    return inventory
  }

  static async updateInventory(productId: number, updates: any) {
    await connect()
    const inventoryColl = db!.collection("inventory")
    const updateDoc: any = { last_updated: nowISO() }
    if (updates.quantity !== undefined) updateDoc.quantity = updates.quantity
    if (updates.minimum_stock !== undefined) updateDoc.minimum_stock = updates.minimum_stock
    if (updates.maximum_stock !== undefined) updateDoc.maximum_stock = updates.maximum_stock
    if (updates.location !== undefined) updateDoc.location = updates.location
    await inventoryColl.updateOne({ product_id: productId }, { $set: updateDoc })
    return await inventoryColl.findOne({ product_id: productId })
  }

  // Raw materials
  static async getRawMaterials() {
    await connect()
    const coll = db!.collection("raw_materials")
    return await coll.find().sort({ name: 1 }).toArray()
  }

  static async createRawMaterial(material: any) {
    await connect()
    const coll = db!.collection("raw_materials")
    const id = await getNextSequence("rawMaterialId")
    const doc = {
      id,
      name: material.name,
      unit: material.unit,
      cost_per_unit: material.cost_per_unit,
      supplier: material.supplier ?? null,
      stock_quantity: material.stock_quantity ?? 0,
      minimum_stock: material.minimum_stock ?? 0,
      created_at: nowISO(),
      updated_at: nowISO(),
    }
    await coll.insertOne(doc)
    return doc
  }

  // Production batches
  static async getProductionBatches() {
    await connect()
    const coll = db!.collection("production_batches")
    // Use aggregation with $lookup to join products in a single query (avoids N+1 lookups)
    const pipeline = [
      { $sort: { production_date: -1 } },
      { $lookup: { from: "products", localField: "product_id", foreignField: "id", as: "product" } },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      { $addFields: { product_name: "$product.name" } },
      { $project: { product: 0 } },
    ]
    return await coll.aggregate(pipeline).toArray()
  }

  static async createProductionBatch(batch: any) {
    await connect()
    const coll = db!.collection("production_batches")
    const inventoryColl = db!.collection("inventory")
    const finColl = db!.collection("financial_transactions")
    const id = await getNextSequence("productionBatchId")
    const doc = { id, ...batch, created_at: nowISO(), updated_at: nowISO() }
    await coll.insertOne(doc)
    // Update inventory quantity
    await inventoryColl.updateOne({ product_id: batch.product_id }, { $inc: { quantity: batch.quantity_produced }, $set: { last_updated: nowISO() } })
    // Record financial transaction
    await finColl.insertOne({ id: await getNextSequence("financialTransactionId"), transaction_type: "production_cost", reference_type: "production_batch", reference_id: id, amount: -batch.total_cost, description: `Production costs for ${batch.batch_number}`, transaction_date: batch.production_date, created_at: nowISO() })
    return doc
  }

  static async createProductionCosts(costs: any[]) {
    await connect()
    const coll = db!.collection("production_costs")
    const rawColl = db!.collection("raw_materials")
    const created: any[] = []
    for (const cost of costs) {
      const id = await getNextSequence("productionCostId")
      const doc = { id, ...cost, created_at: nowISO() }
      await coll.insertOne(doc)
      created.push(doc)
      if (cost.raw_material_id && cost.quantity) {
        await rawColl.updateOne({ id: cost.raw_material_id }, { $inc: { stock_quantity: -cost.quantity }, $set: { updated_at: nowISO() } })
      }
    }
    return created
  }

  // Distributions
  static async getDistributions() {
    await connect()
    const coll = db!.collection("distributions")
    const pipeline = [
      { $sort: { distribution_date: -1 } },
      { $lookup: { from: "products", localField: "product_id", foreignField: "id", as: "product" } },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      { $addFields: { product_name: "$product.name" } },
      { $project: { product: 0 } },
    ]
    return await coll.aggregate(pipeline).toArray()
  }

  static async createDistribution(distribution: any) {
    await connect()
    const coll = db!.collection("distributions")
    const inventoryColl = db!.collection("inventory")
    const finColl = db!.collection("financial_transactions")
    const id = await getNextSequence("distributionId")
    const doc = { id, ...distribution, created_at: nowISO(), updated_at: nowISO() }
    await coll.insertOne(doc)
    // Update inventory
    await inventoryColl.updateOne({ product_id: distribution.product_id }, { $inc: { quantity: -distribution.quantity }, $set: { last_updated: nowISO() } })
    // Record financial transaction
    const totalValue = distribution.quantity * distribution.unit_price
    await finColl.insertOne({ id: await getNextSequence("financialTransactionId"), transaction_type: "sale", reference_type: "distribution", reference_id: id, amount: totalValue, description: `Sale to ${distribution.recipient_name}`, transaction_date: distribution.distribution_date, created_at: nowISO() })
    return doc
  }

  // Analytics
  static async getInventorySummary() {
    await connect()
    // Reuse getInventory logic
    return await this.getInventory()
  }

  static async getProductionProfitability() {
    await connect()
    const coll = db!.collection("production_batches")
    const productsColl = db!.collection("products")
    const batches = await coll.find().sort({ production_date: -1 }).toArray()
    return await Promise.all(
      batches.map(async (pb: any) => {
        const p = await productsColl.findOne({ id: pb.product_id })
        const costPerUnit = pb.quantity_produced ? pb.total_cost / pb.quantity_produced : 0
        const potentialProfit = ((p?.unit_price ?? 0) - costPerUnit) * (pb.quantity_produced ?? 0)
        return { ...pb, product_name: p?.name, cost_per_unit: costPerUnit, unit_price: p?.unit_price, potential_profit: potentialProfit }
      }),
    )
  }

  static async getDistributionPerformance() {
    await connect()
    const coll = db!.collection("distributions")
    const productsColl = db!.collection("products")
    const dists = await coll.find().sort({ distribution_date: -1 }).toArray()
    return await Promise.all(
      dists.map(async (d: any) => {
        const p = await productsColl.findOne({ id: d.product_id })
        const total_value = (d.quantity ?? 0) * (d.unit_price ?? 0)
        const gross_profit = (d.unit_price ?? 0) - (p?.cost_price ?? 0)
        const profit_margin_percent = p?.cost_price ? ((d.unit_price - p.cost_price) / p.cost_price) * 100 : 0
        return { ...d, product_name: p?.name, total_value, cost_price: p?.cost_price, gross_profit: gross_profit * (d.quantity ?? 0), profit_margin_percent }
      }),
    )
  }

  static async getMonthlyFinancialSummary() {
    await connect()
    const coll = db!.collection("financial_transactions")
    // Aggregate last 12 months grouped by month and transaction_type
    const now = new Date()
    const lastYear = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    const pipeline = [
      { $match: { transaction_date: { $gte: lastYear.toISOString() } } },
      { $addFields: { month: { $substr: ["$transaction_date", 0, 7] } } },
      { $group: { _id: { month: "$month", transaction_type: "$transaction_type" }, transaction_count: { $sum: 1 }, total_amount: { $sum: "$amount" } } },
      { $project: { month: "$_id.month", transaction_type: "$_id.transaction_type", transaction_count: 1, total_amount: 1, _id: 0 } },
      { $sort: { month: -1, transaction_type: 1 } },
    ]
    return await coll.aggregate(pipeline).toArray()
  }

  static async getTopPerformingProducts() {
    await connect()
    const productsColl = db!.collection("products")
    const distColl = db!.collection("distributions")
    const pipeline = [
      { $group: { _id: "$product_id", total_sold: { $sum: "$quantity" }, total_revenue: { $sum: { $multiply: ["$quantity", "$unit_price"] } } } },
      { $sort: { total_revenue: -1 } },
      { $limit: 10 },
    ]
    const results = await distColl.aggregate(pipeline).toArray()
    return await Promise.all(
      results.map(async (r: any) => {
        const p = await productsColl.findOne({ id: r._id })
        const total_profit = (r.total_revenue ?? 0) - ((p?.cost_price ?? 0) * (r.total_sold ?? 0))
        return { id: p?.id, product_name: p?.name, category: p?.category, total_sold: r.total_sold ?? 0, total_revenue: r.total_revenue ?? 0, total_profit }
      }),
    )
  }

  static async getRawMaterialUsage() {
    await connect()
    const rmColl = db!.collection("raw_materials")
    const pcColl = db!.collection("production_costs")
    const usage = await rmColl.aggregate([
      { $lookup: { from: "production_costs", localField: "id", foreignField: "raw_material_id", as: "costs" } },
      { $addFields: { total_quantity_used: { $sum: "$costs.quantity" }, total_cost_used: { $sum: { $map: { input: "$costs", as: "c", in: { $multiply: ["$$c.quantity", "$$c.unit_cost"] } } } } } },
      { $project: { id: 1, material_name: "$name", unit: 1, cost_per_unit: 1, stock_quantity: 1, total_quantity_used: 1, total_cost_used: 1 } },
      { $sort: { total_cost_used: -1 } },
    ]).toArray()
    return usage
  }

  // Financial
  static async getFinancialTransactions(limit = 50) {
    await connect()
    const coll = db!.collection("financial_transactions")
    return await coll.find().sort({ transaction_date: -1, created_at: -1 }).limit(limit).toArray()
  }

  static async getFinancialSummary(startDate?: string, endDate?: string) {
    await connect()
    const coll = db!.collection("financial_transactions")
    const match: any = {}
    if (startDate && endDate) {
      match.transaction_date = { $gte: startDate, $lte: endDate }
    }
    const pipeline: any[] = []
    if (Object.keys(match).length) pipeline.push({ $match: match })
    pipeline.push({ $group: { _id: "$transaction_type", count: { $sum: 1 }, total_amount: { $sum: "$amount" }, average_amount: { $avg: "$amount" } } })
    pipeline.push({ $project: { transaction_type: "$_id", count: 1, total_amount: 1, average_amount: 1, _id: 0 } })
    pipeline.push({ $sort: { total_amount: -1 } })
    return await coll.aggregate(pipeline).toArray()
  }
}

export default DatabaseClient
