// exports database functions for accounts, cards, transactions, and statements
// AI went a bit overboard here as far as demo purpose, but I like the idea

/**
 * Database abstraction layer
 * 
 * This is a placeholder implementation that defines the interface
 * for database operations. In a real implementation, this would
 * connect to PostgreSQL, MongoDB, or another database.
 */

import {
  Account,
  Card,
  Transaction,
  Statement,
  TransactionStatus,
} from '../types';

// ==================== In-Memory Storage (for demonstration) ====================

const accounts: Map<string, Account> = new Map();
const cards: Map<string, Card> = new Map();
const transactions: Map<string, Transaction> = new Map();
const statements: Statement[] = [];

// ==================== Account Operations ====================

export const accountsDb = {
  async findById(id: string): Promise<Account | null> {
    return accounts.get(id) ?? null;
  },

  async findAll(filter?: { status?: Account['status'] }): Promise<Account[]> {
    let result = Array.from(accounts.values());
    if (filter?.status) {
      result = result.filter(a => a.status === filter.status);
    }
    return result;
  },

  async create(account: Account): Promise<Account> {
    accounts.set(account.id, account);
    return account;
  },

  async updateBalance(id: string, amountToAdd: number): Promise<Account | null> {
    const account = accounts.get(id);
    if (!account) return null;

    account.currentBalance += amountToAdd;
    account.updatedAt = new Date();
    accounts.set(id, account);
    return account;
  },

  async update(id: string, updates: Partial<Account>): Promise<Account | null> {
    const account = accounts.get(id);
    if (!account) return null;

    const updated = { ...account, ...updates, updatedAt: new Date() };
    accounts.set(id, updated);
    return updated;
  },
};

// ==================== Card Operations ====================

export const cardsDb = {
  async findById(id: string): Promise<Card | null> {
    return cards.get(id) ?? null;
  },

  async findByAccountId(accountId: string): Promise<Card[]> {
    return Array.from(cards.values()).filter(c => c.accountId === accountId);
  },

  async create(card: Card): Promise<Card> {
    cards.set(card.id, card);
    return card;
  },

  async update(id: string, updates: Partial<Card>): Promise<Card | null> {
    const card = cards.get(id);
    if (!card) return null;

    const updated = { ...card, ...updates, updatedAt: new Date() };
    cards.set(id, updated);
    return updated;
  },
};

// ==================== Transaction Operations ====================

export const transactionsDb = {
  async findById(id: string): Promise<Transaction | null> {
    return transactions.get(id) ?? null;
  },

  async create(transaction: Transaction): Promise<Transaction> {
    transactions.set(transaction.id, transaction);
    return transaction;
  },

  async findByAccountAndPeriod(
    accountId: string,
    periodStart: Date,
    periodEnd: Date,
    status?: TransactionStatus
  ): Promise<Transaction[]> {
    return Array.from(transactions.values()).filter(tx => {
      const inAccount = tx.accountId === accountId;
      const inPeriod = tx.createdAt >= periodStart && tx.createdAt <= periodEnd;
      const matchesStatus = status ? tx.status === status : true;
      return inAccount && inPeriod && matchesStatus;
    });
  },

  async findByCardId(cardId: string): Promise<Transaction[]> {
    return Array.from(transactions.values()).filter(tx => tx.cardId === cardId);
  },
};

// ==================== Statement Operations ====================

export const statementsDb = {
  async create(statement: Statement): Promise<Statement> {
    statements.push(statement);
    return statement;
  },

  async findLatest(accountId: string): Promise<Statement | null> {
    const accountStatements = statements
      .filter(s => s.accountId === accountId)
      .sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime());
    
    return accountStatements[0] ?? null;
  },

  async findByAccountId(accountId: string): Promise<Statement[]> {
    return statements.filter(s => s.accountId === accountId);
  },
};

// ==================== Unified DB Export ====================

export const db = {
  accounts: accountsDb,
  cards: cardsDb,
  transactions: transactionsDb,
  statements: statementsDb,
};
