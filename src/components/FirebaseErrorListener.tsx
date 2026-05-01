
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';

export function FirebaseErrorListener({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handlePermissionError = (error: any) => {
      // Re-throw the error so it can be caught by the Next.js development overlay
      // but we don't console.error it ourselves to avoid duplication.
      throw error;
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, []);

  return <>{children}</>;
}
