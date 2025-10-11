import { type NextRequest, NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"
import { createSuccessResponse, createErrorResponse, handleApiError, validateRequired } from "@/lib/api-helpers"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { batchId, quantity, sellingPrice, location, notes } = body

    // Validate required fields
    const errors = validateRequired({ batchId })
    if (errors.length > 0) {
      return NextResponse.json(createErrorResponse(errors.join(", ")), { status: 400 })
    }

    const finishedProduct = await DatabaseClient.moveProductionToInventory(batchId, {
      quantity: quantity ? Number.parseFloat(quantity) : undefined,
      sellingPrice: sellingPrice ? Number.parseFloat(sellingPrice) : 0,
      location: location || 'Main Warehouse',
      notes: notes || '',
    })

    return NextResponse.json(createSuccessResponse(finishedProduct))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}