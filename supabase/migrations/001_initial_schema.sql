-- AssetQR - Schemat bazy danych
-- Uruchom ten skrypt w Supabase SQL Editor

-- Włączenie rozszerzenia UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela kategorii
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela pracowników
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela przedmiotów
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  serial_number TEXT,
  current_owner_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela historii zmian właściciela
CREATE TABLE IF NOT EXISTS ownership_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  previous_owner_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  new_owner_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID,
  reason TEXT
);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_owner ON items(current_owner_id);
CREATE INDEX IF NOT EXISTS idx_items_archived ON items(is_archived);
CREATE INDEX IF NOT EXISTS idx_ownership_history_item ON ownership_history(item_id);
CREATE INDEX IF NOT EXISTS idx_ownership_history_date ON ownership_history(changed_at DESC);

-- Funkcja do automatycznego aktualizowania updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger dla automatycznego aktualizowania updated_at w items
DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
-- Włączenie RLS dla wszystkich tabel
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ownership_history ENABLE ROW LEVEL SECURITY;

-- Polityki RLS - publiczny odczyt dla przedmiotów (potrzebne dla skanowania QR)
CREATE POLICY "Publiczny odczyt przedmiotów" ON items
  FOR SELECT USING (true);

CREATE POLICY "Publiczny odczyt kategorii" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Publiczny odczyt pracowników" ON employees
  FOR SELECT USING (true);

CREATE POLICY "Publiczny odczyt historii" ON ownership_history
  FOR SELECT USING (true);

-- Polityki dla uwierzytelnionych użytkowników (pełny dostęp)
CREATE POLICY "Autoryzowany dostęp do kategorii" ON categories
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Autoryzowany dostęp do pracowników" ON employees
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Autoryzowany dostęp do przedmiotów" ON items
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Autoryzowany dostęp do historii" ON ownership_history
  FOR ALL USING (auth.role() = 'authenticated');

-- Komentarze do tabel
COMMENT ON TABLE categories IS 'Kategorie przedmiotów inwentarza';
COMMENT ON TABLE employees IS 'Pracownicy firmy';
COMMENT ON TABLE items IS 'Przedmioty inwentarza';
COMMENT ON TABLE ownership_history IS 'Historia zmian właściciela przedmiotów';
