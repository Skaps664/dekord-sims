import { NextResponse } from "next/server"
import { DatabaseClient } from "@/lib/database"

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const { id } = params

        if (!id) {
            return NextResponse.json({ success: false, error: "Distribution ID is required" }, { status: 400 })
        }

        const success = await DatabaseClient.deleteDistribution(id)

        if (success) {
            return NextResponse.json({ success: true })
        } else {
            return NextResponse.json({ success: false, error: "Distribution not found or could not be deleted" }, { status: 404 })
        }
    } catch (error: any) {
        console.error("Error deleting distribution:", error)
        return NextResponse.json({ success: false, error: error.message || "Failed to delete distribution" }, { status: 500 })
    }
}
