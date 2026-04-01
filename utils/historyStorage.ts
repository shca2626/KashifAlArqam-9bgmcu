// Powered by OnSpace.AI
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RecentSearch } from '@/types';
import { STORAGE_KEYS, APP_CONFIG } from '@/constants/config';

export async function getRecentSearches(limit = 10): Promise<RecentSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.recentSearches);
    if (!raw) return [];
    const all: RecentSearch[] = JSON.parse(raw);
    return all.slice(0, limit);
  } catch {
    return [];
  }
}

export async function saveSearch(entry: Omit<RecentSearch, 'id' | 'timestamp'>): Promise<void> {
  try {
    const existing = await getRecentSearches(APP_CONFIG.maxRecentSearches);
    // Remove duplicates
    const filtered = existing.filter((r) => r.query !== entry.query || r.type !== entry.type);
    const newEntry: RecentSearch = {
      ...entry,
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    };
    const updated = [newEntry, ...filtered].slice(0, APP_CONFIG.maxRecentSearches);
    await AsyncStorage.setItem(STORAGE_KEYS.recentSearches, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.recentSearches);
  } catch {
    // ignore
  }
}

export async function removeHistoryItem(id: string): Promise<void> {
  try {
    const existing = await getRecentSearches(APP_CONFIG.maxRecentSearches);
    const filtered = existing.filter((r) => r.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.recentSearches, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}
