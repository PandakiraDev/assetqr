import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase'
import type { Item, Employee, Category, OwnershipHistory } from '@/lib/types'

// Typy dla importu
export interface ParsedRow {
  name: string
  category?: string
  serial_number?: string
  owner_email?: string
}

export interface ImportResult {
  success: number
  errors: { row: number; message: string }[]
  skipped: number
}

export interface ColumnMapping {
  name: string | null
  category: string | null
  serial_number: string | null
  owner_email: string | null
}

// Wykryj kolumny na podstawie nagłówków
export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    name: null,
    category: null,
    serial_number: null,
    owner_email: null,
  }

  const namePatterns = ['nazwa', 'name', 'przedmiot', 'item']
  const categoryPatterns = ['kategoria', 'category', 'typ', 'type']
  const serialPatterns = ['numer', 'serial', 'nr', 'sn', 'inwentarzowy', 'seryjny']
  const ownerPatterns = ['właściciel', 'owner', 'email', 'pracownik', 'employee']

  headers.forEach((header) => {
    const headerLower = header.toLowerCase().trim()

    if (namePatterns.some((p) => headerLower.includes(p)) && !mapping.name) {
      mapping.name = header
    }
    if (categoryPatterns.some((p) => headerLower.includes(p)) && !mapping.category) {
      mapping.category = header
    }
    if (serialPatterns.some((p) => headerLower.includes(p)) && !mapping.serial_number) {
      mapping.serial_number = header
    }
    if (ownerPatterns.some((p) => headerLower.includes(p)) && !mapping.owner_email) {
      mapping.owner_email = header
    }
  })

  return mapping
}

// Parsowanie CSV
export function parseCSV(content: string): { headers: string[]; data: Record<string, string>[] } {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  })

  return {
    headers: result.meta.fields || [],
    data: result.data,
  }
}

// Parsowanie Excel
export function parseExcel(buffer: ArrayBuffer): { headers: string[]; data: Record<string, string>[] } {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheet]

  const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: false,
  })

  if (rawData.length === 0) {
    return { headers: [], data: [] }
  }

  const firstRow = rawData[0] as unknown[]
  const headers = firstRow.map((h) => String(h || '').trim())
  const data = rawData.slice(1).map((row) => {
    const rowArray = row as unknown[]
    const rowData: Record<string, string> = {}
    headers.forEach((header, index) => {
      rowData[header] = String(rowArray[index] || '').trim()
    })
    return rowData
  })

  return { headers, data }
}

// Import przedmiotów
export async function importItems(
  data: Record<string, string>[],
  mapping: ColumnMapping
): Promise<ImportResult> {
  const supabase = createClient()
  const result: ImportResult = {
    success: 0,
    errors: [],
    skipped: 0,
  }

  // Pobierz istniejące kategorie i pracowników
  const [categoriesRes, employeesRes] = await Promise.all([
    supabase.from('categories').select('*'),
    supabase.from('employees').select('*'),
  ])

  const categories = categoriesRes.data || []
  const employees = employeesRes.data || []

  // Mapa kategorii (nazwa -> id)
  const categoryMap = new Map<string, string>()
  categories.forEach((cat) => {
    categoryMap.set(cat.name.toLowerCase(), cat.id)
  })

  // Mapa pracowników (email -> id)
  const employeeMap = new Map<string, string>()
  employees.forEach((emp) => {
    if (emp.email) {
      employeeMap.set(emp.email.toLowerCase(), emp.id)
    }
  })

  // Przetwarzaj każdy wiersz
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const rowNum = i + 2 // +2 bo nagłówek to 1, a indeksy zaczynają się od 0

    try {
      // Sprawdź wymagane pole - nazwa
      const name = mapping.name ? row[mapping.name]?.trim() : null
      if (!name) {
        result.errors.push({ row: rowNum, message: 'Brak nazwy przedmiotu' })
        continue
      }

      // Znajdź kategorię
      let categoryId: string | null = null
      if (mapping.category && row[mapping.category]) {
        const catName = row[mapping.category].trim().toLowerCase()
        categoryId = categoryMap.get(catName) || null

        // Jeśli kategoria nie istnieje, utwórz ją
        if (!categoryId && catName) {
          const { data: newCat, error: catError } = await supabase
            .from('categories')
            .insert({ name: row[mapping.category].trim() })
            .select()
            .single()

          if (!catError && newCat) {
            categoryId = newCat.id
            categoryMap.set(catName, newCat.id)
          }
        }
      }

      // Znajdź właściciela
      let ownerId: string | null = null
      if (mapping.owner_email && row[mapping.owner_email]) {
        const email = row[mapping.owner_email].trim().toLowerCase()
        ownerId = employeeMap.get(email) || null
      }

      // Numer seryjny
      const serialNumber = mapping.serial_number
        ? row[mapping.serial_number]?.trim() || null
        : null

      // Dodaj przedmiot
      const { error } = await supabase.from('items').insert({
        name,
        category_id: categoryId,
        serial_number: serialNumber,
        current_owner_id: ownerId,
      })

      if (error) {
        result.errors.push({ row: rowNum, message: error.message })
      } else {
        result.success++
      }
    } catch (error) {
      result.errors.push({
        row: rowNum,
        message: error instanceof Error ? error.message : 'Nieznany błąd',
      })
    }
  }

  return result
}

// Eksport wszystkich danych
export async function exportAllData(): Promise<Blob> {
  const supabase = createClient()
  const JSZip = (await import('jszip')).default

  // Pobierz wszystkie dane
  const [itemsRes, employeesRes, categoriesRes, historyRes] = await Promise.all([
    supabase
      .from('items')
      .select('*, category:categories(name), current_owner:employees(first_name, last_name, email)')
      .order('name'),
    supabase.from('employees').select('*').order('last_name'),
    supabase.from('categories').select('*').order('name'),
    supabase
      .from('ownership_history')
      .select(
        '*, item:items(name), previous_owner:employees!ownership_history_previous_owner_id_fkey(first_name, last_name), new_owner:employees!ownership_history_new_owner_id_fkey(first_name, last_name)'
      )
      .order('changed_at', { ascending: false }),
  ])

  const zip = new JSZip()

  // Eksport przedmiotów
  if (itemsRes.data) {
    const itemsCSV = generateCSV(
      itemsRes.data.map((item) => ({
        Nazwa: item.name,
        Kategoria: (item.category as { name: string } | null)?.name || '',
        'Nr seryjny': item.serial_number || '',
        Właściciel:
          item.current_owner
            ? `${(item.current_owner as { first_name: string; last_name: string }).first_name} ${(item.current_owner as { first_name: string; last_name: string }).last_name}`
            : '',
        'Email właściciela': (item.current_owner as { email?: string } | null)?.email || '',
        Status: item.is_archived ? 'Zarchiwizowany' : 'Aktywny',
        'Data dodania': new Date(item.created_at).toLocaleDateString('pl-PL'),
        'Ostatnia aktualizacja': new Date(item.updated_at).toLocaleDateString('pl-PL'),
      }))
    )
    zip.file('przedmioty.csv', '\ufeff' + itemsCSV)
  }

  // Eksport pracowników
  if (employeesRes.data) {
    const employeesCSV = generateCSV(
      employeesRes.data.map((emp) => ({
        Imię: emp.first_name,
        Nazwisko: emp.last_name,
        Email: emp.email || '',
        Telefon: emp.phone || '',
        Dział: emp.department || '',
        'Data dodania': new Date(emp.created_at).toLocaleDateString('pl-PL'),
      }))
    )
    zip.file('pracownicy.csv', '\ufeff' + employeesCSV)
  }

  // Eksport kategorii
  if (categoriesRes.data) {
    const categoriesCSV = generateCSV(
      categoriesRes.data.map((cat) => ({
        Nazwa: cat.name,
        'Data dodania': new Date(cat.created_at).toLocaleDateString('pl-PL'),
      }))
    )
    zip.file('kategorie.csv', '\ufeff' + categoriesCSV)
  }

  // Eksport historii
  if (historyRes.data) {
    const historyCSV = generateCSV(
      historyRes.data.map((h) => ({
        Przedmiot: (h.item as { name: string } | null)?.name || '',
        'Poprzedni właściciel':
          h.previous_owner
            ? `${(h.previous_owner as { first_name: string; last_name: string }).first_name} ${(h.previous_owner as { first_name: string; last_name: string }).last_name}`
            : '',
        'Nowy właściciel':
          h.new_owner
            ? `${(h.new_owner as { first_name: string; last_name: string }).first_name} ${(h.new_owner as { first_name: string; last_name: string }).last_name}`
            : '',
        Powód: h.reason || '',
        Data: new Date(h.changed_at).toLocaleString('pl-PL'),
      }))
    )
    zip.file('historia_zmian.csv', '\ufeff' + historyCSV)
  }

  return zip.generateAsync({ type: 'blob' })
}

// Eksport pojedynczej tabeli
export async function exportTable(
  table: 'items' | 'employees' | 'categories'
): Promise<string> {
  const supabase = createClient()

  switch (table) {
    case 'items': {
      const { data } = await supabase
        .from('items')
        .select(
          '*, category:categories(name), current_owner:employees(first_name, last_name, email)'
        )
        .order('name')

      if (!data) return ''

      return (
        '\ufeff' +
        generateCSV(
          data.map((item) => ({
            Nazwa: item.name,
            Kategoria: (item.category as { name: string } | null)?.name || '',
            'Nr seryjny': item.serial_number || '',
            Właściciel:
              item.current_owner
                ? `${(item.current_owner as { first_name: string; last_name: string }).first_name} ${(item.current_owner as { first_name: string; last_name: string }).last_name}`
                : '',
            'Email właściciela': (item.current_owner as { email?: string } | null)?.email || '',
            Status: item.is_archived ? 'Zarchiwizowany' : 'Aktywny',
            'Data dodania': new Date(item.created_at).toLocaleDateString('pl-PL'),
          }))
        )
      )
    }

    case 'employees': {
      const { data } = await supabase.from('employees').select('*').order('last_name')

      if (!data) return ''

      return (
        '\ufeff' +
        generateCSV(
          data.map((emp) => ({
            Imię: emp.first_name,
            Nazwisko: emp.last_name,
            Email: emp.email || '',
            Telefon: emp.phone || '',
            Dział: emp.department || '',
          }))
        )
      )
    }

    case 'categories': {
      const { data } = await supabase.from('categories').select('*').order('name')

      if (!data) return ''

      return (
        '\ufeff' +
        generateCSV(
          data.map((cat) => ({
            Nazwa: cat.name,
          }))
        )
      )
    }
  }
}

// Generator CSV
function generateCSV(data: Record<string, string | number>[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const rows = data.map((row) =>
    headers.map((header) => `"${String(row[header] || '').replace(/"/g, '""')}"`).join(';')
  )

  return [headers.join(';'), ...rows].join('\n')
}

// Pobieranie pliku
export function downloadFile(content: string | Blob, filename: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
