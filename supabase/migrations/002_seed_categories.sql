-- AssetQR - Domyślne kategorie
-- Uruchom po 001_initial_schema.sql

INSERT INTO categories (name) VALUES
  ('Meble'),
  ('Elektronika'),
  ('Biurko'),
  ('Krzesło'),
  ('Laptop'),
  ('Monitor'),
  ('Telefon'),
  ('Drukarka'),
  ('Inne')
ON CONFLICT (name) DO NOTHING;
