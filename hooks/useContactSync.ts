// Powered by OnSpace.AI
import { useState, useCallback, useRef } from 'react';
import { runSync, SyncProgress, DEFAULT_PROGRESS } from '@/services/syncOrchestrator';

export function useContactSync() {
  const [progress, setProgress] = useState<SyncProgress>(DEFAULT_PROGRESS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const runningRef = useRef(false);

  /**
   * Start a sync. Pass `verifiedPhone` on first run (from onboarding).
   * Subsequent (manual) resyncs pass null — contributor already exists in cloud.
   */
  const startSync = useCallback(
    async (verifiedPhone: string | null = null) => {
      if (runningRef.current) return;
      runningRef.current = true;
      setIsSyncing(true);
      setShowModal(true);
      setProgress(DEFAULT_PROGRESS);

      await runSync(verifiedPhone, (p) => {
        setProgress({ ...p });
      });

      runningRef.current = false;
      setIsSyncing(false);
    },
    []
  );

  const dismissModal = useCallback(() => {
    if (!isSyncing) {
      setShowModal(false);
      setProgress(DEFAULT_PROGRESS);
    }
  }, [isSyncing]);

  return { progress, isSyncing, showModal, startSync, dismissModal };
}
