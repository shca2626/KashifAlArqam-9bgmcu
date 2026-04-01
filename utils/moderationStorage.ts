// Powered by OnSpace.AI
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HiddenItem, ModerationPrefs } from '@/types';
import { STORAGE_KEYS } from '@/constants/config';

// --- Hidden Numbers ---

export async function hideNumber(phoneNumber: string): Promise<void> {
  try {
    const items = await getHiddenItems();
    const alreadyHidden = items.some((i) => i.type === 'number' && i.value === phoneNumber);
    if (alreadyHidden) return;
    const newItem: HiddenItem = {
      id: `num_${Date.now()}`,
      type: 'number',
      value: phoneNumber,
      hiddenAt: new Date().toISOString(),
    };
    await saveHiddenItem(newItem);
  } catch {
    // ignore
  }
}

export async function hideName(phoneNumber: string, name: string): Promise<void> {
  try {
    const value = `${phoneNumber}::${name}`;
    const items = await getHiddenItems();
    const alreadyHidden = items.some((i) => i.type === 'name' && i.value === value);
    if (alreadyHidden) return;
    const newItem: HiddenItem = {
      id: `name_${Date.now()}`,
      type: 'name',
      value,
      hiddenAt: new Date().toISOString(),
    };
    await saveHiddenItem(newItem);
  } catch {
    // ignore
  }
}

export async function getHiddenItems(): Promise<HiddenItem[]> {
  try {
    const numRaw = await AsyncStorage.getItem(STORAGE_KEYS.hiddenNumbers);
    const nameRaw = await AsyncStorage.getItem(STORAGE_KEYS.hiddenNames);
    const nums: HiddenItem[] = numRaw ? JSON.parse(numRaw) : [];
    const names: HiddenItem[] = nameRaw ? JSON.parse(nameRaw) : [];
    return [...nums, ...names].sort(
      (a, b) => new Date(b.hiddenAt).getTime() - new Date(a.hiddenAt).getTime()
    );
  } catch {
    return [];
  }
}

async function saveHiddenItem(item: HiddenItem): Promise<void> {
  const key = item.type === 'number' ? STORAGE_KEYS.hiddenNumbers : STORAGE_KEYS.hiddenNames;
  const existing = await getItemsByType(item.type);
  existing.unshift(item);
  await AsyncStorage.setItem(key, JSON.stringify(existing));
}

async function getItemsByType(type: 'number' | 'name'): Promise<HiddenItem[]> {
  const key = type === 'number' ? STORAGE_KEYS.hiddenNumbers : STORAGE_KEYS.hiddenNames;
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

export async function removeHiddenItem(id: string): Promise<void> {
  try {
    const [nums, names] = await Promise.all([
      getItemsByType('number'),
      getItemsByType('name'),
    ]);
    const filteredNums = nums.filter((i) => i.id !== id);
    const filteredNames = names.filter((i) => i.id !== id);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.hiddenNumbers, JSON.stringify(filteredNums)),
      AsyncStorage.setItem(STORAGE_KEYS.hiddenNames, JSON.stringify(filteredNames)),
    ]);
  } catch {
    // ignore
  }
}

export async function clearAllHidden(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.hiddenNumbers),
      AsyncStorage.removeItem(STORAGE_KEYS.hiddenNames),
    ]);
  } catch {
    // ignore
  }
}

// --- Moderation Prefs ---

export async function getModerationPrefs(): Promise<ModerationPrefs | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.moderationPrefs);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveModerationPrefs(prefs: ModerationPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.moderationPrefs, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function isNumberHidden(phoneNumber: string, hiddenItems: HiddenItem[]): boolean {
  return hiddenItems.some((i) => i.type === 'number' && i.value === phoneNumber);
}
