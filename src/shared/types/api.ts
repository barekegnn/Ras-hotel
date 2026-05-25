// ============================================================
// Ras Hotel — API Response Types
// src/shared/types/api.ts
// ============================================================

// ── Structured Error ──────────────────────────────────────────

export interface ApiErrorDetail {
  code:     string;
  message:  string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}

// ── Generic Success Response ──────────────────────────────────

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: PaginationMeta;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ── Pagination ────────────────────────────────────────────────

export interface PaginationMeta {
  page:        number;
  per_page:    number;
  total:       number;
  total_pages: number;
}

// ── Well-known error codes ────────────────────────────────────

export const ErrorCode = {
  // Auth
  Unauthorized:           'UNAUTHORIZED',
  Forbidden:              'FORBIDDEN',
  AccountLocked:          'ACCOUNT_LOCKED',
  InvalidCredentials:     'INVALID_CREDENTIALS',
  SessionExpired:         'SESSION_EXPIRED',

  // Booking
  BookingConflict:        'BOOKING_CONFLICT',
  RoomLockUnavailable:    'ROOM_LOCK_UNAVAILABLE',
  RoomLockExpired:        'ROOM_LOCK_EXPIRED',
  InvalidTransition:      'INVALID_TRANSITION',
  BookingNotFound:        'BOOKING_NOT_FOUND',
  AlreadyPaid:            'ALREADY_PAID',
  InvalidLookup:          'INVALID_LOOKUP',                // ref OR phone wrong — don't reveal which
  PastCheckin:            'PAST_CHECKIN_MODIFICATION',
  TerminalStatus:         'TERMINAL_STATUS',

  // Payment
  PaymentFailed:          'PAYMENT_FAILED',
  InvalidWebhookSignature:'INVALID_WEBHOOK_SIGNATURE',
  DuplicateWebhook:       'DUPLICATE_WEBHOOK',

  // Rooms
  RoomNotFound:           'ROOM_NOT_FOUND',
  RoomDeactivated:        'ROOM_DEACTIVATED',
  TooManyPhotos:          'TOO_MANY_PHOTOS',

  // Seasonal rates
  SeasonalRateOverlap:    'SEASONAL_RATE_OVERLAP',

  // Documents
  FileTooLarge:           'FILE_TOO_LARGE',
  UnsupportedFileType:    'UNSUPPORTED_FILE_TYPE',

  // Validation
  ValidationError:        'VALIDATION_ERROR',
  InvalidPhoneFormat:     'INVALID_PHONE_FORMAT',
  InvalidDateRange:       'INVALID_DATE_RANGE',

  // General
  NotFound:               'NOT_FOUND',
  InternalError:          'INTERNAL_ERROR',
  ExternalServiceError:   'EXTERNAL_SERVICE_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ── Helper to build error responses ──────────────────────────

export function buildError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return { error: { code, message, details } };
}

// ── Specific response shapes ──────────────────────────────────

export interface BookingLookupResponse {
  booking_reference:  string;
  guest_name:         string;
  room_type:          string;
  check_in_date:      string;
  check_out_date:     string;
  booking_status:     string;
  total_amount:       number;
  payment_method:     string | null;
  special_request:    string | null;
  pdf_download_url?:  string;
  check_in_instructions?: CheckInInstructions;
  outstanding_amount?: number;
}

export interface CheckInInstructions {
  hotel_address:    string;
  hotel_phone:      string;
  reception_hours:  string;
  checkin_time:     string;
  what_to_bring:    string;
}

export interface BookingConfirmationResponse {
  booking_id:        string;
  booking_reference: string;
  room_type:         string;
  check_in_date:     string;
  check_out_date:    string;
  total_amount:      number;
  payment_method:    string;
  pdf_download_url?: string;
}

export interface RoomAvailabilityResponse {
  room_id:           string;
  is_available:      boolean;
  nightly_rate:      number;
  unavailable_dates: string[];  // ISO date strings
}

export interface RevenueSummaryResponse {
  date:                 string;
  total_cash:           number;
  total_mobile_money:   number;
  total_bookings:       number;
  occupancy_rate:       number;
  cash_by_receptionist: CashByReceptionist[];
  mobile_by_transaction:MobileTransaction[];
  revenue_by_room_type: RevenueByRoomType[];
}

export interface CashByReceptionist {
  staff_username:  string;
  staff_full_name: string;
  total:           number;
  transactions:    CashTransaction[];
}

export interface CashTransaction {
  booking_reference: string;
  guest_name:        string;
  amount:            number;
  collected_at:      string;
}

export interface MobileTransaction {
  booking_reference: string;
  guest_name:        string;
  amount:            number;
  chapa_tx_ref:      string;
  payment_method:    string;
}

export interface RevenueByRoomType {
  room_type: string;
  total:     number;
  count:     number;
}

export interface OccupancyAnalyticsResponse {
  date_range:          { from: string; to: string };
  daily_occupancy:     DailyOccupancy[];
  summary:             OccupancySummary;
  by_room_type:        OccupancyByRoomType[];
  by_payment_method:   OccupancyByPaymentMethod[];
  top_5_busiest_dates: DailyOccupancy[];
  cancellations:       CancellationSummary;
}

export interface DailyOccupancy {
  date:           string;
  occupancy_rate: number;
  occupied_rooms: number;
  total_rooms:    number;
}

export interface OccupancySummary {
  total_bookings:       number;
  total_revenue:        number;
  avg_length_of_stay:   number;
  avg_occupancy_rate:   number;
}

export interface OccupancyByRoomType {
  room_type: string;
  count:     number;
  revenue:   number;
}

export interface OccupancyByPaymentMethod {
  payment_method: string;
  count:          number;
}

export interface CancellationSummary {
  count:            number;
  cancellation_rate:number;
}

export interface ChapaInitiateResponse {
  checkout_url: string;
  tx_ref:       string;
}

export interface StaffListResponse {
  staff: StaffAccountSummary[];
}

export interface StaffAccountSummary {
  id:           string;
  full_name:    string;
  username:     string;
  role:         string;
  is_active:    boolean;
  last_login_at:string | null;
  created_at:   string;
}
