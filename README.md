# AssetQR - System zarządzania inwentarzem

System zarządzania inwentarzem firmowym oparty na QR kodach. Umożliwia szybką identyfikację przedmiotów i ich właścicieli poprzez skanowanie kodów QR.

## Stack technologiczny

- **Web**: Next.js 14, TypeScript, Tailwind CSS, Shadcn/ui
- **Baza danych**: Supabase (PostgreSQL + Auth)
- **Mobile**: React Native + Expo
- **QR**: biblioteka `qrcode`

## Struktura projektu

```
assetqr/
├── apps/
│   ├── web/          # Aplikacja webowa (Next.js)
│   └── mobile/       # Aplikacja mobilna (Expo)
├── packages/
│   └── shared/       # Współdzielone typy TypeScript
└── supabase/
    └── migrations/   # Skrypty SQL dla bazy danych
```

## Uruchomienie

### 1. Konfiguracja Supabase

1. Utwórz projekt na [supabase.com](https://supabase.com)
2. Uruchom migracje SQL z katalogu `supabase/migrations/` w SQL Editor:
   - `001_initial_schema.sql` - schemat tabel
   - `002_seed_categories.sql` - domyślne kategorie
3. Skopiuj klucze API z Settings > API

### 2. Konfiguracja aplikacji webowej

```bash
cd apps/web
cp .env.example .env.local
# Edytuj .env.local i wstaw klucze Supabase

npm install
npm run dev
```

Aplikacja będzie dostępna pod adresem: http://localhost:3000

### 3. Uruchomienie aplikacji mobilnej

```bash
cd apps/mobile
npm install
npx expo start
```

Zeskanuj kod QR aplikacją Expo Go na telefonie.

## Funkcjonalności

### Panel administracyjny (web)
- Dashboard ze statystykami
- CRUD przedmiotów z generowaniem QR
- CRUD pracowników
- CRUD kategorii
- Historia zmian właściciela
- Raporty z eksportem CSV

### Strona publiczna
- `/item/[id]` - publiczny widok przedmiotu (bez logowania)

### Aplikacja mobilna
- Skanowanie kodów QR
- Automatyczne otwieranie strony przedmiotu

## Zmienne środowiskowe

```env
NEXT_PUBLIC_SUPABASE_URL=https://twoj-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=twoj-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Domyślne kategorie

- Meble
- Elektronika
- Biurko
- Krzesło
- Laptop
- Monitor
- Telefon
- Drukarka
- Inne

## Deployment

### Web (Vercel)
1. Push kodu na GitHub
2. Połącz repo z Vercel
3. Ustaw zmienne środowiskowe
4. Deploy!

### Mobile (Expo EAS)
```bash
npx eas build --platform all
```

## Licencja

MIT
