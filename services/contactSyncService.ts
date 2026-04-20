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
    // Try the Contact Picker API (available in Chrome on Android, Edge)
    const nav = navigator as any;
    if (nav.contacts && nav.contacts.select) {
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
              validContacts.push({ name: name.trim(), phone: normalized });
            }
          }
        }
      }

      await finalizeSyncContacts(validContacts, contacts.length, onProgress, true);
      return;
    }

    // Fallback: trigger a file picker for vCard (.vcf) or CSV
    onProgress({ ...DEFAULT_PROGRESS, status: 'web_file_import', isWebMode: true });

    const contacts = await pickContactFile();
    if (contacts === null) {
      // User cancelled
      onProgress({ ...DEFAULT_PROGRESS, status: 'done', total: 0, processed: 0, synced: 0, skipped: 0, isWebMode: true });
      return;
    }

    await finalizeSyncContacts(contacts, contacts.length, onProgress, true);
  } catch (err: any) {
    // User cancelled the contact picker — treat as empty success
    if (err?.name === 'AbortError' || err?.message?.includes('cancel')) {
      onProgress({
        status: 'done',
        total: 0,
        processed: 0,
        synced: 0,
        skipped: 0,
        isWebMode: true,
      });
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

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const text = await file.text();
        if (file.name.toLowerCase().endsWith('.vcf') || file.type === 'text/vcard') {
          resolve(parseVCard(text));
        } else {
          resolve(parseCSV(text));
        }
      } catch {
        resolve([]);
      }
    };

    input.oncancel = () => resolve(null);
    // Some browsers don't fire oncancel — handle via focus trick
    window.addEventListener(
      'focus',
      () => {
        setTimeout(() => {
          if (!input.files || input.files.length === 0) resolve(null);
        }, 500);
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
    const telMatches = card.matchAll(/TEL[^:]*:(.*)/gi);
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
    (h) => h.includes('phone') || h.includes('tel') || h.includes('رقم') || h.includes('هاتف')
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
        onProgress({ status: 'processing', total, processed: i + 1, synced: validContacts.length, skipped, isWebMode: false });
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
    await uploadContactsToCloud(validContacts);
  }

  await AsyncStorage.setItem(STORAGE_KEYS.lastSyncAt, new Date().toISOString());

  onProgress({
    status: 'done',
    total,
    processed: total,
    synced: validContacts.length,
    skipped,
    isWebMode,
  });
}

/** Upload validated contacts to the shared cloud database in batches */
async function uploadContactsToCloud(contacts: { name: string; phone: string }[]): Promise<void> {
  const supabase = getSupabaseClient();
  const BATCH_SIZE = 50;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    const rows = batch.map((c) => ({
      phone_number: c.phone,
      name: c.name,
      occurrence_count: 1,
      confidence_score: 0.5,
      last_seen_at: new Date().toISOString(),
    }));

    await supabase.from('phone_records').upsert(rows, {
      onConflict: 'phone_number,name',
      ignoreDuplicates: false,
    });
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
