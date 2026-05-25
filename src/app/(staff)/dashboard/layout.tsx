// ============================================================
// Dashboard Layout
// src/app/(staff)/dashboard/layout.tsx
// ============================================================

import { redirect } from 'next/navigation';
import { getCurrentStaffAccount } from '@/modules/auth/domain/session';
import { DashboardSidebar } from '@/components/staff/DashboardSidebar';
import { DashboardTopBar }  from '@/components/staff/DashboardTopBar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const staff = await getCurrentStaffAccount();
  if (!staff) redirect('/login?reason=session');

  return (
    <div className="dashboard flex h-screen overflow-hidden bg-gray-50">

      {/* Fixed sidebar */}
      <DashboardSidebar
        role={staff.role as 'manager' | 'receptionist'}
        staffName={staff.full_name}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopBar staffName={staff.full_name} role={staff.role} />

        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {children}
        </main>
      </div>

    </div>
  );
}
