import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type Txn } from '../types';
import { cashflowByMonth, financeSummary, nextId, productCost } from '../lib/calc';
import { formatDate, formatMonth, formatNum, formatRp, formatRpShort, monthKey, pct, todayISO } from '../lib/format';
import { ColumnChart, HBarList, Legend, Meter, TableView, type Series } from '../components/Charts';
import { Empty, Field, Modal, MoneyInput, Seg } from '../components/UI';
import { IconPlus, IconSearch, IconTrash } from '../components/Icons';

const CASH_SERIES: Series[] = [
  { key: 'cashIn', label: 'Cash in', color: 'var(--s1)' },
  { key: 'cashOut', label: 'Spending', color: 'var(--s2)' },
];

export function Finance() {
  const { data } = useStore();
  const [editing, setEditing] = useState<Txn | 'new-expense' | 'new-income' | null>(null);
  const [type, setType] = useState<'all' | 'expense' | 'income'>('all');
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(12);

  const s = useMemo(() => financeSummary(data), [data]);
  const months = useMemo(() => cashflowByMonth(data), [data]);
  const byCat = EXPENSE_CATEGORIES.map((c) => ({
    label: c,
    value: data.txns.filter((t) => t.type === 'expense' && t.category === c).reduce((a, t) => a + t.amount, 0),
  }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  const unit = data.products.map((p) => {
    const cost = productCost(data, p);
    return { p, cost, margin: p.price - cost, ratio: p.price ? (p.price - cost) / p.price : 0 };
  });
  const main = unit.find((u) => u.p.active && u.p.sizeMl === 250) ?? unit[0];
  const bottlesToBreakEven = main && main.margin > 0 ? Math.ceil(s.leftToRecover / main.margin) : 0;

  const txns = data.txns
    .filter((t) => (type === 'all' || t.type === type) && (!cat || t.category === cat))
    .filter((t) => !q || `${t.description} ${t.qtyNote} ${t.category}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const listTotal = txns.reduce((a, t) => a + (t.type === 'expense' ? -t.amount : t.amount), 0);

  return (
    <div className="stack">
      <div className="grid g4">
        <div className="card tile">
          <span className="t-label">Total spent (R&D + stock)</span>
          <span className="t-value num">{formatRp(s.spent)}</span>
          <span className="t-sub">{data.txns.filter((t) => t.type === 'expense').length} purchases</span>
        </div>
        <div className="card tile">
          <span className="t-label">Total cash in</span>
          <span className="t-value num">{formatRp(s.cashIn)}</span>
          <span className="t-sub">
            {formatRp(s.salesRevenue)} sales{s.otherIncome ? ` + ${formatRp(s.otherIncome)} other` : ''}
          </span>
        </div>
        <div className="card tile">
          <span className="t-label">{s.leftToRecover > 0 ? 'R&D left to recover' : 'Profit (cash)'}</span>
          <span className="t-value num">{formatRp(s.leftToRecover > 0 ? s.leftToRecover : s.netCash)}</span>
          <Meter value={s.recoveredRatio} label="Recovered" />
          <span className="t-sub">{pct(Math.min(1, s.recoveredRatio))} recovered</span>
        </div>
        <div className="card tile">
          <span className="t-label">Unpaid orders</span>
          <span className="t-value num">{formatRp(s.unpaid)}</span>
          <span className="t-sub">money still to collect</span>
        </div>
      </div>

      <div className="grid g3">
        <div className="card span2">
          <div className="card-head">
            <div>
              <h2>Cash in vs spending</h2>
              <div className="sub">Per month · sales count when paid</div>
            </div>
            <Legend series={CASH_SERIES} />
          </div>
          <ColumnChart
            data={months}
            series={CASH_SERIES}
            value={(d, k) => d[k as 'cashIn' | 'cashOut']}
            xLabel={(d) => formatMonth(d.month)}
            tooltipTitle={(d) => formatMonth(d.month, true)}
            format={formatRp}
            formatAxis={formatRpShort}
            labelEvery={1}
          />
          <TableView head={['Month', 'Cash in', 'Spending', 'Net']} rows={months.map((m) => [formatMonth(m.month, true), formatRp(m.cashIn), formatRp(m.cashOut), formatRp(m.cashIn - m.cashOut)])} />
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Where the money went</h2>
              <div className="sub">Spending by category</div>
            </div>
          </div>
          <HBarList rows={byCat} format={formatRpShort} color="var(--s2)" />
          <TableView head={['Category', 'Spent']} rows={byCat.map((r) => [r.label, formatRp(r.value)])} />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Unit economics</h2>
            <div className="sub">
              HPP is calculated from your recipes & ingredient prices (edit in Menu & HPP).
              {bottlesToBreakEven > 0 && main && (
                <>
                  {' '}
                  ≈ <b>{formatNum(bottlesToBreakEven)} more {main.p.code}</b> to break even.
                </>
              )}
            </div>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="r">Price</th>
                <th className="r">HPP</th>
                <th className="r">Margin</th>
                <th className="r">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {unit.map((u) => (
                <tr key={u.p.id}>
                  <td>
                    <span className="bold">{u.p.code}</span> <span className="small muted">{u.p.variant}</span>
                  </td>
                  <td className="r num">{formatRp(u.p.price)}</td>
                  <td className="r num">{formatRp(u.cost)}</td>
                  <td className="r num bold">{formatRp(u.margin)}</td>
                  <td className="r num">{pct(u.ratio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="small muted section-gap">
          Gross profit from sold bottles so far: <b>{formatRp(s.grossProfit)}</b> ({formatRp(s.salesRevenue)} sales − {formatRp(s.cogs)} HPP).
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Ledger</h2>
            <div className="sub">Purchases & other money in. Order sales are added automatically.</div>
          </div>
          <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
            <button className="btn sm" onClick={() => setEditing('new-income')}>
              <IconPlus /> Income
            </button>
            <button className="btn sm primary" onClick={() => setEditing('new-expense')}>
              <IconPlus /> Expense
            </button>
          </div>
        </div>
        <div className="row wrap" style={{ gap: 10, marginBottom: 12 }}>
          <Seg
            value={type}
            onChange={setType}
            options={[
              { value: 'all', label: 'All' },
              { value: 'expense', label: 'Spending' },
              { value: 'income', label: 'Income' },
            ]}
          />
          <select className="input" style={{ width: 170, height: 38 }} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <div className="search">
            <IconSearch />
            <input className="input" placeholder="Search item…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {txns.length ? (
          <>
            <div className="list">
              {txns.slice(0, limit).map((t) => (
                <button
                  key={t.id}
                  className="list-row"
                  style={{ background: 'none', border: 0, borderTop: '1px solid var(--border)', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => setEditing(t)}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="bold truncate">{t.description}</div>
                    <div className="tiny muted">
                      {formatDate(t.date)} · {t.category}
                      {t.qtyNote ? ` · ${t.qtyNote}` : ''}
                    </div>
                  </div>
                  <div className="bold num small" style={{ color: t.type === 'income' ? 'var(--good)' : 'var(--ink)' }}>
                    {t.type === 'income' ? '+' : '−'}
                    {formatRp(t.amount)}
                  </div>
                </button>
              ))}
            </div>
            {txns.length > limit && (
              <button className="btn sm section-gap" onClick={() => setLimit((l) => l + 30)}>
                Show more ({txns.length - limit})
              </button>
            )}
            <div className="row between small section-gap">
              <span className="muted">{txns.length} entries · total</span>
              <span className="bold num">{formatRp(listTotal)}</span>
            </div>
          </>
        ) : (
          <Empty>No entries yet.</Empty>
        )}
      </div>

      {editing && <TxnForm txn={typeof editing === 'string' ? undefined : editing} defaultType={editing === 'new-income' ? 'income' : 'expense'} onClose={() => setEditing(null)} />}
    </div>
  );
}

function TxnForm({ txn, defaultType, onClose }: { txn?: Txn; defaultType: 'income' | 'expense'; onClose: () => void }) {
  const { data, update, toast } = useStore();
  const [t, setT] = useState<Txn>(
    () =>
      txn ?? {
        id: nextId('TX', data.txns.map((x) => x.id)),
        date: todayISO(),
        type: defaultType,
        category: defaultType === 'income' ? INCOME_CATEGORIES[0] : 'Ingredients',
        description: '',
        qtyNote: '',
        amount: 0,
        createdAt: new Date().toISOString(),
      },
  );
  const set = <K extends keyof Txn>(k: K, v: Txn[K]) => setT((p) => ({ ...p, [k]: v }));
  const cats: readonly string[] = t.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const valid = t.description.trim() && t.amount > 0 && t.date;

  const save = () => {
    if (!valid) return;
    update((d) => {
      const i = d.txns.findIndex((x) => x.id === t.id);
      if (i >= 0) d.txns[i] = t;
      else d.txns.push({ ...t, id: nextId('TX', d.txns.map((x) => x.id)) });
      return d;
    });
    toast('Saved');
    onClose();
  };
  const remove = () => {
    if (!txn || !confirm('Delete this entry?')) return;
    update((d) => ({ ...d, txns: d.txns.filter((x) => x.id !== txn.id) }));
    onClose();
  };

  return (
    <Modal
      title={txn ? 'Edit entry' : t.type === 'income' ? 'Add income' : 'Add expense'}
      onClose={onClose}
      footer={
        <>
          {txn && (
            <button className="btn ghost danger" onClick={remove}>
              <IconTrash /> Delete
            </button>
          )}
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save} disabled={!valid}>
            Save
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Type" className="full">
          <Seg
            value={t.type}
            onChange={(v) => setT((p) => ({ ...p, type: v, category: v === 'income' ? INCOME_CATEGORIES[0] : 'Ingredients' }))}
            options={[
              { value: 'expense', label: 'Expense / purchase' },
              { value: 'income', label: 'Income' },
            ]}
          />
        </Field>
        <Field label="Item / description" className="full">
          <input className="input" value={t.description} onChange={(e) => set('description', e.target.value)} placeholder="Stok Fujian Oolong Tea" autoFocus />
        </Field>
        <Field label="Amount">
          <MoneyInput value={t.amount} onChange={(v) => set('amount', v)} />
        </Field>
        <Field label="Qty / note">
          <input className="input" value={t.qtyNote} onChange={(e) => set('qtyNote', e.target.value)} placeholder="4x125gr" />
        </Field>
        <Field label="Category">
          <select className="input" value={t.category} onChange={(e) => set('category', e.target.value)}>
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input className="input" type="date" value={t.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
      </div>
      {t.date && <div className="tiny muted section-gap">Counts in {formatMonth(monthKey(t.date), true)}.</div>}
    </Modal>
  );
}
