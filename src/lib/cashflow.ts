import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, onSnapshot, setDoc, query, orderBy } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { Application, BusinessExpenseCategory } from '../types';

const col = (name: string) => collection(db, `cashflow_${name}`);

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

// ── CASHFLOW予算サマリー購読 ────────────────────────────────────

export interface CashflowSummary {
  fixedIncome: number;
  variableIncome: number;
  monthlyIncome: number;
  livingExpense: number;
  businessFixedExpense: number;
  monthlyExpense: number;
  balance: number;
  expenseItems: { id: string; name: string; amount: number }[];
  businessFixedItems: { id: string; name: string; amount: number }[];
  savingsBalance: number;
}

type RawIncome = { invoiceDate: string; amount: number; incomeType?: string; outsourcingCost?: number };
type RawExpense = { id: string; name: string; isActive: boolean; amount: number; expenseType?: string };

const netAmount = (i: RawIncome) => i.amount - (i.outsourcingCost ?? 0);

export function subscribeCashflowSummary(
  callback: (s: CashflowSummary) => void,
): () => void {
  const thisYM = new Date().toISOString().substring(0, 7);

  let incomes: RawIncome[] = [];
  let expenses: RawExpense[] = [];
  let savingsBalance = 0;

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
    const livingActive = activeExpenses.filter(e => e.expenseType !== 'business_fixed');
    const bizFixedActive = activeExpenses.filter(e => e.expenseType === 'business_fixed');
    const livingExpense = livingActive.reduce((s, e) => s + e.amount, 0);
    const businessFixedExpense = bizFixedActive.reduce((s, e) => s + e.amount, 0);
    callback({
      fixedIncome, variableIncome, monthlyIncome,
      livingExpense, businessFixedExpense,
      monthlyExpense: livingExpense + businessFixedExpense,
      balance: monthlyIncome - livingExpense - businessFixedExpense,
      expenseItems: livingActive.map(e => ({ id: e.id, name: e.name, amount: e.amount })),
      businessFixedItems: bizFixedActive.map(e => ({ id: e.id, name: e.name, amount: e.amount })),
      savingsBalance,
    });
  };

  const unsub1 = onSnapshot(query(col('incomes'), orderBy('invoiceDate', 'desc')), snap => {
    incomes = snap.docs.map(d => d.data() as RawIncome);
    emit();
  }, () => {});

  const unsub2 = onSnapshot(query(col('expenses'), orderBy('createdAt', 'asc')), snap => {
    expenses = snap.docs.map(d => d.data() as RawExpense);
    emit();
  }, () => {});

  const unsub3 = onSnapshot(doc(db, 'cashflow_settings', 'savings'), snap => {
    savingsBalance = snap.exists() ? ((snap.data().amount as number) ?? 0) : 0;
    emit();
  }, () => {});

  return () => { unsub1(); unsub2(); unsub3(); };
}

export function useCashflowBalance(): CashflowSummary | null {
  const [summary, setSummary] = useState<CashflowSummary | null>(null);
  useEffect(() => subscribeCashflowSummary(setSummary), []);
  return summary;
}

// ── 承認時にCASHFLOWへ書き込む ─────────────────────────────────

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
