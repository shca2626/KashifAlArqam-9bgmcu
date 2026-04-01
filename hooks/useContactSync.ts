// Powered by OnSpace.AI
import { useState, useCallback } from 'react';
import { runContactSync, SyncProgress, DEFAULT_PROGRESS } from '@/services/contactSyncService';

export function useContactSync() {
  const [progress, setProgress] = useState<SyncProgress>(DEFAULT_PROGRESS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const startSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setShowModal(true);
    setProgress(DEFAULT_PROGRESS);

    await runContactSync((p) => {
      setProgress(p);
    });

    setIsSyncing(false);
  }, [isSyncing]);

  const dismissModal = useCallback(() => {
    if (!isSyncing) {
      setShowModal(false);
      setProgress(DEFAULT_PROGRESS);
    }
  }, [isSyncing]);

  return { progress, isSyncing, showModal, startSync, dismissModal };
}
