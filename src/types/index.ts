// types, main ones being Account, Card, Transaction, Statement

// ==================== Core Entities ====================

export type AccountStatus = 'active' | 'frozen' | 'closed';
export type CardStatus = 'active' | 'frozen' | 'cancelled';
export type TransactionStatus = 'approved' | 'denied';

export interface Account {
  id: string;
  creditLimit: number;      // in cents
  currentBalance: number;   // in cents (what they owe)
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Card {
  id: string;
  accountId: string;        // FK to Account
  status: CardStatus;
  spendingLimit?: number;   // optional per-card limit in cents
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;               // from webhook payload (idempotency key)
  cardId: string;           // FK to Card
  accountId: string;        // denormalized for easier querying
  amount: number;           // in cents
  currency: string;
  merchantCategory: number; // MCC code
  merchantAddress: MerchantAddress;
  status: TransactionStatus;
  denialReason?: DenialReason;
  createdAt: Date;
}

export interface MerchantAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
}

export interface Statement {
  id: string;
  accountId: string;        // FK to Account
  periodStart: Date;
  periodEnd: Date;
  openingBalance: number;   // in cents
  closingBalance: number;   // in cents
  totalSpent: number;       // sum of transactions in period
  minimumPayment: number;   // in cents
  dueDate: Date;
  createdAt: Date;
}

// ==================== Webhook Payload ====================

export interface TransactionWebhookPayload {
  id: string;
  card_id: string;
  amount: number;
  currency: string;
  merchant_data: {
    category: number;
    address: {
      line_1: string;
      line_2?: string;
      city: string;
      state: string;
      country: string;
    };
  };
}

export interface WebhookResponse {
  approved: boolean;
}

// ==================== Denial Reasons ====================

export type DenialReason =
  | 'card_not_found'
  | 'card_not_active'
  | 'account_not_found'
  | 'account_not_active'
  | 'insufficient_credit'
  | 'exceeds_card_limit';

// ==================== Approval Result ====================

export interface ApprovalResult {
  approved: boolean;
  reason?: DenialReason;
  card?: Card;
  account?: Account;
}
