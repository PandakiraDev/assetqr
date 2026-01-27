'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast({
        title: 'Błąd logowania',
        description: error.message,
        variant: 'destructive',
      })
      setIsLoading(false)
      return
    }

    toast({
      title: 'Zalogowano pomyślnie',
      description: 'Przekierowywanie do panelu...',
    })
    router.push('/admin')
    router.refresh()
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    })

    if (error) {
      toast({
        title: 'Błąd',
        description: error.message,
        variant: 'destructive',
      })
      setIsLoading(false)
      return
    }

    toast({
      title: 'Link wysłany',
      description: 'Sprawdź swoją skrzynkę email.',
    })
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-soft">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            AssetQR
          </CardTitle>
          <CardDescription className="text-center">
            Panel administracyjny - zaloguj się
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={mode === 'password' ? handlePasswordLogin : handleMagicLink}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@firma.pl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {mode === 'password' && (
                <div className="space-y-2">
                  <Label htmlFor="password">Hasło</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'password' ? 'Zaloguj się' : 'Wyślij link'}
              </Button>
            </div>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === 'password' ? 'magic' : 'password')}
              className="text-sm text-primary hover:underline"
              disabled={isLoading}
            >
              {mode === 'password'
                ? 'Zaloguj przez magic link'
                : 'Zaloguj hasłem'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
