import { Router, Request, Response } from 'express';
import { supabase, BillingTransaction } from '../lib/supabase';
import { fraudDetectionService } from '../services/fraudDetectionService';
import { randomUUID } from 'crypto';

const router = Router();

// GET /api/transactions - Fetch all transactions with optional pagination and filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      provider_id,
      start_date,
      end_date,
      risk_level
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('billing_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    // Apply filters
    if (provider_id) {
      query = query.eq('provider_id', provider_id);
    }

    if (start_date) {
      query = query.gte('transaction_date', start_date);
    }

    if (end_date) {
      query = query.lte('transaction_date', end_date);
    }

    const { data: transactions, error, count } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch transactions',
        details: error.message
      });
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('billing_transactions')
      .select('*', { count: 'exact', head: true });

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limitNum)
      }
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/transactions/:id - Fetch specific transaction
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: transaction, error } = await supabase
      .from('billing_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: transaction
    });

  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/transactions - Create new transaction and run fraud detection
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      transaction_id,
      provider_id,
      amount,
      transaction_date,
      patient_id,
      procedure_code,
      diagnosis_code,
      raw_data
    } = req.body;

    // Validate required fields
    if (!transaction_id || !provider_id || !amount || !transaction_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: transaction_id, provider_id, amount, transaction_date'
      });
    }

    // Create transaction record
    const newTransaction: Partial<BillingTransaction> = {
      id: randomUUID(),
      transaction_id,
      provider_id,
      amount: parseFloat(amount),
      transaction_date,
      patient_id,
      procedure_code,
      diagnosis_code,
      raw_data,
      created_at: new Date().toISOString()
    };

    const { data: transaction, error: insertError } = await supabase
      .from('billing_transactions')
      .insert(newTransaction)
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create transaction',
        details: insertError.message
      });
    }

    // Run fraud detection analysis
    const analysisResult = await fraudDetectionService.processTransaction(transaction);

    res.status(201).json({
      success: true,
      data: {
        transaction,
        fraud_analysis: {
          detection_result: analysisResult.detectionResult,
          anomaly: analysisResult.anomaly,
          alert: analysisResult.alert,
          should_block: analysisResult.shouldBlock
        }
      }
    });

  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// POST /api/transactions/:id/analyze - Re-run fraud detection on existing transaction
router.post('/:id/analyze', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Fetch transaction
    const { data: transaction, error } = await supabase
      .from('billing_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Run fraud detection analysis
    const analysisResult = await fraudDetectionService.processTransaction(transaction);

    res.json({
      success: true,
      data: {
        transaction,
        fraud_analysis: {
          detection_result: analysisResult.detectionResult,
          anomaly: analysisResult.anomaly,
          alert: analysisResult.alert,
          should_block: analysisResult.shouldBlock
        }
      }
    });

  } catch (error) {
    console.error('Error analyzing transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/transactions/:id/anomalies - Get anomalies for a specific transaction
router.get('/:id/anomalies', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: anomalies, error } = await supabase
      .from('anomalies')
      .select(`
        *,
        alerts (*)
      `)
      .eq('transaction_id', id);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch anomalies',
        details: error.message
      });
    }

    res.json({
      success: true,
      data: anomalies
    });

  } catch (error) {
    console.error('Error fetching anomalies:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;