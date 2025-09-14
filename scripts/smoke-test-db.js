#!/usr/bin/env node
// Smoke test for MongoDB DatabaseClient implementation
// Usage: MONGODB_URI="..." node scripts/smoke-test-db.js

try { require('dotenv').config() } catch (e) {}
const { MongoClient } = require('mongodb')

async function main() {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL
  if (!uri) {
    console.error('MONGODB_URI or DATABASE_URL environment variable must be set')
    process.exit(1)
  }
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const url = new URL(uri)
    const pathname = url.pathname.replace(/^\//, '')
    const dbName = pathname || 'appdb'
    const db = client.db(dbName)

    const counters = db.collection('counters')
    await counters.updateOne({ _id: 'productId' }, { $setOnInsert: { seq: 0 } }, { upsert: true })
    const seq = (await counters.findOneAndUpdate({ _id: 'productId' }, { $inc: { seq: 1 } }, { returnDocument: 'after' })).value.seq
    console.log('Next product id:', seq)

    const products = db.collection('products')
    await products.insertOne({ id: seq, name: 'Smoke Test Product', unit_price: 1.23, cost_price: 0.5, created_at: new Date().toISOString() })
    const p = await products.findOne({ id: seq })
    console.log('Inserted product:', p)

    const inventory = db.collection('inventory')
    await inventory.insertOne({ product_id: seq, quantity: 100, minimum_stock: 10, maximum_stock: 500, location: 'Smoke Warehouse' })
    const inv = await inventory.findOne({ product_id: seq })
    console.log('Inserted inventory:', inv)

    // cleanup
    await products.deleteOne({ id: seq })
    await inventory.deleteOne({ product_id: seq })
    console.log('Cleaned up')
  } catch (err) {
    console.error('Smoke test failed:', err)
    process.exit(2)
  } finally {
    await client.close()
  }
}

main()
