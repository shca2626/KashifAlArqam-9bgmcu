// Powered by OnSpace.AI
import { useState, useCallback, useRef } from 'react';
import { searchByNumber, searchByName } from '@/services/lookupService';
import { saveSearch } from '@/utils/historyStorage';
import { LookupResultGroup } from '@/types';

export function useSearch(mode: 'number' | 'name') {
  const [results, setResults] = useState<LookupResultGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = mode === 'number'
        ? await searchByNumber(query)
        : await searchByName(query);
      setResults(res);
      await saveSearch({ query, type: mode, resultCount: res.length });
    } catch {
      setError('حدث خطأ أثناء البحث');
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  const debouncedSearch = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 300);
  }, [search]);

  return { results, isLoading, error, search, debouncedSearch };
}
