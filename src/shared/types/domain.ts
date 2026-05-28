// ============================================================
// Ras Hotel — Domain Types
// src/shared/types/domain.ts
// ============================================================

// ── Booking Status ────────────────────────────────────────────

/** All valid booking statuses as defined in Requirement 38.1 */
export const BookingStatus = {
  Reserved_Unpaid:          'reserved_unpaid',
  Paid:                     'paid',
  Checked_In:               'checked_in',
  Checked_Out:              'checked_out',
  Cancelled_Full_Refund:    'cancelled_full_refund',
  Cancelled_Partial_Refund: 'cancelled_partial_refund',
  Cancelled_No_Refund:      'cancelled_no_refund',
  No_Show:                  'no_show',
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

/** Terminal statuses — no further transitions permitted (Req 38.6) */
export const TERMINAL_STATUSES: ReadonlySet<BookingStatus> = new Set([
  BookingStatus.Checked_Out,
  BookingStatus.Cancelled_Full_Refund,
  BookingStatus.Cancelled_Partial_Refund,
  BookingStatus.Cancelled_No_Refund,
  BookingStatus.No_Show,
]);

/**
 * Permitted status transitions as specified in Requirement 38.2.
 * Any transition NOT in this map is forbidden.
 */
export const PERMITTED_TRANSITIONS: Readonly<Record<BookingStatus, ReadonlyArray<BookingStatus>>> = {
  [BookingStatus.Reserved_Unpaid]: [
    BookingStatus.Paid,
    BookingStatus.Cancelled_No_Refund,
  ],
  [BookingStatus.Paid]: [
    BookingStatus.Checked_In,
    BookingStatus.Cancelled_Full_Refund,
    BookingStatus.Cancelled_Partial_Refund,
    BookingStatus.Cancelled_No_Refund,
    BookingStatus.No_Show,
  ],
  [BookingStatus.Checked_In]: [
    BookingStatus.Checked_Out,
  ],
  // Terminal statuses — empty arrays (no further transitions)
  [BookingStatus.Checked_Out]:              [],
  [BookingStatus.Cancelled_Full_Refund]:    [],
  [BookingStatus.Cancelled_Partial_Refund]: [],
  [BookingStatus.Cancelled_No_Refund]:      [],
  [BookingStatus.No_Show]:                  [],
};

// ── Refund Tier ───────────────────────────────────────────────

export type RefundTier = 'full' | 'partial' | 'none';

// ── User Roles ────────────────────────────────────────────────

export const UserRole = {
  Receptionist: 'receptionist',
  Manager:      'manager',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// ── Room Status ───────────────────────────────────────────────

export const RoomStatus = {
  Available:       'available',
  Occupied:        'occupied',
  Reserved_Paid:   'reserved_paid',
  Reserved_Unpaid: 'reserved_unpaid',
} as const;

export type RoomStatus = (typeof RoomStatus)[keyof typeof RoomStatus];

// ── Payment Method ────────────────────────────────────────────

export const PaymentMethod = {
  Cash:        'cash',
  TeleBirr:    'telebirr',
  CBEBirr:     'cbe_birr',
  Chapa:       'chapa',
  OnlineChapa: 'online_chapa',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

// ── Document Index Status ─────────────────────────────────────

export const IndexStatus = {
  Pending: 'pending',
  Indexed: 'indexed',
  Failed:  'failed',
} as const;

export type IndexStatus = (typeof IndexStatus)[keyof typeof IndexStatus];

// ── Supported Locales ─────────────────────────────────────────

export const SupportedLocale = {
  English:     'en',
  Amharic:     'am',
  AfaanOromo:  'om',
} as const;

export type SupportedLocale = (typeof SupportedLocale)[keyof typeof SupportedLocale];

export const ALL_LOCALES: ReadonlyArray<SupportedLocale> = ['en', 'am', 'om'];

// ── Booking Source ────────────────────────────────────────────

export type BookingSource = 'online' | 'walk_in';

// ── Notification Priority ─────────────────────────────────────

export type NotificationPriority = 'normal' | 'urgent' | 'action_required';

// ── Audit Action Types ────────────────────────────────────────

/** All auditable action types (Requirement 37.5) */
export const AuditActionType = {
  BookingCreated:          'booking_created',
  BookingModified:         'booking_modified',
  BookingCancelled:        'booking_cancelled',
  CheckIn:                 'check_in',
  CheckOut:                'check_out',
  CashCollectionEvent:     'cash_collection_event',
  PaymentVerification:     'payment_verification',
  ExtensionRequest:        'extension_request',
  NoShowMarked:            'no_show_marked',
  StaffAccountCreated:     'staff_account_created',
  StaffAccountModified:    'staff_account_modified',
  StaffAccountDeactivated: 'staff_account_deactivated',
  PasswordReset:           'password_reset',
  GuestNoteCreated:        'guest_note_created',
  GuestNoteDeleted:        'guest_note_deleted',
  DocumentUploaded:        'document_uploaded',
  DocumentDeleted:         'document_deleted',
  RoomCreated:             'room_created',
  RoomModified:            'room_modified',
  RoomDeactivated:         'room_deactivated',
  SeasonalRateCreated:     'seasonal_rate_created',
  SeasonalRateDeleted:     'seasonal_rate_deleted',
  HotelConfigChanged:      'hotel_config_changed',
  InvalidTransitionAttempt:'invalid_transition_attempt',
  RefundProcessed:         'refund_processed',
} as const;

export type AuditActionType = (typeof AuditActionType)[keyof typeof AuditActionType];

// ── Entity Types (for audit log) ──────────────────────────────

export const EntityType = {
  Booking:           'Booking',
  Room:              'Room',
  StaffAccount:      'StaffAccount',
  Payment:           'Payment',
  GuestNote:         'GuestNote',
  ShiftNote:         'ShiftNote',
  Document:          'Document',
  SeasonalRate:      'SeasonalRate',
  HotelConfig:       'HotelConfiguration',
  CashCollection:    'CashCollectionEvent',
} as const;

export type EntityType = (typeof EntityType)[keyof typeof EntityType];

// ── Domain Models ─────────────────────────────────────────────

export interface Room {
  id:                 string;
  room_number:        string;
  room_type:          string;
  floor:              number;
  description:        string;
  base_price_per_night: number;
  room_status:        RoomStatus;
  is_active:          boolean;
  created_at:         string;
  updated_at:         string;
  photos?:            RoomPhoto[];
}

export interface RoomPhoto {
  id:            string;
  room_id:       string;
  storage_url:   string;
  storage_path:  string;
  display_order: number;
}

export interface SeasonalRate {
  id:             string;
  room_type:      string;
  start_date:     string;       // ISO date string YYYY-MM-DD
  end_date:       string;
  override_price: number;
  created_by?:    string;
  created_at:     string;
}

export interface Booking {
  id:                string;
  booking_reference: string;
  room_id:           string;
  guest_name:        string;
  guest_age:         number;
  guest_sex:         string;
  guest_phone:       string;
  guest_nationality: string;
  guest_language:    SupportedLocale;
  check_in_date:     string;
  check_out_date:    string;
  total_amount:      number;
  payment_method:    PaymentMethod | null;
  booking_status:    BookingStatus;
  special_request:   string | null;
  source:            BookingSource;
  created_by_staff:  string | null;
  created_at:        string;
  updated_at:        string;
}

export interface BookingStatusHistoryEntry {
  id:              string;
  booking_id:      string;
  previous_status: BookingStatus | null;
  new_status:      BookingStatus;
  actor:           string;
  transitioned_at: string;
}

export interface CashCollectionEvent {
  id:               string;
  booking_id:       string;
  receptionist_id:  string;
  amount_collected: number;
  collected_at:     string;
}

export interface PaymentRecord {
  id:             string;
  booking_id:     string;
  payment_method: PaymentMethod;
  chapa_tx_ref:   string | null;
  chapa_status:   string | null;
  amount:         number;
  verified_by:    string | null;
  verified_at:    string | null;
  created_at:     string;
}

export interface PdfTicket {
  id:           string;
  booking_id:   string;
  storage_path: string;
  storage_url:  string;
  language:     SupportedLocale;
  version:      number;
  generated_at: string;
}

export interface GuestNote {
  id:          string;
  guest_phone: string;
  note_text:   string;
  author_id:   string;
  created_at:  string;
  edited_at:   string | null;
  is_deleted:  boolean;
}

export interface ShiftNote {
  id:                   string;
  author_id:            string;
  note_text:            string;
  is_urgent:            boolean;
  manager_acknowledged: boolean;
  acknowledged_by:      string | null;
  acknowledged_at:      string | null;
  created_at:           string;
}

export interface Notification {
  id:               string;
  type:             string;
  payload:          Record<string, unknown>;
  priority:         NotificationPriority;
  is_read:          boolean;
  acknowledged_by:  string | null;
  acknowledged_at:  string | null;
  created_at:       string;
}

export interface StaffAccount {
  id:                   string;
  full_name:            string;
  username:             string;
  role:                 UserRole;
  is_active:            boolean;
  must_change_password: boolean;
  failed_login_attempts:number;
  locked_until:         string | null;
  last_login_at:        string | null;
  created_at:           string;
}

export interface AuditLogEntry {
  id:          string;
  action_at:   string;
  actor:       string;
  action_type: AuditActionType;
  entity_type: EntityType;
  entity_id:   string;
  description: string;
  metadata:    Record<string, unknown>;
}

export interface HotelConfigEntry {
  id:         string;
  key:        string;
  value:      string;
  updated_by: string | null;
  updated_at: string;
}

export interface Document {
  id:              string;
  filename:        string;
  storage_path:    string;
  storage_url:     string;
  mime_type:       string;
  file_size_bytes: number;
  index_status:    IndexStatus;
  uploaded_by:     string;
  uploaded_at:     string;
}

export interface DocumentChunk {
  id:          string;
  document_id: string;
  chunk_text:  string;
  embedding:   number[] | null;
  chunk_index: number;
}

export interface Feedback {
  id:             string;
  booking_id:     string;
  star_rating:    number;
  comment:        string | null;
  feedback_token: string;
  token_expired:  boolean;
  submitted_at:   string | null;
  expires_at:     string;
}

// ── Input / Form types ────────────────────────────────────────

export interface CreateBookingInput {
  room_id:          string;
  guest_name:       string;
  guest_age:        number;
  guest_sex:        string;
  guest_phone:      string;
  guest_nationality:string;
  guest_language:   SupportedLocale;
  check_in_date:    string;
  check_out_date:   string;
  payment_method:   PaymentMethod;
  special_request?: string;
  source:           BookingSource;
  created_by_staff? :string;
}

export interface CreateRoomInput {
  room_number:          string;
  room_type:            string;
  floor:                number;
  description:          string;
  base_price_per_night: number;
}

export interface BookingFilters {
  status?:           BookingStatus;
  room_type?:        string;
  guest_name?:       string;
  guest_phone?:      string;
  booking_reference?:string;
  check_in_from?:    string;
  check_in_to?:      string;
  source?:           BookingSource;
  page?:             number;
  per_page?:         number;
}

export interface HotelConfig {
  hotel_name:                string;
  hotel_address:             string;
  hotel_phone:               string;
  reception_hours:           string;
  checkin_time:              string;
  checkout_time:             string;
  no_show_threshold_time:    string;
  cancellation_window_hours: number;
  feedback_link_expiry_days: number;
  pre_arrival_reminder_hour: number;
  timezone:                  string;
}
