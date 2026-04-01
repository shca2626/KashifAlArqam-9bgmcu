// Powered by OnSpace.AI
import { Linking, Platform, Alert } from 'react-native';
import { WHATSAPP_URL } from '@/constants/config';
import { normalizePhone } from './phoneUtils';

export async function callNumber(phoneNumber: string): Promise<void> {
  const digits = normalizePhone(phoneNumber);
  const url = `tel:${digits}`;
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  } catch {
    // Silently handle on web
  }
}

export async function sendMessageByWhatsApp(phoneNumber: string): Promise<void> {
  const digits = normalizePhone(phoneNumber);
  // Ensure +967 prefix for Yemen
  const international = digits.startsWith('967')
    ? digits
    : digits.startsWith('0')
    ? `967${digits.slice(1)}`
    : `967${digits}`;
  const url = `${WHATSAPP_URL}${international}`;
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      await Linking.openURL(`https://wa.me/${international}`);
    }
  } catch {
    // Silently handle
  }
}

export async function saveToContacts(name: string, phoneNumber: string): Promise<void> {
  // On native we would use expo-contacts to add a contact
  // For now, we link to the system dial with prefilled
  const digits = normalizePhone(phoneNumber);
  if (Platform.OS === 'ios') {
    await Linking.openURL(`tel:${digits}`);
  } else {
    await Linking.openURL(`tel:${digits}`);
  }
}
