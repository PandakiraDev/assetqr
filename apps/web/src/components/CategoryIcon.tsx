'use client'

import {
  Laptop,
  Monitor,
  Smartphone,
  Printer,
  Armchair,
  Table2,
  Sofa,
  Package,
  Cpu,
  LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Mapowanie nazw kategorii na ikony i kolory
const categoryConfig: Record<string, { icon: LucideIcon; color: string; bgColor: string }> = {
  'laptop': { icon: Laptop, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  'monitor': { icon: Monitor, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  'telefon': { icon: Smartphone, color: 'text-green-600', bgColor: 'bg-green-100' },
  'drukarka': { icon: Printer, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  'krzesło': { icon: Armchair, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  'biurko': { icon: Table2, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  'meble': { icon: Sofa, color: 'text-rose-600', bgColor: 'bg-rose-100' },
  'elektronika': { icon: Cpu, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  'inne': { icon: Package, color: 'text-gray-600', bgColor: 'bg-gray-100' },
}

// Znajdź konfigurację dla nazwy kategorii (bez polskich znaków)
function getCategoryConfig(categoryName: string | null | undefined) {
  if (!categoryName) return categoryConfig['inne']

  const normalized = categoryName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // usuń akcenty
    .replace('ó', 'o')

  // Szukaj dopasowania
  for (const [key, config] of Object.entries(categoryConfig)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return config
    }
  }

  return categoryConfig['inne']
}

interface CategoryIconProps {
  categoryName: string | null | undefined
  size?: 'sm' | 'md' | 'lg'
  showBackground?: boolean
  className?: string
}

export function CategoryIcon({
  categoryName,
  size = 'md',
  showBackground = true,
  className
}: CategoryIconProps) {
  const config = getCategoryConfig(categoryName)
  const Icon = config.icon

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  const containerSizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  }

  if (showBackground) {
    return (
      <div className={cn(
        'rounded-md inline-flex items-center justify-center',
        config.bgColor,
        containerSizeClasses[size],
        className
      )}>
        <Icon className={cn(sizeClasses[size], config.color)} />
      </div>
    )
  }

  return <Icon className={cn(sizeClasses[size], config.color, className)} />
}
