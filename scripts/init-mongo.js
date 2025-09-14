#!/usr/bin/env node
// Simple MongoDB initialization script
// Usage: MONGODB_URI="mongodb://..." node scripts/init-mongo.js

// Load environment from .env when running scripts locally
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

    const required = [
      'products',
      'inventory',
      'raw_materials',
      'production_batches',
      'distributions',
      'financial_transactions',
      'production_costs',
      'counters',
    ]

    const existing = (await db.listCollections().toArray()).map((c) => c.name)
    for (const name of required) {
      if (!existing.includes(name)) {
        await db.createCollection(name)
        console.log('Created collection', name)
      } else {
        console.log('Collection exists', name)
      }
    }

    const counters = db.collection('counters')
    const seeds = [
      'productId',
      'inventoryId',
      'rawMaterialId',
      'productionBatchId',
      'distributionId',
      'financialTransactionId',
      'productionCostId',
    ]
    for (const id of seeds) {
      await counters.updateOne({ _id: id }, { $setOnInsert: { seq: 0 } }, { upsert: true })
    }
    console.log('Counters ensured')

    console.log('Initialization complete')
  } catch (err) {
    console.error('Failed to initialize MongoDB:', err)
    process.exit(2)
  } finally {
    await client.close()
  }
}

main()
