import { useMemo, useState } from 'react';
import { useStore } from '../store';
import type { AppData, Campaign, Ingredient } from '../types';
import { ingredientMap, isActive, nextId, productCost, unitCost } from '../lib/calc';
import { formatDate, formatNum, formatRp, pct, todayISO, addDays, uid } from '../lib/format';
import { Meter } from '../components/Charts';
import { Empty, Field, Modal, MoneyInput, ProductChip, Seg, Switch } from '../components/UI';
import { IconPlus, IconTrash } from '../components/Icons';

type Tab = 'sim' | 'campaigns';

export function Lab() {
  const [tab, setTab] = useState<Tab>(() => (window.location.hash.includes('tab=campaigns') ? 'campaigns' : 'sim'));
  const [newCampaign, setNewCampaign] = useState<Partial<Campaign> | null>(null);
  return (
    <div className="stack">
      <Seg
        value={tab}
        onChange={setTab}
        options={[
          { value: 'sim', label: 'Price simulator' },
          { value: 'campaigns', label: 'Campaigns' },
        ]}
      />
      {tab === 'sim' ? (
        <Simulator
          onCampaign={(c) => {
            setNewCampaign(c);
            setTab('campaigns');
          }}
        />
      ) : (
        <Campaigns prefill={newCampaign} clearPrefill={() => setNewCampaign(null)} />
      )}
    </div>
  );
}

/* ───────────────────────── simulator ───────────────────────── */

const NEW = '__new__';

interface PartChoice {
  ingredientId: string; // existing pcs ingredient, or NEW
  name: string;
  packSize: number;
  packPrice: number;
}

interface Extra {
  label: string;
  cost: number;
}

function partCost(c: PartChoice, ings: Map<string, Ingredient>) {
  if (c.ingredientId === NEW) return c.packSize > 0 ? c.packPrice / c.packSize : 0;
  const i = ings.get(c.ingredientId);
  return i ? unitCost(i) : 0;
}

const roundUp = (n: number, step = 500) => Math.ceil(n / step) * step;

function PartPicker({ label, value, onChange, pcs, ings }: { label: string; value: PartChoice; onChange: (c: PartChoice) => void; pcs: Ingredient[]; ings: Map<string, Ingredient> }) {
return (
  <div className="stack" style={{ gap: 8 }}>
    <Field label={label}>
      <select className="input" value={value.ingredientId} onChange={(e) => onChange({ ...value, ingredientId: e.target.value })}>
        {pcs.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name} — Rp{formatNum(unitCost(i))}/pcs
          </option>
        ))}
        <option value={NEW}>+ New (enter price)</option>
      </select>
    </Field>
    {value.ingredientId === NEW && (
      <div className="row wrap" style={{ gap: 8 }}>
        <input className="input" style={{ flex: '1 1 140px' }} value={value.name} placeholder="Name" onChange={(e) => onChange({ ...value, name: e.target.value })} aria-label={`${label} name`} />
        <input
          className="input num"
          style={{ width: 90 }}
          inputMode="numeric"
          value={value.packSize}
          onChange={(e) => onChange({ ...value, packSize: Number(e.target.value.replace(/\D/g, '')) || 0 })}
          aria-label="Pcs per pack"
          title="Pcs per pack"
        />
        <div style={{ width: 130 }}>
          <MoneyInput value={value.packPrice} onChange={(v) => onChange({ ...value, packPrice: v })} />
        </div>
        <span className="tiny muted" style={{ alignSelf: 'center' }}>
          pcs / pack price → Rp{formatNum(partCost(value, ings))}/pcs
        </span>
      </div>
    )}
  </div>
);
}

function Simulator({ onCampaign }: { onCampaign: (c: Partial<Campaign>) => void }) {
  const { data, update, toast } = useStore();
  const ings = ingredientMap(data);
  const pcs = data.ingredients.filter((i) => i.unit === 'pcs');
  const [code, setCode] = useState('DROM BS 100');
  const [variant, setVariant] = useState('Bare Sugar · 100 ml');
  const [recipeId, setRecipeId] = useState(data.recipes[0]?.id ?? '');
  const [sizeMl, setSizeMl] = useState(100);
  const [bottle, setBottle] = useState<PartChoice>({ ingredientId: NEW, name: 'Botol 100 ml', packSize: 50, packPrice: 75000 });
  const [sticker, setSticker] = useState<PartChoice>({ ingredientId: pcs.find((i) => i.id === 'sticker')?.id ?? NEW, name: 'Sticker kecil', packSize: 1, packPrice: 500 });
  const [extras, setExtras] = useState<Extra[]>([]);
  const [price, setPrice] = useState(12000);
  const [promo, setPromo] = useState(10000);
  const [budget, setBudget] = useState(100000);

  const recipe = data.recipes.find((r) => r.id === recipeId);
  const portions = sizeMl / 250;
  const liquid = (recipe?.lines ?? []).reduce((s, l) => s + (ings.get(l.ingredientId) ? unitCost(ings.get(l.ingredientId)!) * l.qty : 0), 0) * portions;
  const bottleCost = partCost(bottle, ings);
  const stickerCost = partCost(sticker, ings);
  const extrasCost = extras.reduce((s, e) => s + e.cost, 0);
  const hpp = liquid + bottleCost + stickerCost + extrasCost;
  const margin = price - hpp;
  const promoMargin = promo - hpp;
  const breakEvenBottles = promoMargin > 0 ? Math.ceil(budget / promoMargin) : Infinity;

  const compare = data.products
    .filter((p) => p.active)
    .map((p) => ({ p, cost: productCost(data, p), per100: (p.price / p.sizeMl) * 100 }));

  const saveProduct = () => {
    if (!code.trim()) return;
    update((d) => {
      const ensure = (c: PartChoice): string => {
        if (c.ingredientId !== NEW) return c.ingredientId;
        const id = uid('i-');
        d.ingredients.push({ id, name: c.name || 'Packaging', unit: 'pcs', packSize: c.packSize || 1, packPrice: c.packPrice, stock: null, lowAt: null });
        return id;
      };
      const packaging = [
        { ingredientId: ensure(bottle), qty: 1 },
        { ingredientId: ensure(sticker), qty: 1 },
        ...extras.map((e) => {
          const id = uid('i-');
          d.ingredients.push({ id, name: e.label || 'Extra', unit: 'pcs' as const, packSize: 1, packPrice: e.cost, stock: null, lowAt: null });
          return { ingredientId: id, qty: 1 };
        }),
      ];
      d.products.push({
        id: uid('p-'),
        code: code.trim(),
        name: 'Deep Roasted Oolong Milk Tea',
        variant,
        sizeMl,
        price,
        priceOptions: promo && promo !== price ? [{ label: 'Promo', price: promo }] : [],
        recipeId,
        recipeScale: portions,
        packaging,
        active: true,
        tone: recipe?.id === 'normal' ? 'sky' : 'honey',
      });
      return d;
    });
    toast(`${code} added to Menu`);
  };

  return (
    <div className="grid g2" style={{ alignItems: 'start' }}>
      <div className="card stack">
        <div>
          <h2>Build a product</h2>
          <div className="sub small muted">Try a new size, bottle or price. Nothing is saved until you press “Save as product”.</div>
        </div>
        <div className="form-grid">
          <Field label="Code">
            <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Field label="Variant / description">
            <input className="input" value={variant} onChange={(e) => setVariant(e.target.value)} />
          </Field>
          <Field label="Recipe">
            <select className="input" value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
              {data.recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Size (ml)">
            <input className="input num" inputMode="numeric" value={sizeMl} onChange={(e) => setSizeMl(Number(e.target.value.replace(/\D/g, '')) || 0)} />
          </Field>
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          {[100, 150, 250, 500, 1000].map((ml) => (
            <button key={ml} className={`chip ${sizeMl === ml ? 'mint' : 'outline'}`} style={{ cursor: 'pointer', height: 30 }} onClick={() => setSizeMl(ml)}>
              {ml} ml
            </button>
          ))}
        </div>
        <PartPicker label="Bottle" value={bottle} onChange={setBottle} pcs={pcs} ings={ings} />
        <PartPicker label="Sticker / label" value={sticker} onChange={setSticker} pcs={pcs} ings={ings} />
        <div className="stack" style={{ gap: 8 }}>
          <div className="row between">
            <span className="small bold ink2">Other per-bottle costs (straw, plastic, ice…)</span>
            <button className="btn sm ghost" onClick={() => setExtras((x) => [...x, { label: 'Sedotan', cost: 300 }])}>
              <IconPlus /> Cost
            </button>
          </div>
          {extras.map((e, i) => (
            <div className="row" key={i} style={{ gap: 8 }}>
              <input className="input" value={e.label} style={{ flex: 1, minWidth: 0 }} onChange={(ev) => setExtras((x) => x.map((y, j) => (j === i ? { ...y, label: ev.target.value } : y)))} aria-label="Cost name" />
              <div style={{ width: 130 }}>
                <MoneyInput value={e.cost} onChange={(v) => setExtras((x) => x.map((y, j) => (j === i ? { ...y, cost: v } : y)))} />
              </div>
              <button className="btn sm ghost icon" aria-label="Remove" onClick={() => setExtras((x) => x.filter((_, j) => j !== i))}>
                <IconTrash />
              </button>
            </div>
          ))}
        </div>
        <div className="form-grid">
          <Field label="Selling price">
            <MoneyInput value={price} onChange={setPrice} />
          </Field>
          <Field label="Promo price (optional)">
            <MoneyInput value={promo} onChange={setPromo} />
          </Field>
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Result</h2>
              <div className="sub">
                {formatNum(portions)} × recipe portion (250 ml) · {recipe?.name}
              </div>
            </div>
          </div>
          <table className="table">
            <tbody>
              <tr><td>Milk tea ({sizeMl} ml)</td><td className="r num">{formatRp(liquid)}</td></tr>
              <tr><td>Bottle</td><td className="r num">{formatRp(bottleCost)}</td></tr>
              <tr><td>Sticker</td><td className="r num">{formatRp(stickerCost)}</td></tr>
              {extras.map((e, i) => (
                <tr key={i}><td>{e.label}</td><td className="r num">{formatRp(e.cost)}</td></tr>
              ))}
              <tr><td className="bold">HPP per bottle</td><td className="r num bold">{formatRp(hpp)}</td></tr>
            </tbody>
          </table>
          <div className="grid g2 section-gap">
            <div className="total-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <span className="small muted">Normal price {formatRp(price)}</span>
              <span className="amt num" style={{ color: margin < 0 ? 'var(--bad)' : undefined }}>{formatRp(margin)}</span>
              <span className="tiny muted">margin {pct(price ? margin / price : 0)}</span>
            </div>
            <div className="total-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <span className="small muted">Promo {formatRp(promo)}</span>
              <span className="amt num" style={{ color: promoMargin < 0 ? 'var(--bad)' : undefined }}>{formatRp(promoMargin)}</span>
              <span className="tiny muted">margin {pct(promo ? promoMargin / promo : 0)}</span>
            </div>
          </div>
          <div className="small section-gap">
            <b>Suggested price</b> (rounded to Rp500):
            <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
              {[0.4, 0.5, 0.6].map((m) => {
                const sp = roundUp(hpp / (1 - m));
                return (
                  <button key={m} className={`chip ${price === sp ? 'mint' : 'outline'}`} style={{ cursor: 'pointer', height: 30 }} onClick={() => setPrice(sp)}>
                    {pct(m)} margin · {formatRp(sp)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="row wrap section-gap">
            <button className="btn primary" onClick={saveProduct}>
              Save as product
            </button>
            <button className="btn" onClick={() => onCampaign({ promoPrice: promo, budget })}>
              Plan a campaign
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h2>Campaign math</h2>
              <div className="sub">How many promo bottles pay back the campaign cost?</div>
            </div>
          </div>
          <Field label="Campaign cost (ads, sampling, giveaway…)">
            <MoneyInput value={budget} onChange={setBudget} />
          </Field>
          <div className="section-gap">
            {promoMargin > 0 ? (
              <span>
                Sell <b className="num">{formatNum(breakEvenBottles)} bottles</b> at {formatRp(promo)} to cover {formatRp(budget)} (each earns {formatRp(promoMargin)}).
              </span>
            ) : (
              <span className="chip rose">Promo price is below HPP — every bottle loses money.</span>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h2>Compare with your menu</h2>
              <div className="sub">Price per 100 ml helps keep sizes fair</div>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="r">Price</th>
                  <th className="r">HPP</th>
                  <th className="r">/100 ml</th>
                </tr>
              </thead>
              <tbody>
                {compare.map(({ p, cost, per100 }) => (
                  <tr key={p.id}>
                    <td><ProductChip product={p} /></td>
                    <td className="r num">{formatRp(p.price)}</td>
                    <td className="r num">{formatRp(cost)}</td>
                    <td className="r num">{formatRp(per100)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="bold">{code} (new)</td>
                  <td className="r num bold">{formatRp(price)}</td>
                  <td className="r num bold">{formatRp(hpp)}</td>
                  <td className="r num bold">{formatRp(sizeMl ? (price / sizeMl) * 100 : 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── campaigns ───────────────────────── */

export function campaignStats(data: AppData, c: Campaign) {
  const product = data.products.find((p) => p.id === c.productId);
  const cost = product ? productCost(data, product) : 0;
  let bottles = 0;
  let revenue = 0;
  for (const o of data.orders) {
    if (!isActive(o) || !o.paid || o.date < c.start || o.date > c.end) continue;
    for (const it of o.items)
      if (it.productId === c.productId) {
        bottles += it.qty;
        revenue += it.qty * it.unitPrice;
      }
  }
  const grossProfit = revenue - bottles * cost;
  return { product, bottles, revenue, grossProfit, net: grossProfit - c.budget };
}

function Campaigns({ prefill, clearPrefill }: { prefill: Partial<Campaign> | null; clearPrefill: () => void }) {
  const { data } = useStore();
  const [editing, setEditing] = useState<Campaign | 'new' | null>(prefill ? 'new' : null);
  const today = todayISO();
  const list = useMemo(() => [...data.campaigns].sort((a, b) => b.start.localeCompare(a.start)), [data.campaigns]);

  return (
    <>
      <div className="row between wrap">
        <div className="small muted">Promo price shows up as a quick option in the order form while a campaign runs.</div>
        <button className="btn primary" onClick={() => setEditing('new')}>
          <IconPlus /> New campaign
        </button>
      </div>
      {list.length ? (
        <div className="grid g2">
          {list.map((c) => {
            const s = campaignStats(data, c);
            const state = c.start > today ? ['Upcoming', 'sky'] : c.end < today ? ['Ended', 'latte'] : ['Running', 'mint'];
            return (
              <button key={c.id} className="card" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setEditing(c)}>
                <div className="card-head">
                  <div style={{ minWidth: 0 }}>
                    <h2 className="truncate">{c.name}</h2>
                    <div className="sub">
                      {formatDate(c.start)} – {formatDate(c.end)} · promo {formatRp(c.promoPrice)}
                    </div>
                  </div>
                  <span className={`chip ${state[1]}`}>{state[0]}</span>
                </div>
                <div className="row wrap" style={{ gap: 6, marginBottom: 12 }}>
                  <ProductChip product={s.product} />
                  {c.budget > 0 && <span className="chip outline">Budget {formatRp(c.budget)}</span>}
                </div>
                <div className="grid g3" style={{ gap: 10 }}>
                  <div className="tile">
                    <span className="t-label">Sold</span>
                    <span className="bold num">{s.bottles}{c.targetBottles ? ` / ${c.targetBottles}` : ''} btl</span>
                  </div>
                  <div className="tile">
                    <span className="t-label">Revenue</span>
                    <span className="bold num">{formatRp(s.revenue)}</span>
                  </div>
                  <div className="tile">
                    <span className="t-label">Profit after cost</span>
                    <span className="bold num" style={{ color: s.net < 0 ? 'var(--bad)' : 'var(--good)' }}>{formatRp(s.net)}</span>
                  </div>
                </div>
                {c.targetBottles > 0 && (
                  <div className="section-gap">
                    <Meter value={s.bottles / c.targetBottles} label="Target progress" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <Empty>No campaigns yet. Plan one from the simulator or tap “New campaign”.</Empty>
        </div>
      )}
      {editing && (
        <CampaignForm
          campaign={editing === 'new' ? undefined : editing}
          prefill={editing === 'new' ? prefill ?? undefined : undefined}
          onClose={() => {
            setEditing(null);
            clearPrefill();
          }}
        />
      )}
    </>
  );
}

function CampaignForm({ campaign, prefill, onClose }: { campaign?: Campaign; prefill?: Partial<Campaign>; onClose: () => void }) {
  const { data, update, toast } = useStore();
  const firstProduct = data.products.find((p) => p.active) ?? data.products[0];
  const today = todayISO();
  const [c, setC] = useState<Campaign>(
    () =>
      campaign ?? {
        id: '',
        name: '',
        productId: firstProduct?.id ?? '',
        start: today,
        end: addDays(today, 6),
        promoPrice: firstProduct?.price ?? 0,
        budget: 0,
        targetBottles: 0,
        notes: '',
        createdAt: new Date().toISOString(),
        ...prefill,
      },
  );
  const [logExpense, setLogExpense] = useState(!campaign);
  const set = <K extends keyof Campaign>(k: K, v: Campaign[K]) => setC((p) => ({ ...p, [k]: v }));
  const product = data.products.find((p) => p.id === c.productId);
  const cost = product ? productCost(data, product) : 0;
  const valid = c.name.trim() && c.productId && c.start && c.end >= c.start;

  const save = () => {
    if (!valid) return;
    update((d) => {
      const i = d.campaigns.findIndex((x) => x.id === c.id);
      if (i >= 0) d.campaigns[i] = c;
      else {
        d.campaigns.push({ ...c, id: nextId('C', d.campaigns.map((x) => x.id)) });
        if (logExpense && c.budget > 0)
          d.txns.push({
            id: nextId('TX', d.txns.map((x) => x.id)),
            date: c.start,
            type: 'expense',
            category: 'Marketing',
            description: `Campaign: ${c.name}`,
            qtyNote: '',
            amount: c.budget,
            createdAt: new Date().toISOString(),
          });
      }
      return d;
    });
    toast('Campaign saved');
    onClose();
  };
  const remove = () => {
    if (!campaign || !confirm('Delete this campaign? (A logged budget expense stays in the ledger.)')) return;
    update((d) => ({ ...d, campaigns: d.campaigns.filter((x) => x.id !== campaign.id) }));
    onClose();
  };

  return (
    <Modal
      title={campaign ? 'Edit campaign' : 'New campaign'}
      onClose={onClose}
      footer={
        <>
          {campaign && (
            <button className="btn ghost danger" onClick={remove}>
              <IconTrash /> Delete
            </button>
          )}
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={!valid}>Save</button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Campaign name" className="full">
          <input className="input" value={c.name} onChange={(e) => set('name', e.target.value)} placeholder="Payday promo, Bundling 2 botol, …" autoFocus />
        </Field>
        <Field label="Product" className="full">
          <select className="input" value={c.productId} onChange={(e) => set('productId', e.target.value)}>
            {data.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.variant} ({formatRp(p.price)})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Start">
          <input className="input" type="date" value={c.start} onChange={(e) => set('start', e.target.value)} />
        </Field>
        <Field label="End">
          <input className="input" type="date" value={c.end} onChange={(e) => set('end', e.target.value)} />
        </Field>
        <Field label="Promo price">
          <MoneyInput value={c.promoPrice} onChange={(v) => set('promoPrice', v)} />
        </Field>
        <Field label="Campaign cost / budget">
          <MoneyInput value={c.budget} onChange={(v) => set('budget', v)} />
        </Field>
        <Field label="Target bottles">
          <input className="input num" inputMode="numeric" value={c.targetBottles || ''} placeholder="0" onChange={(e) => set('targetBottles', Number(e.target.value.replace(/\D/g, '')) || 0)} />
        </Field>
        <div className="field" style={{ justifyContent: 'flex-end' }}>
          <span className="small muted">
            Margin at promo: <b>{formatRp(c.promoPrice - cost)}</b> / btl
            {c.promoPrice - cost > 0 && c.budget > 0 && <> · break-even {formatNum(Math.ceil(c.budget / (c.promoPrice - cost)))} btl</>}
          </span>
        </div>
        <Field label="Notes" className="full">
          <textarea className="input" value={c.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
        {!campaign && (
          <div className="full">
            <Switch checked={logExpense} onChange={setLogExpense} label={<span className="small">Log the budget as a Marketing expense in Finance</span>} />
          </div>
        )}
      </div>
    </Modal>
  );
}
