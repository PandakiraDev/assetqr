'use client'

import { useState, useMemo } from 'react'
import { useItems, useEmployees, useCategories, revalidateAll } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { CategoryIcon } from '@/components/CategoryIcon'
import { ImportModal } from '@/components/ImportModal'
import { Download, Upload, FileArchive, Loader2 } from 'lucide-react'
import { exportTable, exportAllData, downloadFile } from '@/lib/import-export'
import type { Employee, Category, Item } from '@/lib/types'

type ItemWithRelations = Item & {
  category: Category | null
  current_owner: Employee | null
}

interface EmployeeStats {
  employee: Employee
  itemCount: number
  items: ItemWithRelations[]
}

interface CategoryStats {
  category: Category
  itemCount: number
  items: ItemWithRelations[]
}

export default function ReportsPage() {
  const { data: rawItems, isLoading: itemsLoading } = useItems()
  const { data: employees, isLoading: employeesLoading } = useEmployees()
  const { data: categories, isLoading: categoriesLoading } = useCategories()

  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const { toast } = useToast()
  const { mutate: mutateItems } = useItems()

  const isLoading = itemsLoading || employeesLoading || categoriesLoading

  // Filtruj tylko aktywne przedmioty
  const items = useMemo(() => {
    if (!rawItems) return []
    return (rawItems as ItemWithRelations[]).filter((item) => !item.is_archived)
  }, [rawItems])

  // Statystyki po pracownikach
  const employeeStats = useMemo((): EmployeeStats[] => {
    if (!employees) return []
    const stats: EmployeeStats[] = employees.map((emp) => ({
      employee: emp,
      itemCount: 0,
      items: [],
    }))

    items.forEach((item) => {
      if (item.current_owner_id) {
        const stat = stats.find((s) => s.employee.id === item.current_owner_id)
        if (stat) {
          stat.itemCount++
          stat.items.push(item)
        }
      }
    })

    return stats.sort((a, b) => b.itemCount - a.itemCount)
  }, [employees, items])

  // Statystyki po kategoriach
  const categoryStats = useMemo((): CategoryStats[] => {
    if (!categories) return []
    const stats: CategoryStats[] = categories.map((cat) => ({
      category: cat,
      itemCount: 0,
      items: [],
    }))

    items.forEach((item) => {
      if (item.category_id) {
        const stat = stats.find((s) => s.category.id === item.category_id)
        if (stat) {
          stat.itemCount++
          stat.items.push(item)
        }
      }
    })

    return stats.sort((a, b) => b.itemCount - a.itemCount)
  }, [categories, items])

  // Statystyki ogólne
  const generalStats = useMemo(() => {
    const employeesWithItems = new Set(
      items.filter((i) => i.current_owner_id).map((i) => i.current_owner_id)
    ).size
    const avgItemsPerEmployee =
      employeesWithItems > 0
        ? (items.filter((i) => i.current_owner_id).length / employeesWithItems).toFixed(
            1
          )
        : '0'

    return {
      totalItems: items.length,
      assignedItems: items.filter((i) => i.current_owner_id).length,
      unassignedItems: items.filter((i) => !i.current_owner_id).length,
      avgItemsPerEmployee,
      employeesWithItems,
    }
  }, [items])

  // Eksport CSV (raport)
  function exportCSV(data: ItemWithRelations[], filename: string) {
    const headers = ['Nazwa', 'Kategoria', 'Nr seryjny', 'Właściciel', 'Data dodania']
    const rows = data.map((item) => [
      item.name,
      item.category?.name || '',
      item.serial_number || '',
      item.current_owner
        ? `${item.current_owner.first_name} ${item.current_owner.last_name}`
        : '',
      new Date(item.created_at).toLocaleDateString('pl-PL'),
    ])

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';')),
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.csv`
    link.click()
    URL.revokeObjectURL(url)

    toast({
      title: 'Eksport zakończony',
      description: `Plik ${filename}.csv został pobrany`,
    })
  }

  // Eksport tabeli
  async function handleExportTable(table: 'items' | 'employees' | 'categories') {
    setIsExporting(table)
    try {
      const csv = await exportTable(table)
      const dateStr = new Date().toISOString().split('T')[0]
      downloadFile(csv, `${table}-${dateStr}.csv`)
      toast({
        title: 'Eksport zakończony',
        description: `Plik ${table}-${dateStr}.csv został pobrany`,
      })
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się wyeksportować danych',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(null)
    }
  }

  // Pełny eksport
  async function handleExportAll() {
    setIsExporting('all')
    try {
      const blob = await exportAllData()
      const dateStr = new Date().toISOString().split('T')[0]
      downloadFile(blob, `assetqr-backup-${dateStr}.zip`)
      toast({
        title: 'Eksport zakończony',
        description: `Plik assetqr-backup-${dateStr}.zip został pobrany`,
      })
    } catch (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się wyeksportować danych',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(null)
    }
  }

  // Filtrowane przedmioty
  const filteredByEmployee = useMemo(() => {
    return selectedEmployee === 'all'
      ? items.filter((i) => i.current_owner_id)
      : items.filter((i) => i.current_owner_id === selectedEmployee)
  }, [items, selectedEmployee])

  const filteredByCategory = useMemo(() => {
    return selectedCategory === 'all'
      ? items
      : items.filter((i) => i.category_id === selectedCategory)
  }, [items, selectedCategory])

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Raporty</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Statystyki i zestawienia inwentarza
        </p>
      </div>

      {/* Statystyki ogólne */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Wszystkie przedmioty
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{generalStats.totalItems}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Przypisane
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{generalStats.assignedItems}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Wolne
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{generalStats.unassignedItems}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Średnia na pracownika
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {generalStats.avgItemsPerEmployee}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="employees" className="text-xs sm:text-sm px-2 sm:px-3">
            <span className="hidden sm:inline">Po pracownikach</span>
            <span className="sm:hidden">Pracownicy</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="text-xs sm:text-sm px-2 sm:px-3">
            <span className="hidden sm:inline">Po kategoriach</span>
            <span className="sm:hidden">Kategorie</span>
          </TabsTrigger>
          <TabsTrigger value="import-export" className="text-xs sm:text-sm px-2 sm:px-3">
            Import/Export
          </TabsTrigger>
        </TabsList>

        {/* Raport po pracownikach */}
        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle>Przedmioty według pracowników</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Wybierz pracownika" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszyscy pracownicy</SelectItem>
                    {employees?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() =>
                    exportCSV(
                      filteredByEmployee,
                      `przedmioty-pracownicy-${new Date().toISOString().split('T')[0]}`
                    )
                  }
                  className="w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Eksport CSV</span>
                  <span className="sm:hidden">Eksport</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedEmployee === 'all' ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pracownik</TableHead>
                      <TableHead>Dział</TableHead>
                      <TableHead className="text-right">Liczba przedmiotów</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeStats
                      .filter((s) => s.itemCount > 0)
                      .map((stat) => (
                        <TableRow key={stat.employee.id}>
                          <TableCell className="font-medium">
                            {stat.employee.first_name} {stat.employee.last_name}
                          </TableCell>
                          <TableCell>{stat.employee.department || '-'}</TableCell>
                          <TableCell className="text-right">{stat.itemCount}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Przedmiot</TableHead>
                      <TableHead>Kategoria</TableHead>
                      <TableHead>Nr seryjny</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredByEmployee.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <CategoryIcon categoryName={item.category?.name} size="sm" />
                            <span className="font-medium">{item.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{item.category?.name || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{item.serial_number || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raport po kategoriach */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle>Przedmioty według kategorii</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Wybierz kategorię" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie kategorie</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <CategoryIcon categoryName={cat.name} size="sm" showBackground={false} />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() =>
                    exportCSV(
                      filteredByCategory,
                      `przedmioty-kategorie-${new Date().toISOString().split('T')[0]}`
                    )
                  }
                  className="w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Eksport CSV</span>
                  <span className="sm:hidden">Eksport</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedCategory === 'all' ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategoria</TableHead>
                      <TableHead className="text-right">Liczba przedmiotów</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryStats
                      .filter((s) => s.itemCount > 0)
                      .map((stat) => (
                        <TableRow key={stat.category.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <CategoryIcon categoryName={stat.category.name} size="sm" />
                              <span className="font-medium">{stat.category.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{stat.itemCount}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Przedmiot</TableHead>
                      <TableHead>Nr seryjny</TableHead>
                      <TableHead>Właściciel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredByCategory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <CategoryIcon categoryName={item.category?.name} size="sm" />
                            <span className="font-medium">{item.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.serial_number || '-'}</TableCell>
                        <TableCell>
                          {item.current_owner
                            ? `${item.current_owner.first_name} ${item.current_owner.last_name}`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import/Export */}
        <TabsContent value="import-export" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Import */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import danych
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Importuj przedmioty z pliku CSV lub Excel. System automatycznie
                  rozpozna kolumny i utworzy brakujące kategorie.
                </p>
                <Button onClick={() => setIsImportOpen(true)} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Importuj przedmioty
                </Button>
              </CardContent>
            </Card>

            {/* Export pojedynczych tabel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Eksport tabel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleExportTable('items')}
                  disabled={isExporting !== null}
                >
                  {isExporting === 'items' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Eksportuj przedmioty (CSV)
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleExportTable('employees')}
                  disabled={isExporting !== null}
                >
                  {isExporting === 'employees' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Eksportuj pracowników (CSV)
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleExportTable('categories')}
                  disabled={isExporting !== null}
                >
                  {isExporting === 'categories' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Eksportuj kategorie (CSV)
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Pełny backup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileArchive className="h-5 w-5" />
                Pełny backup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Pobierz pełną kopię wszystkich danych w formacie ZIP. Zawiera przedmioty,
                pracowników, kategorie oraz historię zmian właścicieli.
              </p>
              <Button
                onClick={handleExportAll}
                disabled={isExporting !== null}
                className="w-full sm:w-auto"
              >
                {isExporting === 'all' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileArchive className="h-4 w-4 mr-2" />
                )}
                Pobierz pełny backup (ZIP)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={() => revalidateAll()}
      />
    </div>
  )
}
