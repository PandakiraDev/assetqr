-- Migracja: Dodanie zdjęć przedmiotów
-- Data: 2026-01-27

-- Dodanie kolumn dla zdjęć do tabeli items
ALTER TABLE items ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS photo_storage_path TEXT;

-- Indeks dla photo_storage_path (przydatny przy czyszczeniu storage)
CREATE INDEX IF NOT EXISTS idx_items_photo_storage_path ON items(photo_storage_path) WHERE photo_storage_path IS NOT NULL;

-- Komentarze do nowych kolumn
COMMENT ON COLUMN items.photo_url IS 'Publiczny URL zdjęcia przedmiotu';
COMMENT ON COLUMN items.photo_storage_path IS 'Ścieżka do pliku w Supabase Storage';

-- Konfiguracja bucketu storage dla zdjęć przedmiotów
-- UWAGA: Poniższe komendy należy wykonać w Supabase Dashboard -> Storage
-- lub za pomocą Supabase CLI

-- Instrukcja ręczna dla Supabase:
-- 1. Utwórz bucket "item-photos" z opcją Public = true
-- 2. Dodaj następujące polityki:

-- Polityka: Publiczny odczyt zdjęć
-- INSERT INTO storage.policies (bucket_id, name, definition, check_expression)
-- VALUES (
--   'item-photos',
--   'Publiczny odczyt zdjęć',
--   '{"select": true}',
--   'true'
-- );

-- Polityka: Zapis dla uwierzytelnionych użytkowników
-- CREATE POLICY "Uwierzytelniony dostęp do zapisu" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'item-photos' AND
--     auth.role() = 'authenticated'
--   );

-- CREATE POLICY "Uwierzytelniony dostęp do usuwania" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'item-photos' AND
--     auth.role() = 'authenticated'
--   );
