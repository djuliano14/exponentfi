// handles incoming webhook by processing and storing the transaction

/**
 * Webhook Handler
 * 
 * This module handles incoming transaction webhooks from the payment network.
 * It orchestrates the approval logic and persists the transaction record.
 */

import { db } from '../db';
import { processTransaction } from './approvalLogic';
import {
  TransactionWebhookPayload,
  WebhookResponse,
  Transaction,
} from '../types';

/**
 * Handle an incoming transaction webhook
 * 
 * Flow:
 * 1. Run approval logic
 * 2. Record the transaction (approved or denied)
 * 3. If approved, update the account balance
 * 4. Return response to payment network
 */
export async function handleTransactionWebhook(
  payload: TransactionWebhookPayload
): Promise<WebhookResponse> {
  
  // 1. Run approval logic
  const result = await processTransaction(payload);

  // 2. Record the transaction (approved or denied)
  // Only create if this is a new transaction (idempotency handled in processTransaction)
  const existingTransaction = await db.transactions.findById(payload.id);
  
  if (!existingTransaction) {
    // We need the card to get the accountId
    const card = result.card ?? await db.cards.findById(payload.card_id);
    
    const transaction: Transaction = {
      id: payload.id,
      cardId: payload.card_id,
      accountId: card?.accountId ?? 'unknown',
      amount: payload.amount,
      currency: payload.currency,
      merchantCategory: payload.merchant_data.category,
      merchantAddress: {
        line1: payload.merchant_data.address.line_1,
        line2: payload.merchant_data.address.line_2,
        city: payload.merchant_data.address.city,
        state: payload.merchant_data.address.state,
        country: payload.merchant_data.address.country,
      },
      status: result.approved ? 'approved' : 'denied',
      denialReason: result.reason,
      createdAt: new Date(),
    };

    await db.transactions.create(transaction);

    // 3. If approved, update the account balance
    if (result.approved && card) {
      await db.accounts.updateBalance(card.accountId, payload.amount);
    }
  }

  // 4. Return response to payment network
  return { approved: result.approved };
}
