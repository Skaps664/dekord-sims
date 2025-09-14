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
    const { product_id, recipient_name, recipient_contact, quantity, distribution_date, unit_price, notes } = body

    // Validate required fields
    const errors = validateRequired({ product_id, recipient_name, quantity, distribution_date, unit_price })
    if (errors.length > 0) {
      return NextResponse.json(createErrorResponse(errors.join(", ")), { status: 400 })
    }

    const newDistribution = await DatabaseClient.createDistribution({
      product_id: Number.parseInt(product_id),
      recipient_name,
      recipient_contact,
      quantity: Number.parseFloat(quantity),
      distribution_date,
      unit_price: Number.parseFloat(unit_price),
      notes,
    })

    return NextResponse.json(createSuccessResponse(newDistribution))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
