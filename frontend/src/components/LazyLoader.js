/**
 * Lazy loading wrapper component
 * Shows loading state while component loads
 * Copyright © 2024-2026 Christian David Villar Colodro. All rights reserved.
 */

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export function LazyLoader({ children, fallback }) {
  return (
    <Suspense fallback={fallback || <DefaultFallback />}>
      {children}
    </Suspense>
  );
}

function DefaultFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}
