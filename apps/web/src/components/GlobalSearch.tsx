'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useGlobalSearch, SearchResult } from '@/lib/hooks'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Search, Package, Users, Tags, Loader2, X } from 'lucide-react'

interface GlobalSearchProps {
  isOpen: boolean
  onClose: () => void
}

const typeIcons = {
  item: Package,
  employee: Users,
  category: Tags,
}

const typeLabels = {
  item: 'Przedmiot',
  employee: 'Pracownik',
  category: 'Kategoria',
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { results, isSearching } = useGlobalSearch(query)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
          break
        case 'Enter':
          e.preventDefault()
          if (results[selectedIndex]) {
            navigateToResult(results[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [results, selectedIndex, onClose]
  )

  const navigateToResult = (result: SearchResult) => {
    router.push(result.href)
    onClose()
  }

  // Group results by type
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = []
      }
      acc[result.type].push(result)
      return acc
    },
    {} as Record<string, SearchResult[]>
  )

  // Flatten for keyboard navigation
  const flatResults = Object.values(groupedResults).flat()

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-card rounded-xl shadow-2xl overflow-hidden border animate-fade-in">
        <div className="flex items-center gap-3 px-4 border-b">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Szukaj przedmiotów, pracowników, kategorii..."
            className="border-0 focus-visible:ring-0 text-base py-6 bg-transparent"
          />
          {isSearching && (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin shrink-0" />
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded shrink-0 transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {query.length < 2 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <p>Wpisz co najmniej 2 znaki, aby wyszukać</p>
              <p className="text-xs mt-2">
                Naciśnij <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">ESC</kbd> aby zamknąć
              </p>
            </div>
          ) : results.length === 0 && !isSearching ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <p>Nie znaleziono wyników dla &quot;{query}&quot;</p>
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedResults).map(([type, typeResults]) => {
                const Icon = typeIcons[type as keyof typeof typeIcons]
                return (
                  <div key={type}>
                    <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {typeLabels[type as keyof typeof typeLabels]}
                    </div>
                    {typeResults.map((result) => {
                      const globalIndex = flatResults.findIndex(
                        (r) => r.id === result.id && r.type === result.type
                      )
                      const isSelected = globalIndex === selectedIndex

                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => navigateToResult(result)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                            isSelected ? 'bg-primary/10' : 'hover:bg-accent'
                          )}
                        >
                          <div
                            className={cn(
                              'p-2 rounded-lg shrink-0 transition-colors',
                              isSelected ? 'bg-primary/20 text-primary' : 'bg-muted'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate text-foreground">
                              {result.title}
                            </div>
                            {result.subtitle && (
                              <div className="text-sm text-muted-foreground truncate">
                                {result.subtitle}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <kbd className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
                              Enter
                            </kbd>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t bg-muted/50 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 bg-card border rounded mr-1">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-card border rounded mr-1">↓</kbd>
              nawigacja
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-card border rounded mr-1">Enter</kbd>
              wybierz
            </span>
          </div>
          <span>
            <kbd className="px-1.5 py-0.5 bg-card border rounded mr-1">ESC</kbd>
            zamknij
          </span>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

// Hook do obsługi skrótu klawiszowego
export function useGlobalSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpen()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onOpen])
}
