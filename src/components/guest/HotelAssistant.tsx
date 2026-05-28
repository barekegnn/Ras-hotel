'use client';

// ============================================================
// Hotel AI Assistant — Floating Chat Widget
// src/components/guest/HotelAssistant.tsx
//
// Multilingual RAG-based assistant for guests.
// Supports English, Amharic, Afaan Oromo.
// Requirements 26.1–26.6
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';

type Lang = 'en' | 'am' | 'om';

interface Message {
  id:      string;
  role:    'user' | 'assistant';
  text:    string;
  time:    string;
}

const LANG_LABELS: Record<Lang, string> = {
  en: 'English',
  am: 'አማርኛ',
  om: 'Afaan Oromo',
};

const PLACEHOLDERS: Record<Lang, string> = {
  en: 'Ask about rooms, check-in, prices…',
  am: 'ስለ ክፍሎች፣ ቼክ-ኢን፣ ዋጋ ይጠይቁ…',
  om: 'Waa\'ee kutaa, check-in, gatii gaafadhu…',
};

const WELCOME: Record<Lang, string> = {
  en: 'Hello! I\'m the Ras Hotel assistant. How can I help you today?',
  am: 'ሰላም! እኔ የራስ ሆቴል ረዳት ነኝ። ዛሬ እንዴት ልረዳዎ እችላለሁ?',
  om: 'Akkam! Ani gargaaraa Hoteela Ras dha. Har\'a akkamitti si gargaaruu danda\'a?',
};

const SEND_LABELS: Record<Lang, string> = {
  en: 'Send',
  am: 'ላክ',
  om: 'Ergi',
};

const TITLE: Record<Lang, string> = {
  en: 'Hotel Assistant',
  am: 'የሆቴል ረዳት',
  om: 'Gargaaraa Hoteelaa',
};

function genId() { return Math.random().toString(36).slice(2, 9); }
function nowTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function HotelAssistant() {
  const [open,     setOpen]     = useState(false);
  const [lang,     setLang]     = useState<Lang>('en');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [showLookup, setShowLookup] = useState(false);
  const [unread,   setUnread]   = useState(0);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  // Initialise welcome message when opened
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id:   genId(),
        role: 'assistant',
        text: WELCOME[lang],
        time: nowTime(),
      }]);
    }
  }, [open]);

  // Reset welcome when language changes
  useEffect(() => {
    if (messages.length > 0) {
      setMessages([{
        id:   genId(),
        role: 'assistant',
        text: WELCOME[lang],
        time: nowTime(),
      }]);
    }
  }, [lang]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setInput('');
    setShowLookup(false);

    const userMsg: Message = { id: genId(), role: 'user', text: msg, time: nowTime() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res  = await fetch('/api/v1/chatbot', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message:           msg,
          language:          lang,
          booking_reference: bookingRef || undefined,
          guest_phone:       guestPhone || undefined,
        }),
      });
      const json = await res.json();
      const reply = json.data?.reply ?? json.error?.message ?? 'Sorry, something went wrong.';

      setMessages((prev) => [...prev, {
        id:   genId(),
        role: 'assistant',
        text: reply,
        time: nowTime(),
      }]);

      // If response is booking_prompt, show lookup fields
      if (json.data?.type === 'booking_prompt') setShowLookup(true);
    } catch {
      setMessages((prev) => [...prev, {
        id:   genId(),
        role: 'assistant',
        text: 'Sorry, I\'m having trouble connecting. Please try again.',
        time: nowTime(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, lang, loading, bookingRef, guestPhone]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function handleOpen() {
    setOpen(true);
    setUnread(0);
  }

  const QUICK_QUESTIONS: Record<Lang, string[]> = {
    en: ['Check-in time?', 'Room prices?', 'Payment methods?', 'My booking'],
    am: ['ቼክ-ኢን ጊዜ?', 'የክፍል ዋጋ?', 'የክፍያ ዘዴዎች?', 'ቦታ ማስያዝ'],
    om: ['Yeroo check-in?', 'Gatii kutaa?', 'Mala kaffaltii?', 'Booking koo'],
  };

  return (
    <>
      {/* ── Floating button ─────────────────────────────────── */}
      <button
        onClick={handleOpen}
        aria-label="Open hotel assistant"
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center
                    rounded-full bg-brand-500 text-white shadow-lg
                    hover:bg-brand-600 hover:shadow-xl hover:scale-105
                    transition-all duration-200
                    ${open ? 'hidden' : 'flex'}`}>
        <span className="text-2xl">💬</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* ── Chat window ─────────────────────────────────────── */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[360px] max-h-[600px]
                        rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden
                        animate-slide-in-bottom">

          {/* Header */}
          <div className="flex items-center justify-between bg-brand-500 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-lg">
                🏨
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{TITLE[lang]}</p>
                <p className="text-[11px] text-brand-100">Ras Hotel · Online</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Language selector */}
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                className="rounded-md bg-white/20 border-0 text-white text-xs px-2 py-1
                           focus:outline-none focus:ring-1 focus:ring-white/50 cursor-pointer">
                {(Object.entries(LANG_LABELS) as [Lang, string][]).map(([code, label]) => (
                  <option key={code} value={code} className="text-gray-900 bg-white">{label}</option>
                ))}
              </select>
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                aria-label="Close">
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 min-h-0">
            {messages.map((msg) => (
              <div key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-0.5">
                    🏨
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
                  ${msg.role === 'user'
                    ? 'bg-brand-500 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'}`}>
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-brand-100' : 'text-gray-400'}`}>
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="h-7 w-7 rounded-full bg-brand-100 flex items-center justify-center text-sm mr-2 flex-shrink-0">
                  🏨
                </div>
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex gap-1 items-center">
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Booking lookup fields */}
            {showLookup && (
              <div className="bg-white rounded-xl border border-brand-200 p-3 space-y-2">
                <p className="text-xs font-semibold text-brand-700">Enter your booking details:</p>
                <input
                  type="text"
                  placeholder="Booking reference (e.g. RAS-XXXXXX)"
                  value={bookingRef}
                  onChange={(e) => setBookingRef(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs
                             focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                <input
                  type="tel"
                  placeholder="Phone number (e.g. 0912345678)"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs
                             focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                <button
                  onClick={() => sendMessage('Look up my booking')}
                  disabled={!bookingRef || !guestPhone}
                  className="w-full rounded-lg bg-brand-500 py-2 text-xs font-semibold text-white
                             hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  Look up booking
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Quick questions */}
          {messages.length <= 1 && (
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Quick questions</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS[lang].map((q) => (
                  <button key={q}
                    onClick={() => sendMessage(q)}
                    className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs
                               font-medium text-brand-700 hover:bg-brand-50 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={PLACEHOLDERS[lang]}
              disabled={loading}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm
                         text-gray-900 placeholder:text-gray-400
                         focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                         disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              aria-label={SEND_LABELS[lang]}
              className="h-10 w-10 rounded-xl bg-brand-500 flex items-center justify-center text-white
                         hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors flex-shrink-0">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>

          {/* Footer */}
          <div className="bg-white px-4 py-2 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400">Ras Hotel · Harar, Ethiopia</p>
          </div>
        </div>
      )}
    </>
  );
}
