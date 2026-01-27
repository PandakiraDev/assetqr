// Współdzielone typy dla AssetQR (web + mobile)

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
  created_at: string
  updated_at: string
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
  previous_owner?: Employee
  new_owner?: Employee
}

// Typ dla publicznego widoku przedmiotu (skanowanie QR)
export interface PublicItemView {
  id: string
  name: string
  category_name: string | null
  serial_number: string | null
  owner_name: string | null
  last_updated: string
}
