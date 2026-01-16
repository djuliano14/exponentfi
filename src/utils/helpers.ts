/**
 * Utility helper functions
 */

/**
 * Generate a unique ID
 * In production, consider using UUID v4 or a more robust ID generator
 */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Subtract one month from a date
 */
export function subtractOneMonth(date: Date): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() - 1);
  return result;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format cents as a dollar string
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Validate that a payload has required fields
 */
export function validateWebhookPayload(payload: unknown): string[] {
  const errors: string[] = [];
  
  if (!payload || typeof payload !== 'object') {
    return ['Payload must be an object'];
  }

  const p = payload as Record<string, unknown>;

  if (!p.id || typeof p.id !== 'string') {
    errors.push('Missing or invalid "id" field');
  }

  if (!p.card_id || typeof p.card_id !== 'string') {
    errors.push('Missing or invalid "card_id" field');
  }

  if (p.amount == null || typeof p.amount !== 'number') {
    errors.push('Missing or invalid "amount" field');
  }

  if (!p.currency || typeof p.currency !== 'string') {
    errors.push('Missing or invalid "currency" field');
  }

  if (!p.merchant_data || typeof p.merchant_data !== 'object') {
    errors.push('Missing or invalid "merchant_data" field');
  }

  return errors;
}
