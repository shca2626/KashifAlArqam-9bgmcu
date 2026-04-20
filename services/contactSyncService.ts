// Powered by OnSpace.AI
// contactSyncService.ts is superseded by the new architecture:
//   services/syncOrchestrator.ts  — orchestrates the full sync pipeline
//   services/contactCollector.ts  — device contact reading
//   services/persistenceService.ts — cloud DB writes
//   services/contributorService.ts — contributor identity
//
// This file is kept only to avoid import errors in any unresolved references.
// All exports delegate to syncOrchestrator.

export {
  SyncProgress,
  SyncStatus,
  DEFAULT_PROGRESS,
  runSync as runContactSync,
  getLastSyncAt,
  isSyncLocked,
} from './syncOrchestrator';
