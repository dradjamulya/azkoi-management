import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { useUI } from '../App';
import { brewNeeds, ingredientMap, nextOpenDay, orderBottles, productBOM, productCost, productMap, unitCost } from '../lib/calc';
import { addDays, formatDate, formatNum, formatRp, relativeDay, todayISO } from '../lib/format';
import { Empty, Field, ProductChip, Qty, STATUS_META, Seg, StatusChip } from '../components/UI';
import { IconCopy, IconPlus } from '../components/Icons';

function readDateParam(): string | null {
  const m = window.location.hash.match(/[?&]d=(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export function Brew() {
  const { data, update, toast } = useStore();
  const { openOrder } = useUI();
  const today = todayISO();
  const [from, setFrom] = useState(() => readDateParam() ?? addDays(today, 1));
  const [to, setTo] = useState(() => readDateParam() ?? addDays(today, 1));
  const [extra, setExtra] = useState<Record<string, number>>({});
  const [doneSteps, setDoneSteps] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const on = () => {
      const d = readDateParam();
      if (d) {
        setFrom(d);
        setTo(d);
      }
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const products = productMap(data);
  const ings = ingredientMap(data);
  const { orders, counts } = useMemo(() => brewNeeds(data, from, to), [data, from, to]);

  const plan = data.products
    .map((p) => {
      const c = counts.get(p.id) ?? { todo: 0, ready: 0 };
      const add = extra[p.id] ?? 0;
      return { product: p, todo: c.todo, ready: c.ready, extra: add, make: c.todo + add };
    })
    .filter((r) => r.make > 0 || r.ready > 0 || r.product.active);

  const totals = new Map<string, number>();
  for (const r of plan) {
    if (!r.make) continue;
    for (const l of productBOM(data, r.product)) totals.set(l.ingredientId, (totals.get(l.ingredientId) ?? 0) + l.qty * r.make);
  }
  const ingRows = [...totals.entries()]
    .map(([id, qty]) => ({ ing: ings.get(id), id, qty }))
    .filter((r) => r.ing)
    .sort((a, b) => (a.ing!.unit === 'pcs' ? 1 : 0) - (b.ing!.unit === 'pcs' ? 1 : 0));
  const batchCost = ingRows.reduce((s, r) => s + unitCost(r.ing!) * r.qty, 0);
  const bottlesToMake = plan.reduce((s, r) => s + r.make, 0);
  const portions = plan.reduce((s, r) => s + r.make * r.product.recipeScale, 0);

  const recipesUsed = data.recipes.filter((rc) => plan.some((r) => r.make > 0 && r.product.recipeId === rc.id));
  const steps = (recipesUsed[0] ?? data.recipes[0])?.steps ?? [];

  const setRange = (k: string) => {
    if (k === 'today') {
      setFrom(today);
      setTo(today);
    } else if (k === 'tomorrow') {
      setFrom(addDays(today, 1));
      setTo(addDays(today, 1));
    } else if (k === 'next') {
      const d = nextOpenDay(data.settings.openDays, today);
      setFrom(d);
      setTo(d);
    } else {
      setFrom(today);
      setTo(addDays(today, 6));
    }
  };
  const rangeKey =
    from === today && to === today ? 'today' : from === addDays(today, 1) && to === from ? 'tomorrow' : from === today && to === addDays(today, 6) ? 'week' : 'custom';

  const startBrewing = () => {
    const ids = orders.filter((o) => o.status === 'new').map((o) => o.id);
    if (!ids.length) return;
    update((d) => {
      for (const o of d.orders) if (ids.includes(o.id)) o.status = 'brewing';
      return d;
    });
    toast(`${ids.length} order${ids.length > 1 ? 's' : ''} → Brewing`);
  };

  const deductStock = () => {
    if (!confirm('Subtract these ingredients from your stock?')) return;
    update((d) => {
      for (const ing of d.ingredients) {
        const used = totals.get(ing.id);
        if (used && ing.stock !== null) ing.stock = Math.max(0, ing.stock - used);
      }
      return d;
    });
    toast('Stock updated');
  };

  const copySummary = async () => {
    const lines = [
      `AZKOI brew plan · ${from === to ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`}`,
      '',
      ...plan.filter((r) => r.make).map((r) => `• ${r.make}× ${r.product.code}`),
      '',
      'Bahan:',
      ...ingRows.map((r) => `• ${r.ing!.name}: ${formatNum(Math.ceil(r.qty))} ${r.ing!.unit}`),
      '',
      'Orders:',
      ...orders.map((o) => `• ${o.id} ${o.buyer || 'Walk-in'} — ${o.items.map((i) => `${i.qty}× ${products.get(i.productId)?.code}`).join(', ')} [${STATUS_META[o.status].short}]`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast('Copied — paste it in WhatsApp / Notes');
    } catch {
      toast('Copy not allowed in this browser');
    }
  };

  return (
    <div className="stack">
      <div className="row wrap" style={{ gap: 10 }}>
        <Seg
          value={rangeKey}
          onChange={setRange}
          options={[
            { value: 'today', label: 'Today' },
            { value: 'tomorrow', label: 'Tomorrow' },
            { value: 'week', label: 'Next 7 days' },
          ]}
        />
        <div className="row" style={{ gap: 6 }}>
          <input className="input" type="date" value={from} style={{ width: 160, height: 38 }} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value); }} aria-label="From" />
          <span className="muted">–</span>
          <input className="input" type="date" value={to} style={{ width: 160, height: 38 }} onChange={(e) => setTo(e.target.value < from ? from : e.target.value)} aria-label="To" />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>
              {from === to ? `${relativeDay(from)}${relativeDay(from) !== formatDate(from) ? ` · ${formatDate(from)}` : ''}` : `${formatDate(from)} – ${formatDate(to)}`}
            </h2>
            <div className="sub">
              {bottlesToMake} bottle{bottlesToMake === 1 ? '' : 's'} to brew · {formatNum(portions)} × 250 ml portions · est. HPP {formatRp(batchCost)}
            </div>
          </div>
          <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
            <button className="btn sm" onClick={copySummary}>
              <IconCopy /> Copy
            </button>
            <button className="btn sm primary" onClick={startBrewing} disabled={!orders.some((o) => o.status === 'new')}>
              Start brewing
            </button>
          </div>
        </div>
        <div className="brew-big">
          {plan.map((r) => (
            <div key={r.product.id} className={`brew-tile ${r.product.tone}`}>
              <span className="code">{r.product.code}</span>
              <span className="n num">{r.make}</span>
              <span className="meta">
                {r.todo} ordered{r.ready ? ` · ${r.ready} already ready` : ''}
              </span>
              <Field label="+ extra (walk-in)">
                <Qty value={r.extra} onChange={(v) => setExtra((p) => ({ ...p, [r.product.id]: v }))} />
              </Field>
            </div>
          ))}
        </div>
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Ingredients needed</h2>
              <div className="sub">From your recipes in Menu & HPP</div>
            </div>
            {ingRows.some((r) => r.ing!.stock !== null) && (
              <button className="btn sm" onClick={deductStock} disabled={!bottlesToMake}>
                Use from stock
              </button>
            )}
          </div>
          {ingRows.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th className="r">Need</th>
                    <th className="r">Stock</th>
                    <th className="r">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {ingRows.map(({ ing, id, qty }) => {
                    const short = ing!.stock !== null && ing!.stock < qty;
                    return (
                      <tr key={id}>
                        <td>
                          {ing!.name}
                          {ing!.unit !== 'pcs' && ing!.packSize > 0 && ing!.packPrice > 0 && (
                            <div className="tiny muted">≈ {formatNum(qty / ing!.packSize)} pack</div>
                          )}
                        </td>
                        <td className="r num bold">
                          {formatNum(Math.ceil(qty))} {ing!.unit}
                        </td>
                        <td className="r num">
                          {ing!.stock === null ? <span className="muted">—</span> : <span className={short ? 'chip rose' : ''}>{formatNum(ing!.stock)}</span>}
                        </td>
                        <td className="r num">{formatRp(unitCost(ing!) * qty)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>Nothing to brew for this date.</Empty>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h2>Step by step</h2>
              <div className="sub">Tap a step when it's done · {recipesUsed.map((r) => r.name).join(' + ') || 'recipe'}</div>
            </div>
            <button className="btn sm ghost" onClick={() => setDoneSteps({})}>
              Reset
            </button>
          </div>
          <ol className="steps">
            {steps.map((s, i) => (
              <li key={i} className={doneSteps[i] ? 'done' : ''} onClick={() => setDoneSteps((p) => ({ ...p, [i]: !p[i] }))}>
                <span className="n" />
                <span>{s}</span>
              </li>
            ))}
          </ol>
          {recipesUsed.length > 0 && (
            <div className="small muted section-gap">
              Per 250 ml portion:{' '}
              {recipesUsed.map((rc) => (
                <div key={rc.id}>
                  <b>{rc.name}</b> — {rc.lines.map((l) => `${ings.get(l.ingredientId)?.name} ${l.qty}${ings.get(l.ingredientId)?.unit}`).join(', ')}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Orders in this plan</h2>
            <div className="sub">{orders.length} orders</div>
          </div>
          <button className="btn sm" onClick={() => openOrder(undefined, from)}>
            <IconPlus /> Add
          </button>
        </div>
        {orders.length ? (
          <div className="list">
            {orders.map((o) => (
              <button
                key={o.id}
                className="list-row"
                style={{ background: 'none', border: 0, borderTop: '1px solid var(--border)', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => openOrder(o)}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="bold truncate">
                    {o.buyer || 'Walk-in'} <span className="tiny muted">{o.id} · {formatDate(o.date)}</span>
                  </div>
                  <div className="row wrap" style={{ gap: 4, marginTop: 4 }}>
                    {o.items.map((it, i) => (
                      <ProductChip key={i} product={products.get(it.productId)} qty={it.qty} />
                    ))}
                  </div>
                </div>
                <div className="stack" style={{ gap: 4, alignItems: 'flex-end' }}>
                  <StatusChip status={o.status} />
                  <span className="tiny muted">{orderBottles(o)} btl</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Empty>No orders for this date yet.</Empty>
        )}
      </div>

      <div className="small muted">
        HPP per bottle:{' '}
        {data.products.map((p) => `${p.code} ${formatRp(productCost(data, p))}`).join(' · ')}
      </div>
    </div>
  );
}
