/**
 * Utility functions for Admin feature
 */

/**
 * Format phone number to international WhatsApp format (wa.me)
 * E.g.: "08123456789" -> "https://wa.me/628123456789"
 */
export function formatWhatsAppUrl(phone: string, text?: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  }
  const baseUrl = `https://wa.me/${cleaned}`;
  if (text) {
    return `${baseUrl}?text=${encodeURIComponent(text)}`;
  }
  return baseUrl;
}

/**
 * Generate a random alphanumeric password with symbols for initial account setup
 */
export function generateRandomPassword(length = 10): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789#@!";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Calculate days remaining until expiration date
 */
export function calculateDaysRemaining(activeUntilStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeUntil = new Date(activeUntilStr);
  activeUntil.setHours(0, 0, 0, 0);

  const diffTime = activeUntil.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
