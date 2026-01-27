'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Loader2, ArrowRight } from 'lucide-react'
import type { Item, OwnershipHistory, Employee } from '@/lib/types'

type HistoryWithRelations = OwnershipHistory & {
  previous_owner: Employee | null
  new_owner: Employee | null
}

export default function ItemHistoryPage() {
  const params = useParams()
  const { toast } = useToast()
  const supabase = createClient()
  const itemId = params.id as string

  const [item, setItem] = useState<Item | null>(null)
  const [history, setHistory] = useState<HistoryWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [itemId])

  async function loadData() {
    const [itemRes, historyRes] = await Promise.all([
      supabase
        .from('items')
        .select('*, category:categories(*), current_owner:employees(*)')
        .eq('id', itemId)
        .single(),
      supabase
        .from('ownership_history')
        .select(
          '*, previous_owner:employees!ownership_history_previous_owner_id_fkey(*), new_owner:employees!ownership_history_new_owner_id_fkey(*)'
        )
        .eq('item_id', itemId)
        .order('changed_at', { ascending: false }),
    ])

    if (itemRes.error || !itemRes.data) {
      toast({
        title: 'Błąd',
        description: 'Nie znaleziono przedmiotu',
        variant: 'destructive',
      })
      return
    }

    setItem(itemRes.data)

    if (!historyRes.error) {
      setHistory(historyRes.data || [])
    }

    setIsLoading(false)
  }

  function formatOwner(owner: Employee | null): string {
    if (!owner) return 'Brak właściciela'
    return `${owner.first_name} ${owner.last_name}`
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
          <h1 className="text-3xl font-bold">Historia zmian</h1>
          <p className="text-muted-foreground mt-1">{item?.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informacje o przedmiocie</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Nazwa</dt>
              <dd className="font-medium">{item?.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Kategoria</dt>
              <dd className="font-medium">
                {(item as any)?.category?.name || '-'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Nr seryjny</dt>
              <dd className="font-medium">{item?.serial_number || '-'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Aktualny właściciel</dt>
              <dd className="font-medium">
                {(item as any)?.current_owner
                  ? `${(item as any).current_owner.first_name} ${(item as any).current_owner.last_name}`
                  : 'Brak'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historia zmian właściciela</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Brak historii zmian dla tego przedmiotu.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data zmiany</TableHead>
                  <TableHead>Poprzedni właściciel</TableHead>
                  <TableHead></TableHead>
                  <TableHead>Nowy właściciel</TableHead>
                  <TableHead>Powód</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {new Date(entry.changed_at).toLocaleString('pl-PL', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </TableCell>
                    <TableCell>{formatOwner(entry.previous_owner)}</TableCell>
                    <TableCell>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell>{formatOwner(entry.new_owner)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {entry.reason || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
