// Powered by OnSpace.AI — Contributor identity management
//
// Manages a stable device_install_id (generated once on first run) and
// creates/upserts a contributor row in the cloud database.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { getSupabaseClient } from '@/template';
import { STORAGE_KEYS, APP_CONFIG } from '@/constants/config';
import { ContributorProfile } from '@/types';

/** Returns a stable device install ID, creating one if needed. */
export async function getOrCreateDeviceInstallId(): Promise<string> {
  let id = await AsyncStorage.getItem(STORAGE_KEYS.deviceInstallId);
  if (!id) {
    id = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${Date.now()}-${Math.random()}`
    );
    await AsyncStorage.setItem(STORAGE_KEYS.deviceInstallId, id);
  }
  return id;
}

/**
 * Registers or refreshes the contributor record in the cloud.
 * Returns the contributor profile (with cloud id).
 */
export async function ensureContributor(
  verifiedPhone?: string
): Promise<ContributorProfile> {
  const deviceInstallId = await getOrCreateDeviceInstallId();
  const platform = Platform.OS;
  const appVersion = APP_CONFIG.version;
  const supabase = getSupabaseClient();

  // Try to upsert contributor
  const { data, error } = await supabase
    .from('contributors')
    .upsert(
      {
        device_install_id: deviceInstallId,
        platform,
        app_version: appVersion,
        verified_phone: verifiedPhone ?? null,
        is_verified: !!verifiedPhone,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'device_install_id' }
    )
    .select('id, device_install_id, verified_phone, platform, app_version, is_verified')
    .single();

  if (error || !data) {
    throw new Error(`Contributor upsert failed: ${error?.message ?? 'no data'}`);
  }

  const profile: ContributorProfile = {
    id: data.id,
    deviceInstallId: data.device_install_id,
    verifiedPhone: data.verified_phone ?? null,
    platform: data.platform,
    appVersion: data.app_version,
    isVerified: data.is_verified,
  };

  // Cache locally
  await AsyncStorage.setItem(STORAGE_KEYS.contributorId, profile.id);
  if (verifiedPhone) {
    await AsyncStorage.setItem(STORAGE_KEYS.contributorPhone, verifiedPhone);
  }

  return profile;
}

/** Returns cached contributor ID without network call. */
export async function getCachedContributorId(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.contributorId);
}

/** Returns cached contributor phone without network call. */
export async function getCachedContributorPhone(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.contributorPhone);
}
