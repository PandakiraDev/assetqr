'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  itemsPerPage?: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage = 10,
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems || 0)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
      {/* Info o wynikach - widoczne tylko na większych ekranach */}
      <div className="text-sm text-muted-foreground hidden sm:block">
        {totalItems !== undefined && (
          <>
            Pokazuje <span className="font-medium">{startItem}</span> -{' '}
            <span className="font-medium">{endItem}</span> z{' '}
            <span className="font-medium">{totalItems}</span> wyników
          </>
        )}
      </div>

      {/* Mobile: uproszczone info */}
      <div className="text-sm text-muted-foreground sm:hidden">
        {totalItems !== undefined && (
          <>
            Strona <span className="font-medium">{currentPage}</span> z{' '}
            <span className="font-medium">{totalPages}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="h-8 w-8"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Numery stron - ukryte na mobile */}
        <div className="hidden sm:flex items-center gap-1 mx-2">
          {generatePageNumbers(currentPage, totalPages).map((page, idx) => (
            page === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'outline'}
                size="icon"
                onClick={() => onPageChange(page as number)}
                className="h-8 w-8"
              >
                {page}
              </Button>
            )
          ))}
        </div>

        {/* Mobile: pokazuj tylko aktualną stronę */}
        <div className="flex sm:hidden items-center mx-2">
          <span className="px-3 py-1 text-sm font-medium bg-primary text-primary-foreground rounded-md">
            {currentPage}
          </span>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="h-8 w-8"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  if (current <= 3) {
    return [1, 2, 3, 4, 5, '...', total]
  }

  if (current >= total - 2) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  }

  return [1, '...', current - 1, current, current + 1, '...', total]
}
