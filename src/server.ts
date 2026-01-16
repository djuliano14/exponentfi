/**
 * Express Server
 * 
 * Main entry point for the credit card transaction processing platform.
 * Exposes the webhook endpoint at POST /webhooks/transactions
 */

import express, { Request, Response } from 'express';
import { handleTransactionWebhook } from './services/webhookHandler';
import { generateMonthlyStatements } from './services/statementGenerator';
import { TransactionWebhookPayload } from './types';
import { validateWebhookPayload } from './utils/helpers';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// ==================== Webhook Endpoint ====================

app.post('/webhooks/transactions', async (req: Request, res: Response) => {
  try {
    const payload = req.body as TransactionWebhookPayload;

    // Basic validation
    const validationErrors = validateWebhookPayload(payload);
    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      // Still return a valid response format - deny invalid requests
      return res.json({ approved: false });
    }

    console.log(`Processing transaction ${payload.id} for card ${payload.card_id}`);

    const response = await handleTransactionWebhook(payload);

    console.log(`Transaction ${payload.id}: ${response.approved ? 'APPROVED' : 'DENIED'}`);

    return res.json(response);
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Important: don't leak internal errors to external callers
    // Return deny on error to be safe (fail closed)
    return res.json({ approved: false });
  }
});

// ==================== Admin/Internal Endpoints ====================

// Trigger statement generation (in production, this would be a scheduled job)
app.post('/admin/generate-statements', async (req: Request, res: Response) => {
  try {
    const statements = await generateMonthlyStatements();
    return res.json({
      success: true,
      count: statements.length,
      statements: statements.map(s => ({
        id: s.id,
        accountId: s.accountId,
        closingBalance: s.closingBalance,
        minimumPayment: s.minimumPayment,
        dueDate: s.dueDate,
      })),
    });
  } catch (error) {
    console.error('Statement generation error:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate statements' });
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  return res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== Start Server ====================

app.listen(PORT, () => {
  console.log(`🚀 Transaction webhook server running on port ${PORT}`);
  console.log(`📍 Webhook endpoint: POST http://localhost:${PORT}/webhooks/transactions`);
  console.log(`📊 Statement generation: POST http://localhost:${PORT}/admin/generate-statements`);
  console.log(`❤️  Health check: GET http://localhost:${PORT}/health`);
});

export default app;
