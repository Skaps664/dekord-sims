"use client"

import type React from "react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface AddItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AddItemDialog({ open, onOpenChange, onSuccess }: AddItemDialogProps) {
  const [itemType, setItemType] = useState<"raw_material">("raw_material")
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    unit_price: "",
    cost_price: "",
    barcode: "",
    // Raw material specific
    unit: "",
    supplier: "",
    location: "",
    notes: "",
    stock_quantity: "",
    minimum_stock: "",
  })

  const categories = [
    "Electronics",
    "Components",
    "Raw Materials",
    "Packaging",
    "Tools & Equipment",
    "Cables & Connectors",
    "Other",
  ]

  const rawMaterialUnits = [
    "kg",
    "g",
    "lbs",
    "oz",
    "liters",
    "ml",
    "gallons",
    "pieces",
    "units",
    "meters",
    "feet",
    "sheets",
    "rolls",
    "boxes",
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/raw-materials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          unit: formData.unit,
          quantity: Number.parseFloat(formData.stock_quantity || "0"),
          unit_cost: Number.parseFloat(formData.cost_price),
          supplier: formData.supplier,
          location: formData.location || 'Raw Materials Storage',
          notes: formData.notes || '',
          barcode: formData.barcode || '',
          minimum_stock: formData.minimum_stock ? Number.parseInt(formData.minimum_stock) : 0,
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Reset form
        setFormData({
          name: "",
          description: "",
          category: "",
          unit_price: "",
          cost_price: "",
          barcode: "",
          unit: "",
          supplier: "",
          location: "",
          notes: "",
          stock_quantity: "",
          minimum_stock: "",
        })
        onOpenChange(false)
        onSuccess?.()
      } else {
        console.error("Failed to create item:", result.error)
        alert("Failed to create item: " + result.error)
      }
    } catch (error) {
      console.error("Error creating item:", error)
      alert("Error creating item. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Raw Material</DialogTitle>
          <DialogDescription>
            Add a new raw material with supplier and stock details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Raw material name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {rawMaterialUnits.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode/SKU</Label>
            <Input
              id="barcode"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              placeholder="Barcode number (optional)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost_price">Cost per Unit ($) *</Label>
            <Input
              id="cost_price"
              type="number"
              step="0.01"
              value={formData.cost_price}
              onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
              required
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              placeholder="Supplier name (optional)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="stock_quantity">Initial Stock Quantity</Label>
              <Input
                id="stock_quantity"
                type="number"
                step="0.01"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minimum_stock">Minimum Stock Level</Label>
              <Input
                id="minimum_stock"
                type="number"
                step="0.01"
                value={formData.minimum_stock}
                onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Storage Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Warehouse A, Shelf 3"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes (optional)"
            />
          </div>

          <DialogFooter className="pt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Add Raw Material"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
