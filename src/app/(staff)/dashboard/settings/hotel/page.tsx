'use client';

// ============================================================
// Hotel Settings Page
// src/app/(staff)/dashboard/settings/hotel/page.tsx
// Manager-only. Requirements 35.1–35.6
// ============================================================

import { useState, useEffect } from 'react';
import { CheckIcon, AlertIcon } from '@/components/staff/Icons';

interface HotelConfig {
  hotel_name:                string;
  hotel_address:             string;
  hotel_phone:               string;
  reception_hours:           string;
  checkin_time:              string;
  checkout_time:             string;
  no_show_threshold_time:    string;
  cancellation_window_hours: string;
  feedback_link_expiry_days: string;
  timezone:                  string;
}

const DEFAULTS: HotelConfig = {
  hotel_name:                'Ras Hotel',
  hotel_address:             'Harar, Ethiopia',
  hotel_phone:               '+251 XXX XXX XXX',
  reception_hours:           '24/7',
  checkin_time:              '14:00',
  checkout_time:             '12:00',
  no_show_threshold_time:    '18:00',
  cancellation_window_hours: '24',
  feedback_link_expiry_days: '7',
  timezone:                  'Africa/Addis_Ababa',
};

export default function HotelSettingsPage() {
  const [config,   setConfig]   = useState<HotelConfig>(DEFAULTS);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch('/api/v1/config');
        const json = await res.json();
        if (res.ok && json.data) {
          setConfig((prev) => ({ ...prev, ...json.data }));
        }
      } catch { /* use defaults */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res  = await fetch('/api/v1/config', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(config),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Save failed');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function update(key: keyof HotelConfig, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        {[...Array(6)].map((_, i) => <div key={i} className="h-14 bg-gray-200 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hotel Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure hotel information and operational parameters</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Hotel Information */}
        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-gray-700">Hotel Information</h2>
          </div>
          <div className="p-5 space-y-4">
            <Field label="Hotel name" value={config.hotel_name}
              onChange={(v) => update('hotel_name', v)} />
            <Field label="Address" value={config.hotel_address}
              onChange={(v) => update('hotel_address', v)} />
            <Field label="Phone number" value={config.hotel_phone} type="tel"
              onChange={(v) => update('hotel_phone', v)} />
            <Field label="Reception hours" value={config.reception_hours}
              onChange={(v) => update('reception_hours', v)}
              placeholder="e.g. 24/7 or 06:00–22:00" />
            <Field label="Timezone" value={config.timezone}
              onChange={(v) => update('timezone', v)}
              placeholder="e.g. Africa/Addis_Ababa" />
          </div>
        </section>

        {/* Operational Parameters */}
        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-gray-700">Operational Parameters</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Check-in time" value={config.checkin_time} type="time"
                onChange={(v) => update('checkin_time', v)} />
              <Field label="Check-out time" value={config.checkout_time} type="time"
                onChange={(v) => update('checkout_time', v)} />
            </div>
            <Field label="No-show threshold time" value={config.no_show_threshold_time} type="time"
              onChange={(v) => update('no_show_threshold_time', v)}
              hint="Bookings past this time without check-in are flagged as overdue" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Cancellation window (hours)" value={config.cancellation_window_hours}
                type="number" onChange={(v) => update('cancellation_window_hours', v)}
                hint="Hours before check-in for full refund" />
              <Field label="Feedback link expiry (days)" value={config.feedback_link_expiry_days}
                type="number" onChange={(v) => update('feedback_link_expiry_days', v)} />
            </div>
          </div>
        </section>

        {/* Feedback */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-900">
            <AlertIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3.5 text-sm text-green-800">
            <CheckIcon className="h-4 w-4 text-green-600" />
            Settings saved successfully
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary px-8">
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Saving…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4" />
                Save settings
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', placeholder, hint,
}: {
  label:        string;
  value:        string;
  onChange:     (v: string) => void;
  type?:        string;
  placeholder?: string;
  hint?:        string;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="field-input"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
