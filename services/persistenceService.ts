// Powered by OnSpace.AI — Persistence layer
//
// Handles all cloud DB writes for the contact sync pipeline.
// UI and orchestration layers must not call Supabase directly.

import { getSupabaseClient } from '@/template';
import { APP_CONFIG } from '@/constants/config';
import { RawContactRecord } from '@/types';
import { Platform } from 'react-native';

const supabase = getSupabaseClient();

// ─── Import job lifecycle ─────────────────────────────────────────────────────

export async function createImportJob(contributorId: string): Promise<string> {
  const { data, error } = await supabase
    .from('import_jobs')
    .insert({
      contributor_id: contributorId,
      status: 'running',
      platform: Platform.OS,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(`createImportJob failed: ${error?.message}`);
  return data.id;
}

export async function finalizeImportJob(
  jobId: string,
  opts: { totalRead: number; totalUploaded: number; totalSkipped: number; status: 'done' | 'error'; errorMessage?: string }
): Promise<void> {
  await supabase
    .from('import_jobs')
    .update({
      status: opts.status,
      total_read: opts.totalRead,
      total_uploaded: opts.totalUploaded,
      total_skipped: opts.totalSkipped,
      error_message: opts.errorMessage ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}

// ─── Contact batch upload ─────────────────────────────────────────────────────

/**
 * Uploads a batch of raw contact records.
 * Returns the number of phone number rows actually inserted.
 */
export async function uploadContactBatch(
  records: RawContactRecord[],
  contributorId: string,
  jobId: string
): Promise<number> {
  let uploadedPhoneRows = 0;

  // Insert contacts one-by-one to get their IDs, then batch phone numbers
  // We use a single contacts insert per batch and collect IDs.
  const contactRows = records.map((r) => ({
    import_job_id: jobId,
    contributor_id: contributorId,
    device_contact_id: r.deviceContactId ?? null,
    first_name: r.firstName ?? null,
    last_name: r.lastName ?? null,
    middle_name: r.middleName ?? null,
    nickname: r.nickname ?? null,
    company: r.company ?? null,
    job_title: r.jobTitle ?? null,
    department: r.department ?? null,
    note: r.note ?? null,
    contact_type: r.contactType ?? null,
    raw_payload: sanitizePayload(r.rawPayload),
    imported_at: new Date().toISOString(),
  }));

  const { data: insertedContacts, error: contactErr } = await supabase
    .from('contacts')
    .insert(contactRows)
    .select('id');

  if (contactErr || !insertedContacts) {
    // Non-fatal: log and skip batch
    console.error('uploadContactBatch contacts insert failed:', contactErr?.message);
    return 0;
  }

  // Build phone number rows cross-referencing contact IDs by position
  const phoneRows: object[] = [];
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const contactId = insertedContacts[i]?.id;
    if (!contactId) continue;

    for (const ph of record.phoneNumbers) {
      phoneRows.push({
        contact_id: contactId,
        contributor_id: contributorId,
        import_job_id: jobId,
        phone_normalized: ph.normalized,
        phone_raw: ph.raw,
        phone_label: ph.label ?? null,
        contact_name: ph.displayName,
        imported_at: new Date().toISOString(),
      });
    }
  }

  if (phoneRows.length > 0) {
    const { error: phoneErr } = await supabase
      .from('contact_phone_numbers')
      .insert(phoneRows);

    if (phoneErr) {
      console.error('uploadContactBatch phone_numbers insert failed:', phoneErr.message);
    } else {
      uploadedPhoneRows = phoneRows.length;
    }
  }

  return uploadedPhoneRows;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Remove undefined values and truncate large strings to stay under 1 MB limit. */
function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.length > 5000) {
      out[k] = v.slice(0, 5000);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Count distinct contributors for a given phone number (for display). */
export async function countContributorsForPhone(phoneNormalized: string): Promise<number> {
  const { count, error } = await supabase
    .from('contact_phone_numbers')
    .select('contributor_id', { count: 'exact', head: true })
    .eq('phone_normalized', phoneNormalized);

  return error ? 0 : (count ?? 0);
}
