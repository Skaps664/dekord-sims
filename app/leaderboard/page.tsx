"use client"

import { useEffect, useState } from "react"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface Distribution {
  id: string
  recipient: string
  personName: string
  recipientType: "distributor" | "shop_keeper" | "individual" | "friend_family" | "influencer_marketing"
  location: string
  items: {
    itemId: string
    itemName: string
    quantity: number
    unitCost: number
    sellingPrice: number
    batchId?: string
    batchName?: string
  }[]
  totalValue: number
  totalProfit: number
  date: string
  status: "pending" | "completed" | "cancelled"
  month: string
}

export default function LeaderboardPage() {
  const [distributions, setDistributions] = useState<Distribution[]>([])

  useEffect(() => {
    const savedDistributions = localStorage.getItem("distributions")
    if (savedDistributions) {
      setDistributions(JSON.parse(savedDistributions))
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => window.history.back()} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Sales Analytics & Leaderboard</h1>
              <p className="text-slate-600">Comprehensive sales performance and analytics dashboard</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <AnalyticsDashboard open={true} onOpenChange={() => {}} distributions={distributions} />
      </div>
    </div>
  )
}
