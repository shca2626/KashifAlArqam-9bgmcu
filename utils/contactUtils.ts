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
  const digits = normalizePhone(phoneNumber);
  try {
    await Linking.openURL(`tel:${digits}`);
  } catch {
    // Silently handle
  }
}

export async function sendSMS(phoneNumber: string): Promise<void> {
  const digits = normalizePhone(phoneNumber);
  const url = `sms:${digits}`;
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  } catch {
    // Silently handle on web
  }
}
