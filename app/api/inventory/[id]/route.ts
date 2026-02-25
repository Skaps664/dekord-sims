export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"
import { createSuccessResponse, createErrorResponse, handleApiError } from "@/lib/api-helpers"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(createErrorResponse("Invalid inventory ID"), { status: 400 })
    }

    const item = await DatabaseClient.getInventoryItem(id)
    if (!item) {
      return NextResponse.json(createErrorResponse("Inventory item not found"), { status: 404 })
    }

    return NextResponse.json(createSuccessResponse(item))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id
    
    const body = await request.json()
    console.log('[inventory PUT] Updating item:', id, 'with data:', body)

    const updatedItem = await DatabaseClient.updateInventory(id, body)
    
    if (!updatedItem) {
      return NextResponse.json(createErrorResponse("Inventory item not found"), { status: 404 })
    }

    return NextResponse.json(createSuccessResponse(updatedItem))
  } catch (error) {
    console.error('[inventory PUT] Error:', error)
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id

    await DatabaseClient.deleteInventoryItem(id)
    return NextResponse.json(createSuccessResponse({ message: "Inventory item deleted successfully" }))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
