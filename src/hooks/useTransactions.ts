import { useState, useEffect } from 'react';
import { supabase, transformTransactionsForTable, Transaction } from '../lib/supabase';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('billing_transactions')
        .select(`
          *,
          provider:providers(name)
        `)
        .order('transaction_date', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        setTransactions(transformTransactionsForTable(data));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

    // Set up real-time subscription
    const subscription = supabase
      .channel('transactions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'billing_transactions'
      }, () => {
        fetchTransactions();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { transactions, loading, error, refetch: fetchTransactions };
}