### STAŁA SPECYFIKACJA PROJEKTU ASSETQR (wersja 1.2 – nie zmieniaj bez uzgodnienia)

Jesteś doświadczonym full-stack developerem specjalizującym się w Next.js, React Native (Expo), Supabase i TypeScript. Twoim zadaniem jest zbudowanie kompletnej aplikacji pokazowej (MVP) o nazwie "AssetQR" – systemu zarządzania inwentarzem firmowym opartym na QR kodach.

### Cel aplikacji

Zastąpić ręczny zeszyt inwentaryzacyjny. Każdy przedmiot (meble, elektronika itp.) ma naklejany QR kod. Skanując go telefonem, pracownik widzi od razu: co to za przedmiot, kto jest aktualnym właścicielem (imię + nazwisko). Admin ma webowy panel do pełnej kontroli.

### Wymagania funkcjonalne – MVP (pokazowy)

1. **Panel administracyjny (web – Next.js)**
   - Logowanie tylko dla adminów (Supabase Auth – email + hasło lub magic link)
   - Dashboard główny: statystyki (liczba przedmiotów, liczba pracowników, liczba wolnych przedmiotów)
   - CRUD przedmiotów:
     - Dodawanie: nazwa, kategoria (lista rozwijana), numer seryjny/inwentarzowy (opcjonalny), przypisanie właściciela (wybór z listy pracowników)
     - Edycja / usuwanie / archiwizacja
     - Generowanie QR: przycisk → generuje PNG/SVG z URL-em https://twoja-domena/item/[unikalne_id]
   - CRUD pracowników: imię, nazwisko, email, telefon, dział (opcjonalny)
   - Historia zmian właściciela: tabela z logami (kto, kiedy, z jakiego powodu – pole tekstowe opcjonalne)
   - Raporty:
     - Przedmioty po pracowniku (lista + eksport CSV)
     - Przedmioty po kategorii
     - Statystyki: ile przedmiotów średnio na pracownika, najwięcej zmian u kogo
   - Kategorie z góry: Meble, Elektronika, Biurko, Krzesło, Laptop, Monitor, Telefon, Drukarka, Inne – admin może dodać nowe

2. **Aplikacja mobilna (React Native + Expo)**
   - Tylko skanowanie QR (expo-camera)
   - Po zeskanowaniu: otwiera URL z QR (lub wyświetla dane jeśli nie ma netu – ale priorytet online)
   - Prosty ekran: nazwa przedmiotu, ID, kategoria, właściciel (imię + nazwisko), data ostatniej zmiany
   - Bez logowania – publiczne odczytywanie

3. **Dane w QR kodzie**
   - Krótki unikalny URL: /item/[id] (np. ABC123)
   - Po otwarciu URL: strona z danymi (może być ta sama strona co w panelu admin, ale read-only i bez nawigacji)

4. **Stack techniczny – wszystko darmowe**
   - Frontend web + API: Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/ui
   - Baza: Supabase (PostgreSQL + Auth + Storage jeśli potrzeba zdjęć później)
   - Mobilna: React Native + Expo (expo-camera, expo-linking)
   - QR: biblioteka qrcode
   - Deployment: Vercel (web + API), Expo EAS (mobilna)

### Schemat bazy danych (Supabase PostgreSQL)

- employees: id (uuid), first_name, last_name, email, phone, department
- categories: id (uuid), name (string, unique)
- items: id (uuid), name, category_id (fk), serial_number, current_owner_id (fk employees), created_at, updated_at
- ownership_history: id (uuid), item_id (fk), previous_owner_id (fk employees), new_owner_id (fk employees), changed_at (timestamp), changed_by (admin_id), reason (text optional)

Używaj TypeScript wszędzie. Kod ma być czysty, z komentarzami, z obsługą błędów. Jeśli coś wymaga kluczy (np. Supabase URL/key) – zostaw jako .env.
Teraz kontynuuj pracę nad projektem zgodnie z powyższą specyfikacją. Nie zmieniaj założeń bez mojej wyraźnej prośby. Jeśli masz wątpliwości – zapytaj.
