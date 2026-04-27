import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { BASE } from '../components/constants';

export interface CreditBalance {
  credits_used:      number;
  credit_limit:      number;
  credits_remaining: number;
  usage_pct:         number;
  usd_used:          number;
  usd_limit:         number;
  is_unlimited:      boolean;
  enforce_limit:     boolean;
  near_limit:        boolean;
  at_limit:          boolean;
  notify_at_pct:     number;
}

export interface CreditTransaction {
  id:            number;
  amount:        number;
  balance_after: number;
  tx_type:       string;
  description:   string;
  created_at:    string;
}

const DEFAULT_BALANCE: CreditBalance = {
  credits_used: 0, credit_limit: 20, credits_remaining: 20,
  usage_pct: 0, usd_used: 0, usd_limit: 5,
  is_unlimited: false, enforce_limit: false,
  near_limit: false, at_limit: false, notify_at_pct: 80,
};

export function useCredits() {
  const [balance, setBalance] = useState<CreditBalance>(DEFAULT_BALANCE);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await axios.get<CreditBalance>(`${BASE}/credits/`);
      setBalance(r.data);
    } catch {
      // not authenticated or error — keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { balance, loading, refresh };
}

export function useCreditTransactions(page = 1) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${BASE}/credits/transactions/?page=${page}&page_size=20`)
      .then(r => {
        setTransactions(r.data.transactions);
        setTotal(r.data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page]);

  return { transactions, total, loading };
}
