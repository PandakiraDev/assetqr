'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { GlobalSearch, useGlobalSearchShortcut } from '@/components/GlobalSearch'
import {
  prefetchDashboardStats,
  prefetchItems,
  prefetchEmployees,
  prefetchCategories,
  prefetchAllData,
} from '@/lib/hooks'
import {
  LayoutDashboard,
  Package,
  Users,
  Tags,
  FileBarChart,
  LogOut,
  Menu,
  X,
  Search,
  QrCode,
} from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, prefetch: prefetchDashboardStats },
  { name: 'Przedmioty', href: '/admin/przedmioty', icon: Package, prefetch: prefetchItems },
  { name: 'Pracownicy', href: '/admin/pracownicy', icon: Users, prefetch: prefetchEmployees },
  { name: 'Kategorie', href: '/admin/kategorie', icon: Tags, prefetch: prefetchCategories },
  { name: 'Raporty', href: '/admin/raporty', icon: FileBarChart, prefetch: prefetchAllData },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const supabase = createClient()

  const openSearch = useCallback(() => setIsSearchOpen(true), [])
  useGlobalSearchShortcut(openSearch)

  // Prefetch wszystkie dane przy pierwszym renderze sidebara
  useEffect(() => {
    prefetchAllData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast({
      title: 'Wylogowano',
      description: 'Do zobaczenia!',
    })
    router.push('/logowanie')
    router.refresh()
  }

  return (
    <>
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-card border-b flex items-center justify-between px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="h-9 w-9"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        <Link href="/admin" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <QrCode className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">AssetQR</span>
        </Link>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(true)}
            className="h-9 w-9"
          >
            <Search className="h-5 w-5" />
          </Button>
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-accent/50',
          'transition-transform duration-300 ease-out lg:translate-x-0',
          mobileMenuOpen ? 'translate-x-0 animate-slide-in' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 h-16 px-4 border-b border-sidebar-accent/50">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <QrCode className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <Link href="/admin" className="text-lg font-bold text-sidebar-foreground">
                AssetQR
              </Link>
              <p className="text-xs text-sidebar-foreground/60">Zarządzanie inwentarzem</p>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 pt-4">
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                setIsSearchOpen(true)
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                text-sidebar-foreground/70 hover:text-sidebar-foreground
                bg-sidebar-accent/50 hover:bg-sidebar-accent
                border border-sidebar-accent
                transition-all duration-200"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Szukaj...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5
                bg-sidebar-accent rounded text-xs text-sidebar-foreground/50">
                <span className="text-[10px]">Ctrl</span>K
              </kbd>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
            {navigation.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  onMouseEnter={item.prefetch}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-sidebar-accent/50 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-sidebar-foreground/50">Motyw</span>
              <ThemeToggle />
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Wyloguj
            </Button>
          </div>
        </div>
      </aside>

      {/* Global Search Modal */}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}
