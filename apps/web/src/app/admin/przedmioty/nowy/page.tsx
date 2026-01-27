'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import type { Category, Employee } from '@/lib/types'
import { revalidateItems } from '@/lib/hooks'

export default function NewItemPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const [categories, setCategories] = useState<Category[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

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
  }, [])

  async function loadData() {
    const [categoriesRes, employeesRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('employees').select('*').order('last_name'),
    ])

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

    const { error } = await supabase.from('items').insert({
      name: formData.name.trim(),
      category_id: formData.category_id || null,
      serial_number: formData.serial_number.trim() || null,
      current_owner_id: formData.current_owner_id || null,
      photo_url: photoData.photo_url,
      photo_storage_path: photoData.photo_storage_path,
    })

    if (error) {
      toast({
        title: 'Błąd',
        description: 'Nie udało się dodać przedmiotu',
        variant: 'destructive',
      })
      setIsSaving(false)
      return
    }

    toast({
      title: 'Sukces',
      description: 'Przedmiot został dodany',
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/przedmioty">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nowy przedmiot</h1>
          <p className="text-muted-foreground mt-1">
            Dodaj nowy przedmiot do inwentarza
          </p>
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
                placeholder="np. Laptop Dell XPS 15"
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
                placeholder="np. SN123456789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner">Właściciel</Label>
              <Select
                value={formData.current_owner_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, current_owner_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz właściciela (opcjonalnie)" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name}
                      {emp.department && ` (${emp.department})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Zdjęcie</Label>
              <PhotoUpload
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
                Dodaj przedmiot
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
