"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Camera, Type } from "lucide-react"

interface BarcodeScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBarcodeScanned: (barcode: string) => void
}

export function BarcodeScannerDialog({ open, onOpenChange, onBarcodeScanned }: BarcodeScannerDialogProps) {
  const [manualBarcode, setManualBarcode] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsScanning(true)
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      alert("Camera access denied. Please use manual entry.")
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      onBarcodeScanned(manualBarcode.trim())
      setManualBarcode("")
    }
  }

  useEffect(() => {
    if (!open) {
      stopCamera()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Barcode/QR Code</DialogTitle>
          <DialogDescription>Scan a barcode to add or update inventory items</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera Scanner Section */}
          <div className="space-y-2">
            <Label>Camera Scanner</Label>
            {!isScanning ? (
              <Button onClick={startCamera} className="w-full bg-transparent" variant="outline">
                <Camera className="w-4 h-4 mr-2" />
                Start Camera
              </Button>
            ) : (
              <div className="space-y-2">
                <video ref={videoRef} autoPlay playsInline className="w-full h-48 bg-black rounded-md" />
                <Button onClick={stopCamera} variant="outline" className="w-full bg-transparent">
                  Stop Camera
                </Button>
                <p className="text-sm text-slate-500 text-center">
                  Position barcode in camera view. Detection coming soon!
                </p>
              </div>
            )}
          </div>

          {/* Manual Entry Section */}
          <div className="space-y-2">
            <Label htmlFor="manual-barcode">Manual Entry</Label>
            <div className="flex gap-2">
              <Input
                id="manual-barcode"
                placeholder="Enter barcode manually"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleManualSubmit()}
              />
              <Button onClick={handleManualSubmit} disabled={!manualBarcode.trim()}>
                <Type className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            <p>• If barcode exists: quantity will be increased by 1</p>
            <p>• If barcode is new: add item dialog will open</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
