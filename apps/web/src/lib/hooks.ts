'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import useSWR, { preload, mutate } from 'swr'
import { createClient } from '@/lib/supabase'
import type { Category, Employee, Item } from '@/lib/types'

// Klucze cache dla SWR
export const SWR_KEYS = {
  items: 'items',
  employees: 'employees',
  categories: 'categories',
  dashboardStats: 'dashboard-stats',
} as const

// Fetcher dla przedmiotów z relacjami
async function fetchItems() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('items')
    .select('*, category:categories(*), current_owner:employees(*)')
    .order('name')

  if (error) throw error
  return data
}

// Fetcher dla pracowników
async function fetchEmployees() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('last_name')

  if (error) throw error
  return data
}

// Fetcher dla kategorii
async function fetchCategories() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

// Fetcher dla statystyk dashboardu
async function fetchDashboardStats() {
  const supabase = createClient()
  const [
    { count: totalItems },
    { count: totalEmployees },
    { count: availableItems },
    { count: archivedItems },
  ] = await Promise.all([
    supabase.from('items').select('*', { count: 'exact', head: true }),
    supabase.from('employees').select('*', { count: 'exact', head: true }),
    supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .is('current_owner_id', null)
      .eq('is_archived', false),
    supabase
      .from('items')
      .select('*', { count: 'exact', head: true })
      .eq('is_archived', true),
  ])

  return {
    totalItems: totalItems ?? 0,
    totalEmployees: totalEmployees ?? 0,
    availableItems: availableItems ?? 0,
    archivedItems: archivedItems ?? 0,
  }
}

// Prefetch funkcje - wywołaj na hover nad linkiem
export function prefetchItems() {
  preload(SWR_KEYS.items, fetchItems)
}

export function prefetchEmployees() {
  preload(SWR_KEYS.employees, fetchEmployees)
}

export function prefetchCategories() {
  preload(SWR_KEYS.categories, fetchCategories)
}

export function prefetchDashboardStats() {
  preload(SWR_KEYS.dashboardStats, fetchDashboardStats)
}

// Prefetch wszystkie dane (np. przy wejściu do admina)
export function prefetchAllData() {
  prefetchItems()
  prefetchEmployees()
  prefetchCategories()
  prefetchDashboardStats()
}

// Hooki SWR - używają globalnej konfiguracji z SWRProvider
export function useItems() {
  return useSWR(SWR_KEYS.items, fetchItems)
}

export function useEmployees() {
  return useSWR(SWR_KEYS.employees, fetchEmployees)
}

export function useCategories() {
  return useSWR(SWR_KEYS.categories, fetchCategories)
}

export function useDashboardStats() {
  return useSWR(SWR_KEYS.dashboardStats, fetchDashboardStats)
}

// Funkcje do rewalidacji cache po mutacjach
export function revalidateItems() {
  mutate(SWR_KEYS.items)
  mutate(SWR_KEYS.dashboardStats)
}

export function revalidateEmployees() {
  mutate(SWR_KEYS.employees)
  mutate(SWR_KEYS.dashboardStats)
}

export function revalidateCategories() {
  mutate(SWR_KEYS.categories)
}

export function revalidateAll() {
  mutate(SWR_KEYS.items)
  mutate(SWR_KEYS.employees)
  mutate(SWR_KEYS.categories)
  mutate(SWR_KEYS.dashboardStats)
}

// Hook do paginacji
export function usePagination<T>(items: T[], itemsPerPage: number = 10) {
  const totalItems = items.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const getPageItems = (page: number) => {
    const start = (page - 1) * itemsPerPage
    const end = start + itemsPerPage
    return items.slice(start, end)
  }

  return {
    totalItems,
    totalPages,
    itemsPerPage,
    getPageItems,
  }
}

// Typy dla globalnego wyszukiwania
export interface SearchResult {
  type: 'item' | 'employee' | 'category'
  id: string
  title: string
  subtitle?: string
  href: string
}

// Hook do globalnego wyszukiwania
export function useGlobalSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const { data: items } = useItems()
  const { data: employees } = useEmployees()
  const { data: categories } = useCategories()

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const results = useMemo((): SearchResult[] => {
    if (!debouncedQuery || debouncedQuery.length < 2) return []

    const searchLower = debouncedQuery.toLowerCase()
    const results: SearchResult[] = []
    const limit = 5

    // Szukaj w przedmiotach
    if (items) {
      const itemResults = (items as (Item & { category?: Category; current_owner?: Employee })[])
        .filter((item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.serial_number?.toLowerCase().includes(searchLower) ||
          item.current_owner?.first_name.toLowerCase().includes(searchLower) ||
          item.current_owner?.last_name.toLowerCase().includes(searchLower)
        )
        .slice(0, limit)
        .map((item) => ({
          type: 'item' as const,
          id: item.id,
          title: item.name,
          subtitle: [
            item.category?.name,
            item.serial_number,
            item.current_owner
              ? `${item.current_owner.first_name} ${item.current_owner.last_name}`
              : null,
          ]
            .filter(Boolean)
            .join(' • '),
          href: `/admin/przedmioty/${item.id}`,
        }))
      results.push(...itemResults)
    }

    // Szukaj w pracownikach
    if (employees) {
      const employeeResults = employees
        .filter((emp) =>
          emp.first_name.toLowerCase().includes(searchLower) ||
          emp.last_name.toLowerCase().includes(searchLower) ||
          emp.email?.toLowerCase().includes(searchLower) ||
          emp.department?.toLowerCase().includes(searchLower)
        )
        .slice(0, limit)
        .map((emp) => ({
          type: 'employee' as const,
          id: emp.id,
          title: `${emp.first_name} ${emp.last_name}`,
          subtitle: [emp.department, emp.email].filter(Boolean).join(' • '),
          href: `/admin/pracownicy`,
        }))
      results.push(...employeeResults)
    }

    // Szukaj w kategoriach
    if (categories) {
      const categoryResults = categories
        .filter((cat) => cat.name.toLowerCase().includes(searchLower))
        .slice(0, limit)
        .map((cat) => ({
          type: 'category' as const,
          id: cat.id,
          title: cat.name,
          subtitle: 'Kategoria',
          href: `/admin/kategorie`,
        }))
      results.push(...categoryResults)
    }

    return results
  }, [debouncedQuery, items, employees, categories])

  const isSearching = query !== debouncedQuery

  return {
    results,
    isSearching,
    query: debouncedQuery,
  }
}
