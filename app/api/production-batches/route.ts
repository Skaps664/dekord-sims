export const dynamic = "force-dynamic";

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
    const { 
      productId, product_id, 
      productName, product_name,
      quantityProduced, quantity_produced, 
      rawMaterialsUsed, raw_materials_used, rawMaterials,
      otherCosts, other_costs,
      notes,
      batch_number,
      production_date,
      total_cost,
      costs
    } = body

    // Support both camelCase and snake_case field names
    const finalProductId = productId || product_id
    const finalProductName = productName || product_name
    const finalQuantityProduced = quantityProduced || quantity_produced
    const finalRawMaterialsUsed = rawMaterialsUsed || raw_materials_used || rawMaterials || []
    const finalOtherCosts = otherCosts || other_costs || total_cost || 0

    // Validate required fields
    const errors = validateRequired({ 
      productId: finalProductId, 
      quantityProduced: finalQuantityProduced 
    })
    if (errors.length > 0) {
      return NextResponse.json(createErrorResponse(errors.join(", ")), { status: 400 })
    }

    // Create the production batch with automatic cost calculation and inventory updates
    const newBatch = await DatabaseClient.createProductionBatch({
      productId: Number.parseInt(finalProductId),
      productName: finalProductName,
      quantityProduced: Number.parseFloat(finalQuantityProduced),
      rawMaterialsUsed: finalRawMaterialsUsed,
      otherCosts: Number.parseFloat(finalOtherCosts) || 0,
      notes: notes || '',
      batchNumber: batch_number,
      productionDate: production_date,
      costs: costs
    })

    return NextResponse.json(createSuccessResponse(newBatch))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
