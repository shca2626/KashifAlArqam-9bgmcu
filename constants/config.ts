// Powered by OnSpace.AI
export const APP_CONFIG = {
  name: 'كاشف الارقام الذكي',
  nameEn: 'Smart Caller ID',
  version: '1.0.0',
  // Search debounce in ms
  searchDebounce: 300,
  // Max recent searches to store
  maxRecentSearches: 20,
  // Max cached results
  maxCachedResults: 50,
  // Splash duration ms
  splashDuration: 2000,
  // Yemen phone pattern
  yemenPhoneRegex: /^(\+9677|9677|7|01)\d{7,8}$/,
};

export const STORAGE_KEYS = {
  recentSearches: '@kashif_recent_searches',
  hiddenNumbers: '@kashif_hidden_numbers',
  hiddenNames: '@kashif_hidden_names',
  moderationPrefs: '@kashif_moderation_prefs',
  cachedResults: '@kashif_cached_results',
  contactSyncEnabled: '@kashif_contact_sync',
  permissionsAsked: '@kashif_permissions_asked',
  lastSyncAt: '@kashif_last_sync_at',
  localContactIndex: '@kashif_local_contact_index',
};

export const WHATSAPP_URL = 'https://wa.me/';
