// Powered by OnSpace.AI — Lookup service (OnSpace Cloud / Supabase)
import { LookupResultGroup, LabelEntry, ReportPayload } from '@/types';
import { normalizePhone } from '@/utils/phoneUtils';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

interface PhoneRecord {
  id: string;
  phone_number: string;
  name: string;
  occurrence_count: number;
  confidence_score: number;
  is_abusive: boolean;
  last_seen_at: string | null;
}

/** Group raw rows by phone_number into LookupResultGroup[] */
function groupRows(rows: PhoneRecord[]): LookupResultGroup[] {
  const map = new Map<string, PhoneRecord[]>();
  for (const row of rows) {
    const key = row.phone_number;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  const groups: LookupResultGroup[] = [];
  map.forEach((entries, phone) => {
    const sorted = [...entries].sort((a, b) => b.occurrence_count - a.occurrence_count);
    const totalOccurrences = sorted.reduce((s, r) => s + r.occurrence_count, 0);
    const isAbusive = sorted.some((r) => r.is_abusive);
    const topEntry = sorted[0];

    const labels: LabelEntry[] = sorted.map((r) => ({
      name: r.name,
      count: r.occurrence_count,
      confidenceScore: Number(r.confidence_score),
      lastSeenAt: r.last_seen_at ?? undefined,
    }));

    groups.push({
      id: topEntry.id,
      phoneNumber: phone,
      topLabel: topEntry.name,
      labels,
      totalOccurrences,
      uniqueContributors: Math.max(1, Math.floor(totalOccurrences * 0.6)),
      isAbusive,
      confidenceScore: Number(topEntry.confidence_score),
    });
  });

  // Sort by total occurrences descending
  return groups.sort((a, b) => b.totalOccurrences - a.totalOccurrences);
}

export async function searchByNumber(query: string): Promise<LookupResultGroup[]> {
  const normalized = normalizePhone(query);
  if (!normalized || normalized.length < 5) return [];

  const { data, error } = await supabase
    .from('phone_records')
    .select('*')
    .ilike('phone_number', `%${normalized}%`)
    .order('occurrence_count', { ascending: false })
    .limit(100);

  if (error) {
    console.error('searchByNumber error:', error.message);
    return [];
  }

  return groupRows((data ?? []) as PhoneRecord[]);
}

export async function searchByName(query: string): Promise<LookupResultGroup[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  const { data, error } = await supabase
    .from('phone_records')
    .select('*')
    .ilike('name', `%${q}%`)
    .order('occurrence_count', { ascending: false })
    .limit(200);

  if (error) {
    console.error('searchByName error:', error.message);
    return [];
  }

  return groupRows((data ?? []) as PhoneRecord[]);
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

  // If reported as abusive, increment abusive flag
  if (payload.reason === 'abusive' || payload.reason === 'spam') {
    await supabase
      .from('phone_records')
      .update({ is_abusive: true })
      .eq('phone_number', payload.phoneNumber)
      .eq('name', payload.labelName);
  }
}
