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
  monthlyIncome: number;
  monthlyExpense: number;
  balance: number;
}

export function subscribeCashflowSummary(
  callback: (s: CashflowSummary) => void,
): () => void {
  const thisYM = new Date().toISOString().substring(0, 7);

  let incomes: { invoiceDate: string; amount: number }[] = [];
  let expenses: { isActive: boolean; amount: number }[] = [];

  const emit = () => {
    const monthlyIncome = incomes
      .filter(i => i.invoiceDate.startsWith(thisYM))
      .reduce((s, i) => s + i.amount, 0);
    const monthlyExpense = expenses
      .filter(e => e.isActive)
      .reduce((s, e) => s + e.amount, 0);
    callback({ monthlyIncome, monthlyExpense, balance: monthlyIncome - monthlyExpense });
  };

  const q1 = query(col('incomes'), orderBy('invoiceDate', 'desc'));
  const unsub1 = onSnapshot(q1, snap => {
    incomes = snap.docs.map(d => d.data() as { invoiceDate: string; amount: number });
    emit();
  }, () => {});

  const q2 = query(col('expenses'), orderBy('createdAt', 'asc'));
  const unsub2 = onSnapshot(q2, snap => {
    expenses = snap.docs.map(d => d.data() as { isActive: boolean; amount: number });
    emit();
  }, () => {});

  return () => { unsub1(); unsub2(); };
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
