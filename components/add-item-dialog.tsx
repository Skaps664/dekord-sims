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
  const [itemType, setItemType] = useState<"product" | "raw_material">("product")
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
      let response

      if (itemType === "product") {
        response = await fetch("/api/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            category: formData.category,
            unit_price: Number.parseFloat(formData.unit_price),
            cost_price: Number.parseFloat(formData.cost_price),
            barcode: formData.barcode || null,
          }),
        })
      } else {
        response = await fetch("/api/raw-materials", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            unit: formData.unit,
            cost_per_unit: Number.parseFloat(formData.cost_price),
            supplier: formData.supplier,
            stock_quantity: Number.parseFloat(formData.stock_quantity || "0"),
            minimum_stock: Number.parseFloat(formData.minimum_stock || "0"),
          }),
        })
      }

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
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>
            {itemType === "product"
              ? "Add a new product to your inventory with pricing information"
              : "Add a new raw material with supplier and stock details"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="itemType">Item Type</Label>
            <Select
              value={itemType}
              onValueChange={(value: "product" | "raw_material") => {
                setItemType(value)
                // Reset form when switching types
                setFormData({
                  name: "",
                  description: "",
                  category: "",
                  unit_price: "",
                  cost_price: "",
                  barcode: "",
                  unit: "",
                  supplier: "",
                  stock_quantity: "",
                  minimum_stock: "",
                })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select item type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Finished Product</SelectItem>
                <SelectItem value="raw_material">Raw Material</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder={itemType === "product" ? "Product name" : "Raw material name"}
              />
            </div>

            {itemType === "product" && (
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {itemType === "raw_material" && (
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
            )}
          </div>

          {itemType === "product" && (
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description (optional)"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode</Label>
            <Input
              id="barcode"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              placeholder="Barcode number (optional)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="cost_price">{itemType === "product" ? "Cost Price ($) *" : "Cost per Unit ($) *"}</Label>
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

            {itemType === "product" && (
              <div className="space-y-2">
                <Label htmlFor="unit_price">Selling Price ($) *</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                  required
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          {itemType === "raw_material" && (
            <>
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
            </>
          )}

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
                `Add ${itemType === "product" ? "Product" : "Raw Material"}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
