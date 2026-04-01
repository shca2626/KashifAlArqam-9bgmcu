// Powered by OnSpace.AI
import { APP_CONFIG } from '@/constants/config';

/** Check if a query looks like a phone number */
export function isPhoneQuery(query: string): boolean {
  const cleaned = query.replace(/[\s\-\(\)\.]/g, '');
  return /^[\d\+]{7,}$/.test(cleaned);
}

/** Normalize phone to digits only */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\+\.]/g, '');
}

/** Format phone number for display */
export function formatPhoneDisplay(phone: string): string {
  const digits = normalizePhone(phone);
  if (digits.startsWith('9677') && digits.length === 11) {
    return `+967 ${digits.slice(4, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  if (digits.startsWith('7') && digits.length === 9) {
    return `0${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return phone;
}

/** Check if phone matches Yemen format */
export function isYemenPhone(phone: string): boolean {
  const cleaned = normalizePhone(phone);
  return APP_CONFIG.yemenPhoneRegex.test(cleaned);
}
