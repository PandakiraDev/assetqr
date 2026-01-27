'use client'

import { useDashboardStats } from '@/lib/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardSkeleton } from '@/components/CardSkeleton'
import { Package, Users, PackageCheck, Archive, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useDashboardStats()

  const cards = [
    {
      title: 'Wszystkie przedmioty',
      value: stats?.totalItems ?? 0,
      icon: Package,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      href: '/admin/przedmioty',
    },
    {
      title: 'Pracownicy',
      value: stats?.totalEmployees ?? 0,
      icon: Users,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      href: '/admin/pracownicy',
    },
    {
      title: 'Wolne przedmioty',
      value: stats?.availableItems ?? 0,
      icon: PackageCheck,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      href: '/admin/przedmioty?status=available',
    },
    {
      title: 'Zarchiwizowane',
      value: stats?.archivedItems ?? 0,
      icon: Archive,
      color: 'text-slate-600 dark:text-slate-400',
      bgColor: 'bg-slate-100 dark:bg-slate-800/50',
      href: '/admin/przedmioty?status=archived',
    },
  ]

  const quickActions = [
    { label: 'Dodaj przedmiot', href: '/admin/przedmioty/nowy', icon: Package },
    { label: 'Dodaj pracownika', href: '/admin/pracownicy/nowy', icon: Users },
    { label: 'Eksportuj dane', href: '/admin/raporty', icon: Archive },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Przegląd stanu inwentarza
        </p>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <DashboardSkeleton />
      ) : error ? (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="py-8 text-center">
            <p className="text-destructive font-medium">
              Błąd ładowania danych. Spróbuj odświeżyć stronę.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Link key={card.title} href={card.href}>
              <Card className="group transition-all duration-200 hover:shadow-soft hover:border-primary/20 cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2.5 rounded-xl ${card.bgColor} transition-transform group-hover:scale-110`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{card.value}</div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Zobacz szczegóły <ArrowRight className="h-3 w-3" />
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Quick Actions & Welcome */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Szybkie akcje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 p-3 rounded-lg border border-transparent
                  hover:bg-accent hover:border-border transition-all duration-200 group"
              >
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <action.icon className="h-4 w-4" />
                </div>
                <span className="font-medium text-foreground">{action.label}</span>
                <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Welcome Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Witaj w AssetQR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              System zarządzania inwentarzem firmowym. Użyj menu po lewej stronie,
              aby zarządzać przedmiotami, pracownikami i kategoriami.
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Package className="h-4 w-4 mt-0.5 text-primary" />
                <span><strong className="text-foreground">Przedmioty</strong> <span className="text-muted-foreground">- dodawaj, edytuj i generuj kody QR</span></span>
              </li>
              <li className="flex items-start gap-2">
                <Users className="h-4 w-4 mt-0.5 text-primary" />
                <span><strong className="text-foreground">Pracownicy</strong> <span className="text-muted-foreground">- zarządzaj listą pracowników</span></span>
              </li>
              <li className="flex items-start gap-2">
                <Archive className="h-4 w-4 mt-0.5 text-primary" />
                <span><strong className="text-foreground">Raporty</strong> <span className="text-muted-foreground">- przeglądaj statystyki i eksportuj dane</span></span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
