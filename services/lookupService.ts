// Powered by OnSpace.AI — Lookup service (queries contact_phone_numbers)
import { LookupResultGroup, LabelEntry, ReportPayload } from '@/types';
import { normalizePhone } from '@/utils/phoneUtils';
import { getSupabaseClient } from '@/template';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/config';

const supabase = getSupabaseClient();

interface PhoneRow {
  id: string;
  phone_normalized: string;
  phone_raw: string | null;
  contact_name: string;
  is_abusive: boolean;
  contributor_id: string;
  imported_at: string | null;
}

/** Group flat phone rows into LookupResultGroup[]. */
function groupRows(rows: PhoneRow[]): LookupResultGroup[] {
  const map = new Map<string, PhoneRow[]>();
  for (const row of rows) {
    const key = row.phone_normalized;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  const groups: LookupResultGroup[] = [];
  map.forEach((entries, phone) => {
    // Count occurrences per name
    const nameCount = new Map<string, { count: number; lastSeen: string | null; isAbusive: boolean }>();
    const contributorSet = new Set<string>();

    for (const e of entries) {
      contributorSet.add(e.contributor_id);
      const existing = nameCount.get(e.contact_name);
      if (existing) {
        existing.count++;
        if (e.is_abusive) existing.isAbusive = true;
        if (e.imported_at && (!existing.lastSeen || e.imported_at > existing.lastSeen)) {
          existing.lastSeen = e.imported_at;
        }
      } else {
        nameCount.set(e.contact_name, {
          count: 1,
          lastSeen: e.imported_at,
          isAbusive: e.is_abusive,
        });
      }
    }

    const labels: LabelEntry[] = Array.from(nameCount.entries())
      .map(([name, meta]) => ({
        name,
        count: meta.count,
        confidenceScore: Math.min(0.99, 0.3 + meta.count * 0.07),
        lastSeenAt: meta.lastSeen ?? undefined,
      }))
      .sort((a, b) => b.count - a.count);

    const topEntry = labels[0];
    const totalOccurrences = labels.reduce((s, l) => s + l.count, 0);
    const isAbusive = entries.some((e) => e.is_abusive);

    groups.push({
      id: entries[0].id,
      phoneNumber: phone,
      topLabel: topEntry.name,
      labels,
      totalOccurrences,
      uniqueContributors: contributorSet.size,
      isAbusive,
      confidenceScore: topEntry.confidenceScore,
    });
  });

  return groups.sort((a, b) => b.totalOccurrences - a.totalOccurrences);
}

export async function searchByNumber(query: string): Promise<LookupResultGroup[]> {
  const normalized = normalizePhone(query);
  if (!normalized || normalized.length < 4) return [];

  const { data, error } = await supabase
    .from('contact_phone_numbers')
    .select('id, phone_normalized, phone_raw, contact_name, is_abusive, contributor_id, imported_at')
    .ilike('phone_normalized', `%${normalized}%`)
    .limit(300);

  if (error) {
    console.error('searchByNumber error:', error.message);
    // Fallback to local index
    return searchLocalByNumber(normalized);
  }

  const groups = groupRows((data ?? []) as PhoneRow[]);
  if (groups.length === 0) {
    return searchLocalByNumber(normalized);
  }
  return groups;
}

export async function searchByName(query: string): Promise<LookupResultGroup[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  const { data, error } = await supabase
    .from('contact_phone_numbers')
    .select('id, phone_normalized, phone_raw, contact_name, is_abusive, contributor_id, imported_at')
    .ilike('contact_name', `%${q}%`)
    .limit(300);

  if (error) {
    console.error('searchByName error:', error.message);
    return searchLocalByName(q);
  }

  const groups = groupRows((data ?? []) as PhoneRow[]);
  if (groups.length === 0) {
    return searchLocalByName(q);
  }
  return groups;
}

/** Local AsyncStorage fallback — used when offline or DB is empty. */
async function searchLocalByNumber(normalized: string): Promise<LookupResultGroup[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.localContactIndex);
    if (!raw) return [];
    const index: Record<string, string> = JSON.parse(raw);
    const results: LookupResultGroup[] = [];
    for (const [phone, name] of Object.entries(index)) {
      if (phone.includes(normalized) || normalized.includes(phone)) {
        results.push(makeFallbackGroup(phone, name));
      }
    }
    return results.slice(0, 50);
  } catch {
    return [];
  }
}

async function searchLocalByName(query: string): Promise<LookupResultGroup[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.localContactIndex);
    if (!raw) return [];
    const index: Record<string, string> = JSON.parse(raw);
    const lq = query.toLowerCase();
    const results: LookupResultGroup[] = [];
    for (const [phone, name] of Object.entries(index)) {
      if (name.toLowerCase().includes(lq)) {
        results.push(makeFallbackGroup(phone, name));
      }
    }
    return results.slice(0, 50);
  } catch {
    return [];
  }
}

function makeFallbackGroup(phone: string, name: string): LookupResultGroup {
  return {
    id: `local-${phone}`,
    phoneNumber: phone,
    topLabel: name,
    labels: [{ name, count: 1, confidenceScore: 0.4 }],
    totalOccurrences: 1,
    uniqueContributors: 1,
    isAbusive: false,
    confidenceScore: 0.4,
  };
}

export async function reportName(payload: ReportPayload): Promise<void> {
  const { error } = await supabase.from('name_reports').insert({
    phone_number: payload.phoneNumber,
    label_name: payload.labelName,
    reason: payload.reason,
    reporter_note: payload.reporterNote ?? null,
  });

  if (error) {
    console.error('reportName error:', error.message);
    throw new Error(error.message);
  }

  // Mark as abusive in contact_phone_numbers
  if (payload.reason === 'abusive' || payload.reason === 'spam') {
    await supabase
      .from('contact_phone_numbers')
      .update({ is_abusive: true })
      .eq('phone_normalized', normalizePhone(payload.phoneNumber))
      .eq('contact_name', payload.labelName);
  }
}
