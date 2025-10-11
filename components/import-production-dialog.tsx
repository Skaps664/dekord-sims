"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Package, AlertTriangle, CheckCircle, DollarSign } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ProductionBatch {
  id: string | number
  batch_number?: string
  batchName?: string
  product_id?: number
  productId?: number | string
  product_name?: string
  productName?: string
  quantity_produced?: number
  unitsProduced?: number
  quantity_remaining?: number
  cost_per_unit?: number
  costPerUnit?: number
  production_date?: string
  productionDate?: string
  status?: string
}

interface ImportProductionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function ImportProductionDialog({ open, onOpenChange, onSuccess }: ImportProductionDialogProps) {
  const [loading, setLoading] = useState(false)
  const [batches, setBatches] = useState<ProductionBatch[]>([])
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null)
  const [rejectedUnits, setRejectedUnits] = useState<number>(0)
  const [sellingPrice, setSellingPrice] = useState<string>("")
  const [location, setLocation] = useState<string>("Main Warehouse")
  const [notes, setNotes] = useState<string>("")
  const [error, setError] = useState<string>("")

  useEffect(() => {
    if (open) {
      fetchAvailableBatches()
    }
  }, [open])

  const fetchAvailableBatches = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/production-batches")
      const result = await response.json()

      if (result.success) {
        // Filter batches that have remaining quantity > 0
        const availableBatches = result.data.filter((batch: ProductionBatch) => {
          const remaining = batch.quantity_remaining ?? batch.quantity_produced ?? batch.unitsProduced ?? 0
          return remaining > 0
        })
        setBatches(availableBatches)
      }
    } catch (error) {
      console.error("Error fetching batches:", error)
      setError("Failed to load production batches")
    } finally {
      setLoading(false)
    }
  }

  const handleBatchSelect = (batchId: string) => {
    const batch = batches.find((b) => String(b.id) === batchId)
    if (batch) {
      setSelectedBatch(batch)
      setRejectedUnits(0)
      setSellingPrice("")
      setError("")
      
      // Set default selling price suggestion (cost + 50% markup)
      const costPerUnit = batch.cost_per_unit ?? batch.costPerUnit ?? 0
      const suggestedPrice = (costPerUnit * 1.5).toFixed(2)
      setSellingPrice(suggestedPrice)
    }
  }

  const getAvailableQuantity = () => {
    if (!selectedBatch) return 0
    return selectedBatch.quantity_remaining ?? selectedBatch.quantity_produced ?? selectedBatch.unitsProduced ?? 0
  }

  const getAcceptedQuantity = () => {
    return Math.max(0, getAvailableQuantity() - rejectedUnits)
  }

  const getBatchName = (batch: ProductionBatch) => {
    return batch.batch_number || batch.batchName || `Batch #${batch.id}`
  }

  const getProductName = (batch: ProductionBatch) => {
    return batch.product_name || batch.productName || "Unknown Product"
  }

  const validateForm = () => {
    if (!selectedBatch) {
      setError("Please select a production batch")
      return false
    }

    if (rejectedUnits < 0) {
      setError("Rejected units cannot be negative")
      return false
    }

    if (rejectedUnits > getAvailableQuantity()) {
      setError("Rejected units cannot exceed available quantity")
      return false
    }

    if (getAcceptedQuantity() === 0) {
      setError("At least one unit must be accepted")
      return false
    }

    const price = parseFloat(sellingPrice)
    if (isNaN(price) || price <= 0) {
      setError("Please enter a valid selling price")
      return false
    }

    const costPerUnit = selectedBatch.cost_per_unit ?? selectedBatch.costPerUnit ?? 0
    if (price < costPerUnit) {
      setError("Warning: Selling price is lower than production cost")
      // Allow it but warn the user
    }

    return true
  }

  const handleImport = async () => {
    if (!validateForm()) return

    try {
      setLoading(true)
      setError("")

      const response = await fetch(`/api/production-batches/${selectedBatch!.id}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rejected_units: rejectedUnits,
          accepted_units: getAcceptedQuantity(),
          selling_price: parseFloat(sellingPrice),
          location: location,
          notes: notes,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to import production batch")
      }

      // Success!
      onSuccess()
      handleClose()
    } catch (error: any) {
      console.error("Error importing batch:", error)
      setError(error.message || "Failed to import batch. Please try again.")
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedBatch(null)
    setRejectedUnits(0)
    setSellingPrice("")
    setLocation("Main Warehouse")
    setNotes("")
    setError("")
    onOpenChange(false)
  }

  const costPerUnit = selectedBatch ? (selectedBatch.cost_per_unit ?? selectedBatch.costPerUnit ?? 0) : 0
  const sellingPriceNum = parseFloat(sellingPrice) || 0
  const profitPerUnit = sellingPriceNum - costPerUnit
  const profitMargin = costPerUnit > 0 ? ((profitPerUnit / costPerUnit) * 100).toFixed(1) : "0"

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="w-5 h-5" />
            Import Production to Ready Inventory
          </DialogTitle>
          <DialogDescription>
            Select a production batch and perform quality control before moving to ready inventory
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Batch Selection */}
          <div className="space-y-2">
            <Label htmlFor="batch" className="text-base font-semibold">Select Production Batch *</Label>
            <Select onValueChange={handleBatchSelect} disabled={loading}>
              <SelectTrigger id="batch" className="h-11">
                <SelectValue placeholder="Choose a batch to import..." />
              </SelectTrigger>
              <SelectContent>
                {batches.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500 text-center">
                    No production batches available
                  </div>
                ) : (
                  batches.map((batch) => {
                    const batchName = getBatchName(batch)
                    const productName = getProductName(batch)
                    const available = batch.quantity_remaining ?? batch.quantity_produced ?? batch.unitsProduced ?? 0
                    return (
                      <SelectItem key={batch.id} value={String(batch.id)}>
                        {productName} - {batchName} ({available} units)
                      </SelectItem>
                    )
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Batch Details */}
          {selectedBatch && (
            <>
              <div className="bg-slate-50 border rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-wide">Batch Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-600">Product:</span>
                    <div className="font-medium mt-1">{getProductName(selectedBatch)}</div>
                  </div>
                  <div>
                    <span className="text-slate-600">Batch Number:</span>
                    <div className="font-medium mt-1">{getBatchName(selectedBatch)}</div>
                  </div>
                  <div>
                    <span className="text-slate-600">Production Date:</span>
                    <div className="font-medium mt-1">
                      {new Date(selectedBatch.production_date || selectedBatch.productionDate || "").toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-600">Available Quantity:</span>
                    <div className="font-medium mt-1">{getAvailableQuantity()} units</div>
                  </div>
                  <div>
                    <span className="text-slate-600">Production Cost per Unit:</span>
                    <div className="font-medium mt-1">${costPerUnit.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Quality Control */}
              <div className="space-y-4">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Quality Control
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="rejected">Rejected Units (Defective/Damaged)</Label>
                  <Input
                    id="rejected"
                    type="number"
                    min="0"
                    max={getAvailableQuantity()}
                    value={rejectedUnits}
                    onChange={(e) => setRejectedUnits(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="Enter number of rejected units"
                    className="h-11"
                  />
                  <p className="text-xs text-slate-500">
                    Units that failed quality inspection and cannot be sold
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-900">Accepted Units:</span>
                    </div>
                    <span className="text-3xl font-bold text-green-700">{getAcceptedQuantity()}</span>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Pricing & Location
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="sellingPrice">Expected Selling Price per Unit *</Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="Enter selling price"
                    className="h-11"
                  />
                  {sellingPriceNum > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Profit per Unit:</span>
                        <span className={profitPerUnit >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                          ${profitPerUnit.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Profit Margin:</span>
                        <span className={parseFloat(profitMargin) >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                          {profitMargin}%
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-slate-700 font-medium">Total Expected Revenue:</span>
                        <span className="font-bold text-slate-900">${(sellingPriceNum * getAcceptedQuantity()).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Storage Location</Label>
                    <Select value={location} onValueChange={setLocation}>
                      <SelectTrigger id="location" className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Main Warehouse">Main Warehouse</SelectItem>
                        <SelectItem value="Ready Products Storage">Ready Products Storage</SelectItem>
                        <SelectItem value="Distribution Center">Distribution Center</SelectItem>
                        <SelectItem value="Quality Hold">Quality Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any additional notes..."
                      className="h-11"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={loading || !selectedBatch} className="min-w-[180px]">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>Import to Ready Inventory</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
