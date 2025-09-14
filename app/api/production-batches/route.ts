import { type NextRequest, NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"
import { createSuccessResponse, createErrorResponse, handleApiError, validateRequired } from "@/lib/api-helpers"

export async function GET() {
  try {
    const batches = await DatabaseClient.getProductionBatches()
    return NextResponse.json(createSuccessResponse(batches))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { batch_number, product_id, quantity_produced, production_date, total_cost, notes, costs } = body

    // Validate required fields
    const errors = validateRequired({ batch_number, product_id, quantity_produced, production_date, total_cost })
    if (errors.length > 0) {
      return NextResponse.json(createErrorResponse(errors.join(", ")), { status: 400 })
    }

    // Create the production batch
    const newBatch = await DatabaseClient.createProductionBatch({
      batch_number,
      product_id: Number.parseInt(product_id),
      quantity_produced: Number.parseFloat(quantity_produced),
      production_date,
      total_cost: Number.parseFloat(total_cost),
      notes,
    })

    // Create production costs if provided
    if (costs && costs.length > 0) {
      const formattedCosts = costs.map((cost: any) => ({
        batch_id: newBatch.id,
        cost_type: cost.cost_type,
        item_name: cost.item_name,
        quantity: cost.quantity ? Number.parseFloat(cost.quantity) : null,
        unit_cost: Number.parseFloat(cost.unit_cost),
        raw_material_id: cost.raw_material_id ? Number.parseInt(cost.raw_material_id) : null,
      }))

      await DatabaseClient.createProductionCosts(formattedCosts)
    }

    return NextResponse.json(createSuccessResponse(newBatch))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
