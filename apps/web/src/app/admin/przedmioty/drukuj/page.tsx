'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'
import type { Item, Category } from '@/lib/types'

type ItemWithCategory = Item & { category: Category | null }

type LabelSize = 'small' | 'medium' | 'large'

const LABEL_CONFIGS = {
  small: { cols: 4, rows: 6, qrSize: 80, fontSize: 8 },
  medium: { cols: 3, rows: 4, qrSize: 120, fontSize: 10 },
  large: { cols: 2, rows: 3, qrSize: 160, fontSize: 12 },
}

export default function PrintLabelsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [items, setItems] = useState<ItemWithCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [qrCodes, setQrCodes] = useState<Map<string, string>>(new Map())
  const [labelSize, setLabelSize] = useState<LabelSize>('medium')
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    // Get selected item IDs from sessionStorage
    const storedIds = sessionStorage.getItem('printItems')
    if (!storedIds) {
      // If no items selected, load all active items
      const { data, error } = await supabase
        .from('items')
        .select('*, category:categories(*)')
        .eq('is_archived', false)
        .order('name')

      if (!error && data) {
        setItems(data as ItemWithCategory[])
        generateQRCodes(data as ItemWithCategory[])
      }
    } else {
      try {
        const ids = JSON.parse(storedIds) as string[]
        const { data, error } = await supabase
          .from('items')
          .select('*, category:categories(*)')
          .in('id', ids)
          .order('name')

        if (!error && data) {
          setItems(data as ItemWithCategory[])
          generateQRCodes(data as ItemWithCategory[])
        }
      } catch {
        // Invalid JSON, load all items
        const { data, error } = await supabase
          .from('items')
          .select('*, category:categories(*)')
          .eq('is_archived', false)
          .order('name')

        if (!error && data) {
          setItems(data as ItemWithCategory[])
          generateQRCodes(data as ItemWithCategory[])
        }
      }
    }

    setIsLoading(false)
  }

  const generateQRCodes = async (itemsToGenerate: ItemWithCategory[]) => {
    const codes = new Map<string, string>()
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

    for (const item of itemsToGenerate) {
      try {
        const dataUrl = await QRCode.toDataURL(`${baseUrl}/item/${item.id}`, {
          width: 400,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        })
        codes.set(item.id, dataUrl)
      } catch (error) {
        console.error(`Error generating QR for ${item.id}:`, error)
      }
    }

    setQrCodes(codes)
  }

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const config = LABEL_CONFIGS[labelSize]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <>
      {/* Controls (hidden when printing) */}
      <div className="print:hidden space-y-6 mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/przedmioty">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Drukowanie etykiet</h1>
            <p className="text-muted-foreground mt-1">
              {items.length} przedmiotów do wydrukowania
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>Rozmiar etykiet</Label>
            <Select value={labelSize} onValueChange={(v) => setLabelSize(v as LabelSize)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Małe (4x6 = 24 na stronę)</SelectItem>
                <SelectItem value="medium">Średnie (3x4 = 12 na stronę)</SelectItem>
                <SelectItem value="large">Duże (2x3 = 6 na stronę)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Drukuj
          </Button>
        </div>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Wskazówka:</strong> W oknie drukowania ustaw orientację na &quot;Pionową&quot; (Portrait)
            i wyłącz marginesy (lub ustaw minimalne). Dla najlepszych wyników użyj papieru samoprzylepnego.
          </p>
        </div>
      </div>

      {/* Print Preview */}
      <div
        ref={printRef}
        className="bg-white print:bg-white"
      >
        {/* Generate pages */}
        {Array.from({ length: Math.ceil(items.length / (config.cols * config.rows)) }).map(
          (_, pageIndex) => {
            const pageItems = items.slice(
              pageIndex * config.cols * config.rows,
              (pageIndex + 1) * config.cols * config.rows
            )

            return (
              <div
                key={pageIndex}
                className="page-break-after-always"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  padding: '5mm',
                  margin: '0 auto',
                  boxSizing: 'border-box',
                  display: 'grid',
                  gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${config.rows}, 1fr)`,
                  gap: '2mm',
                  pageBreakAfter: pageIndex < Math.ceil(items.length / (config.cols * config.rows)) - 1 ? 'always' : 'auto',
                }}
              >
                {pageItems.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-300 print:border-gray-400 rounded flex flex-col items-center justify-center p-1"
                    style={{
                      minHeight: `${(297 - 10) / config.rows - 2}mm`,
                    }}
                  >
                    {qrCodes.get(item.id) ? (
                      <img
                        src={qrCodes.get(item.id)}
                        alt={`QR ${item.name}`}
                        style={{
                          width: `${config.qrSize}px`,
                          height: `${config.qrSize}px`,
                        }}
                        className="print:w-auto print:h-auto"
                      />
                    ) : (
                      <div
                        style={{
                          width: `${config.qrSize}px`,
                          height: `${config.qrSize}px`,
                        }}
                        className="bg-gray-100"
                      />
                    )}
                    <p
                      className="text-center font-medium mt-1 line-clamp-2 px-1"
                      style={{ fontSize: `${config.fontSize}pt` }}
                    >
                      {item.name}
                    </p>
                    {item.serial_number && (
                      <p
                        className="text-center text-gray-500 font-mono"
                        style={{ fontSize: `${config.fontSize - 2}pt` }}
                      >
                        {item.serial_number}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )
          }
        )}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 0;
          }

          .print\\:hidden {
            display: none !important;
          }

          .page-break-after-always {
            page-break-after: always;
          }
        }
      `}</style>
    </>
  )
}
