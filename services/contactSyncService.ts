// Powered by OnSpace.AI — Contact sync service (real contacts, web + mobile)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from '@/constants/config';
import { getSupabaseClient } from '@/template';

export type SyncStatus =
  | 'idle'
  | 'requesting_permission'
  | 'permission_denied'
  | 'reading_contacts'
  | 'processing'
  | 'uploading'
  | 'done'
  | 'error'
  | 'web_picker'
  | 'web_file_import';

export interface SyncProgress {
  status: SyncStatus;
  total: number;
  processed: number;
  synced: number;
  skipped: number;
  errorMessage?: string;
  isWebMode: boolean;
}

export const DEFAULT_PROGRESS: SyncProgress = {
  status: 'idle',
  total: 0,
  processed: 0,
  synced: 0,
  skipped: 0,
  isWebMode: false,
};

export async function getLastSyncAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.lastSyncAt);
  } catch {
    return null;
  }
}

type ProgressCallback = (p: SyncProgress) => void;

export async function runContactSync(onProgress: ProgressCallback): Promise<void> {
  const isWeb = Platform.OS === 'web';

  if (isWeb) {
    await runWebContactSync(onProgress);
  } else {
    await runMobileContactSync(onProgress);
  }
}

// ─── Web ─────────────────────────────────────────────────────────────────────

async function runWebContactSync(onProgress: ProgressCallback): Promise<void> {
  onProgress({ ...DEFAULT_PROGRESS, status: 'requesting_permission', isWebMode: true });

  try {
    // Try the Contact Picker API (Chrome on Android, Edge — NOT available in iframes)
    const nav = navigator as any;
    const hasContactsAPI = nav.contacts && typeof nav.contacts.select === 'function';

    if (hasContactsAPI) {
      try {
        onProgress({ ...DEFAULT_PROGRESS, status: 'web_picker', isWebMode: true });

        const contacts = await nav.contacts.select(
          ['name', 'tel'],
          { multiple: true }
        );

        const validContacts: { name: string; phone: string }[] = [];
        for (const c of contacts) {
          const name = Array.isArray(c.name) ? c.name[0] : c.name;
          const tels: string[] = Array.isArray(c.tel) ? c.tel : [];
          if (name && tels.length > 0) {
            for (const tel of tels) {
              const normalized = tel.replace(/\D/g, '');
              if (normalized.length >= 7) {
                validContacts.push({ name: String(name).trim(), phone: normalized });
              }
            }
          }
        }

        await finalizeSyncContacts(validContacts, contacts.length, onProgress, true);
        return;
      } catch (pickerErr: any) {
        // Contact Picker API failed (e.g., running inside an iframe, or user cancelled)
        const isIframeError =
          pickerErr?.message?.includes('top frame') ||
          pickerErr?.message?.includes('top-level') ||
          pickerErr?.message?.includes('cross-origin') ||
          pickerErr?.name === 'SecurityError';

        const isCancel =
          pickerErr?.name === 'AbortError' ||
          pickerErr?.message?.toLowerCase().includes('cancel') ||
          pickerErr?.message?.toLowerCase().includes('abort');

        if (isCancel) {
          // User cancelled — no error, just done with 0
          onProgress({ status: 'done', total: 0, processed: 0, synced: 0, skipped: 0, isWebMode: true });
          return;
        }

        if (!isIframeError) {
          // Unexpected error from Contact Picker — fall through to file import
          console.warn('Contact Picker API error (falling back to file import):', pickerErr?.message);
        }
        // Fall through to file import below
      }
    }

    // Fallback: trigger a file picker for vCard (.vcf) or CSV
    onProgress({ ...DEFAULT_PROGRESS, status: 'web_file_import', isWebMode: true });

    const contacts = await pickContactFile();
    if (contacts === null) {
      // User cancelled file picker
      onProgress({ status: 'done', total: 0, processed: 0, synced: 0, skipped: 0, isWebMode: true });
      return;
    }

    await finalizeSyncContacts(contacts, contacts.length, onProgress, true);

  } catch (err: any) {
    const isCancel =
      err?.name === 'AbortError' ||
      err?.message?.toLowerCase().includes('cancel');

    if (isCancel) {
      onProgress({ status: 'done', total: 0, processed: 0, synced: 0, skipped: 0, isWebMode: true });
      return;
    }

    onProgress({
      ...DEFAULT_PROGRESS,
      status: 'error',
      errorMessage: err?.message ?? 'حدث خطأ أثناء قراءة جهات الاتصال',
      isWebMode: true,
    });
  }
}

/** Open a file input for .vcf or .csv and parse contacts from it */
function pickContactFile(): Promise<{ name: string; phone: string }[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.vcf,.csv,text/vcard,text/csv';

    let resolved = false;
    const safeResolve = (val: { name: string; phone: string }[] | null) => {
      if (!resolved) {
        resolved = true;
        resolve(val);
      }
    };

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        safeResolve(null);
        return;
      }
      try {
        const text = await file.text();
        if (file.name.toLowerCase().endsWith('.vcf') || file.type === 'text/vcard' || file.type === 'text/x-vcard') {
          safeResolve(parseVCard(text));
        } else {
          safeResolve(parseCSV(text));
        }
      } catch {
        safeResolve([]);
      }
    };

    // Handle cancellation — some browsers fire oncancel, others don't
    (input as any).oncancel = () => safeResolve(null);

    window.addEventListener(
      'focus',
      () => {
        setTimeout(() => {
          if (!input.files || input.files.length === 0) safeResolve(null);
        }, 800);
      },
      { once: true }
    );

    input.click();
  });
}

/** Parse vCard (.vcf) file into contacts */
function parseVCard(text: string): { name: string; phone: string }[] {
  const contacts: { name: string; phone: string }[] = [];
  const cards = text.split(/BEGIN:VCARD/i).slice(1);

  for (const card of cards) {
    const fnMatch = card.match(/FN[^:]*:(.*)/i);
    const telMatches = Array.from(card.matchAll(/TEL[^:]*:(.*)/gi));
    const name = fnMatch ? fnMatch[1].trim() : '';
    if (!name) continue;
    for (const m of telMatches) {
      const normalized = m[1].replace(/\D/g, '');
      if (normalized.length >= 7) {
        contacts.push({ name, phone: normalized });
      }
    }
  }
  return contacts;
}

/** Parse CSV file — expects columns: name, phone (or phone, name) */
function parseCSV(text: string): { name: string; phone: string }[] {
  const contacts: { name: string; phone: string }[] = [];
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return contacts;

  const header = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/"/g, ''));
  const nameIdx = header.findIndex((h) => h.includes('name') || h.includes('اسم'));
  const phoneIdx = header.findIndex(
    (h) => h.includes('phone') || h.includes('tel') || h.includes('رقم') || h.includes('هاتف') || h.includes('mobile')
  );
  if (nameIdx === -1 || phoneIdx === -1) return contacts;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''));
    const name = cols[nameIdx] ?? '';
    const phone = (cols[phoneIdx] ?? '').replace(/\D/g, '');
    if (name && phone.length >= 7) {
      contacts.push({ name, phone });
    }
  }
  return contacts;
}

// ─── Mobile ──────────────────────────────────────────────────────────────────

async function runMobileContactSync(onProgress: ProgressCallback): Promise<void> {
  onProgress({ ...DEFAULT_PROGRESS, status: 'requesting_permission', isWebMode: false });

  try {
    const Contacts = await import('expo-contacts');
    const { status } = await Contacts.requestPermissionsAsync();

    if (status !== 'granted') {
      onProgress({ ...DEFAULT_PROGRESS, status: 'permission_denied', isWebMode: false });
      return;
    }

    onProgress({ ...DEFAULT_PROGRESS, status: 'reading_contacts', isWebMode: false });

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
    });

    const total = data.length;

    if (total === 0) {
      onProgress({ status: 'done', total: 0, processed: 0, synced: 0, skipped: 0, isWebMode: false });
      await AsyncStorage.setItem(STORAGE_KEYS.lastSyncAt, new Date().toISOString());
      return;
    }

    onProgress({ status: 'processing', total, processed: 0, synced: 0, skipped: 0, isWebMode: false });

    const validContacts: { name: string; phone: string }[] = [];
    const localIndex: Record<string, string> = {};
    let skipped = 0;

    for (let i = 0; i < data.length; i++) {
      const contact = data[i];
      const hasName = contact.name && contact.name.trim().length > 0;
      const hasPhone = contact.phoneNumbers && contact.phoneNumbers.length > 0;

      if (hasName && hasPhone) {
        for (const ph of contact.phoneNumbers!) {
          if (ph.number) {
            const normalized = ph.number.replace(/\D/g, '');
            if (normalized.length >= 7) {
              validContacts.push({ name: contact.name!.trim(), phone: normalized });
              localIndex[normalized] = contact.name!.trim();
            }
          }
        }
      } else {
        skipped++;
      }

      if (i % 20 === 0 || i === data.length - 1) {
        onProgress({
          status: 'processing',
          total,
          processed: i + 1,
          synced: validContacts.length,
          skipped,
          isWebMode: false,
        });
        await sleep(16);
      }
    }

    await AsyncStorage.setItem(STORAGE_KEYS.localContactIndex, JSON.stringify(localIndex));

    await finalizeSyncContacts(validContacts, total, onProgress, false, skipped);
  } catch (err: any) {
    onProgress({
      ...DEFAULT_PROGRESS,
      status: 'error',
      errorMessage: err?.message ?? 'حدث خطأ غير متوقع أثناء قراءة جهات الاتصال',
      isWebMode: false,
    });
  }
}

// ─── Shared finalization ──────────────────────────────────────────────────────

async function finalizeSyncContacts(
  validContacts: { name: string; phone: string }[],
  total: number,
  onProgress: ProgressCallback,
  isWebMode: boolean,
  skipped = 0
): Promise<void> {
  onProgress({
    status: 'uploading',
    total,
    processed: total,
    synced: validContacts.length,
    skipped,
    isWebMode,
  });

  if (validContacts.length > 0) {
    await uploadContactsToCloud(validContacts, (uploaded) => {
      onProgress({
        status: 'uploading',
        total: validContacts.length,
        processed: uploaded,
        synced: uploaded,
        skipped,
        isWebMode,
      });
    });
  }

  await AsyncStorage.setItem(STORAGE_KEYS.lastSyncAt, new Date().toISOString());
  await AsyncStorage.setItem(STORAGE_KEYS.contactSyncEnabled, 'true');

  onProgress({
    status: 'done',
    total,
    processed: total,
    synced: validContacts.length,
    skipped,
    isWebMode,
  });
}

/**
 * Upload contacts to the cloud database using a batch RPC that properly
 * increments occurrence_count on re-sync instead of overwriting.
 */
async function uploadContactsToCloud(
  contacts: { name: string; phone: string }[],
  onBatchUploaded?: (count: number) => void
): Promise<void> {
  const supabase = getSupabaseClient();
  const BATCH_SIZE = 100;
  let totalUploaded = 0;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);

    const records = batch.map((c) => ({
      phone_number: c.phone,
      name: c.name,
      confidence_score: 0.5,
    }));

    // Use the batch RPC function which properly increments occurrence_count
    const { error } = await supabase.rpc('upsert_phone_records_batch', {
      records: records,
    });

    if (error) {
      // Fallback to direct upsert if RPC fails
      console.warn('RPC upsert failed, falling back to direct upsert:', error.message);
      const rows = batch.map((c) => ({
        phone_number: c.phone,
        name: c.name,
        occurrence_count: 1,
        confidence_score: 0.5,
        last_seen_at: new Date().toISOString(),
      }));
      await supabase.from('phone_records').upsert(rows, {
        onConflict: 'phone_number,name',
        ignoreDuplicates: true,
      });
    }

    totalUploaded += batch.length;
    onBatchUploaded?.(totalUploaded);

    // Small delay between batches to avoid overwhelming the server
    if (i + BATCH_SIZE < contacts.length) {
      await sleep(50);
    }
  }
}

/** Look up a name from the local contact index */
export async function lookupFromLocalContacts(phone: string): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.localContactIndex);
    if (!raw) return null;
    const index: Record<string, string> = JSON.parse(raw);
    const normalized = phone.replace(/\D/g, '');
    if (index[normalized]) return index[normalized];
    for (const key of Object.keys(index)) {
      if (key.endsWith(normalized) || normalized.endsWith(key)) return index[key];
    }
    return null;
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
