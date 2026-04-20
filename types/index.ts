// Powered by OnSpace.AI — Shared types

// ─── Lookup ───────────────────────────────────────────────────────────────────

export interface LabelEntry {
  name: string;
  count: number;
  confidenceScore: number;
  lastSeenAt?: string;
}

export interface LookupResultGroup {
  id: string;
  phoneNumber: string;
  topLabel: string;
  labels: LabelEntry[];
  totalOccurrences: number;
  uniqueContributors: number;
  isAbusive: boolean;
  confidenceScore?: number;
}

export interface ReportPayload {
  phoneNumber: string;
  labelName: string;
  reason: string;
  reporterNote?: string;
  timestamp: string;
}

// ─── UX ───────────────────────────────────────────────────────────────────────

export interface RecentSearch {
  id: string;
  query: string;
  type: 'number' | 'name';
  resultCount?: number;
  timestamp: number;
}

export interface HiddenItem {
  id: string;
  type: 'number' | 'name';
  value: string;
  hiddenAt: string;
}

export interface ModerationPrefs {
  hideAbusiveAuto: boolean;
  filterEnabled: boolean;
}

// ─── Contributor / Sync ───────────────────────────────────────────────────────

export interface ContributorProfile {
  id: string;                // cloud UUID
  deviceInstallId: string;
  verifiedPhone: string | null;
  platform: string;
  appVersion: string;
  isVerified: boolean;
}

export interface SyncStats {
  jobId: string;
  totalRead: number;
  totalUploaded: number;
  totalSkipped: number;
  completedAt: string;
}

export interface ContactEntry {
  name: string;
  phoneNumber: string;
}

// ─── Raw contact fields collected from device ─────────────────────────────────

export interface RawContactRecord {
  deviceContactId?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  nickname?: string;
  company?: string;
  jobTitle?: string;
  department?: string;
  note?: string;
  contactType?: string;
  phoneNumbers: { raw: string; normalized: string; label?: string; displayName: string }[];
  rawPayload: Record<string, unknown>;
}
