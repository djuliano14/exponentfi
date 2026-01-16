/**
 * Statement Generator
 * 
 * This module handles the generation of monthly credit card statements.
 * In a production environment, this would be triggered by a cron job
 * or scheduled task (e.g., AWS Lambda, Cloud Functions, or a job scheduler).
 */

import { db } from '../db';
import { Statement } from '../types';
import { generateId, subtractOneMonth, addDays } from '../utils/helpers';

/**
 * Generate monthly statements for all active accounts
 * 
 * This function should be run once per month at the end of each billing cycle.
 * 
 * Flow:
 * 1. Determine the billing period (typically last month)
 * 2. For each active account:
 *    a. Get the opening balance from the previous statement
 *    b. Sum all approved transactions in the period
 *    c. Calculate the closing balance
 *    d. Calculate the minimum payment due
 *    e. Create the statement record
 */
export async function generateMonthlyStatements(): Promise<Statement[]> {
  const periodEnd = new Date();
  const periodStart = subtractOneMonth(periodEnd);

  // Get all active accounts
  const accounts = await db.accounts.findAll({ status: 'active' });
  const generatedStatements: Statement[] = [];

  for (const account of accounts) {
    const statement = await generateStatementForAccount(
      account.id,
      periodStart,
      periodEnd
    );
    generatedStatements.push(statement);
  }

  console.log(`Generated ${generatedStatements.length} statements`);
  return generatedStatements;
}

/**
 * Generate a statement for a specific account and period
 */
export async function generateStatementForAccount(
  accountId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<Statement> {
  // Get opening balance (closing balance from last statement, or 0)
  const lastStatement = await db.statements.findLatest(accountId);
  const openingBalance = lastStatement?.closingBalance ?? 0;

  // Get all approved transactions in this period
  const transactions = await db.transactions.findByAccountAndPeriod(
    accountId,
    periodStart,
    periodEnd,
    'approved'
  );

  // Calculate totals
  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  
  // Closing balance = opening + new charges
  // Note: In a full implementation, we'd also subtract payments received
  const closingBalance = openingBalance + totalSpent;

  // Calculate minimum payment
  // Standard rule: greater of 2% of balance or $25 (2500 cents)
  const minimumPayment = calculateMinimumPayment(closingBalance);

  // Create statement
  const statement: Statement = {
    id: generateId(),
    accountId,
    periodStart,
    periodEnd,
    openingBalance,
    closingBalance,
    totalSpent,
    minimumPayment,
    dueDate: addDays(periodEnd, 25), // Due 25 days after statement date
    createdAt: new Date(),
  };

  await db.statements.create(statement);
  
  console.log(`Generated statement for account ${accountId}: $${(closingBalance / 100).toFixed(2)} balance`);
  
  return statement;
}

/**
 * Calculate the minimum payment due
 * 
 * Standard credit card rules:
 * - Minimum of 2% of the balance OR $25, whichever is greater
 * - If balance is less than $25, minimum is the full balance
 */
function calculateMinimumPayment(balance: number): number {
  if (balance <= 0) {
    return 0;
  }

  const minimumFloor = 2500; // $25 in cents
  const percentagePayment = Math.ceil(balance * 0.02);

  // If balance is less than $25, pay full balance
  if (balance < minimumFloor) {
    return balance;
  }

  return Math.max(percentagePayment, minimumFloor);
}
