// ============================================================
// Stats Bar — Real Ras Hotel numbers
// ============================================================

interface Props {
  totalRooms: number;
  totalGuests: number;
  checkinTime: string;
  checkoutTime: string;
}

export function StatsSection({ totalRooms, totalGuests, checkinTime, checkoutTime }: Props) {
  const stats = [
    { value: totalRooms > 0 ? `${totalRooms}` : '15', label: 'Rooms available',      icon: '🏨' },
    { value: totalGuests > 0 ? `${totalGuests}+` : '1,000+', label: 'Happy guests served', icon: '⭐' },
    { value: checkinTime || '14:00',  label: 'Check-in from',   icon: '🔑' },
    { value: '24/7',                  label: 'Front desk',       icon: '🛎️' },
  ];

  return (
    <section className="bg-white border-b border-gray-100 shadow-sm">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-gray-100">
          {stats.map(({ value, label, icon }) => (
            <div key={label} className="flex items-center gap-4 px-6 py-7">
              <div className="text-3xl flex-shrink-0">{icon}</div>
              <div>
                <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
