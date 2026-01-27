-- AssetQR - Przykładowe dane testowe

-- Pracownicy
INSERT INTO employees (first_name, last_name, email, phone, department) VALUES
  ('Jan', 'Kowalski', 'jan.kowalski@firma.pl', '501-234-567', 'IT'),
  ('Anna', 'Nowak', 'anna.nowak@firma.pl', '502-345-678', 'Marketing'),
  ('Piotr', 'Wiśniewski', 'piotr.wisniewski@firma.pl', '503-456-789', 'Sprzedaż'),
  ('Maria', 'Wójcik', 'maria.wojcik@firma.pl', '504-567-890', 'HR'),
  ('Tomasz', 'Kamiński', 'tomasz.kaminski@firma.pl', '505-678-901', 'IT'),
  ('Katarzyna', 'Lewandowska', 'k.lewandowska@firma.pl', '506-789-012', 'Finanse'),
  ('Michał', 'Zieliński', 'michal.zielinski@firma.pl', '507-890-123', 'IT'),
  ('Agnieszka', 'Szymańska', 'a.szymanska@firma.pl', '508-901-234', 'Marketing');

-- Pobranie ID kategorii i pracowników
DO $$
DECLARE
  cat_laptop UUID;
  cat_monitor UUID;
  cat_biurko UUID;
  cat_krzeslo UUID;
  cat_telefon UUID;
  cat_drukarka UUID;
  cat_elektronika UUID;
  emp_jan UUID;
  emp_anna UUID;
  emp_piotr UUID;
  emp_maria UUID;
  emp_tomasz UUID;
  emp_katarzyna UUID;
  emp_michal UUID;
BEGIN
  -- Pobierz ID kategorii
  SELECT id INTO cat_laptop FROM categories WHERE name = 'Laptop';
  SELECT id INTO cat_monitor FROM categories WHERE name = 'Monitor';
  SELECT id INTO cat_biurko FROM categories WHERE name = 'Biurko';
  SELECT id INTO cat_krzeslo FROM categories WHERE name = 'Krzesło';
  SELECT id INTO cat_telefon FROM categories WHERE name = 'Telefon';
  SELECT id INTO cat_drukarka FROM categories WHERE name = 'Drukarka';
  SELECT id INTO cat_elektronika FROM categories WHERE name = 'Elektronika';

  -- Pobierz ID pracowników
  SELECT id INTO emp_jan FROM employees WHERE email = 'jan.kowalski@firma.pl';
  SELECT id INTO emp_anna FROM employees WHERE email = 'anna.nowak@firma.pl';
  SELECT id INTO emp_piotr FROM employees WHERE email = 'piotr.wisniewski@firma.pl';
  SELECT id INTO emp_maria FROM employees WHERE email = 'maria.wojcik@firma.pl';
  SELECT id INTO emp_tomasz FROM employees WHERE email = 'tomasz.kaminski@firma.pl';
  SELECT id INTO emp_katarzyna FROM employees WHERE email = 'k.lewandowska@firma.pl';
  SELECT id INTO emp_michal FROM employees WHERE email = 'michal.zielinski@firma.pl';

  -- Laptopy
  INSERT INTO items (name, category_id, serial_number, current_owner_id) VALUES
    ('Dell XPS 15', cat_laptop, 'DELL-2024-001', emp_jan),
    ('MacBook Pro 14"', cat_laptop, 'APPLE-2024-001', emp_anna),
    ('Lenovo ThinkPad X1', cat_laptop, 'LEN-2024-001', emp_tomasz),
    ('HP EliteBook 840', cat_laptop, 'HP-2024-001', emp_michal),
    ('Dell Latitude 5540', cat_laptop, 'DELL-2024-002', emp_piotr),
    ('MacBook Air M2', cat_laptop, 'APPLE-2024-002', NULL);

  -- Monitory
  INSERT INTO items (name, category_id, serial_number, current_owner_id) VALUES
    ('Dell U2722D 27"', cat_monitor, 'MON-DELL-001', emp_jan),
    ('Dell U2722D 27"', cat_monitor, 'MON-DELL-002', emp_jan),
    ('LG 27UK850 4K', cat_monitor, 'MON-LG-001', emp_anna),
    ('Samsung Odyssey G5', cat_monitor, 'MON-SAM-001', emp_tomasz),
    ('BenQ PD2700U', cat_monitor, 'MON-BEN-001', emp_michal),
    ('Philips 243V7', cat_monitor, 'MON-PHI-001', NULL),
    ('Philips 243V7', cat_monitor, 'MON-PHI-002', NULL);

  -- Biurka
  INSERT INTO items (name, category_id, serial_number, current_owner_id) VALUES
    ('Biurko regulowane IKEA Bekant', cat_biurko, 'BIUR-001', emp_jan),
    ('Biurko regulowane IKEA Bekant', cat_biurko, 'BIUR-002', emp_anna),
    ('Biurko narożne', cat_biurko, 'BIUR-003', emp_piotr),
    ('Biurko proste 140cm', cat_biurko, 'BIUR-004', emp_maria),
    ('Biurko regulowane FlexiSpot', cat_biurko, 'BIUR-005', emp_tomasz);

  -- Krzesła
  INSERT INTO items (name, category_id, serial_number, current_owner_id) VALUES
    ('Krzesło ergonomiczne Herman Miller', cat_krzeslo, 'KRZ-HM-001', emp_jan),
    ('Krzesło IKEA Markus', cat_krzeslo, 'KRZ-IKEA-001', emp_anna),
    ('Krzesło IKEA Markus', cat_krzeslo, 'KRZ-IKEA-002', emp_piotr),
    ('Krzesło gamingowe Secretlab', cat_krzeslo, 'KRZ-SEC-001', emp_tomasz),
    ('Krzesło obrotowe basic', cat_krzeslo, 'KRZ-BAS-001', emp_maria),
    ('Krzesło obrotowe basic', cat_krzeslo, 'KRZ-BAS-002', NULL);

  -- Telefony
  INSERT INTO items (name, category_id, serial_number, current_owner_id) VALUES
    ('iPhone 14 Pro', cat_telefon, 'TEL-IP-001', emp_piotr),
    ('Samsung Galaxy S23', cat_telefon, 'TEL-SAM-001', emp_katarzyna),
    ('iPhone 13', cat_telefon, 'TEL-IP-002', emp_maria);

  -- Drukarki
  INSERT INTO items (name, category_id, serial_number, current_owner_id) VALUES
    ('HP LaserJet Pro M404', cat_drukarka, 'DRU-HP-001', NULL),
    ('Brother HL-L2350DW', cat_drukarka, 'DRU-BRO-001', NULL),
    ('Canon PIXMA G6020', cat_drukarka, 'DRU-CAN-001', NULL);

  -- Inne elektronika
  INSERT INTO items (name, category_id, serial_number, current_owner_id) VALUES
    ('Projektor Epson EB-W06', cat_elektronika, 'PROJ-001', NULL),
    ('Kamera internetowa Logitech C920', cat_elektronika, 'CAM-LOG-001', emp_jan),
    ('Słuchawki Sony WH-1000XM4', cat_elektronika, 'SLU-SONY-001', emp_anna),
    ('Stacja dokująca Dell WD19', cat_elektronika, 'DOK-DELL-001', emp_tomasz);

END $$;
