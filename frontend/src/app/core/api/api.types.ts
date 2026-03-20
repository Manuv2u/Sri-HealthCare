/** Shared TypeScript interfaces matching backend Pydantic schemas. */

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  date_of_birth?: string;
  gender?: string;
  role: string;
  is_active: boolean;
}

export interface FamilyMember {
  id: string;
  user_id: string;
  name: string;
  relationship: string;
  date_of_birth?: string;
  gender?: string;
}

export interface Test {
  id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  discount_percent: number;
  effective_price: number;
  turnaround_hours: number;
  is_active: boolean;
}

export interface Package {
  id: string;
  name: string;
  description?: string;
  price: number;
  discount_percent: number;
  is_active: boolean;
  tests: Test[];
}

export interface TimeSlot {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
  collection_type: string;
  max_capacity: number;
  remaining_capacity: number;
  is_enabled: boolean;
}

export interface ServiceArea {
  id: string;
  pincode: string;
  city: string;
  state: string;
  is_active: boolean;
}

export interface LabBranch {
  id: string;
  name: string;
  address: string;
  pincode: string;
  phone: string;
  is_active: boolean;
}

export interface Booking {
  id: string;
  reference_number: string;
  user_id: string;
  collection_type: string;
  booking_date: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
}

export interface Report {
  id: string;
  booking_id: string;
  file_name: string;
  file_size_bytes: number;
  uploaded_by: string;
  uploader_role: string;
  uploaded_at: string;
  retention_until: string;
}

export interface Payment {
  payment_id: string;
  order_id: string;
  payment_url: string;
  amount: number;
  gst_amount: number;
}

export interface Technician {
  id: string;
  name: string;
  phone: string;
  email: string;
  is_active: boolean;
}

export interface FeatureFlag {
  id: string;
  key: string;
  is_enabled: boolean;
  description?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
