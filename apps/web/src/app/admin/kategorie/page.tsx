'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useCategories, revalidateCategories } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { CategoryIcon } from '@/components/CategoryIcon'
import { Plus, Pencil, Trash2, Loader2, MoreVertical, Calendar } from 'lucide-react'
import type { Category } from '@/lib/types'

export default function CategoriesPage() {
  const { data: categories, error, isLoading, mutate } = useCategories()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  function openAddDialog() {
    setEditingCategory(null)
    setCategoryName('')
    setIsDialogOpen(true)
  }

  function openEditDialog(category: Category) {
    setEditingCategory(category)
    setCategoryName(category.name)
    setIsDialogOpen(true)
  }

  function openDeleteDialog(category: Category) {
    setCategoryToDelete(category)
    setIsDeleteDialogOpen(true)
  }

  async function handleSave() {
    if (!categoryName.trim()) {
      toast({
        title: 'Błąd',
        description: 'Nazwa kategorii nie może być pusta',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)

    if (editingCategory) {
      // Edycja
      const { error } = await supabase
        .from('categories')
        .update({ name: categoryName.trim() })
        .eq('id', editingCategory.id)

      if (error) {
        toast({
          title: 'Błąd',
          description: error.message.includes('unique')
            ? 'Kategoria o tej nazwie już istnieje'
            : 'Nie udało się zaktualizować kategorii',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Sukces',
          description: 'Kategoria została zaktualizowana',
        })
        setIsDialogOpen(false)
        revalidateCategories()
      }
    } else {
      // Dodawanie
      const { error } = await supabase
        .from('categories')
        .insert({ name: categoryName.trim() })

      if (error) {
        toast({
          title: 'Błąd',
          description: error.message.includes('unique')
            ? 'Kategoria o tej nazwie już istnieje'
            : 'Nie udało się dodać kategorii',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Sukces',
          description: 'Kategoria została dodana',
        })
        setIsDialogOpen(false)
        revalidateCategories()
      }
    }

    setIsSaving(false)
  }

  async function handleDelete() {
    if (!categoryToDelete) return

    // Sprawdź czy kategoria jest używana
    const { count } = await supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryToDelete.id)

    if (count && count > 0) {
      toast({
        title: 'Nie można usunąć',
        description: `Ta kategoria jest przypisana do ${count} przedmiotów`,
        variant: 'destructive',
      })
      setIsDeleteDialogOpen(false)
      setCategoryToDelete(null)
      return
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryToDelete.id)

    if (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć kategorii',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Sukces',
        description: 'Kategoria została usunięta',
      })
      revalidateCategories()
    }

    setIsDeleteDialogOpen(false)
    setCategoryToDelete(null)
  }

  // Komponent karty kategorii dla mobile
  const CategoryCard = ({ category }: { category: Category }) => (
    <div className="p-4 border-b last:border-b-0">
      <div className="flex items-start gap-3">
        <CategoryIcon categoryName={category.name} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{category.name}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(category.created_at).toLocaleDateString('pl-PL')}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditDialog(category)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edytuj
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => openDeleteDialog(category)}
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
          <h1 className="text-2xl sm:text-3xl font-bold">Kategorie</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Zarządzaj kategoriami przedmiotów
          </p>
        </div>
        <Button onClick={openAddDialog} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Dodaj kategorię
        </Button>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        {isLoading ? (
          <TableSkeleton
            columns={3}
            rows={8}
            headers={['Nazwa', 'Data utworzenia', 'Akcje']}
          />
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            Błąd ładowania danych. Spróbuj odświeżyć stronę.
          </div>
        ) : !categories || categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Brak kategorii. Dodaj pierwszą kategorię.
          </div>
        ) : (
          <>
            {/* Desktop: Tabela */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nazwa</TableHead>
                    <TableHead>Data utworzenia</TableHead>
                    <TableHead className="w-[100px]">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <CategoryIcon categoryName={category.name} size="sm" />
                          <span className="font-medium">{category.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(category.created_at).toLocaleDateString('pl-PL')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(category)}
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
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Dialog dodawania/edycji */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edytuj kategorię' : 'Dodaj kategorię'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nazwa kategorii"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto">
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingCategory ? 'Zapisz' : 'Dodaj'}
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
              Kategoria &quot;{categoryToDelete?.name}&quot; zostanie trwale usunięta.
              Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
