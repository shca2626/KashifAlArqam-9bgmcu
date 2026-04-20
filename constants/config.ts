// Powered by OnSpace.AI
export const APP_CONFIG = {
  name: 'كاشف الارقام الذكي',
  nameEn: 'Smart Caller ID',
  version: '1.0.0',
  searchDebounce: 300,
  maxRecentSearches: 20,
  splashDuration: 1800,
  yemenPhoneRegex: /^(\+9677|9677|7|01)\d{7,8}$/,
  // Batch size for uploading contacts to cloud
  uploadBatchSize: 30,
};

export const STORAGE_KEYS = {
  // Onboarding / boot flags
  permissionsAsked: '@kashif_permissions_asked',
  contactSyncEnabled: '@kashif_contact_sync',
  initialSyncCompleted: '@kashif_initial_sync_completed',
  syncLock: '@kashif_sync_lock',

  // Contributor identity
  deviceInstallId: '@kashif_device_install_id',
  contributorId: '@kashif_contributor_id',
  contributorPhone: '@kashif_contributor_phone',

  // Sync metadata (lightweight)
  lastSyncAt: '@kashif_last_sync_at',
  lastSyncJobId: '@kashif_last_sync_job_id',
  lastSyncStats: '@kashif_last_sync_stats',

  // Local search index (phone → name map for offline fallback)
  localContactIndex: '@kashif_local_contact_index',

  // UX
  recentSearches: '@kashif_recent_searches',
  hiddenNumbers: '@kashif_hidden_numbers',
  hiddenNames: '@kashif_hidden_names',
  moderationPrefs: '@kashif_moderation_prefs',
};

export const WHATSAPP_URL = 'https://wa.me/';
