import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, User, Tag, Hash, Calendar } from 'lucide-react'
import type { Metadata } from 'next'

interface PageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createServerSupabaseClient()
  const { data: item } = await supabase
    .from('items')
    .select('name')
    .eq('id', params.id)
    .single()

  return {
    title: item ? `${item.name} - AssetQR` : 'Przedmiot nie znaleziony - AssetQR',
    description: 'Informacje o przedmiocie inwentarza',
  }
}

export default async function PublicItemPage({ params }: PageProps) {
  const supabase = createServerSupabaseClient()

  const { data: item, error } = await supabase
    .from('items')
    .select(
      `
      *,
      category:categories(*),
      current_owner:employees(*)
    `
    )
    .eq('id', params.id)
    .single()

  if (error || !item) {
    notFound()
  }

  const category = item.category as { name: string } | null
  const owner = item.current_owner as {
    first_name: string
    last_name: string
    department: string | null
  } | null

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary">AssetQR</h1>
          <p className="text-sm text-muted-foreground">
            System zarządzania inwentarzem
          </p>
        </div>

        <Card className="shadow-soft">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <CardTitle className="text-xl">{item.name}</CardTitle>
              {item.is_archived ? (
                <Badge variant="secondary">Zarchiwizowany</Badge>
              ) : owner ? (
                <Badge variant="default">Przypisany</Badge>
              ) : (
                <Badge variant="success">Wolny</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Zdjęcie przedmiotu */}
            {item.photo_url && (
              <div className="aspect-video relative rounded-lg overflow-hidden border bg-muted mb-4">
                <img
                  src={item.photo_url}
                  alt={item.name}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Kategoria */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kategoria</p>
                <p className="font-medium text-foreground">{category?.name || 'Brak kategorii'}</p>
              </div>
            </div>

            {/* Numer seryjny */}
            {item.serial_number && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Hash className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nr seryjny</p>
                  <p className="font-medium font-mono text-foreground">{item.serial_number}</p>
                </div>
              </div>
            )}

            {/* Właściciel */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                <User className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Właściciel</p>
                {owner ? (
                  <>
                    <p className="font-medium text-foreground">
                      {owner.first_name} {owner.last_name}
                    </p>
                    {owner.department && (
                      <p className="text-xs text-muted-foreground">
                        {owner.department}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="font-medium text-muted-foreground">
                    Nieprzypisany
                  </p>
                )}
              </div>
            </div>

            {/* Data ostatniej aktualizacji */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Ostatnia aktualizacja
                </p>
                <p className="font-medium text-foreground">
                  {new Date(item.updated_at).toLocaleDateString('pl-PL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* ID przedmiotu */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Package className="h-3 w-3" />
                <span>ID: {item.id}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Zeskanuj kod QR na przedmiocie, aby wyświetlić jego dane.
        </p>
      </div>
    </div>
  )
}
