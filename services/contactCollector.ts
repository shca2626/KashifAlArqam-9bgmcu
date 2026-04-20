// Powered by OnSpace.AI — Contact collection (mobile + web)
//
// Reads the full available contact fields from the device and returns
// normalized RawContactRecord[]. Does NOT write to any database.

import { Platform } from 'react-native';
import { RawContactRecord } from '@/types';
import { normalizePhone } from '@/utils/phoneUtils';

export type CollectorProgress = {
  total: number;
  processed: number;
};

export type CollectorResult = {
  contacts: RawContactRecord[];
  permissionGranted: boolean;
  permissionDenied: boolean;
};

/**
 * Mobile (iOS / Android): requests permission and reads all contacts.
 * Collects all available fields from expo-contacts.
 */
async function collectMobileContacts(
  onProgress: (p: CollectorProgress) => void
): Promise<CollectorResult> {
  const Contacts = await import('expo-contacts');

  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') {
    return { contacts: [], permissionGranted: false, permissionDenied: true };
  }

  // Request every available field
  const fields: Contacts.ContactField[] = [
    Contacts.Fields.Name,
    Contacts.Fields.FirstName,
    Contacts.Fields.LastName,
    Contacts.Fields.MiddleName,
    Contacts.Fields.MaidenName,
    Contacts.Fields.Nickname,
    Contacts.Fields.Company,
    Contacts.Fields.JobTitle,
    Contacts.Fields.Department,
    Contacts.Fields.Emails,
    Contacts.Fields.Addresses,
    Contacts.Fields.Birthday,
    Contacts.Fields.Dates,
    Contacts.Fields.UrlAddresses,
    Contacts.Fields.Relationships,
    Contacts.Fields.PhoneNumbers,
    Contacts.Fields.ContactType,
    // Note field requires entitlement on iOS; may be undefined — safe to request
    Contacts.Fields.Note,
    Contacts.Fields.Image,
    Contacts.Fields.ImageAvailable,
    Contacts.Fields.SocialProfiles,
  ];

  const { data } = await Contacts.getContactsAsync({ fields });
  const total = data.length;

  const records: RawContactRecord[] = [];

  for (let i = 0; i < data.length; i++) {
    const c = data[i];

    // Build phone number entries — at least one valid number required
    const phoneEntries: RawContactRecord['phoneNumbers'] = [];
    for (const ph of c.phoneNumbers ?? []) {
      if (!ph.number) continue;
      const normalized = normalizePhone(ph.number);
      if (normalized.length < 5) continue;

      // Build a display name: prefer full name, fall back to company
      const displayName =
        (c.name ?? '').trim() ||
        [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ').trim() ||
        c.company?.trim() ||
        '';

      if (!displayName) continue;

      phoneEntries.push({
        raw: ph.number,
        normalized,
        label: ph.label ?? undefined,
        displayName,
      });
    }

    if (phoneEntries.length === 0) {
      // Contact has no usable phone numbers; skip
      if (i % 50 === 0) onProgress({ total, processed: i + 1 });
      continue;
    }

    // Build raw payload — omit large image blobs
    const rawPayload: Record<string, unknown> = {
      id: c.id,
      name: c.name,
      firstName: c.firstName,
      lastName: c.lastName,
      middleName: c.middleName,
      nickname: c.nickname,
      company: c.company,
      jobTitle: c.jobTitle,
      department: c.department,
      contactType: c.contactType,
      emails: c.emails,
      addresses: c.addresses,
      birthday: c.birthday,
      dates: c.dates,
      urlAddresses: c.urlAddresses,
      relationships: c.relationships,
      socialProfiles: c.socialProfiles,
      imageAvailable: c.imageAvailable,
      // Exclude c.image (binary blob) to avoid exceeding 1 MB DB limit
    };
    // Include note only if available and not too large
    if (c.note && c.note.length < 2000) {
      rawPayload['note'] = c.note;
    }

    records.push({
      deviceContactId: c.id,
      firstName: c.firstName ?? undefined,
      lastName: c.lastName ?? undefined,
      middleName: c.middleName ?? undefined,
      nickname: c.nickname ?? undefined,
      company: c.company ?? undefined,
      jobTitle: c.jobTitle ?? undefined,
      department: c.department ?? undefined,
      note: typeof rawPayload['note'] === 'string' ? rawPayload['note'] : undefined,
      contactType: c.contactType ?? undefined,
      phoneNumbers: phoneEntries,
      rawPayload,
    });

    if (i % 50 === 0 || i === data.length - 1) {
      onProgress({ total, processed: i + 1 });
      // Yield to keep UI thread responsive
      await sleep(8);
    }
  }

  return { contacts: records, permissionGranted: true, permissionDenied: false };
}

/**
 * Web: tries Contact Picker API first, falls back to file import (.vcf/.csv).
 * Returns empty list with permissionGranted=true if user cancels — not an error.
 */
async function collectWebContacts(
  onProgress: (p: CollectorProgress) => void
): Promise<CollectorResult> {
  const nav = navigator as any;

  // Try Contact Picker API (Chrome on Android)
  if (nav.contacts?.select) {
    try {
      const rawContacts = await nav.contacts.select(['name', 'tel'], { multiple: true });
      const records = buildRecordsFromWebPicker(rawContacts);
      onProgress({ total: rawContacts.length, processed: rawContacts.length });
      return { contacts: records, permissionGranted: true, permissionDenied: false };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { contacts: [], permissionGranted: true, permissionDenied: false };
      }
      // Fall through to file import
    }
  }

  // File import fallback
  const fileContacts = await pickContactFile();
  if (fileContacts === null) {
    // User cancelled
    return { contacts: [], permissionGranted: true, permissionDenied: false };
  }
  onProgress({ total: fileContacts.length, processed: fileContacts.length });
  return { contacts: fileContacts, permissionGranted: true, permissionDenied: false };
}

function buildRecordsFromWebPicker(rawContacts: any[]): RawContactRecord[] {
  const records: RawContactRecord[] = [];
  for (const c of rawContacts) {
    const name = Array.isArray(c.name) ? c.name[0] : (c.name ?? '');
    if (!name?.trim()) continue;
    const tels: string[] = Array.isArray(c.tel) ? c.tel : [];
    const phoneEntries: RawContactRecord['phoneNumbers'] = [];
    for (const tel of tels) {
      const normalized = normalizePhone(tel);
      if (normalized.length >= 5) {
        phoneEntries.push({ raw: tel, normalized, displayName: name.trim() });
      }
    }
    if (phoneEntries.length === 0) continue;
    records.push({
      phoneNumbers: phoneEntries,
      rawPayload: { name, tels },
    });
  }
  return records;
}

function pickContactFile(): Promise<RawContactRecord[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.vcf,.csv,text/vcard,text/csv';

    let resolved = false;
    const done = (v: RawContactRecord[] | null) => {
      if (!resolved) {
        resolved = true;
        resolve(v);
      }
    };

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { done(null); return; }
      try {
        const text = await file.text();
        if (file.name.toLowerCase().endsWith('.vcf') || file.type === 'text/vcard') {
          done(parseVCard(text));
        } else {
          done(parseCSV(text));
        }
      } catch { done([]); }
    };

    window.addEventListener('focus', () => {
      setTimeout(() => {
        if (!input.files || input.files.length === 0) done(null);
      }, 600);
    }, { once: true });

    input.click();
  });
}

function parseVCard(text: string): RawContactRecord[] {
  const records: RawContactRecord[] = [];
  for (const card of text.split(/BEGIN:VCARD/i).slice(1)) {
    const fnMatch = card.match(/FN[^:]*:(.*)/i);
    const name = fnMatch ? fnMatch[1].trim() : '';
    if (!name) continue;
    const phoneEntries: RawContactRecord['phoneNumbers'] = [];
    for (const m of card.matchAll(/TEL[^:]*:(.*)/gi)) {
      const normalized = normalizePhone(m[1]);
      if (normalized.length >= 5) {
        phoneEntries.push({ raw: m[1].trim(), normalized, displayName: name });
      }
    }
    if (phoneEntries.length === 0) continue;
    records.push({ phoneNumbers: phoneEntries, rawPayload: { fn: name } });
  }
  return records;
}

function parseCSV(text: string): RawContactRecord[] {
  const records: RawContactRecord[] = [];
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return records;
  const header = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/"/g, ''));
  const nameIdx = header.findIndex((h) => h.includes('name') || h.includes('اسم'));
  const phoneIdx = header.findIndex((h) =>
    h.includes('phone') || h.includes('tel') || h.includes('رقم') || h.includes('هاتف')
  );
  if (nameIdx === -1 || phoneIdx === -1) return records;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''));
    const name = cols[nameIdx] ?? '';
    const rawPhone = cols[phoneIdx] ?? '';
    const normalized = normalizePhone(rawPhone);
    if (name && normalized.length >= 5) {
      records.push({
        phoneNumbers: [{ raw: rawPhone, normalized, displayName: name }],
        rawPayload: { name, phone: rawPhone },
      });
    }
  }
  return records;
}

/** Public entry point — dispatches to mobile or web. */
export async function collectContacts(
  onProgress: (p: CollectorProgress) => void
): Promise<CollectorResult> {
  if (Platform.OS === 'web') {
    return collectWebContacts(onProgress);
  }
  return collectMobileContacts(onProgress);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
