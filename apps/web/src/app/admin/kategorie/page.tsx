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
import { useToast } from '@/components/ui/use-toast'
import { TableSkeleton } from '@/components/TableSkeleton'
import { CategoryIcon } from '@/components/CategoryIcon'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kategorie</h1>
          <p className="text-muted-foreground mt-1">
            Zarządzaj kategoriami przedmiotów
          </p>
        </div>
        <Button onClick={openAddDialog}>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
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
