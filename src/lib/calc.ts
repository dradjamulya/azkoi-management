import type { AppData, Ingredient, Order, Product } from '../types';
import { addDays, monthKey, todayISO } from './format';

export const unitCost = (ing: Ingredient) => (ing.packSize > 0 ? ing.packPrice / ing.packSize : 0);

export function ingredientMap(data: AppData) {
  return new Map(data.ingredients.map((i) => [i.id, i]));
}

export function productMap(data: AppData) {
  return new Map(data.products.map((p) => [p.id, p]));
}

/** Ingredients (incl. packaging) needed for ONE bottle of a product. */
export function productBOM(data: AppData, product: Product): { ingredientId: string; qty: number }[] {
  const recipe = data.recipes.find((r) => r.id === product.recipeId);
  const lines = (recipe?.lines ?? []).map((l) => ({ ingredientId: l.ingredientId, qty: l.qty * product.recipeScale }));
  return [...lines, ...product.packaging];
}

/** HPP / cost of goods for one bottle. */
export function productCost(data: AppData, product: Product): number {
  const ings = ingredientMap(data);
  return productBOM(data, product).reduce((sum, l) => {
    const ing = ings.get(l.ingredientId);
    return sum + (ing ? unitCost(ing) * l.qty : 0);
  }, 0);
}

export const orderSubtotal = (o: Order) => o.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
export const orderTotal = (o: Order) => Math.max(0, orderSubtotal(o) - (o.discount || 0));
export const orderBottles = (o: Order) => o.items.reduce((s, i) => s + i.qty, 0);
export const isActive = (o: Order) => o.status !== 'cancelled';
/** Revenue counts once an order is paid (cash actually in). */
export const isRevenue = (o: Order) => o.paid && isActive(o);

export function nextOrderId(orders: Order[]): string {
  const max = orders.reduce((m, o) => {
    const n = Number(o.id.replace(/\D/g, ''));
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `ORD-${String(max + 1).padStart(3, '0')}`;
}

export function nextId(prefix: string, ids: string[]): string {
  const max = ids.reduce((m, id) => Math.max(m, Number(id.replace(/\D/g, '')) || 0), 0);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

/** First open day on or after `from` (falls back to `from` if no open days are set). */
export function nextOpenDay(openDays: number[], from = addDays(todayISO(), 1)): string {
  if (!openDays.length) return from;
  for (let i = 0; i < 7; i++) {
    const d = addDays(from, i);
    const [y, m, day] = d.split('-').map(Number);
    if (openDays.includes(new Date(y, m - 1, day).getDay())) return d;
  }
  return from;
}

export interface FinanceSummary {
  salesRevenue: number;
  otherIncome: number;
  cashIn: number;
  spent: number;
  /** Amount still needed to recover everything spent (≥ 0). */
  leftToRecover: number;
  recoveredRatio: number;
  netCash: number;
  cogs: number;
  grossProfit: number;
  bottles: number;
  unpaid: number;
}

export function financeSummary(data: AppData, from?: string, to?: string): FinanceSummary {
  const inRange = (d: string) => (!from || d >= from) && (!to || d <= to);
  const products = productMap(data);
  const costCache = new Map<string, number>();
  const costOf = (id: string) => {
    if (!costCache.has(id)) {
      const p = products.get(id);
      costCache.set(id, p ? productCost(data, p) : 0);
    }
    return costCache.get(id)!;
  };

  let salesRevenue = 0;
  let cogs = 0;
  let bottles = 0;
  let unpaid = 0;
  for (const o of data.orders) {
    if (!inRange(o.date) || !isActive(o)) continue;
    if (!o.paid) {
      unpaid += orderTotal(o);
      continue;
    }
    salesRevenue += orderTotal(o);
    bottles += orderBottles(o);
    for (const it of o.items) cogs += costOf(it.productId) * it.qty;
  }
  let otherIncome = 0;
  let spent = 0;
  for (const t of data.txns) {
    if (!inRange(t.date)) continue;
    if (t.type === 'income') otherIncome += t.amount;
    else spent += t.amount;
  }
  const cashIn = salesRevenue + otherIncome;
  return {
    salesRevenue,
    otherIncome,
    cashIn,
    spent,
    leftToRecover: Math.max(0, spent - cashIn),
    recoveredRatio: spent > 0 ? cashIn / spent : 1,
    netCash: cashIn - spent,
    cogs,
    grossProfit: salesRevenue - cogs,
    bottles,
    unpaid,
  };
}

export function revenueByDay(data: AppData, from: string, to: string) {
  const map = new Map<string, { revenue: number; bottles: number; orders: number }>();
  for (let d = from; d <= to; d = addDays(d, 1)) map.set(d, { revenue: 0, bottles: 0, orders: 0 });
  for (const o of data.orders) {
    const row = map.get(o.date);
    if (!row || !isRevenue(o)) continue;
    row.revenue += orderTotal(o);
    row.bottles += orderBottles(o);
    row.orders += 1;
  }
  return [...map.entries()].map(([date, v]) => ({ date, ...v }));
}

export function monthsBetween(fromKey: string, toKey: string): string[] {
  const out: string[] = [];
  let [y, m] = fromKey.split('-').map(Number);
  const [ty, tm] = toKey.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export function cashflowByMonth(data: AppData) {
  const keys = [...data.orders.map((o) => o.date), ...data.txns.map((t) => t.date)].filter(Boolean).map(monthKey).sort();
  if (!keys.length) return [];
  const months = monthsBetween(keys[0], keys[keys.length - 1] > monthKey(todayISO()) ? keys[keys.length - 1] : monthKey(todayISO()));
  const rows = new Map(months.map((k) => [k, { month: k, cashIn: 0, cashOut: 0 }]));
  for (const o of data.orders) if (isRevenue(o)) rows.get(monthKey(o.date))!.cashIn += orderTotal(o);
  for (const t of data.txns) {
    const r = rows.get(monthKey(t.date));
    if (!r) continue;
    if (t.type === 'income') r.cashIn += t.amount;
    else r.cashOut += t.amount;
  }
  return [...rows.values()];
}

export interface Customer {
  key: string;
  name: string;
  contact: string;
  orders: number;
  bottles: number;
  spent: number;
  first: string;
  last: string;
  favourite: string;
}

export function customers(data: AppData): Customer[] {
  const products = productMap(data);
  const map = new Map<string, Customer & { counts: Map<string, number> }>();
  for (const o of data.orders) {
    if (!isActive(o)) continue;
    const name = o.buyer.trim() || 'Walk-in';
    const key = name.toLowerCase();
    let c = map.get(key);
    if (!c) {
      c = { key, name, contact: '', orders: 0, bottles: 0, spent: 0, first: o.date, last: o.date, favourite: '', counts: new Map() };
      map.set(key, c);
    }
    c.orders += 1;
    c.bottles += orderBottles(o);
    if (o.paid) c.spent += orderTotal(o);
    if (o.contact) c.contact = o.contact;
    if (o.date < c.first) c.first = o.date;
    if (o.date > c.last) c.last = o.date;
    for (const it of o.items) c.counts.set(it.productId, (c.counts.get(it.productId) ?? 0) + it.qty);
  }
  return [...map.values()]
    .map(({ counts, ...c }) => {
      const fav = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      return { ...c, favourite: fav ? products.get(fav[0])?.code ?? fav[0] : '' };
    })
    .sort((a, b) => b.spent - a.spent || b.orders - a.orders);
}

/** Bottles to brew per product for orders on a date range (only orders not yet ready). */
export function brewNeeds(data: AppData, from: string, to: string) {
  const counts = new Map<string, { todo: number; ready: number }>();
  const orders = data.orders.filter((o) => o.date >= from && o.date <= to && isActive(o));
  for (const o of orders) {
    for (const it of o.items) {
      const c = counts.get(it.productId) ?? { todo: 0, ready: 0 };
      if (o.status === 'new' || o.status === 'brewing') c.todo += it.qty;
      else c.ready += it.qty;
      counts.set(it.productId, c);
    }
  }
  return { orders, counts };
}
