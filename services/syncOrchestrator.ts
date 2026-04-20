// Powered by OnSpace.AI — Sync orchestrator
//
// Single entry point for all sync operations. Enforces a sync lock so the sync
// cannot run twice concurrently. Responsible for:
//   1. Ensuring contributor identity
//   2. Collecting contacts from device
//   3. Uploading in batches with progress reporting
//   4. Writing lightweight metadata to AsyncStorage
//   5. Finalizing the import job

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, APP_CONFIG } from '@/constants/config';
import { SyncStats } from '@/types';
import { ensureContributor } from './contributorService';
import { collectContacts } from './contactCollector';
import { createImportJob, finalizeImportJob, uploadContactBatch } from './persistenceService';

export type SyncStatus =
  | 'idle'
  | 'requesting_permission'
  | 'permission_denied'
  | 'reading_contacts'
  | 'processing'
  | 'uploading'
  | 'done'
  | 'error';

export interface SyncProgress {
  status: SyncStatus;
  total: number;
  processed: number;
  uploaded: number;
  skipped: number;
  errorMessage?: string;
}

export const DEFAULT_PROGRESS: SyncProgress = {
  status: 'idle',
  total: 0,
  processed: 0,
  uploaded: 0,
  skipped: 0,
};

type ProgressCallback = (p: SyncProgress) => void;

/** Returns true if a sync is currently running (sync lock is held). */
export async function isSyncLocked(): Promise<boolean> {
  const lock = await AsyncStorage.getItem(STORAGE_KEYS.syncLock);
  return lock === 'true';
}

/** Acquire lock — returns false if already locked. */
async function acquireLock(): Promise<boolean> {
  if (await isSyncLocked()) return false;
  await AsyncStorage.setItem(STORAGE_KEYS.syncLock, 'true');
  return true;
}

async function releaseLock(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.syncLock);
}

/**
 * Main sync entry point.
 * @param verifiedPhone - the contributor's own phone number (required on first sync)
 * @param onProgress    - called repeatedly with updated SyncProgress
 */
export async function runSync(
  verifiedPhone: string | null,
  onProgress: ProgressCallback
): Promise<void> {
  const locked = !(await acquireLock());
  if (locked) {
    // Sync already running — silently bail
    return;
  }

  try {
    await _runSync(verifiedPhone, onProgress);
  } finally {
    await releaseLock();
  }
}

async function _runSync(
  verifiedPhone: string | null,
  onProgress: ProgressCallback
): Promise<void> {
  // ── Step 1: Ensure contributor ────────────────────────────────────────────
  onProgress({ ...DEFAULT_PROGRESS, status: 'requesting_permission' });

  let contributorId: string;
  try {
    const profile = await ensureContributor(verifiedPhone ?? undefined);
    contributorId = profile.id;
  } catch (err: any) {
    onProgress({
      ...DEFAULT_PROGRESS,
      status: 'error',
      errorMessage: `فشل تسجيل المساهم: ${err?.message ?? 'خطأ غير متوقع'}`,
    });
    return;
  }

  // ── Step 2: Collect contacts from device ──────────────────────────────────
  onProgress({ ...DEFAULT_PROGRESS, status: 'reading_contacts' });

  let collectionResult;
  try {
    collectionResult = await collectContacts((p) => {
      onProgress({
        status: 'reading_contacts',
        total: p.total,
        processed: p.processed,
        uploaded: 0,
        skipped: 0,
      });
    });
  } catch (err: any) {
    onProgress({
      ...DEFAULT_PROGRESS,
      status: 'error',
      errorMessage: err?.message ?? 'فشل قراءة جهات الاتصال',
    });
    return;
  }

  if (collectionResult.permissionDenied) {
    onProgress({ ...DEFAULT_PROGRESS, status: 'permission_denied' });
    // Mark as asked so we don't re-prompt
    await AsyncStorage.setItem(STORAGE_KEYS.permissionsAsked, 'true');
    await AsyncStorage.setItem(STORAGE_KEYS.contactSyncEnabled, 'false');
    return;
  }

  const contacts = collectionResult.contacts;
  const totalRead = contacts.length;

  if (totalRead === 0) {
    // Permission granted but no contacts found
    await markSyncComplete('', { totalRead: 0, totalUploaded: 0, totalSkipped: 0 });
    onProgress({ status: 'done', total: 0, processed: 0, uploaded: 0, skipped: 0 });
    return;
  }

  // ── Step 3: Build local search index (offline fallback) ───────────────────
  onProgress({ status: 'processing', total: totalRead, processed: 0, uploaded: 0, skipped: 0 });

  const localIndex: Record<string, string> = {};
  for (const c of contacts) {
    for (const ph of c.phoneNumbers) {
      localIndex[ph.normalized] = ph.displayName;
    }
  }
  await AsyncStorage.setItem(STORAGE_KEYS.localContactIndex, JSON.stringify(localIndex));

  // ── Step 4: Create import job ─────────────────────────────────────────────
  onProgress({ status: 'uploading', total: totalRead, processed: 0, uploaded: 0, skipped: 0 });

  let jobId: string;
  try {
    jobId = await createImportJob(contributorId);
  } catch (err: any) {
    onProgress({
      ...DEFAULT_PROGRESS,
      status: 'error',
      errorMessage: `فشل إنشاء مهمة المزامنة: ${err?.message}`,
    });
    return;
  }

  // ── Step 5: Upload in batches ─────────────────────────────────────────────
  const BATCH = APP_CONFIG.uploadBatchSize;
  let totalUploaded = 0;
  let totalSkipped = 0;

  for (let i = 0; i < contacts.length; i += BATCH) {
    const batch = contacts.slice(i, i + BATCH);
    try {
      const uploadedRows = await uploadContactBatch(batch, contributorId, jobId);
      totalUploaded += uploadedRows;
    } catch {
      totalSkipped += batch.length;
    }

    onProgress({
      status: 'uploading',
      total: totalRead,
      processed: Math.min(i + BATCH, totalRead),
      uploaded: totalUploaded,
      skipped: totalSkipped,
    });
  }

  // ── Step 6: Finalize job and persist metadata ──────────────────────────────
  const finalStatus = totalSkipped === totalRead && totalRead > 0 ? 'error' : 'done';

  await finalizeImportJob(jobId, {
    totalRead,
    totalUploaded,
    totalSkipped,
    status: finalStatus,
  });

  await markSyncComplete(jobId, { totalRead, totalUploaded, totalSkipped });

  onProgress({
    status: finalStatus,
    total: totalRead,
    processed: totalRead,
    uploaded: totalUploaded,
    skipped: totalSkipped,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function markSyncComplete(
  jobId: string,
  stats: { totalRead: number; totalUploaded: number; totalSkipped: number }
): Promise<void> {
  const now = new Date().toISOString();
  const syncStats: SyncStats = {
    jobId,
    totalRead: stats.totalRead,
    totalUploaded: stats.totalUploaded,
    totalSkipped: stats.totalSkipped,
    completedAt: now,
  };
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.lastSyncAt, now),
    AsyncStorage.setItem(STORAGE_KEYS.lastSyncJobId, jobId),
    AsyncStorage.setItem(STORAGE_KEYS.lastSyncStats, JSON.stringify(syncStats)),
    AsyncStorage.setItem(STORAGE_KEYS.initialSyncCompleted, 'true'),
    AsyncStorage.setItem(STORAGE_KEYS.permissionsAsked, 'true'),
    AsyncStorage.setItem(STORAGE_KEYS.contactSyncEnabled, 'true'),
  ]);
}

/** Read cached sync stats from AsyncStorage (no network). */
export async function getLastSyncStats(): Promise<SyncStats | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.lastSyncStats);
    return raw ? (JSON.parse(raw) as SyncStats) : null;
  } catch {
    return null;
  }
}

export async function getLastSyncAt(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.lastSyncAt);
}
