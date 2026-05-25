// ============================================================
// Seasonal Rate Repository
// src/modules/pricing/infrastructure/repository.ts
//
// Database operations for seasonal rate management.
// Requirements 26.5–26.9
// ============================================================

import { createSupabaseServerClient, createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';
import { detectSeasonalRateOverlap, getApplicableRate, calculateStayPrice } from '../domain/seasonalRates';
import type { SeasonalRate } from '@/shared/types/domain';

// ── Read operations ───────────────────────────────────────────

export async function listSeasonalRates(): Promise<SeasonalRate[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('seasonal_rates')
    .select('*')
    .order('start_date', { ascending: true });

  if (error) throw new Error(`listSeasonalRates: ${error.message}`);
  return (data ?? []) as SeasonalRate[];
}

export async function getActiveRatesForRoomType(
  roomType: string,
  startDate: string,
  endDate: string
): Promise<SeasonalRate[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('seasonal_rates')
    .select('*')
    .eq('room_type', roomType)
    .lte('start_date', endDate)
    .gte('end_date', startDate);

  if (error) throw new Error(`getActiveRatesForRoomType: ${error.message}`);
  return (data ?? []) as SeasonalRate[];
}

// ── Write operations ──────────────────────────────────────────

export interface CreateSeasonalRateInput {
  room_type:      string;
  start_date:     string;
  end_date:       string;
  override_price: number;
  created_by:     string;
}

/**
 * Creates a seasonal rate after validating there is no date-range overlap
 * with existing rates for the same room type. Requirement 26.7
 */
export async function createSeasonalRate(
  input: CreateSeasonalRateInput
): Promise<SeasonalRate> {
  // 1. Load all existing rates for this room type
  const existing = await listSeasonalRates();
  const forType = existing.filter((r) => r.room_type === input.room_type);

  // 2. Check for overlap before writing
  const conflict = detectSeasonalRateOverlap(forType, {
    room_type:  input.room_type,
    start_date: input.start_date,
    end_date:   input.end_date,
  });

  if (conflict) {
    throw Object.assign(
      new Error(
        `Date conflict: a ${input.room_type} rate already exists ` +
        `from ${conflict.start_date} to ${conflict.end_date}.`
      ),
      { code: 'SEASONAL_RATE_OVERLAP', conflictingRate: conflict }
    );
  }

  // 3. Insert
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('seasonal_rates')
    .insert({
      room_type:      input.room_type,
      start_date:     input.start_date,
      end_date:       input.end_date,
      override_price: input.override_price,
      created_by:     input.created_by,
    })
    .select()
    .single();

  if (error) throw new Error(`createSeasonalRate: ${error.message}`);
  return data as SeasonalRate;
}

export async function deleteSeasonalRate(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('seasonal_rates').delete().eq('id', id);
  if (error) throw new Error(`deleteSeasonalRate: ${error.message}`);
}

// ── Price resolution ──────────────────────────────────────────

/**
 * Resolves the nightly rate for a room type on a specific date,
 * applying any active seasonal override. Requirement 26.6
 */
export async function resolveNightlyRate(
  roomType: string,
  date: Date,
  basePrice: number
): Promise<number> {
  const dateStr = date.toISOString().slice(0, 10);
  const rates = await getActiveRatesForRoomType(roomType, dateStr, dateStr);
  return getApplicableRate(roomType, date, rates, basePrice);
}

/**
 * Calculates the total price for a stay, fetching applicable seasonal rates.
 * Used by booking creation and the manual booking form price preview.
 */
export async function resolveStayPrice(
  roomType: string,
  checkIn: string,
  checkOut: string,
  basePrice: number
): Promise<{ total: number; nights: number; breakdown: Array<{ date: string; rate: number }> }> {
  const rates = await getActiveRatesForRoomType(roomType, checkIn, checkOut);
  return calculateStayPrice(
    roomType,
    new Date(checkIn),
    new Date(checkOut),
    rates,
    basePrice
  );
}
