'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import JSZip from 'jszip'
import { jsPDF } from 'jspdf'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { X, Download, Printer, Loader2, FileArchive } from 'lucide-react'
import type { Item, Category } from '@/lib/types'

interface BulkQRGeneratorProps {
  items: (Item & { category?: Category | null })[]
  isOpen: boolean
  onClose: () => void
}

export function BulkQRGenerator({ items, isOpen, onClose }: BulkQRGeneratorProps) {
  const [mounted, setMounted] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [qrCodes, setQrCodes] = useState<Map<string, string>>(new Map())
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen && items.length > 0) {
      generateQRCodes()
    }
  }, [isOpen, items])

  const getItemUrl = (itemId: string) => {
    return typeof window !== 'undefined'
      ? `${window.location.origin}/item/${itemId}`
      : `/item/${itemId}`
  }

  const generateQRCodes = async () => {
    setIsGenerating(true)
    const codes = new Map<string, string>()

    for (const item of items) {
      try {
        const dataUrl = await QRCode.toDataURL(getItemUrl(item.id), {
          width: 200,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        })
        codes.set(item.id, dataUrl)
      } catch (error) {
        console.error(`Error generating QR for ${item.id}:`, error)
      }
    }

    setQrCodes(codes)
    setIsGenerating(false)
  }

  const handleDownloadZIP = async () => {
    setIsGenerating(true)

    try {
      const zip = new JSZip()
      const folder = zip.folder('qr-codes')

      for (const item of items) {
        const dataUrl = await QRCode.toDataURL(getItemUrl(item.id), {
          width: 1024,
          margin: 4,
          color: { dark: '#000000', light: '#ffffff' },
        })

        // Convert data URL to blob
        const base64Data = dataUrl.split(',')[1]
        const fileName = `qr-${item.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`
        folder?.file(fileName, base64Data, { base64: true })
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `qr-codes-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: 'Sukces',
        description: `Pobrano ${items.length} kodów QR`,
      })
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się wygenerować archiwum ZIP',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadPDF = async () => {
    setIsGenerating(true)

    try {
      // A4 dimensions in mm
      const pageWidth = 210
      const pageHeight = 297
      const margin = 10
      const labelWidth = (pageWidth - margin * 2) / 3
      const labelHeight = (pageHeight - margin * 2) / 4
      const qrSize = 35
      const padding = 5

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      let currentPage = 0
      let col = 0
      let row = 0

      for (let i = 0; i < items.length; i++) {
        const item = items[i]

        // Add new page if needed
        if (i > 0 && col === 0 && row === 0) {
          pdf.addPage()
          currentPage++
        }

        // Calculate position
        const x = margin + col * labelWidth
        const y = margin + row * labelHeight

        // Draw border
        pdf.setDrawColor(200)
        pdf.setLineWidth(0.1)
        pdf.rect(x, y, labelWidth, labelHeight)

        // Generate QR code
        const qrDataUrl = await QRCode.toDataURL(getItemUrl(item.id), {
          width: 400,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        })

        // Add QR code centered horizontally
        const qrX = x + (labelWidth - qrSize) / 2
        const qrY = y + padding
        pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

        // Add item name
        pdf.setFontSize(9)
        pdf.setFont('helvetica', 'bold')
        const nameY = qrY + qrSize + 5
        const maxNameWidth = labelWidth - padding * 2

        // Truncate name if too long
        let displayName = item.name
        while (pdf.getTextWidth(displayName) > maxNameWidth && displayName.length > 3) {
          displayName = displayName.slice(0, -4) + '...'
        }
        pdf.text(displayName, x + labelWidth / 2, nameY, { align: 'center' })

        // Add serial number if exists
        if (item.serial_number) {
          pdf.setFontSize(7)
          pdf.setFont('helvetica', 'normal')
          let displaySerial = item.serial_number
          while (pdf.getTextWidth(displaySerial) > maxNameWidth && displaySerial.length > 3) {
            displaySerial = displaySerial.slice(0, -4) + '...'
          }
          pdf.text(displaySerial, x + labelWidth / 2, nameY + 4, { align: 'center' })
        }

        // Move to next cell
        col++
        if (col >= 3) {
          col = 0
          row++
          if (row >= 4) {
            row = 0
          }
        }
      }

      pdf.save(`etykiety-${new Date().toISOString().split('T')[0]}.pdf`)

      toast({
        title: 'Sukces',
        description: `Wygenerowano PDF z ${items.length} etykietami`,
      })
    } catch (error) {
      console.error('PDF generation error:', error)
      toast({
        title: 'Błąd',
        description: 'Nie udało się wygenerować PDF',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleOpenPrintPage = () => {
    // Store selected items in sessionStorage
    sessionStorage.setItem('printItems', JSON.stringify(items.map(i => i.id)))
    router.push('/admin/przedmioty/drukuj')
    onClose()
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[90vh] bg-card rounded-xl shadow-2xl overflow-hidden flex flex-col border animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Generowanie kodów QR</h2>
            <p className="text-sm text-muted-foreground">
              {items.length} przedmiotów wybranych
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-background">
          {isGenerating && qrCodes.size === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-foreground">Generowanie kodów QR...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-3 flex flex-col items-center bg-card hover:shadow-soft transition-shadow"
                >
                  {qrCodes.get(item.id) ? (
                    <img
                      src={qrCodes.get(item.id)}
                      alt={`QR for ${item.name}`}
                      className="w-24 h-24"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-muted animate-pulse rounded" />
                  )}
                  <p className="text-xs font-medium text-center mt-2 line-clamp-2 text-foreground">
                    {item.name}
                  </p>
                  {item.serial_number && (
                    <p className="text-xs text-muted-foreground text-center">
                      {item.serial_number}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t bg-muted/50 flex flex-wrap gap-3 justify-end">
          <Button
            variant="outline"
            onClick={handleDownloadZIP}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileArchive className="h-4 w-4 mr-2" />
            )}
            Pobierz ZIP (osobne pliki)
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Pobierz PDF (etykiety 3x4)
          </Button>
          <Button onClick={handleOpenPrintPage} disabled={isGenerating}>
            <Printer className="h-4 w-4 mr-2" />
            Otwórz stronę drukowania
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
