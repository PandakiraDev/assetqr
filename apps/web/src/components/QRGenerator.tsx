'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'
import { Download, X, Maximize2, Minimize2 } from 'lucide-react'

interface QRGeneratorProps {
  itemId: string
  itemName: string
  isOpen: boolean
  onClose: () => void
}

export function QRGenerator({ itemId, itemName, isOpen, onClose }: QRGeneratorProps) {
  const [mounted, setMounted] = useState(false)
  const smallCanvasRef = useRef<HTMLCanvasElement>(null)
  const largeCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const itemUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/item/${itemId}`
    : `/item/${itemId}`

  const generateQR = useCallback(async () => {
    if (!isOpen || !mounted) return

    setIsReady(false)

    // Mały QR do podglądu
    if (smallCanvasRef.current) {
      await QRCode.toCanvas(smallCanvasRef.current, itemUrl, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
    }

    // Duży QR do druku
    if (largeCanvasRef.current) {
      await QRCode.toCanvas(largeCanvasRef.current, itemUrl, {
        width: 600,
        margin: 3,
        color: { dark: '#000000', light: '#ffffff' },
      })
    }

    setIsReady(true)
  }, [isOpen, itemUrl, mounted])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Małe opóźnienie żeby canvas zdążył się wyrenderować
    const timer = setTimeout(() => {
      generateQR()
    }, 50)
    return () => clearTimeout(timer)
  }, [generateQR])

  useEffect(() => {
    // Regeneruj QR przy zmianie widoku
    if (isReady && mounted) {
      const timer = setTimeout(() => {
        generateQR()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isFullscreen])

  const handleDownloadPNG = async () => {
    // Generuj świeży canvas do pobrania
    const downloadCanvas = document.createElement('canvas')
    await QRCode.toCanvas(downloadCanvas, itemUrl, {
      width: 1024,
      margin: 4,
      color: { dark: '#000000', light: '#ffffff' },
    })

    const dataUrl = downloadCanvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `qr-${itemName.replace(/\s+/g, '-').toLowerCase()}.png`
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadSVG = async () => {
    const svgString = await QRCode.toString(itemUrl, {
      type: 'svg',
      width: 1024,
      margin: 4,
    })

    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.download = `qr-${itemName.replace(/\s+/g, '-').toLowerCase()}.svg`
    link.href = url
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  const handleClose = () => {
    setIsFullscreen(false)
    onClose()
  }

  if (!isOpen || !mounted) return null

  const modalContent = isFullscreen ? (
    // Widok pełnoekranowy
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-8">
      <div className="absolute top-4 right-4 flex gap-2">
        <Button variant="secondary" size="icon" onClick={() => setIsFullscreen(false)}>
          <Minimize2 className="h-5 w-5" />
        </Button>
        <Button variant="secondary" size="icon" onClick={handleClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-2 text-center text-white">{itemName}</h2>
        <p className="text-sm text-gray-400 mb-8 text-center break-all max-w-md">{itemUrl}</p>

        <div className="rounded-xl shadow-2xl bg-white p-4">
          <canvas ref={largeCanvasRef} />
        </div>

        <div className="flex gap-4 mt-8">
          <Button size="lg" onClick={handleDownloadPNG}>
            <Download className="h-5 w-5 mr-2" />
            Pobierz PNG
          </Button>
          <Button size="lg" variant="secondary" onClick={handleDownloadSVG}>
            <Download className="h-5 w-5 mr-2" />
            Pobierz SVG
          </Button>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          SVG - najlepsza jakość do druku w dowolnym rozmiarze
        </p>
      </div>
    </div>
  ) : (
    // Widok dialogu
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80">
      <div className="absolute inset-0" onClick={handleClose} />

      <div className="relative bg-card rounded-xl shadow-xl max-w-sm w-full p-6 border animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold truncate pr-4 text-foreground">{itemName}</h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col items-center">
          <div className="border rounded-lg p-2 bg-white">
            <canvas ref={smallCanvasRef} />
          </div>

          <p className="text-xs text-muted-foreground text-center break-all mt-3 px-2">
            {itemUrl}
          </p>
        </div>

        <div className="flex flex-col gap-2 mt-6">
          <Button onClick={() => setIsFullscreen(true)} className="w-full">
            <Maximize2 className="h-4 w-4 mr-2" />
            Powiększ na cały ekran
          </Button>

          <div className="flex gap-2">
            <Button onClick={handleDownloadPNG} variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              PNG
            </Button>
            <Button onClick={handleDownloadSVG} variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              SVG
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
