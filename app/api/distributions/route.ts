import { type NextRequest, NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"
import { createSuccessResponse, createErrorResponse, handleApiError, validateRequired } from "@/lib/api-helpers"

export async function GET() {
  try {
    const distributions = await DatabaseClient.getDistributions()
    return NextResponse.json(createSuccessResponse(distributions))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { inventory_item_id, recipient_name, recipient_contact, quantity, unit_price, notes } = body

    // Validate required fields
    const errors = validateRequired({ inventory_item_id, recipient_name, quantity, unit_price })
    if (errors.length > 0) {
      return NextResponse.json(createErrorResponse(errors.join(", ")), { status: 400 })
    }

    const newDistribution = await DatabaseClient.createDistribution({
      inventory_item_id: Number.parseInt(inventory_item_id),
      recipient_name,
      recipient_contact,
      quantity: Number.parseFloat(quantity),
      unit_price: Number.parseFloat(unit_price),
      distribution_date: new Date().toISOString(),
      total_amount: Number.parseFloat(quantity) * Number.parseFloat(unit_price),
      notes: notes || '',
    })

    return NextResponse.json(createSuccessResponse(newDistribution))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
