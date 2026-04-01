// Powered by OnSpace.AI — Shared types

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

export interface ReportPayload {
  phoneNumber: string;
  labelName: string;
  reason: string;
  reporterNote?: string;
  timestamp: string;
}

export interface ContactEntry {
  name: string;
  phoneNumber: string;
}
