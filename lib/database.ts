import { MongoClient, Db, ObjectId } from 'mongodb'

// Load environment variables
try {
  require('dotenv').config()
} catch (e) {
  // dotenv not available in production
}

const MONGODB_URI = process.env.MONGODB_URI || ""

if (!MONGODB_URI) {
  throw new Error('Please define MONGODB_URI environment variable in .env')
}

declare global {
  var _mongoClient: MongoClient | undefined
  var _mongoDb: Db | undefined
}

let client: MongoClient
let db: Db

async function connect(): Promise<Db> {
  if (global._mongoDb) {
    return global._mongoDb
  }

  // Add connection options to handle SSL/TLS issues
  const options = {
    tls: true,
    tlsAllowInvalidCertificates: false,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  }

  client = new MongoClient(MONGODB_URI, options)
  await client.connect()
  
  const dbName = new URL(MONGODB_URI).pathname.slice(1) || 'sims_db'
  db = client.db(dbName)

  global._mongoClient = client
  global._mongoDb = db

  return db
}

function nowISO(): string {
  return new Date().toISOString()
}

async function getNextSequence(name: string): Promise<number> {
  const database = await connect()
  const result = await database.collection('counters').findOneAndUpdate(
    { _id: name } as any,
    { $inc: { sequence_value: 1 } },
    { upsert: true, returnDocument: 'after' }
  )
  // findOneAndUpdate returns an object with a `value` property containing the document
  // Ensure we read the sequence_value from result.value.sequence_value
  const value = (result as any)?.value
  if (value && typeof value.sequence_value === 'number') {
    return value.sequence_value
  }
  return 1
}

export class DatabaseClient {
  static async checkDatabaseSetup() {
    try {
      const database = await connect()
      const collections = await database.listCollections().toArray()
      const collectionNames = collections.map(c => c.name)
      
      return { 
        isSetup: true, 
        connected: true,
        existingTables: collectionNames,
        missingTables: []
      }
    } catch (error) {
      return { 
        isSetup: false, 
        connected: false, 
        existingTables: [],
        missingTables: ['products', 'inventory', 'raw_materials', 'production_batches', 'distributions', 'production_costs', 'financial_transactions'],
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  static async getProducts() {
    const database = await connect()
    const products = await database.collection('products').find({}).toArray()
    return products.map(p => ({ ...p, id: (p.id !== undefined && p.id !== null) ? p.id : p._id.toString() }))
  }

  static async createProduct(data: any) {
    const database = await connect()
    const id = await getNextSequence('productId')
    
    // Handle date fields: use provided value, or null for empty strings, or default for undefined
    const ideaCreationDate = data.ideaCreationDate !== undefined 
      ? (data.ideaCreationDate === '' ? null : data.ideaCreationDate)
      : nowISO()
    
    const productionStartDate = data.productionStartDate !== undefined
      ? (data.productionStartDate === '' ? null : data.productionStartDate)
      : null
    
    const product = {
      id,
      name: data.name,
      description: data.description || '',
      category: data.category || 'General',
      type: data.type || 'Physical',
      ideaCreationDate,
      productionStartDate,
      additionalInfo: data.additionalInfo || '',
      isActive: data.isActive ?? true,
      createdAt: nowISO(),
      updatedAt: nowISO()
    }
    
    const result = await database.collection('products').insertOne(product)
    return { ...product, _id: result.insertedId }
  }

  static async updateProduct(id: string, data: any) {
    const database = await connect()
    
    // Remove immutable fields
    const { _id, id: idField, createdAt, ...updateData } = data
    
    // Try to parse as numeric ID first, then try ObjectId
    let query
    const numericId = parseInt(id)
    if (!isNaN(numericId)) {
      query = { id: numericId }
    } else {
      try {
        query = { _id: new ObjectId(id) }
      } catch (e) {
        throw new Error('Invalid product ID')
      }
    }
    
    const result = await database.collection('products').findOneAndUpdate(
      query,
      { $set: { ...updateData, updatedAt: nowISO() } },
      { returnDocument: 'after' }
    )
    
    if (!result || !result.value) {
      throw new Error('Product not found')
    }
    
    return result.value || result
  }

  static async deleteProduct(id: string | number) {
    const database = await connect()
    
    console.log('[DB deleteProduct] Received ID:', id, 'Type:', typeof id)
    
    // Try to delete by MongoDB _id first (if it's a string that looks like ObjectId)
    if (typeof id === 'string' && id.length === 24) {
      try {
        console.log('[DB deleteProduct] Trying MongoDB _id deletion')
        const result = await database.collection('products').deleteOne({ _id: new ObjectId(id) })
        console.log('[DB deleteProduct] MongoDB _id deletion result:', result.deletedCount)
        if (result.deletedCount > 0) {
          return true
        }
      } catch (e) {
        console.log('[DB deleteProduct] MongoDB _id deletion failed:', e instanceof Error ? e.message : e)
        // If ObjectId conversion fails, fall through to numeric ID
      }
    }
    
    // Try numeric ID
    const numericId = typeof id === 'string' ? parseInt(id) : id
    console.log('[DB deleteProduct] Trying numeric ID deletion:', numericId)
    if (!isNaN(numericId)) {
      const result = await database.collection('products').deleteOne({ id: numericId })
      console.log('[DB deleteProduct] Numeric ID deletion result:', result.deletedCount)
      return result.deletedCount > 0
    }
    
    console.log('[DB deleteProduct] All deletion attempts failed')
    return false
  }

  static async getInventory() {
    const database = await connect()
    const inventory = await database.collection('inventory').find({}).toArray()
    return inventory.map(i => ({ ...i, id: (i.id !== undefined && i.id !== null) ? i.id : i._id.toString() }))
  }

  static async getInventoryItem(id: number) {
    const database = await connect()
    const item = await database.collection('inventory').findOne({ id })
    if (!item) return null
    return { ...item, id: (item.id !== undefined && item.id !== null) ? item.id : item._id.toString() }
  }

  static async getInventoryByType(type: 'raw_material' | 'finished_product') {
    const database = await connect()
    const inventory = await database.collection('inventory').find({ item_type: type }).toArray()
    return inventory.map(i => ({ ...i, id: (i.id !== undefined && i.id !== null) ? i.id : i._id.toString() }))
  }

  static async createInventoryItem(data: any) {
    const database = await connect()
    const id = await getNextSequence('inventoryId')
    const item = {
      id,
      ...data,
      createdAt: nowISO(),
      updatedAt: nowISO()
    }
    
    const result = await database.collection('inventory').insertOne(item)
    return { ...item, _id: result.insertedId }
  }

  static async updateInventory(id: string, data: any) {
    const database = await connect()
    
    // Remove immutable fields that shouldn't be updated
    const { _id, id: idField, ...updateData } = data
    
    // Try to parse as numeric ID first, then try ObjectId
    let query
    const numericId = parseInt(id)
    if (!isNaN(numericId)) {
      query = { id: numericId }
    } else {
      try {
        query = { _id: new ObjectId(id) }
      } catch (e) {
        throw new Error('Invalid inventory item ID')
      }
    }
    
    const result = await database.collection('inventory').findOneAndUpdate(
      query,
      { $set: { ...updateData, last_updated: nowISO() } },
      { returnDocument: 'after' }
    )
    
    if (!result || !result.value) {
      throw new Error('Inventory item not found')
    }
    
    // Return just the updated document (MongoDB v4+ returns result.value, older versions return result directly)
    return result.value || result
  }

  static async deleteInventoryItem(id: string | number) {
    const database = await connect()
    const numericId = typeof id === 'string' ? parseInt(id) : id
    const result = await database.collection('inventory').deleteOne({ id: numericId })
    return result.deletedCount > 0
  }

  static async moveProductionToInventory(batchId: string, data: any) {
    const database = await connect()
    
    // Get the production batch
    const batch = await database.collection('production_batches').findOne({ id: parseInt(batchId) })
    if (!batch) {
      throw new Error('Production batch not found')
    }
    
    // Create finished product inventory item
    const inventoryId = await getNextSequence('inventoryId')
    const finishedProduct = {
      id: inventoryId,
      item_type: 'finished_product',
      product_id: batch.productId,
      product_name: batch.productName,
      batch_id: batchId,
      quantity: data.quantity || batch.quantityProduced,
      production_cost_per_unit: batch.costPerUnit,
      selling_price_per_unit: data.sellingPrice || 0,
      location: data.location || 'Main Warehouse',
      notes: data.notes || `From production batch ${batch.batchNumber}`,
      createdAt: nowISO(),
      updatedAt: nowISO()
    }
    
    const result = await database.collection('inventory').insertOne(finishedProduct)
    return { ...finishedProduct, _id: result.insertedId }
  }

  static async getRawMaterials() {
    const database = await connect()
    const materials = await database.collection('inventory').find({ item_type: 'raw_material' }).toArray()
    return materials.map(m => ({ ...m, id: (m.id !== undefined && m.id !== null) ? m.id : m._id.toString() }))
  }

  static async createRawMaterial(data: any) {
    const database = await connect()
    const id = await getNextSequence('rawMaterialId')
    const material = {
      id,
      ...data,
      createdAt: nowISO(),
      updatedAt: nowISO()
    }
    
    const result = await database.collection('raw_materials').insertOne(material)
    return { ...material, _id: result.insertedId }
  }

  static async getProductionBatches() {
    const database = await connect()
    const batches = await database.collection('production_batches').find({}).toArray()
    const mappedBatches = batches.map(b => ({
      ...b,
      // Keep the original numeric id field if it exists, otherwise use _id
      id: (b.id !== undefined && b.id !== null) ? b.id : b._id.toString(),
      _id: b._id.toString(), // Keep MongoDB ID as string for reference
      // Provide snake_case aliases for frontend compatibility
      production_date: (b.productionDate || b.production_date) || null,
      quantity_produced: (b.quantityProduced || b.quantity_produced) || 0,
      product_name: (b.productName || b.product_name) || null,
      raw_materials_used: (b.rawMaterialsUsed || b.raw_materials_used) || [],
    }))
    console.log('[DB getProductionBatches] Found batches:', mappedBatches.length, 'Sample batch:', mappedBatches[0] ? { id: mappedBatches[0].id, type: typeof mappedBatches[0].id, batchNumber: (mappedBatches[0] as any).batchNumber || (mappedBatches[0] as any).batch_number } : 'none')
    return mappedBatches
  }

  static async createProductionBatch(data: any) {
    const database = await connect()
    const id = await getNextSequence('productionBatchId')
    
    // Calculate total cost from costs array or from raw materials used
    let totalCost = 0
    if (data.costs && Array.isArray(data.costs)) {
      // Sum all costs from the costs array
      for (const cost of data.costs) {
        const quantity = cost.quantity || 1
        const unitCost = cost.unit_cost || 0
        totalCost += quantity * unitCost
      }
    } else if (data.rawMaterialsUsed && Array.isArray(data.rawMaterialsUsed)) {
      // Fallback: calculate from raw materials
      for (const material of data.rawMaterialsUsed) {
        totalCost += (material.quantityUsed || material.quantity || 0) * (material.unitCost || material.unit_cost || 0)
      }
      if (data.otherCosts || data.total_cost) {
        totalCost += (data.otherCosts || data.total_cost || 0)
      }
    } else if (data.total_cost) {
      totalCost = data.total_cost
    }

    const costPerUnit = totalCost / (data.quantityProduced || data.quantity_produced || 1)
    
    const batch = {
      id,
      productId: data.productId || data.product_id,
      productName: data.productName || data.product_name,
      quantityProduced: data.quantityProduced || data.quantity_produced,
      quantity_remaining: data.quantityProduced || data.quantity_produced, // Track remaining quantity
      rejected_units: 0, // Track rejected units
      rawMaterialsUsed: data.rawMaterialsUsed || data.raw_materials_used || [],
      costs: data.costs || [],
      otherCosts: data.otherCosts || data.other_costs || 0,
      totalCost,
      costPerUnit,
      batchNumber: data.batchNumber || data.batch_number || `BATCH-${id}`,
      productionDate: data.productionDate || data.production_date || nowISO(),
      notes: data.notes || '',
      createdAt: nowISO(),
      updatedAt: nowISO()
    }
    
    // Update inventory: decrease raw materials
    if (batch.rawMaterialsUsed && Array.isArray(batch.rawMaterialsUsed)) {
      for (const material of batch.rawMaterialsUsed) {
        const materialId = material.raw_material_id || material.materialId
        const quantityUsed = material.quantity || material.quantityUsed || 0
        
        if (materialId && quantityUsed > 0) {
          await database.collection('inventory').updateOne(
            { id: Number.parseInt(materialId), item_type: 'raw_material' },
            { 
              $inc: { quantity: -quantityUsed, current_stock: -quantityUsed }, 
              $set: { last_updated: nowISO() } 
            }
          )
        }
      }
    }
    
    // DO NOT add to inventory automatically - require import workflow instead
    // Products must be imported via importProductionBatch() with quality control
    
    const result = await database.collection('production_batches').insertOne(batch)
    return { ...batch, _id: result.insertedId }
  }

  static async createProductionCosts(data: any) {
    const database = await connect()
    const id = await getNextSequence('productionCostId')
    const cost = {
      id,
      ...data,
      createdAt: nowISO()
    }
    
    const result = await database.collection('production_costs').insertOne(cost)
    return { ...cost, _id: result.insertedId }
  }

  static async importProductionBatch(batchId: number, data: any) {
    const database = await connect()
    
    console.log('[DB importProductionBatch] Looking for batch with id:', batchId, typeof batchId)
    
    // Try to find the batch with flexible ID matching
    const batch = await database.collection('production_batches').findOne({ 
      $or: [
        { id: batchId },
        { id: Number(batchId) },
        { id: String(batchId) }
      ]
    })
    
    console.log('[DB importProductionBatch] Found batch:', batch ? 'YES' : 'NO', batch?.id, batch?.batchNumber)
    
    if (!batch) {
      // Try to list all batches to debug
      const allBatches = await database.collection('production_batches').find({}).limit(5).toArray()
      console.log('[DB importProductionBatch] Available batches:', allBatches.map(b => ({ id: b.id, type: typeof b.id, batchNumber: b.batchNumber })))
      throw new Error(`Production batch not found. Looking for ID: ${batchId} (${typeof batchId})`)
    }

    const quantityProduced = batch.quantityProduced || batch.quantity_produced || 0
    const quantityRemaining = batch.quantity_remaining ?? quantityProduced
    const rejectedUnits = data.rejected_units || 0
    const acceptedUnits = data.accepted_units || 0

    // Validate quantities
    if (rejectedUnits + acceptedUnits > quantityRemaining) {
      throw new Error(`Cannot import ${rejectedUnits + acceptedUnits} units. Only ${quantityRemaining} units remaining in batch.`)
    }

    // Update production batch: track rejected units and reduce remaining quantity
    const updatedRejectedUnits = (batch.rejected_units || 0) + rejectedUnits
    const updatedQuantityRemaining = quantityRemaining - rejectedUnits - acceptedUnits
    
    await database.collection('production_batches').updateOne(
      { id: batchId },
      { 
        $set: { 
          rejected_units: updatedRejectedUnits,
          quantity_remaining: updatedQuantityRemaining,
          updatedAt: nowISO()
        }
      }
    )

    // Create finished product inventory item
    const inventoryId = await getNextSequence('inventoryId')
    const productName = batch.productName || batch.product_name || 'Unknown Product'
    const batchNumber = batch.batchNumber || batch.batch_number || `BATCH-${batchId}`
    const costPerUnit = batch.costPerUnit || batch.cost_per_unit || 0
    
    const finishedProduct = {
      id: inventoryId,
      name: productName,
      item_type: 'finished_product',
      product_id: batch.productId || batch.product_id,
      batch_id: batchId,
      batch_number: batchNumber,
      quantity: acceptedUnits,
      current_stock: acceptedUnits,
      unit_cost: costPerUnit,
      selling_price: data.selling_price,
      minimum_stock: 10,
      supplier: 'Internal Production',
      barcode: `${batchNumber}-READY-${Date.now()}`,
      location: data.location || 'Main Warehouse',
      notes: data.notes || `Imported from ${batchNumber}. Rejected units: ${rejectedUnits}`,
      rejected_units: rejectedUnits,
      production_date: batch.productionDate || batch.production_date,
      import_date: nowISO(),
      last_updated: nowISO(),
      createdAt: nowISO(),
      updatedAt: nowISO()
    }
    
    const result = await database.collection('inventory').insertOne(finishedProduct)
    
    return { 
      ...finishedProduct, 
      _id: result.insertedId,
      batch: {
        id: batchId,
        batch_number: batchNumber,
        quantity_remaining: updatedQuantityRemaining,
        rejected_units: updatedRejectedUnits
      }
    }
  }

  static async getDistributions() {
    const database = await connect()
    const distributions = await database.collection('distributions').find({}).toArray()
    return distributions.map(d => ({ ...d, id: d._id.toString() }))
  }

  static async createDistribution(data: any) {
    const database = await connect()
    const id = await getNextSequence('distributionId')
    
    const distribution = {
      id,
      inventory_item_id: data.inventory_item_id,
      recipient_name: data.recipient_name,
      recipient_contact: data.recipient_contact || '',
      quantity: data.quantity,
      unit_price: data.unit_price,
      total_amount: data.quantity * data.unit_price,
      distribution_date: data.distribution_date || nowISO(),
      notes: data.notes || '',
      createdAt: nowISO(),
      updatedAt: nowISO()
    }
    
    // Update inventory: decrease finished product quantity
    await database.collection('inventory').updateOne(
      { id: data.inventory_item_id, item_type: 'finished_product' },
      { 
        $inc: { quantity: -data.quantity },
        $set: { updatedAt: nowISO() }
      }
    )
    
    // Create financial transaction for revenue
    await database.collection('financial_transactions').insertOne({
      id: await getNextSequence('financialTransactionId'),
      type: 'revenue',
      amount: data.quantity * data.unit_price,
      description: `Sale to ${data.recipient_name}`,
      category: 'Sales',
      distribution_id: id,
      date: data.distribution_date || nowISO(),
      createdAt: nowISO()
    })
    
    const result = await database.collection('distributions').insertOne(distribution)
    return { ...distribution, _id: result.insertedId }
  }

  static async getFinancialTransactions() {
    const database = await connect()
    const transactions = await database.collection('financial_transactions').find({}).toArray()
    return transactions.map(t => ({ ...t, id: t._id.toString() }))
  }

  static async getFinancialSummary() {
    const database = await connect()
    
    // Get all financial transactions
    const transactions = await this.getFinancialTransactions()
    
    // Calculate revenue and expenses
    const revenue = transactions
      .filter((t: any) => t.type === 'revenue')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
    
    const expenses = transactions
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + (t.amount || 0), 0)

    // Calculate inventory value
    const inventory = await this.getInventory()
    const rawMaterialsValue = inventory
      .filter((i: any) => i.item_type === 'raw_material')
      .reduce((sum: number, i: any) => sum + ((i.quantity || 0) * (i.unit_cost || 0)), 0)
    
    const finishedProductsValue = inventory
      .filter((i: any) => i.item_type === 'finished_product')
      .reduce((sum: number, i: any) => sum + ((i.quantity || 0) * (i.production_cost_per_unit || 0)), 0)

    // Calculate production costs
    const productionBatches = await this.getProductionBatches()
    const totalProductionCost = productionBatches
      .reduce((sum: number, batch: any) => sum + (batch.totalCost || 0), 0)

    return {
      totalRevenue: revenue,
      totalExpenses: expenses,
      netProfit: revenue - expenses,
      rawMaterialsInventoryValue: rawMaterialsValue,
      finishedProductsInventoryValue: finishedProductsValue,
      totalInventoryValue: rawMaterialsValue + finishedProductsValue,
      totalProductionCost,
      profitMargin: revenue > 0 ? ((revenue - expenses) / revenue * 100) : 0
    }
  }

  static async getMonthlyFinancialSummary() {
    const transactions = await this.getFinancialTransactions()
    
    const monthlyData = transactions.reduce((acc: any, transaction: any) => {
      const date = new Date(transaction.createdAt || transaction.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!acc[monthKey]) {
        acc[monthKey] = { revenue: 0, expenses: 0 }
      }
      
      if (transaction.type === 'revenue') {
        acc[monthKey].revenue += transaction.amount || 0
      } else if (transaction.type === 'expense') {
        acc[monthKey].expenses += transaction.amount || 0
      }
      
      return acc
    }, {})
    
    return Object.entries(monthlyData).map(([month, data]: [string, any]) => ({
      month,
      revenue: data.revenue,
      expenses: data.expenses,
      profit: data.revenue - data.expenses
    }))
  }

  static async getTopPerformingProducts() {
    const distributions = await this.getDistributions()
    
    const productPerformance = distributions.reduce((acc: any, dist: any) => {
      const productId = dist.productId
      if (!acc[productId]) {
        acc[productId] = {
          productId,
          productName: dist.productName || `Product ${productId}`,
          totalQuantity: 0,
          totalRevenue: 0
        }
      }
      acc[productId].totalQuantity += dist.quantity || 0
      acc[productId].totalRevenue += (dist.quantity || 0) * (dist.pricePerUnit || 0)
      return acc
    }, {})
    
    return Object.values(productPerformance)
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5)
  }

  static async getRawMaterialUsage() {
    const batches = await this.getProductionBatches()
    
    const materialUsage = batches.reduce((acc: any, batch: any) => {
      if (batch.rawMaterials) {
        batch.rawMaterials.forEach((material: any) => {
          if (!acc[material.materialId]) {
            acc[material.materialId] = {
              materialId: material.materialId,
              materialName: material.materialName || `Material ${material.materialId}`,
              totalUsed: 0
            }
          }
          acc[material.materialId].totalUsed += material.quantityUsed || 0
        })
      }
      return acc
    }, {})
    
    return Object.values(materialUsage)
  }

  static async getInventorySummary() {
    const inventory = await this.getInventory()
    const rawMaterials = inventory.filter((i: any) => i.item_type === 'raw_material')
    const finishedProducts = inventory.filter((i: any) => i.item_type === 'finished_product')
    
    return {
      rawMaterialsCount: rawMaterials.length,
      finishedProductsCount: finishedProducts.length,
      rawMaterialsValue: rawMaterials.reduce((sum: number, i: any) => sum + ((i.quantity || 0) * (i.unit_cost || 0)), 0),
      finishedProductsValue: finishedProducts.reduce((sum: number, i: any) => sum + ((i.quantity || 0) * (i.production_cost_per_unit || 0)), 0)
    }
  }

  static async getDistributionPerformance() {
    const distributions = await this.getDistributions()
    const totalSales = distributions.reduce((sum: number, d: any) => sum + (d.total_amount || 0), 0)
    const totalQuantity = distributions.reduce((sum: number, d: any) => sum + (d.quantity || 0), 0)
    
    return {
      totalSales,
      totalQuantity,
      averageOrderValue: totalQuantity > 0 ? totalSales / totalQuantity : 0,
      totalOrders: distributions.length
    }
  }

  static async getProductionProfitability() {
    const batches = await this.getProductionBatches()
    const distributions = await this.getDistributions()
    
    // Calculate total production cost
    const totalProductionCost = batches.reduce((sum: number, batch: any) => sum + (batch.totalCost || 0), 0)
    
    // Calculate total revenue from sales
    const totalRevenue = distributions.reduce((sum: number, d: any) => sum + (d.total_amount || 0), 0)
    
    return {
      totalProductionCost,
      totalRevenue,
      grossProfit: totalRevenue - totalProductionCost,
      profitMargin: totalRevenue > 0 ? ((totalRevenue - totalProductionCost) / totalRevenue * 100) : 0
    }
  }

  // ==================== PAYMENT RECOVERY TRACKING ====================

  static async getPayments() {
    const database = await connect()
    const payments = await database.collection('payments').find({}).sort({ payment_date: -1 }).toArray()
    return payments.map(p => ({ ...p, id: p.id || p._id.toString() }))
  }

  static async createPayment(data: any) {
    const database = await connect()
    const id = await getNextSequence('paymentId')
    
    const payment = {
      id,
      distribution_id: data.distribution_id,
      recipient_name: data.recipient_name,
      recipient_type: data.recipient_type || 'distributor',
      amount_paid: parseFloat(data.amount_paid) || 0,
      payment_date: data.payment_date || nowISO(),
      payment_method: data.payment_method || 'cash',
      proof_image_url: data.proof_image_url || null,
      notes: data.notes || '',
      created_at: nowISO(),
      updated_at: nowISO()
    }
    
    await database.collection('payments').insertOne(payment)
    return payment
  }

  static async updatePayment(paymentId: string | number, updates: any) {
    const database = await connect()
    const id = typeof paymentId === 'string' ? parseInt(paymentId) : paymentId
    
    const updateData = {
      ...updates,
      updated_at: nowISO()
    }
    
    await database.collection('payments').updateOne(
      { id },
      { $set: updateData }
    )
    
    return { id, ...updateData }
  }

  static async deletePayment(paymentId: string | number) {
    const database = await connect()
    const id = typeof paymentId === 'string' ? parseInt(paymentId) : paymentId
    await database.collection('payments').deleteOne({ id })
    return { success: true }
  }

  static async getPaymentsByDistribution(distributionId: string | number) {
    const database = await connect()
    const id = typeof distributionId === 'string' ? parseInt(distributionId) : distributionId
    const payments = await database.collection('payments')
      .find({ distribution_id: id })
      .sort({ payment_date: -1 })
      .toArray()
    return payments.map(p => ({ ...p, id: p.id || p._id.toString() }))
  }

  static async getPaymentsByRecipient(recipientName: string) {
    const database = await connect()
    const payments = await database.collection('payments')
      .find({ recipient_name: recipientName })
      .sort({ payment_date: -1 })
      .toArray()
    return payments.map(p => ({ ...p, id: p.id || p._id.toString() }))
  }

  static async getRecoverySummary() {
    const database = await connect()
    const distributions = await this.getDistributions()
    const payments = await this.getPayments()
    
    // Calculate total distributed amount
    const totalDistributed = distributions.reduce((sum: number, d: any) => 
      sum + (d.total_amount || 0), 0
    )
    
    // Calculate total recovered amount
    const totalRecovered = payments.reduce((sum: number, p: any) => 
      sum + (p.amount_paid || 0), 0
    )
    
    // Calculate outstanding by recipient
    const recipientSummary = new Map()
    
    distributions.forEach((dist: any) => {
      const recipient = dist.recipient_name || 'Unknown'
      if (!recipientSummary.has(recipient)) {
        recipientSummary.set(recipient, {
          recipient_name: recipient,
          recipient_type: dist.recipientType || 'distributor',
          total_distributed: 0,
          total_paid: 0,
          outstanding: 0,
          distribution_count: 0
        })
      }
      const summary = recipientSummary.get(recipient)
      summary.total_distributed += (dist.total_amount || 0)
      summary.distribution_count += 1
    })
    
    payments.forEach((payment: any) => {
      const recipient = payment.recipient_name
      if (recipientSummary.has(recipient)) {
        const summary = recipientSummary.get(recipient)
        summary.total_paid += (payment.amount_paid || 0)
      }
    })
    
    // Calculate outstanding for each recipient
    recipientSummary.forEach((summary) => {
      summary.outstanding = summary.total_distributed - summary.total_paid
    })
    
    return {
      totalDistributed,
      totalRecovered,
      totalOutstanding: totalDistributed - totalRecovered,
      recoveryRate: totalDistributed > 0 ? (totalRecovered / totalDistributed) * 100 : 0,
      recipients: Array.from(recipientSummary.values())
    }
  }
}

export default DatabaseClient