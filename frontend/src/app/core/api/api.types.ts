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
  health_concerns?: string[] | null;
  created_at: string;
}

export interface HealthConcern {
  id: string;
  key: string;
  name: string;
  icon: string;
  display_order: number;
}

export interface CallbackRequest {
  id: string;
  name?: string | null;
  phone: string;
  status: 'new' | 'contacted' | 'closed';
  notes?: string | null;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  user_id: string;
  name: string;
  relationship: string;
  date_of_birth?: string;
  gender?: string;
  is_active: boolean;
  deleted_at?: string;
}

export interface Test {
  id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  discount_percentage: number;   // backend field name
  effective_price: number;
  turnaround_hours: number;
  is_active: boolean;
}

export interface Package {
  id: string;
  name: string;
  description?: string;
  original_price: number;        // backend field name
  discounted_price: number;      // backend field name
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
  district: string;              // backend field name (not "state")
  city: string;
  pincode: string;
  is_active: boolean;
  created_at: string;
}

export interface LabBranch {
  id: string;
  name: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  operating_hours?: string;
  is_active: boolean;
}

export interface BookingItem {
  id: string;
  booking_id: string;
  item_type: string;
  item_name: string;
  test_id?: string;
  package_id?: string;
  unit_price: number;
}

export interface Booking {
  id: string;
  reference_number: string;
  user_id: string;
  patient_id?: string;
  collection_type: string;
  time_slot_id?: string;
  booking_date: string;
  lab_branch_id?: string;
  pincode?: string;
  status: string;
  payment_status: string;
  total_amount: number;
  technician_notes?: string;
  cancellation_reason?: string;
  cancellation_fee?: number;
  collected_at?: string;
  processing_started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at?: string;
  items?: BookingItem[];

  // Enriched detail fields (from GET /bookings/{id})
  patient_name?: string;
  patient_gender?: string;
  patient_relationship?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: BookingAddress;
  time_slot?: BookingTimeSlot;
  lab_branch?: BookingLabBranch;
  payment?: BookingPayment;
  assigned_technician?: AssignedTechnician;
  status_history?: BookingStatusHistoryEntry[];
  reports?: Report[];
  refund?: Refund;
}

export interface BookingAddress {
  label: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface BookingTimeSlot {
  start_time: string;
  end_time: string;
  collection_type: string;
}

export interface BookingLabBranch {
  name: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
}

export interface BookingPayment {
  id?: string;
  method: string;
  status: string;
  amount: number;
  gst_amount: number;
  invoice_number?: string;
  paid_at?: string;
  notes?: string;
}

export interface Refund {
  id: string;
  amount: number;
  reason: string;
  status: 'initiated' | 'approved' | 'completed' | 'failed';
  transaction_reference?: string;
  remarks?: string;
  initiated_at?: string;
  completed_at?: string;
}

export interface AssignedTechnician {
  id: string;
  name?: string;
  phone?: string;
  assignment_status: string;
  assigned_at?: string;
}

export interface BookingStatusHistoryEntry {
  from_status?: string;
  to_status: string;
  reason?: string;
  changed_at?: string;
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
  user_id?: string;              // optional — technicians can exist without a linked user account
  name: string;
  phone: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  is_enabled: boolean;
  description?: string;
  updated_at: string;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  is_temp_password?: boolean;
}

export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  created_at: string;
}

export interface UserAddressListResponse {
  items: UserAddress[];
  total: number;
  page: number;
  page_size: number;
}
