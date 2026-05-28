// ============================================================
// POST /api/v1/chatbot
// src/app/api/v1/chatbot/route.ts
//
// Multilingual hotel assistant for guests.
// Supports English (en), Amharic (am), Afaan Oromo (om).
// Uses hotel knowledge base + Supabase for booking lookups.
// Requirements 26.1–26.6
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/modules/auth/infrastructure/supabase';

// ── Hotel Knowledge Base ──────────────────────────────────────
// Static FAQ content in all three languages

const HOTEL_KB = {
  en: {
    hotel_name:    'Ras Hotel',
    location:      'Harar Jugol (Walled City), Harar, Ethiopia — inside the UNESCO World Heritage historic walled city',
    phone:         '+251256660027, +251930179947',
    email:         'reservation@hararrashotel.com',
    checkin_time:  '2:00 PM (14:00)',
    checkout_time: '12:00 PM (noon)',
    amenities:     'Free WiFi in all areas, ensuite bathrooms, daily housekeeping, 24/7 reception, concierge service, luggage storage, currency exchange, express check-in/check-out, room service, shuttle service, Ras Cinema & Game Zone, ATM, laundry facilities, Ras Café',
    room_types:    'Single Room (ETB 2,000/night) — single bed, seating area, flat-screen TV, bath or shower\nSuite Room (ETB 4,000/night) — king bed, comprehensive seating area, flat-screen TV, bath or shower\nTwin Small Room (ETB 2,000/night) — two single beds, seating area, flat-screen TV, bath or shower\nTwin Large Room (ETB 4,000/night) — two large single beds, seating area, flat-screen TV, bath or shower',
    payment:       'We accept Cash, TeleBirr, CBE Birr, and Chapa online payments',
    cancellation:  'Free cancellation more than 48 hours before check-in (full refund). Within 48 hours: 50% refund. On check-in day or no-show: no refund.',
    booking:       'Book online at our website or call us. Walk-in guests are welcome.',
    parking:       'Limited parking available on-site. Street parking also available nearby.',
    breakfast:     'Breakfast is available at Ras Café from 7:00 AM to 10:00 AM.',
    tours:         'We can arrange guided tours of Harar\'s historic sites, the legendary hyena feeding experience, traditional coffee ceremonies, and more.',
    transport:     'Shuttle service available for local and international guests who book in advance. Harar is 526 km from Addis Ababa.',
    cafe:          'Ras Café offers freshly brewed coffee, delicious pastries, and light meals in a cozy atmosphere. Open daily.',
    cinema:        'Ras Cinema & Game Zone is available for movie screenings and corporate meetings with exceptional screens and sound systems.',
    wifi:          'Free WiFi is available in all areas of the hotel at no charge.',
    atm:           'ATM machines are available in all areas for international and local currency exchanges.',
    laundry:       'Laundry area equipped with machines. Guests can wash clothes themselves or with staff assistance.',
  },
  am: {
    hotel_name:    'ራስ ሆቴል',
    location:      'ሃረር ጁጎል (ግንብ ከተማ)፣ ሃረር፣ ኢትዮጵያ — የዩኔስኮ የዓለም ቅርስ ታሪካዊ ግንብ ከተማ ውስጥ',
    phone:         '+251256660027, +251930179947',
    email:         'reservation@hararrashotel.com',
    checkin_time:  'ከሰዓት 2:00 (14:00)',
    checkout_time: 'ቀኑ 12:00 (ሰዓት)',
    amenities:     'ነፃ ዋይፋይ፣ የግል መታጠቢያ ቤቶች፣ ዕለታዊ ጽዳት፣ 24/7 ሪሴፕሽን፣ ኮንሲርጅ አገልግሎት፣ ሻትል አገልግሎት፣ ራስ ሲኒማ እና ጌም ዞን፣ ATM፣ ልብስ ማጠቢያ፣ ራስ ካፌ',
    room_types:    'ነጠላ ክፍል (2,000 ብር/ሌሊት)\nስዊት ክፍል (4,000 ብር/ሌሊት)\nትዊን ስሞል ክፍል (2,000 ብር/ሌሊት)\nትዊን ላርጅ ክፍል (4,000 ብር/ሌሊት)',
    payment:       'ጥሬ ገንዘብ፣ ቴሌብር፣ CBE ብር እና ቻፓ ኦንላይን ክፍያዎችን እንቀበላለን',
    cancellation:  'ከቼክ-ኢን 48 ሰዓት በፊት ነፃ ሰርዛ (ሙሉ ተመላሽ)። በ48 ሰዓት ውስጥ: 50% ተመላሽ። በቼክ-ኢን ቀን ወይም ሳይመጡ: ምንም ተመላሽ የለም።',
    booking:       'በድህረ ገጻችን ወይም ሪሴፕሽን ደውለው ያስይዙ። ያለ ቀጠሮ የሚመጡ እንግዶችም ይቀበላሉ።',
    parking:       'በቦታው ላይ ውስን ፓርኪንግ አለ።',
    breakfast:     'ቁርስ ከጠዋቱ 7:00 እስከ 10:00 ራስ ካፌ ውስጥ ይቀርባል።',
    tours:         'የሃረርን ታሪካዊ ቦታዎች፣ ጅቦ መመገብ እና የቡና ሥነ ሥርዓት ጉብኝቶችን ማዘጋጀት እንችላለን።',
    transport:     'ቀደም ብለው ለሚያስይዙ እንግዶች ሻትል አገልግሎት ይቀርባል። ሃረር ከአዲስ አበባ 526 ኪ.ሜ ርቀት ላይ ነው።',
    cafe:          'ራስ ካፌ ትኩስ ቡና፣ ጣፋጭ ፓስትሪ እና ቀላል ምግቦችን ያቀርባል።',
    cinema:        'ራስ ሲኒማ እና ጌም ዞን ለፊልም ቅርጫ እና ለኮርፖሬት ስብሰባዎች ይቀርባል።',
    wifi:          'ነፃ ዋይፋይ በሆቴሉ ሁሉም ቦታ ይቀርባል።',
    atm:           'ATM ማሽኖች ለዓለም አቀፍ እና አካባቢያዊ ምንዛሬ ልውውጥ ይቀርባሉ።',
    laundry:       'ልብስ ማጠቢያ ቦታ አለ። እንግዶች ራሳቸው ወይም በሰራተኞች እርዳታ ልብሳቸውን ማጠብ ይችላሉ።',
  },
  om: {
    hotel_name:    'Hoteela Ras',
    location:      'Harar Jugol (Magaalaa Dallaa), Harar, Itoophiyaa — magaalaa seenaa UNESCO World Heritage keessatti',
    phone:         '+251256660027, +251930179947',
    email:         'reservation@hararrashotel.com',
    checkin_time:  'Sa\'a 2:00 galgala (14:00)',
    checkout_time: 'Sa\'a 12:00 guyyaa',
    amenities:     'WiFi bilisaa bakka hundatti, daandii dhiqannaa dhuunfaa, qulqullina guyyaa guyyaa, simsiisaa 24/7, tajaajila shuttle, Ras Cinema fi Game Zone, ATM, uffata dhiquu, Ras Café',
    room_types:    'Kutaa Single (Birr 2,000/halkan)\nKutaa Suite (Birr 4,000/halkan)\nKutaa Twin Small (Birr 2,000/halkan)\nKutaa Twin Large (Birr 4,000/halkan)',
    payment:       'Maallaqa qabatamaa, TeleBirr, CBE Birr fi Chapa online fudhanna',
    cancellation:  'Sa\'a 48 dura check-in dura bilisaan haquu ni danda\'ama (deebii guutuu). Sa\'a 48 keessatti: 50% deebifama. Guyyaa check-in ykn dhufuu dhabuuf: deebii hin jiru.',
    booking:       'Marsariitii keenya irratti ykn simsiisaa bilbilaa qabadhu. Keessummoota kallattiin dhufan ni simanna.',
    parking:       'Bakka dhaabuu murtaa\'aa qabna.',
    breakfast:     'Quraansi sa\'a 7:00 hanga 10:00 Ras Café keessatti ni dhiyaata.',
    tours:         'Bakka seenaa Harar, nyaata hyena fi sirna bunaa daawwachuu qopheessuu ni dandeenya.',
    transport:     'Tajaajilli shuttle keessummoota duraan qabataniif ni dhiyaata. Harar Finfinnee irraa km 526 fagaata.',
    cafe:          'Ras Café bunaa haaraa, damma fi nyaata salphaa dhiyeessa.',
    cinema:        'Ras Cinema fi Game Zone filimii fi walgahii dhaabbataa dhiyeessa.',
    wifi:          'WiFi bilisaa bakka hoteela hundatti ni argama.',
    atm:           'Meeshaaleen ATM jijjiirraa maallaqaa idil-addunyaa fi naannoo dhiyeessu.',
    laundry:       'Bakka uffata dhiquu qabna. Keessumoonni ofii ykn gargaarsa hojjettootaan uffata dhiqachuu ni danda\'u.',
  },
};

// ── Intent patterns ───────────────────────────────────────────

const INTENTS: Array<{
  patterns: Record<string, RegExp[]>;
  respond:  (kb: typeof HOTEL_KB['en'], lang: string) => string;
}> = [
  {
    patterns: {
      en: [/check.?in|arrival|when.*arrive|arrive.*when/i],
      am: [/ቼክ.?ኢን|መምጣት|ሲደርሱ/i],
      om: [/check.?in|ga\'uu|yeroo dhufuu/i],
    },
    respond: (kb) => `Check-in time is ${kb.checkin_time}. Early check-in may be available on request.`,
  },
  {
    patterns: {
      en: [/check.?out|departure|leave|leaving/i],
      am: [/ቼክ.?አውት|መሄድ|ሲሄዱ/i],
      om: [/check.?out|ba\'uu|deemuu/i],
    },
    respond: (kb) => `Check-out time is ${kb.checkout_time}. Late check-out may be available on request.`,
  },
  {
    patterns: {
      en: [/price|cost|rate|how much|fee|charge/i],
      am: [/ዋጋ|ምን ያህል|ክፍያ/i],
      om: [/gatii|meeqa|kaffaltii/i],
    },
    respond: (kb) => `Our room rates:\n${kb.room_types}\n\nAll rates are per night and include free WiFi.`,
  },
  {
    patterns: {
      en: [/pay|payment|method|cash|telebirr|chapa|cbe/i],
      am: [/ክፍያ|ቴሌብር|ቻፓ|ጥሬ ገንዘብ/i],
      om: [/kaffaltii|telebirr|chapa|maallaqa/i],
    },
    respond: (kb) => `${kb.payment}`,
  },
  {
    patterns: {
      en: [/cancel|refund|cancellation/i],
      am: [/ሰርዝ|ተመላሽ|ሰርዛ/i],
      om: [/haquu|deebii|cancel/i],
    },
    respond: (kb) => `Cancellation policy: ${kb.cancellation}`,
  },
  {
    patterns: {
      en: [/book|reservation|reserve|how.*book/i],
      am: [/ያስይዙ|ቦታ ያስይዙ|ቦታ/i],
      om: [/qabadhu|galmeessuu|booking/i],
    },
    respond: (kb) => `${kb.booking} You can book online at our website or call us at ${kb.phone}.`,
  },
  {
    patterns: {
      en: [/wifi|internet|connection/i],
      am: [/ዋይፋይ|ኢንተርኔት/i],
      om: [/wifi|internet/i],
    },
    respond: (kb) => kb.wifi,
  },
  {
    patterns: {
      en: [/breakfast|food|restaurant|eat|meal|cafe|café|coffee/i],
      am: [/ቁርስ|ምግብ|ምግብ ቤት|ካፌ|ቡና/i],
      om: [/quraansa|nyaata|mana nyaataa|café|buna/i],
    },
    respond: (kb) => `${kb.breakfast}\n\n${kb.cafe}`,
  },
  {
    patterns: {
      en: [/cinema|movie|meeting|conference|game.*zone|screen/i],
      am: [/ሲኒማ|ፊልም|ስብሰባ|ጌም ዞን/i],
      om: [/cinema|filimii|walgahii|game zone/i],
    },
    respond: (kb) => kb.cinema,
  },
  {
    patterns: {
      en: [/atm|cash.*machine|currency.*exchange|exchange/i],
      am: [/ATM|ምንዛሬ|ጥሬ ገንዘብ ማሽን/i],
      om: [/ATM|jijjiirraa maallaqaa/i],
    },
    respond: (kb) => kb.atm,
  },
  {
    patterns: {
      en: [/laundry|wash.*cloth|iron|washing/i],
      am: [/ልብስ ማጠቢያ|ልብስ|ማጠብ/i],
      om: [/uffata dhiquu|uffata/i],
    },
    respond: (kb) => kb.laundry,
  },
  {
    patterns: {
      en: [/shuttle|transfer|transport|bus|pickup/i],
      am: [/ሻትል|ትራንስፖርት|ሰጪ/i],
      om: [/shuttle|geejjiba|transport/i],
    },
    respond: (kb) => kb.transport,
  },
  {
    patterns: {
      en: [/tour|visit|sight|harar|attraction|hyena|coffee/i],
      am: [/ጉብኝት|ሃረር|ጅቦ|ቡና/i],
      om: [/daawwannaa|harar|hyena|buna/i],
    },
    respond: (kb) => `${kb.tours}`,
  },
  {
    patterns: {
      en: [/location|address|where|find|directions|map/i],
      am: [/አድራሻ|የት|ቦታ/i],
      om: [/teessoo|eessa|bakka/i],
    },
    respond: (kb) => `We are located at: ${kb.location}. ${kb.transport}`,
  },
  {
    patterns: {
      en: [/phone|call|contact|reach|number/i],
      am: [/ስልክ|ደውሉ|ያግኙ/i],
      om: [/bilbila|quunnamtii|lakkoofsa/i],
    },
    respond: (kb) => `You can reach us at:\n📞 ${kb.phone}\n📧 ${kb.email}`,
  },
  {
    patterns: {
      en: [/parking|car|vehicle/i],
      am: [/ፓርኪንግ|መኪና/i],
      om: [/parking|konkolaataa/i],
    },
    respond: (kb) => kb.parking,
  },
  {
    patterns: {
      en: [/amenities|facilities|services|offer/i],
      am: [/አገልግሎቶች|ምቾቶች/i],
      om: [/tajaajila|meeshaalee/i],
    },
    respond: (kb) => `Our amenities include: ${kb.amenities}`,
  },
];

// ── Greeting patterns ─────────────────────────────────────────

const GREETINGS: Record<string, RegExp> = {
  en: /^(hi|hello|hey|good morning|good afternoon|good evening|greetings)/i,
  am: /^(ሰላም|ሃይ|ጤና ይስጥልኝ)/i,
  om: /^(akkam|nagaa|salaam|hello)/i,
};

const GREETING_RESPONSES: Record<string, string> = {
  en: 'Hello! Welcome to Ras Hotel. How can I help you today? I can answer questions about check-in/out times, room rates, amenities, bookings, and more.',
  am: 'ሰላም! ወደ ራስ ሆቴል እንኳን ደህና መጡ። ዛሬ እንዴት ልረዳዎ እችላለሁ? ስለ ቼክ-ኢን/አውት ጊዜ፣ የክፍል ዋጋ፣ አገልግሎቶች፣ ቦታ ማስያዝ እና ሌሎች ጥያቄዎችን መመለስ እችላለሁ።',
  om: 'Akkam! Hoteela Ras irratti baga nagaan dhuftan. Har\'a akkamitti si gargaaruu danda\'a? Yeroo check-in/out, gatii kutaa, tajaajila, booking fi waa\'ee biroo gaafii deebisuu ni danda\'a.',
};

// ── Booking lookup ────────────────────────────────────────────

const BOOKING_LOOKUP_PATTERNS: Record<string, RegExp> = {
  en: /booking|reservation|my.*room|reference|ref.*number|status/i,
  am: /ቦታ ማስያዝ|ቦታ|ሪፈረንስ|ሁኔታ/i,
  om: /booking|reservation|kutaa koo|reference|haala/i,
};

// ── Main handler ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, language = 'en', booking_reference, guest_phone } = body as {
      message:           string;
      language?:         'en' | 'am' | 'om';
      booking_reference?: string;
      guest_phone?:       string;
    };

    if (!message?.trim()) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Message is required' } },
        { status: 400 }
      );
    }

    const lang = (['en', 'am', 'om'].includes(language) ? language : 'en') as 'en' | 'am' | 'om';
    const kb   = HOTEL_KB[lang];
    const msg  = message.trim();

    // 1. Greeting
    if (GREETINGS[lang]?.test(msg)) {
      return NextResponse.json({ data: { reply: GREETING_RESPONSES[lang], type: 'greeting' } });
    }

    // 2. Booking lookup — if reference + phone provided
    if (booking_reference && guest_phone) {
      const supabase = createSupabaseServiceClient();
      const { data: booking } = await supabase
        .from('bookings')
        .select('booking_reference, guest_name, check_in_date, check_out_date, booking_status, total_amount, room_id, rooms(room_number, room_type)')
        .eq('booking_reference', booking_reference.toUpperCase())
        .eq('guest_phone', guest_phone)
        .single();

      if (booking) {
        const statusLabels: Record<string, Record<string, string>> = {
          en: {
            reserved_unpaid: 'Reserved (payment pending)',
            paid:            'Confirmed & paid',
            checked_in:      'Currently checked in',
            checked_out:     'Checked out',
            cancelled_full_refund:    'Cancelled (full refund)',
            cancelled_partial_refund: 'Cancelled (partial refund)',
            cancelled_no_refund:      'Cancelled (no refund)',
            no_show:         'No-show',
          },
          am: {
            reserved_unpaid: 'ተይዟል (ክፍያ ይጠበቃል)',
            paid:            'ተረጋግጧል እና ተከፍሏል',
            checked_in:      'አሁን ቼክ-ኢን ተደርጓል',
            checked_out:     'ቼክ-አውት ተደርጓል',
          },
          om: {
            reserved_unpaid: 'Qabame (kaffaltii eegama)',
            paid:            'Mirkaneeffame fi kaffalame',
            checked_in:      'Amma check-in ta\'e',
            checked_out:     'Check-out ta\'e',
          },
        };

        const statusLabel = statusLabels[lang]?.[booking.booking_status] ?? booking.booking_status;
        const room = (booking as any).rooms;

        const replies: Record<string, string> = {
          en: `Here are your booking details:\n\n📋 Reference: ${booking.booking_reference}\n👤 Guest: ${booking.guest_name}\n🏨 Room: ${room?.room_number ?? '—'} (${room?.room_type ?? '—'})\n📅 Check-in: ${booking.check_in_date}\n📅 Check-out: ${booking.check_out_date}\n💰 Total: ETB ${booking.total_amount?.toLocaleString()}\n✅ Status: ${statusLabel}`,
          am: `የቦታ ማስያዝ ዝርዝሮችዎ:\n\n📋 ሪፈረንስ: ${booking.booking_reference}\n👤 እንግዳ: ${booking.guest_name}\n🏨 ክፍል: ${room?.room_number ?? '—'} (${room?.room_type ?? '—'})\n📅 ቼክ-ኢን: ${booking.check_in_date}\n📅 ቼክ-አውት: ${booking.check_out_date}\n💰 ጠቅላላ: ${booking.total_amount?.toLocaleString()} ብር\n✅ ሁኔታ: ${statusLabel}`,
          om: `Odeeffannoo booking keessan:\n\n📋 Reference: ${booking.booking_reference}\n👤 Keessumaa: ${booking.guest_name}\n🏨 Kutaa: ${room?.room_number ?? '—'} (${room?.room_type ?? '—'})\n📅 Check-in: ${booking.check_in_date}\n📅 Check-out: ${booking.check_out_date}\n💰 Waliigala: Birr ${booking.total_amount?.toLocaleString()}\n✅ Haala: ${statusLabel}`,
        };

        return NextResponse.json({ data: { reply: replies[lang], type: 'booking_lookup' } });
      }
    }

    // 3. Intent matching
    for (const intent of INTENTS) {
      const patterns = intent.patterns[lang] ?? intent.patterns.en;
      if (patterns?.some((p) => p.test(msg))) {
        return NextResponse.json({
          data: { reply: intent.respond(kb, lang), type: 'faq' },
        });
      }
    }

    // 4. Booking lookup prompt (if message mentions booking but no ref provided)
    if (BOOKING_LOOKUP_PATTERNS[lang]?.test(msg)) {
      const prompts: Record<string, string> = {
        en: 'I can look up your booking! Please provide your booking reference number and the phone number you used when booking.',
        am: 'የቦታ ማስያዝዎን ማግኘት እችላለሁ! እባክዎ የቦታ ማስያዝ ሪፈረንስ ቁጥርዎን እና ሲያስይዙ የተጠቀሙትን ስልክ ቁጥር ያቅርቡ።',
        om: 'Booking keessan barbaaduu ni danda\'a! Maaloo lakkoofsa reference booking fi lakkoofsa bilbila booking yeroo fayyadamtan kenni.',
      };
      return NextResponse.json({ data: { reply: prompts[lang], type: 'booking_prompt' } });
    }

    // 5. Fallback
    const fallbacks: Record<string, string> = {
      en: `I'm here to help with questions about Ras Hotel. You can ask me about:\n• Check-in/out times\n• Room rates & types\n• Payment methods\n• Cancellation policy\n• Amenities & services\n• Tours & activities\n• Your booking status\n\nFor urgent matters, call us at ${kb.phone}`,
      am: `ስለ ራስ ሆቴል ጥያቄዎችን ለመመለስ እዚህ ነኝ። ስለ እነዚህ ጠይቁኝ:\n• ቼክ-ኢን/አውት ጊዜ\n• የክፍል ዋጋ እና ዓይነቶች\n• የክፍያ ዘዴዎች\n• የሰርዛ ፖሊሲ\n• አገልግሎቶች\n• ጉብኝቶች\n• የቦታ ማስያዝ ሁኔታ\n\nለአስቸኳይ ጉዳዮች: ${kb.phone}`,
      om: `Gaafii waa\'ee Hoteela Ras deebisuu nan danda\'a. Waa\'ee kanneen gaafachuu ni dandeessa:\n• Yeroo check-in/out\n• Gatii fi gosa kutaa\n• Mala kaffaltii\n• Imaammata haquu\n• Tajaajila\n• Imala\n• Haala booking keessan\n\nDhimma hatattamaaf: ${kb.phone}`,
    };

    return NextResponse.json({ data: { reply: fallbacks[lang], type: 'fallback' } });
  } catch (err: any) {
    console.error('[POST /api/v1/chatbot]', err);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Assistant unavailable. Please try again.' } },
      { status: 500 }
    );
  }
}
