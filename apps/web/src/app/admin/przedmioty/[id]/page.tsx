'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { PhotoUpload } from '@/components/PhotoUpload'
import type { Category, Employee, Item } from '@/lib/types'
import { revalidateItems } from '@/lib/hooks'

export default function EditItemPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const supabase = createClient()
  const itemId = params.id as string

  const [item, setItem] = useState<Item | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [changeReason, setChangeReason] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    serial_number: '',
    current_owner_id: '',
  })
  const [photoData, setPhotoData] = useState<{
    photo_url: string | null
    photo_storage_path: string | null
  }>({
    photo_url: null,
    photo_storage_path: null,
  })

  useEffect(() => {
    loadData()
  }, [itemId])

  async function loadData() {
    const [itemRes, categoriesRes, employeesRes] = await Promise.all([
      supabase.from('items').select('*').eq('id', itemId).single(),
      supabase.from('categories').select('*').order('name'),
      supabase.from('employees').select('*').order('last_name'),
    ])

    if (itemRes.error || !itemRes.data) {
      toast({
        title: 'Błąd',
        description: 'Nie znaleziono przedmiotu',
        variant: 'destructive',
      })
      router.push('/admin/przedmioty')
      return
    }

    setItem(itemRes.data)
    setFormData({
      name: itemRes.data.name,
      category_id: itemRes.data.category_id || '',
      serial_number: itemRes.data.serial_number || '',
      current_owner_id: itemRes.data.current_owner_id || '',
    })
    setPhotoData({
      photo_url: itemRes.data.photo_url || null,
      photo_storage_path: itemRes.data.photo_storage_path || null,
    })

    if (!categoriesRes.error) {
      setCategories(categoriesRes.data || [])
    }
    if (!employeesRes.error) {
      setEmployees(employeesRes.data || [])
    }

    setIsLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: 'Błąd',
        description: 'Nazwa przedmiotu jest wymagana',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)

    const newOwnerId = formData.current_owner_id || null
    const oldOwnerId = item?.current_owner_id || null
    const ownerChanged = newOwnerId !== oldOwnerId

    // Aktualizuj przedmiot
    const { error } = await supabase
      .from('items')
      .update({
        name: formData.name.trim(),
        category_id: formData.category_id || null,
        serial_number: formData.serial_number.trim() || null,
        current_owner_id: newOwnerId,
        photo_url: photoData.photo_url,
        photo_storage_path: photoData.photo_storage_path,
      })
      .eq('id', itemId)

    if (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się zaktualizować przedmiotu',
        variant: 'destructive',
      })
      setIsSaving(false)
      return
    }

    // Jeśli zmienił się właściciel, dodaj wpis do historii
    if (ownerChanged) {
      const { data: { user } } = await supabase.auth.getUser()

      await supabase.from('ownership_history').insert({
        item_id: itemId,
        previous_owner_id: oldOwnerId,
        new_owner_id: newOwnerId,
        changed_by: user?.id || null,
        reason: changeReason.trim() || null,
      })
    }

    toast({
      title: 'Sukces',
      description: 'Przedmiot został zaktualizowany',
    })
    revalidateItems()
    router.push('/admin/przedmioty')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  const ownerChanged =
    (formData.current_owner_id || null) !== (item?.current_owner_id || null)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/przedmioty">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edycja przedmiotu</h1>
          <p className="text-muted-foreground mt-1">{item?.name}</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dane przedmiotu</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategoria</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, category_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz kategorię" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serial_number">Numer seryjny / inwentarzowy</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                onChange={(e) =>
                  setFormData({ ...formData, serial_number: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner">Właściciel</Label>
              <Select
                value={formData.current_owner_id || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, current_owner_id: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Brak właściciela" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak właściciela</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                      {emp.department && ` (${emp.department})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {ownerChanged && (
              <div className="space-y-2 p-4 bg-amber-100 dark:bg-amber-900/30 rounded-lg border border-amber-300 dark:border-amber-700">
                <Label htmlFor="reason" className="text-amber-900 dark:text-amber-100">
                  Powód zmiany właściciela (opcjonalnie)
                </Label>
                <Textarea
                  id="reason"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="np. Przekazanie sprzętu nowemu pracownikowi"
                  rows={2}
                />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Zmiana właściciela zostanie zapisana w historii przedmiotu.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Zdjęcie</Label>
              <PhotoUpload
                itemId={itemId}
                currentPhotoUrl={photoData.photo_url}
                currentStoragePath={photoData.photo_storage_path}
                onPhotoChange={(url, path) =>
                  setPhotoData({ photo_url: url, photo_storage_path: path })
                }
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Zapisz zmiany
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/przedmioty">Anuluj</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
