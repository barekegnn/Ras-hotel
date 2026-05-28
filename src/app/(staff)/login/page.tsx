// ============================================================
// Staff Login Page
// src/app/(staff)/login/page.tsx
// ============================================================

import { Suspense } from 'react';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-4 border-brand-200 border-t-brand-500 animate-spin" />
    </div>}>
      <LoginForm />
    </Suspense>
  );
}
