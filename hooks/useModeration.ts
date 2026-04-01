// Powered by OnSpace.AI
import { useState, useEffect, useCallback } from 'react';
import {
  getModerationPrefs,
  saveModerationPrefs,
  getHiddenItems,
  removeHiddenItem,
  clearAllHidden,
} from '@/utils/moderationStorage';
import { HiddenItem, ModerationPrefs } from '@/types';

const DEFAULT_PREFS: ModerationPrefs = {
  hideAbusiveAuto: true,
  filterEnabled: true,
};

export function useModeration() {
  const [prefs, setPrefs] = useState<ModerationPrefs>(DEFAULT_PREFS);
  const [hiddenItems, setHiddenItems] = useState<HiddenItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const [p, items] = await Promise.all([getModerationPrefs(), getHiddenItems()]);
      setPrefs(p ?? DEFAULT_PREFS);
      setHiddenItems(items);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const updatePref = useCallback(async (key: keyof ModerationPrefs, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await saveModerationPrefs(updated);
  }, [prefs]);

  const unhide = useCallback(async (id: string) => {
    await removeHiddenItem(id);
    setHiddenItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearAll = useCallback(async () => {
    await clearAllHidden();
    setHiddenItems([]);
  }, []);

  return { prefs, hiddenItems, isLoading, updatePref, unhide, clearAll };
}
