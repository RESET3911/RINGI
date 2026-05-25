import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, doc, onSnapshot, setDoc, query, orderBy,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { Application, BusinessExpenseCategory } from '../types';

const col = (name: string) => collection(db, `cashflow_${name}`);

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

// ── 予算サマリー購読（案B） ────────────────────────────────────

export interface CashflowSummary {
  fixedIncome: number;
  variableIncome: number;
  monthlyIncome: number;
  monthlyExpense: number;
  balance: number;
  expenseItems: { id: string; name: string; amount: number }[];
}

type RawIncome = { invoiceDate: string; amount: number; incomeType?: string; outsourcingCost?: number };
type RawExpense = { id: string; name: string; isActive: boolean; amount: number };

const netAmount = (i: RawIncome) => i.amount - (i.outsourcingCost ?? 0);

export function subscribeCashflowSummary(
  callback: (s: CashflowSummary) => void,
): () => void {
  const thisYM = new Date().toISOString().substring(0, 7);

  let incomes: RawIncome[] = [];
  let expenses: RawExpense[] = [];

  const emit = () => {
    const thisMonthIncomes = incomes.filter(i => i.invoiceDate.startsWith(thisYM));
    const fixedIncome = thisMonthIncomes
      .filter(i => i.incomeType === 'fixed')
      .reduce((s, i) => s + netAmount(i), 0);
    const variableIncome = thisMonthIncomes
      .filter(i => i.incomeType !== 'fixed')
      .reduce((s, i) => s + netAmount(i), 0);
    const monthlyIncome = fixedIncome + variableIncome;
    const activeExpenses = expenses.filter(e => e.isActive);
    const monthlyExpense = activeExpenses.reduce((s, e) => s + e.amount, 0);
    const expenseItems = activeExpenses.map(e => ({ id: e.id, name: e.name, amount: e.amount }));
    callback({
      fixedIncome, variableIncome, monthlyIncome,
      monthlyExpense, balance: monthlyIncome - monthlyExpense,
      expenseItems,
    });
  };

  const q1 = query(col('incomes'), orderBy('invoiceDate', 'desc'));
  const unsub1 = onSnapshot(q1, snap => {
    incomes = snap.docs.map(d => d.data() as RawIncome);
    emit();
  }, () => {});

  const q2 = query(col('expenses'), orderBy('createdAt', 'asc'));
  const unsub2 = onSnapshot(q2, snap => {
    expenses = snap.docs.map(d => d.data() as RawExpense);
    emit();
  }, () => {});

  return () => { unsub1(); unsub2(); };
}

export function useCashflowBalance(): CashflowSummary | null {
  const [summary, setSummary] = useState<CashflowSummary | null>(null);
  useEffect(() => subscribeCashflowSummary(setSummary), []);
  return summary;
}

// ── 承認時にCASHFLOWへ書き込む（案A） ────────────────────────

export async function pushToCashflow(
  app: Application,
  category: 'business' | 'variable',
  subCategory: BusinessExpenseCategory,
): Promise<void> {
  const today = new Date().toISOString().substring(0, 10);

  if (category === 'business') {
    const item = {
      id: uuidv4(),
      userId: 'shared',
      date: app.decidedAt ? app.decidedAt.substring(0, 10) : today,
      amount: app.amount,
      category: subCategory,
      description: app.item,
      memo: `RINGI承認 #${app.id.substring(0, 8)}`,
      createdAt: Date.now(),
    };
    await setDoc(doc(col('business_expenses'), item.id), stripUndefined(item));
  } else {
    const item = {
      id: uuidv4(),
      name: app.item,
      amount: app.amount,
      expenseType: 'variable',
      category: 'other',
      note: `RINGI承認 #${app.id.substring(0, 8)}`,
      isActive: true,
      createdAt: Date.now(),
    };
    await setDoc(doc(col('expenses'), item.id), stripUndefined(item));
  }
}
