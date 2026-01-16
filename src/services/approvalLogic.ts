// Core transaction logic, makes sure all the card and account data is valid, limit
// not reached, not a duplicate transaction, etc.
// this is also where we might add country checks

/**
 * Transaction Approval Logic
 * 
 * This module contains the core business logic for determining
 * whether a credit card transaction should be approved or denied.
 */

import { db } from '../db';
import {
  TransactionWebhookPayload,
  ApprovalResult,
  DenialReason,
} from '../types';

/**
 * Helper function to create a denial result
 */
function deny(reason: DenialReason): ApprovalResult {
  return { approved: false, reason };
}

/**
 * Process a transaction and determine if it should be approved
 * 
 * Approval checks (in order):
 * 1. Idempotency - have we seen this transaction before?
 * 2. Card exists
 * 3. Card is active
 * 4. Account exists
 * 5. Account is active
 * 6. Credit limit not exceeded
 * 7. Per-card spending limit not exceeded (if set)
 */
export async function processTransaction(
  payload: TransactionWebhookPayload
): Promise<ApprovalResult> {
  
  // 1. Idempotency check — have we seen this transaction ID before?
  const existingTransaction = await db.transactions.findById(payload.id);
  if (existingTransaction) {
    // Return the same result we gave before
    return {
      approved: existingTransaction.status === 'approved',
      reason: existingTransaction.denialReason,
    };
  }

  // 2. Look up the card
  const card = await db.cards.findById(payload.card_id);
  if (!card) {
    return deny('card_not_found');
  }

  // 3. Check card status
  if (card.status !== 'active') {
    return deny('card_not_active');
  }

  // 4. Look up the account
  const account = await db.accounts.findById(card.accountId);
  if (!account) {
    return deny('account_not_found');
  }

  // 5. Check account status
  if (account.status !== 'active') {
    return deny('account_not_active');
  }

  // 6. Check credit limit
  const newBalance = account.currentBalance + payload.amount;
  if (newBalance > account.creditLimit) {
    return deny('insufficient_credit');
  }

  // 7. Check per-card spending limit (if set)
  if (card.spendingLimit && payload.amount > card.spendingLimit) {
    return deny('exceeds_card_limit');
  }

  // All checks passed — approve
  return {
    approved: true,
    card,
    account,
  };
}
