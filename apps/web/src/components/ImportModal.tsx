'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import {
  Upload,
  X,
  Loader2,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import {
  parseCSV,
  parseExcel,
  detectColumnMapping,
  importItems,
  type ColumnMapping,
  type ImportResult,
} from '@/lib/import-export'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
}

type Step = 'upload' | 'preview' | 'mapping' | 'importing' | 'result'

export function ImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: ImportModalProps) {
  const [step, setStep] = useState<Step>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [data, setData] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: null,
    category: null,
    serial_number: null,
    owner_email: null,
  })
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    setMounted(true)
  }, [])

  const resetState = () => {
    setStep('upload')
    setFileName('')
    setHeaders([])
    setData([])
    setMapping({ name: null, category: null, serial_number: null, owner_email: null })
    setImportResult(null)
    setIsImporting(false)
  }

  const handleClose = () => {
    resetState()
    onClose()
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const processFile = async (file: File) => {
    setFileName(file.name)

    try {
      const isExcel =
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls') ||
        file.type.includes('spreadsheet')

      let parsed: { headers: string[]; data: Record<string, string>[] }

      if (isExcel) {
        const buffer = await file.arrayBuffer()
        parsed = parseExcel(buffer)
      } else {
        const text = await file.text()
        parsed = parseCSV(text)
      }

      if (parsed.headers.length === 0) {
        toast({
          title: 'Błąd',
          description: 'Plik jest pusty lub ma nieprawidłowy format',
          variant: 'destructive',
        })
        return
      }

      setHeaders(parsed.headers)
      setData(parsed.data)

      // Auto-detect column mapping
      const detectedMapping = detectColumnMapping(parsed.headers)
      setMapping(detectedMapping)

      setStep('preview')
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się przetworzyć pliku',
        variant: 'destructive',
      })
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleImport = async () => {
    if (!mapping.name) {
      toast({
        title: 'Błąd',
        description: 'Musisz zmapować kolumnę z nazwą przedmiotu',
        variant: 'destructive',
      })
      return
    }

    setIsImporting(true)
    setStep('importing')

    try {
      const result = await importItems(data, mapping)
      setImportResult(result)
      setStep('result')

      if (result.success > 0) {
        onImportComplete()
      }
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Wystąpił błąd podczas importu',
        variant: 'destructive',
      })
      setStep('mapping')
    } finally {
      setIsImporting(false)
    }
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-3xl max-h-[90vh] bg-card rounded-xl shadow-2xl overflow-hidden flex flex-col border animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-foreground">Import przedmiotów</h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  h-48 rounded-lg border-2 border-dashed
                  flex flex-col items-center justify-center gap-3 cursor-pointer
                  transition-colors
                  ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-muted-foreground/50'}
                `}
              >
                <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">
                    Przeciągnij plik tutaj lub kliknij, aby wybrać
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Obsługiwane formaty: CSV, XLSX, XLS
                  </p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                <div>
                  <h3 className="font-medium mb-2 text-foreground">Wymagany schemat pliku</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Plik musi zawierać nagłówki w pierwszym wierszu. System automatycznie rozpoznaje kolumny:
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium">Pole</th>
                          <th className="text-left py-2 pr-4 font-medium">Wymagane</th>
                          <th className="text-left py-2 font-medium">Rozpoznawane nagłówki</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b">
                          <td className="py-2 pr-4 font-medium text-foreground">Nazwa</td>
                          <td className="py-2 pr-4 text-green-600 dark:text-green-400">Tak</td>
                          <td className="py-2"><code className="bg-muted px-1 rounded">Nazwa</code>, <code className="bg-muted px-1 rounded">name</code>, <code className="bg-muted px-1 rounded">przedmiot</code>, <code className="bg-muted px-1 rounded">item</code></td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 pr-4 font-medium text-foreground">Kategoria</td>
                          <td className="py-2 pr-4">Nie</td>
                          <td className="py-2"><code className="bg-muted px-1 rounded">Kategoria</code>, <code className="bg-muted px-1 rounded">category</code>, <code className="bg-muted px-1 rounded">typ</code>, <code className="bg-muted px-1 rounded">type</code></td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-2 pr-4 font-medium text-foreground">Nr seryjny</td>
                          <td className="py-2 pr-4">Nie</td>
                          <td className="py-2"><code className="bg-muted px-1 rounded">Numer seryjny</code>, <code className="bg-muted px-1 rounded">serial</code>, <code className="bg-muted px-1 rounded">nr</code>, <code className="bg-muted px-1 rounded">sn</code>, <code className="bg-muted px-1 rounded">inwentarzowy</code></td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-4 font-medium text-foreground">Właściciel</td>
                          <td className="py-2 pr-4">Nie</td>
                          <td className="py-2"><code className="bg-muted px-1 rounded">Email</code>, <code className="bg-muted px-1 rounded">właściciel</code>, <code className="bg-muted px-1 rounded">owner</code>, <code className="bg-muted px-1 rounded">pracownik</code></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2 text-foreground">Przykład zawartości pliku:</h4>
                  <div className="overflow-x-auto bg-background rounded border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2 font-medium">Nazwa</th>
                          <th className="text-left p-2 font-medium">Kategoria</th>
                          <th className="text-left p-2 font-medium">Numer seryjny</th>
                          <th className="text-left p-2 font-medium">Email</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b">
                          <td className="p-2">Laptop Dell XPS 15</td>
                          <td className="p-2">Laptop</td>
                          <td className="p-2">SN-2024-001</td>
                          <td className="p-2">jan.kowalski@firma.pl</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2">Monitor LG 27&quot;</td>
                          <td className="p-2">Monitor</td>
                          <td className="p-2">SN-2024-002</td>
                          <td className="p-2">anna.nowak@firma.pl</td>
                        </tr>
                        <tr>
                          <td className="p-2">Biurko regulowane</td>
                          <td className="p-2">Meble</td>
                          <td className="p-2"></td>
                          <td className="p-2"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong className="text-foreground">Uwagi:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Jeśli kategoria nie istnieje w systemie, zostanie automatycznie utworzona</li>
                    <li>Właściciel jest dopasowywany po emailu - pracownik musi wcześniej istnieć w systemie</li>
                    <li>Dla plików CSV zalecane kodowanie: UTF-8</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {data.length} wierszy do zaimportowania
                  </p>
                </div>
                <Button variant="outline" onClick={resetState}>
                  Wybierz inny plik
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((header) => (
                          <TableHead key={header}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          {headers.map((header) => (
                            <TableCell key={header} className="max-w-xs truncate">
                              {row[header] || '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {data.length > 5 && (
                  <div className="px-4 py-2 bg-muted/50 text-sm text-muted-foreground">
                    ...i {data.length - 5} więcej wierszy
                  </div>
                )}
              </div>

              <Button onClick={() => setStep('mapping')} className="w-full">
                Dalej - mapowanie kolumn
              </Button>
            </div>
          )}

          {/* Step: Mapping */}
          {step === 'mapping' && (
            <div className="space-y-6">
              <p className="text-muted-foreground">
                Przypisz kolumny z pliku do pól w systemie. Kolumna &quot;Nazwa&quot; jest wymagana.
              </p>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Nazwa przedmiotu *</Label>
                  <Select
                    value={mapping.name || ''}
                    onValueChange={(value) =>
                      setMapping({ ...mapping, name: value || null })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz kolumnę" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Kategoria</Label>
                  <Select
                    value={mapping.category || 'none'}
                    onValueChange={(value) =>
                      setMapping({ ...mapping, category: value === 'none' ? null : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz kolumnę (opcjonalnie)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Brak --</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Numer seryjny</Label>
                  <Select
                    value={mapping.serial_number || 'none'}
                    onValueChange={(value) =>
                      setMapping({
                        ...mapping,
                        serial_number: value === 'none' ? null : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz kolumnę (opcjonalnie)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Brak --</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Email właściciela</Label>
                  <Select
                    value={mapping.owner_email || 'none'}
                    onValueChange={(value) =>
                      setMapping({
                        ...mapping,
                        owner_email: value === 'none' ? null : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz kolumnę (opcjonalnie)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Brak --</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('preview')}>
                  Wróć
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!mapping.name}
                  className="flex-1"
                >
                  Importuj {data.length} przedmiotów
                </Button>
              </div>
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
              <p className="text-lg font-medium">Importowanie danych...</p>
              <p className="text-muted-foreground">Proszę czekać</p>
            </div>
          )}

          {/* Step: Result */}
          {step === 'result' && importResult && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                {importResult.success > 0 ? (
                  <CheckCircle className="h-12 w-12 text-green-500" />
                ) : (
                  <AlertCircle className="h-12 w-12 text-destructive" />
                )}
                <div>
                  <h3 className="text-xl font-semibold">Import zakończony</h3>
                  <p className="text-muted-foreground">
                    {importResult.success > 0
                      ? `Zaimportowano ${importResult.success} przedmiotów`
                      : 'Nie zaimportowano żadnych przedmiotów'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {importResult.success}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">Zaimportowano</div>
                </div>
                <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {importResult.errors.length}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">Błędów</div>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <div className="text-2xl font-bold text-muted-foreground">
                    {importResult.skipped}
                  </div>
                  <div className="text-sm text-muted-foreground">Pominiętych</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-4 py-2 bg-red-100 dark:bg-red-900/30 font-medium text-red-800 dark:text-red-200">
                    Błędy importu
                  </div>
                  <div className="max-h-48 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Wiersz</TableHead>
                          <TableHead>Błąd</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.errors.slice(0, 20).map((error, i) => (
                          <TableRow key={i}>
                            <TableCell>{error.row}</TableCell>
                            <TableCell>{error.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {importResult.errors.length > 20 && (
                    <div className="px-4 py-2 bg-muted/50 text-sm text-muted-foreground">
                      ...i {importResult.errors.length - 20} więcej błędów
                    </div>
                  )}
                </div>
              )}

              <Button onClick={handleClose} className="w-full">
                Zamknij
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
