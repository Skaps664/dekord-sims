import { type NextRequest, NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"
import { createSuccessResponse, handleApiError } from "@/lib/api-helpers"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const distributionId = searchParams.get("distribution_id")
    const recipientName = searchParams.get("recipient_name")

    let payments
    if (distributionId) {
      payments = await DatabaseClient.getPaymentsByDistribution(distributionId)
    } else if (recipientName) {
      payments = await DatabaseClient.getPaymentsByRecipient(recipientName)
    } else {
      payments = await DatabaseClient.getPayments()
    }

    return NextResponse.json(createSuccessResponse(payments))
  } catch (error) {
    console.error("[v0] Payments API error:", error)
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const payment = await DatabaseClient.createPayment(body)
    return NextResponse.json(createSuccessResponse(payment))
  } catch (error) {
    console.error("[v0] Create payment error:", error)
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Payment ID is required" },
        { status: 400 }
      )
    }

    const payment = await DatabaseClient.updatePayment(id, updates)
    return NextResponse.json(createSuccessResponse(payment))
  } catch (error) {
    console.error("[v0] Update payment error:", error)
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Payment ID is required" },
        { status: 400 }
      )
    }

    await DatabaseClient.deletePayment(id)
    return NextResponse.json(createSuccessResponse({ id }))
  } catch (error) {
    console.error("[v0] Delete payment error:", error)
    return NextResponse.json(handleApiError(error), { status: 500 })
  }
}
