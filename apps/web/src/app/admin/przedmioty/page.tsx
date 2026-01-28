'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useItems, useCategories, usePagination, revalidateItems } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Checkbox } from '@/components/ui/checkbox'
import { QRGenerator } from '@/components/QRGenerator'
import { BulkQRGenerator } from '@/components/BulkQRGenerator'
import { CategoryIcon } from '@/components/CategoryIcon'
import { TableSkeleton } from '@/components/TableSkeleton'
import { Pagination } from '@/components/ui/pagination'
import {
  Plus,
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  QrCode,
  Search,
  History,
  X,
  MoreVertical,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Item, Category, Employee } from '@/lib/types'

type ItemWithRelations = Item & {
  category: Category | null
  current_owner: Employee | null
}

const ITEMS_PER_PAGE = 10

export default function ItemsPage() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status') || 'active'

  const { data: items, error: itemsError, isLoading: itemsLoading, mutate: mutateItems } = useItems()
  const { data: categories } = useCategories()

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus)
  const [currentPage, setCurrentPage] = useState(1)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ItemWithRelations | null>(null)
  const [qrItem, setQrItem] = useState<ItemWithRelations | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [isBulkQROpen, setIsBulkQROpen] = useState(false)

  const { toast } = useToast()
  const supabase = createClient()

  // Filtrowanie przedmiotów
  const filteredItems = useMemo(() => {
    if (!items) return []

    let filtered = [...items] as ItemWithRelations[]

    // Filtr statusu
    if (statusFilter === 'active') {
      filtered = filtered.filter((item) => !item.is_archived)
    } else if (statusFilter === 'archived') {
      filtered = filtered.filter((item) => item.is_archived)
    } else if (statusFilter === 'available') {
      filtered = filtered.filter((item) => !item.is_archived && !item.current_owner_id)
    } else if (statusFilter === 'assigned') {
      filtered = filtered.filter((item) => !item.is_archived && item.current_owner_id)
    }

    // Filtr kategorii
    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter((item) => item.category_id === categoryFilter)
    }

    // Wyszukiwanie
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.serial_number?.toLowerCase().includes(query) ||
          item.current_owner?.first_name.toLowerCase().includes(query) ||
          item.current_owner?.last_name.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [items, searchQuery, categoryFilter, statusFilter])

  // Paginacja
  const { totalItems, totalPages, getPageItems } = usePagination(filteredItems, ITEMS_PER_PAGE)
  const paginatedItems = getPageItems(currentPage)

  // Reset strony przy zmianie filtrów
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, categoryFilter, statusFilter])

  async function handleArchive(item: ItemWithRelations) {
    const { error } = await supabase
      .from('items')
      .update({ is_archived: !item.is_archived })
      .eq('id', item.id)

    if (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zmienić statusu przedmiotu',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Sukces',
        description: item.is_archived ? 'Przedmiot przywrócony' : 'Przedmiot zarchiwizowany',
      })
      revalidateItems()
    }
  }

  async function handleDelete() {
    if (!itemToDelete) return

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemToDelete.id)

    if (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć przedmiotu',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Sukces',
        description: 'Przedmiot został usunięty',
      })
      revalidateItems()
    }

    setIsDeleteDialogOpen(false)
    setItemToDelete(null)
  }

  function getStatusBadge(item: ItemWithRelations) {
    if (item.is_archived) {
      return <Badge variant="secondary">Zarchiwizowany</Badge>
    }
    if (item.current_owner_id) {
      return <Badge variant="default">Przypisany</Badge>
    }
    return <Badge variant="success">Wolny</Badge>
  }

  // Funkcje zaznaczania
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(paginatedItems.map((item) => item.id)))
    } else {
      setSelectedItems(new Set())
    }
  }

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(itemId)
    } else {
      newSelected.delete(itemId)
    }
    setSelectedItems(newSelected)
  }

  const isAllSelected = paginatedItems.length > 0 && paginatedItems.every((item) => selectedItems.has(item.id))
  const isSomeSelected = selectedItems.size > 0

  const getSelectedItemsData = () => {
    return filteredItems.filter((item) => selectedItems.has(item.id))
  }

  // Komponent karty przedmiotu dla mobile
  const ItemCard = ({ item }: { item: ItemWithRelations }) => (
    <div
      className={`p-4 border-b last:border-b-0 ${selectedItems.has(item.id) ? 'bg-primary/5' : ''}`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selectedItems.has(item.id)}
          onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <CategoryIcon categoryName={item.category?.name} size="sm" />
            <span className="font-medium truncate">{item.name}</span>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            {item.category && (
              <p>Kategoria: {item.category.name}</p>
            )}
            {item.serial_number && (
              <p className="font-mono">Nr: {item.serial_number}</p>
            )}
            {item.current_owner && (
              <p>Właściciel: {item.current_owner.first_name} {item.current_owner.last_name}</p>
            )}
          </div>
          <div className="mt-2">
            {getStatusBadge(item)}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setQrItem(item)}>
              <QrCode className="h-4 w-4 mr-2" />
              Generuj QR
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/admin/przedmioty/${item.id}`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edytuj
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/admin/przedmioty/${item.id}/historia`}>
                <History className="h-4 w-4 mr-2" />
                Historia
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleArchive(item)}>
              {item.is_archived ? (
                <>
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  Przywróć
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Archiwizuj
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setItemToDelete(item)
                setIsDeleteDialogOpen(true)
              }}
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
          <h1 className="text-2xl sm:text-3xl font-bold">Przedmioty</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Zarządzaj przedmiotami inwentarza
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/admin/przedmioty/nowy">
            <Plus className="h-4 w-4 mr-2" />
            Dodaj przedmiot
          </Link>
        </Button>
      </div>

      {/* Filtry */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="flex-1 sm:w-[200px] sm:flex-none">
              <SelectValue placeholder="Kategoria" />
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 sm:w-[180px] sm:flex-none">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="active">Aktywne</SelectItem>
              <SelectItem value="available">Wolne</SelectItem>
              <SelectItem value="assigned">Przypisane</SelectItem>
              <SelectItem value="archived">Zarchiwizowane</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pasek zaznaczenia */}
      {isSomeSelected && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium">
            Zaznaczono {selectedItems.size} przedmiotów
          </span>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              onClick={() => setIsBulkQROpen(true)}
              className="flex-1 sm:flex-none"
            >
              <QrCode className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Generuj QR dla wybranych</span>
              <span className="sm:hidden">Generuj QR</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedItems(new Set())}
            >
              <X className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Odznacz</span>
            </Button>
          </div>
        </div>
      )}

      <div className="bg-card rounded-lg border shadow-sm">
        {itemsLoading ? (
          <TableSkeleton
            columns={6}
            rows={ITEMS_PER_PAGE}
            headers={['Nazwa', 'Kategoria', 'Nr seryjny', 'Właściciel', 'Status', 'Akcje']}
          />
        ) : itemsError ? (
          <div className="text-center py-8 text-destructive">
            Błąd ładowania danych. Spróbuj odświeżyć stronę.
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {items?.length === 0
              ? 'Brak przedmiotów. Dodaj pierwszy przedmiot.'
              : 'Nie znaleziono przedmiotów spełniających kryteria.'}
          </div>
        ) : (
          <>
            {/* Desktop: Tabela */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Nazwa</TableHead>
                    <TableHead>Kategoria</TableHead>
                    <TableHead>Nr seryjny</TableHead>
                    <TableHead>Właściciel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[150px]">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item) => (
                    <TableRow key={item.id} className={selectedItems.has(item.id) ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <CategoryIcon categoryName={item.category?.name} size="sm" />
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.category?.name || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{item.serial_number || '-'}</TableCell>
                      <TableCell>
                        {item.current_owner
                          ? `${item.current_owner.first_name} ${item.current_owner.last_name}`
                          : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(item)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setQrItem(item)}
                            title="Generuj QR"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="Edytuj"
                          >
                            <Link href={`/admin/przedmioty/${item.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="Historia"
                          >
                            <Link href={`/admin/przedmioty/${item.id}/historia`}>
                              <History className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleArchive(item)}
                            title={item.is_archived ? 'Przywróć' : 'Archiwizuj'}
                          >
                            {item.is_archived ? (
                              <ArchiveRestore className="h-4 w-4" />
                            ) : (
                              <Archive className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setItemToDelete(item)
                              setIsDeleteDialogOpen(true)
                            }}
                            title="Usuń"
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
              <div className="p-3 border-b bg-muted/30 flex items-center gap-3">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">Zaznacz wszystkie</span>
              </div>
              {paginatedItems.map((item) => (
                <ItemCard key={item.id} item={item} />
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

      {/* QR Generator Dialog */}
      {qrItem && (
        <QRGenerator
          itemId={qrItem.id}
          itemName={qrItem.name}
          isOpen={!!qrItem}
          onClose={() => setQrItem(null)}
        />
      )}

      {/* Bulk QR Generator */}
      <BulkQRGenerator
        items={getSelectedItemsData()}
        isOpen={isBulkQROpen}
        onClose={() => setIsBulkQROpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć?</AlertDialogTitle>
            <AlertDialogDescription>
              Przedmiot &quot;{itemToDelete?.name}&quot; zostanie trwale usunięty wraz
              z całą historią zmian. Tej operacji nie można cofnąć.
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
