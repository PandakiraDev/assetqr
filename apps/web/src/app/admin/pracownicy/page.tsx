'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useEmployees, usePagination, revalidateEmployees } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import { TableSkeleton } from '@/components/TableSkeleton'
import { Pagination } from '@/components/ui/pagination'
import { Plus, Pencil, Trash2, Loader2, Search, User, MoreVertical, Mail, Phone, Building } from 'lucide-react'
import type { Employee, EmployeeFormData } from '@/lib/types'

const ITEMS_PER_PAGE = 10

export default function EmployeesPage() {
  const { data: employees, error, isLoading, mutate } = useEmployees()

  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)
  const [formData, setFormData] = useState<EmployeeFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  const { toast } = useToast()
  const supabase = createClient()

  // Filtrowanie pracowników
  const filteredEmployees = useMemo(() => {
    if (!employees) return []

    if (!searchQuery) return employees

    const query = searchQuery.toLowerCase()
    return employees.filter(
      (e) =>
        e.first_name.toLowerCase().includes(query) ||
        e.last_name.toLowerCase().includes(query) ||
        e.email?.toLowerCase().includes(query) ||
        e.department?.toLowerCase().includes(query)
    )
  }, [employees, searchQuery])

  // Paginacja
  const { totalItems, totalPages, getPageItems } = usePagination(filteredEmployees, ITEMS_PER_PAGE)
  const paginatedEmployees = getPageItems(currentPage)

  // Reset strony przy zmianie wyszukiwania
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  function openAddDialog() {
    setEditingEmployee(null)
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      department: '',
    })
    setIsDialogOpen(true)
  }

  function openEditDialog(employee: Employee) {
    setEditingEmployee(employee)
    setFormData({
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email || '',
      phone: employee.phone || '',
      department: employee.department || '',
    })
    setIsDialogOpen(true)
  }

  function openDeleteDialog(employee: Employee) {
    setEmployeeToDelete(employee)
    setIsDeleteDialogOpen(true)
  }

  async function handleSave() {
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast({
        title: 'Błąd',
        description: 'Imię i nazwisko są wymagane',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)

    const payload = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      email: formData.email?.trim() || null,
      phone: formData.phone?.trim() || null,
      department: formData.department?.trim() || null,
    }

    if (editingEmployee) {
      const { error } = await supabase
        .from('employees')
        .update(payload)
        .eq('id', editingEmployee.id)

      if (error) {
        toast({
          title: 'Błąd',
          description: error.message.includes('unique')
            ? 'Pracownik z tym adresem email już istnieje'
            : 'Nie udało się zaktualizować pracownika',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Sukces',
          description: 'Dane pracownika zostały zaktualizowane',
        })
        setIsDialogOpen(false)
        revalidateEmployees()
      }
    } else {
      const { error } = await supabase.from('employees').insert(payload)

      if (error) {
        toast({
          title: 'Błąd',
          description: error.message.includes('unique')
            ? 'Pracownik z tym adresem email już istnieje'
            : 'Nie udało się dodać pracownika',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Sukces',
          description: 'Pracownik został dodany',
        })
        setIsDialogOpen(false)
        revalidateEmployees()
      }
    }

    setIsSaving(false)
  }

  async function handleDelete() {
    if (!employeeToDelete) return

    // Sprawdź czy pracownik ma przypisane przedmioty
    const { count } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('current_owner_id', employeeToDelete.id)

    if (count && count > 0) {
      toast({
        title: 'Nie można usunąć',
        description: `Ten pracownik ma przypisane ${count} przedmiotów. Najpierw przepisz przedmioty na innego pracownika.`,
        variant: 'destructive',
      })
      setIsDeleteDialogOpen(false)
      setEmployeeToDelete(null)
      return
    }

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', employeeToDelete.id)

    if (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć pracownika',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Sukces',
        description: 'Pracownik został usunięty',
      })
      revalidateEmployees()
    }

    setIsDeleteDialogOpen(false)
    setEmployeeToDelete(null)
  }

  // Komponent karty pracownika dla mobile
  const EmployeeCard = ({ employee }: { employee: Employee }) => (
    <div className="p-4 border-b last:border-b-0">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium">
            {employee.first_name} {employee.last_name}
          </p>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            {employee.email && (
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">{employee.email}</span>
              </p>
            )}
            {employee.phone && (
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                {employee.phone}
              </p>
            )}
            {employee.department && (
              <p className="flex items-center gap-2">
                <Building className="h-3.5 w-3.5" />
                {employee.department}
              </p>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditDialog(employee)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edytuj
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openDeleteDialog(employee)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Usuń
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Pracownicy</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Zarządzaj listą pracowników
          </p>
        </div>
        <Button onClick={openAddDialog} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Dodaj pracownika
        </Button>
      </div>

      {/* Wyszukiwarka */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Szukaj pracownika..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        {isLoading ? (
          <TableSkeleton
            columns={5}
            rows={ITEMS_PER_PAGE}
            headers={['Imię i nazwisko', 'Email', 'Telefon', 'Dział', 'Akcje']}
          />
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            Błąd ładowania danych. Spróbuj odświeżyć stronę.
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery
              ? 'Nie znaleziono pracowników'
              : 'Brak pracowników. Dodaj pierwszego pracownika.'}
          </div>
        ) : (
          <>
            {/* Desktop: Tabela */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imię i nazwisko</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Dział</TableHead>
                    <TableHead className="w-[100px]">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">
                            {employee.first_name} {employee.last_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{employee.email || '-'}</TableCell>
                      <TableCell>{employee.phone || '-'}</TableCell>
                      <TableCell>{employee.department || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(employee)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(employee)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: Karty */}
            <div className="md:hidden">
              {paginatedEmployees.map((employee) => (
                <EmployeeCard key={employee.id} employee={employee} />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </div>

      {/* Dialog dodawania/edycji */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? 'Edytuj pracownika' : 'Dodaj pracownika'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Imię *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) =>
                    setFormData({ ...formData, first_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nazwisko *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) =>
                    setFormData({ ...formData, last_name: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Dział</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingEmployee ? 'Zapisz' : 'Dodaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog potwierdzenia usunięcia */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć?</AlertDialogTitle>
            <AlertDialogDescription>
              Pracownik {employeeToDelete?.first_name} {employeeToDelete?.last_name} zostanie
              trwale usunięty. Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
