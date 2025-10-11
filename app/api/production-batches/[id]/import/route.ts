import { type NextRequest, NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"
import { createSuccessResponse, createErrorResponse, handleApiError, validateRequired } from "@/lib/api-helpers"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const batchId = params.id
    const body = await request.json()
    const { rejected_units, accepted_units, selling_price, location, notes } = body

    // Validate required fields
    const errors = validateRequired({ 
      rejected_units: rejected_units !== undefined ? rejected_units : null, 
      accepted_units, 
      selling_price 
    })
    if (errors.length > 0) {
      return NextResponse.json(createErrorResponse(errors.join(", ")), { status: 400 })
    }

    // Validate numbers
    const rejectedUnits = Number.parseInt(rejected_units)
    const acceptedUnits = Number.parseInt(accepted_units)
    const sellingPriceNum = Number.parseFloat(selling_price)

    if (isNaN(rejectedUnits) || rejectedUnits < 0) {
      return NextResponse.json(createErrorResponse("Invalid rejected_units value"), { status: 400 })
    }

    if (isNaN(acceptedUnits) || acceptedUnits <= 0) {
      return NextResponse.json(createErrorResponse("Invalid accepted_units value"), { status: 400 })
    }

    if (isNaN(sellingPriceNum) || sellingPriceNum <= 0) {
      return NextResponse.json(createErrorResponse("Invalid selling_price value"), { status: 400 })
    }

    // Import the production batch
    const result = await DatabaseClient.importProductionBatch(
      Number.parseInt(batchId),
      {
        rejected_units: rejectedUnits,
        accepted_units: acceptedUnits,
        selling_price: sellingPriceNum,
        location: location || "Main Warehouse",
        notes: notes || "",
      }
    )

    return NextResponse.json(createSuccessResponse(result))
  } catch (error: any) {
    console.error("Error importing production batch:", error)
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
