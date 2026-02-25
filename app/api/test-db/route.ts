export const dynamic = "force-dynamic";

import { NextResponse } from "next/server"
import DatabaseClient from "@/lib/database"

// Load .env at request time to ensure values added after server start are seen in this environment
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv').config()
} catch (e) {
  // ignore
}

function envPresent() {
  return !!(
    process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI || process.env.DATABASE_URL || process.env.NEXT_PUBLIC_DATABASE_URL || process.env.MONGO_URI
  )
}

export async function GET() {
  try {
    console.log("[v0] Testing database connection...")

    // Always attempt checkDatabaseSetup which will try to connect and initialize
    const setupStatus = await DatabaseClient.checkDatabaseSetup()

    if (!setupStatus.connected) {
      return NextResponse.json({
        success: false,
        error: "Database connection failed",
        details: setupStatus.error,
        env_check: { MONGODB_URI: envPresent() ? "Set" : "Missing" },
      })
    }

    return NextResponse.json({
      success: true,
      message: "Database test completed",
      setup_status: setupStatus,
      env_check: { MONGODB_URI: envPresent() ? "Set" : "Missing" },
    })
  } catch (error) {
    console.error("[v0] Database test error:", error)
    return NextResponse.json({
      success: false,
      error: "Database test failed",
      details: error instanceof Error ? error.message : String(error),
      env_check: { MONGODB_URI: envPresent() ? "Set" : "Missing" },
    })
  }
}
