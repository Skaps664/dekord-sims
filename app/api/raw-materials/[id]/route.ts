import { type NextRequest, NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"
import { createSuccessResponse, handleApiError } from "@/lib/api-helpers"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const itemId = params.id

    console.log('[raw-materials PUT] Updating item:', itemId, 'with data:', body)

    const updatedItem = await DatabaseClient.updateInventory(itemId, body)
    
    console.log('[raw-materials PUT] Update result:', updatedItem)
    
    return NextResponse.json(createSuccessResponse(updatedItem))
  } catch (error) {
    console.error('[raw-materials PUT] Error:', error)
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const itemId = params.id

    await DatabaseClient.deleteInventoryItem(itemId)
    return NextResponse.json(createSuccessResponse({ message: "Raw material deleted successfully" }))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}