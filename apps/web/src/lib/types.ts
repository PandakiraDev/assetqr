// Typy bazodanowe dla AssetQR

export interface Category {
  id: string
  name: string
  created_at: string
}

export interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  department: string | null
  created_at: string
}

export interface Item {
  id: string
  name: string
  category_id: string | null
  serial_number: string | null
  current_owner_id: string | null
  is_archived: boolean
  photo_url: string | null
  photo_storage_path: string | null
  created_at: string
  updated_at: string
  // Relacje (opcjonalne, gdy JOIN)
  category?: Category
  current_owner?: Employee
}

export interface OwnershipHistory {
  id: string
  item_id: string
  previous_owner_id: string | null
  new_owner_id: string | null
  changed_at: string
  changed_by: string | null
  reason: string | null
  // Relacje (opcjonalne, gdy JOIN)
  previous_owner?: Employee
  new_owner?: Employee
  item?: Item
}

// Typy dla formularzy
export interface CategoryFormData {
  name: string
}

export interface EmployeeFormData {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  department?: string
}

export interface ItemFormData {
  name: string
  category_id?: string
  serial_number?: string
  current_owner_id?: string
}

// Typy dla statystyk
export interface DashboardStats {
  totalItems: number
  totalEmployees: number
  availableItems: number
  archivedItems: number
}

// Typy dla raportów
export interface ItemsByEmployee {
  employee: Employee
  items: Item[]
  count: number
}

export interface ItemsByCategory {
  category: Category
  items: Item[]
  count: number
}
