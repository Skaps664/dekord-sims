export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"
import { createSuccessResponse, createErrorResponse, handleApiError, validateRequired } from "@/lib/api-helpers"

export async function GET() {
  try {
    const materials = await DatabaseClient.getRawMaterials()
    return NextResponse.json(createSuccessResponse(materials))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[raw-materials POST] Received data:', body)
    
    const { 
      name, 
      quantity, 
      unit_cost, 
      supplier, 
      notes, 
      barcode, 
      minimum_stock, 
      location 
    } = body

    // Validate required fields
    const errors = validateRequired({ name, quantity })
    if (errors.length > 0) {
      return NextResponse.json(createErrorResponse(errors.join(", ")), { status: 400 })
    }

    const materialData = {
      item_type: 'raw_material',
      name,
      quantity: Number.parseFloat(quantity),
      unit_cost: unit_cost ? Number.parseFloat(unit_cost) : 0,
      supplier: supplier || '',
      location: location || 'Raw Materials Storage',
      notes: notes || '',
      barcode: barcode || '',
      minimum_stock: minimum_stock ? Number.parseInt(minimum_stock) : 0,
    }
    
    console.log('[raw-materials POST] Creating material with data:', materialData)

    const newMaterial = await DatabaseClient.createInventoryItem(materialData)

    return NextResponse.json(createSuccessResponse(newMaterial))
  } catch (error) {
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
