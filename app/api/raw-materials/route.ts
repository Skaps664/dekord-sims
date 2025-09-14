import { type NextRequest, NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"
import { createSuccessResponse, createErrorResponse, handleApiError, validateRequired } from "@/lib/api-helpers"

export async function GET() {
  try {
    const materials = await DatabaseClient.getRawMaterials()
    return NextResponse.json(createSuccessResponse(materials))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, unit, cost_per_unit, supplier, stock_quantity, minimum_stock } = body

    // Validate required fields
    const errors = validateRequired({ name, unit, cost_per_unit })
    if (errors.length > 0) {
      return NextResponse.json(createErrorResponse(errors.join(", ")), { status: 400 })
    }

    const newMaterial = await DatabaseClient.createRawMaterial({
      name,
      unit,
      cost_per_unit: Number.parseFloat(cost_per_unit),
      supplier,
      stock_quantity: Number.parseFloat(stock_quantity || 0),
      minimum_stock: Number.parseFloat(minimum_stock || 0),
    })

    return NextResponse.json(createSuccessResponse(newMaterial))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
