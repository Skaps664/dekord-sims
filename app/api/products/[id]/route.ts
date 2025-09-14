import { type NextRequest, NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"
import { createSuccessResponse, handleApiError } from "@/lib/api-helpers"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const productId = Number.parseInt(params.id)

    if (isNaN(productId)) {
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
    const productId = Number.parseInt(params.id)

    if (isNaN(productId)) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 })
    }

    await DatabaseClient.deleteProduct(productId)
    return NextResponse.json(createSuccessResponse({ message: "Product deleted successfully" }))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
