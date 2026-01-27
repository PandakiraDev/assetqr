import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          AssetQR
        </h1>
        <p className="text-xl text-muted-foreground">
          System zarządzania inwentarzem firmowym oparty na QR kodach
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link href="/logowanie">
              Panel administracyjny
            </Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
