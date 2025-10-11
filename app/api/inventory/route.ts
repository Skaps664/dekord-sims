import { type NextRequest, NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/lib/api-helpers"

export async function GET() {
  try {
    console.log("[v0] Starting inventory API request...")

    // Check database setup first
    const setupStatus = await DatabaseClient.checkDatabaseSetup()
    console.log("[v0] Database setup status:", setupStatus)

    if (!setupStatus.connected) {
      console.log("[v0] Database connection failed")
      return NextResponse.json(
        createErrorResponse(
          "Database connection failed",
          "Please check your MONGODB_URI environment variable in Project Settings. Make sure your MongoDB database is reachable and the connection string is correct.",
          {
            setupRequired: true,
            connectionFailed: true,
            error: setupStatus.error,
          },
        ),
        { status: 503 },
      )
    }

    if (!setupStatus.isSetup) {
      console.log("[v0] Database not set up, missing tables:", setupStatus.missingTables)
      return NextResponse.json(
        createErrorResponse(
          "Database not set up",
          `Missing tables: ${setupStatus.missingTables.join(", ")}. Please run the database setup scripts in order: 01-create-tables.sql, 02-seed-data.sql, 03-create-views.sql`,
          {
            setupRequired: true,
            missingTables: setupStatus.missingTables,
            existingTables: setupStatus.existingTables,
          },
        ),
        { status: 503 },
      )
    }

    console.log("[v0] Database setup verified, fetching inventory data...")
    const inventory = await DatabaseClient.getInventory()
    console.log("[v0] Successfully fetched inventory:", inventory.length, "items")
    return NextResponse.json(createSuccessResponse(inventory))
  } catch (error) {
    console.error("[v0] Inventory API error:", error)

    // Always return JSON, never let it fall through to HTML error page
    return NextResponse.json(
      createErrorResponse(
        "Internal server error",
        "An unexpected error occurred while fetching inventory data. Please try again or contact support if the problem persists.",
    { error: error instanceof Error ? error.message : String(error) },
      ),
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { item_type, name, quantity, unit_cost, selling_price, location, notes } = body

    if (!item_type || !name || quantity === undefined) {
      return NextResponse.json(createErrorResponse("Item type, name and quantity are required"), { status: 400 })
    }

    const inventoryItem = await DatabaseClient.createInventoryItem({
      item_type, // 'raw_material' or 'finished_product'
      name,
      quantity: parseFloat(quantity),
      unit_cost: unit_cost ? parseFloat(unit_cost) : null,
      selling_price: selling_price ? parseFloat(selling_price) : null,
      location: location || 'Main Warehouse',
      notes: notes || '',
    })

    return NextResponse.json(createSuccessResponse(inventoryItem))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
