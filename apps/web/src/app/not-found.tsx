import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <h2 className="text-xl text-muted-foreground mb-6">Strona nie znaleziona</h2>
      <p className="text-center text-muted-foreground mb-6 max-w-md">
        Przedmiot o podanym identyfikatorze nie istnieje lub został usunięty.
      </p>
      <Button asChild>
        <Link href="/">Strona główna</Link>
      </Button>
    </div>
  )
}
