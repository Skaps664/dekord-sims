import { type NextRequest, NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"
import { createSuccessResponse, createErrorResponse, handleApiError, validateRequired } from "@/lib/api-helpers"

export async function GET() {
  try {
    console.log("[v0] Checking database setup...")
    const setupStatus = await DatabaseClient.checkDatabaseSetup()

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

    console.log("[v0] Database setup verified, fetching products data...")
    const products = await DatabaseClient.getProducts()
    console.log("[v0] Successfully fetched products:", products.length, "items")
    return NextResponse.json(createSuccessResponse(products))
  } catch (error) {
    console.error("[v0] Products API error:", error)
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, category, unit_price, cost_price, barcode } = body

    // Validate required fields
    const errors = validateRequired({ name, unit_price, cost_price })
    if (errors.length > 0) {
      return NextResponse.json(createErrorResponse(errors.join(", ")), { status: 400 })
    }

    const newProduct = await DatabaseClient.createProduct({
      name,
      description,
      category,
      unit_price: Number.parseFloat(unit_price),
      cost_price: Number.parseFloat(cost_price),
      barcode,
    })

    return NextResponse.json(createSuccessResponse(newProduct))
  } catch (error) {
    console.error("[v0] Create product error:", error)
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
