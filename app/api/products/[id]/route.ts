import { type NextRequest, NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"
import { createSuccessResponse, handleApiError } from "@/lib/api-helpers"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const productId = params.id

    if (!productId) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    const updatedProduct = await DatabaseClient.updateProduct(productId, body)
    return NextResponse.json(createSuccessResponse(updatedProduct))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productId = params.id

    if (!productId) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    const deleted = await DatabaseClient.deleteProduct(productId)
    if (!deleted) {
      return NextResponse.json({ error: 'Product not found or could not be deleted' }, { status: 404 })
    }

    return NextResponse.json(createSuccessResponse({ message: "Product deleted successfully" }))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
