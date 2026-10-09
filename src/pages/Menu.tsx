import { useState } from 'react';
import { useStore } from '../store';
import type { Ingredient, Product, Recipe, Unit } from '../types';
import { ingredientMap, productBOM, productCost, unitCost } from '../lib/calc';
import { formatNum, formatRp, pct, uid } from '../lib/format';
import { Field, MoneyInput, Seg, Switch } from '../components/UI';
import { IconPlus, IconTrash } from '../components/Icons';

type Tab = 'products' | 'recipes' | 'ingredients';

export function MenuPage() {
  const [tab, setTab] = useState<Tab>('products');
  return (
    <div className="stack">
      <Seg
        value={tab}
        onChange={setTab}
        options={[
          { value: 'products', label: 'Products & prices' },
          { value: 'recipes', label: 'Recipes' },
          { value: 'ingredients', label: 'Ingredients & stock' },
        ]}
      />
      {tab === 'products' && <Products />}
      {tab === 'recipes' && <Recipes />}
      {tab === 'ingredients' && <Ingredients />}
    </div>
  );
}

function Products() {
  const { data, update } = useStore();
  const ings = ingredientMap(data);
  const patch = (id: string, p: Partial<Product>) =>
    update((d) => {
      const t = d.products.find((x) => x.id === id);
      if (t) Object.assign(t, p);
      return d;
    });
  const add = () =>
    update((d) => {
      d.products.push({
        id: uid('p-'),
        code: 'NEW',
        name: 'New product',
        variant: '',
        sizeMl: 250,
        price: 21000,
        recipeId: d.recipes[0]?.id ?? '',
        recipeScale: 1,
        packaging: [
          { ingredientId: 'bottle-250', qty: 1 },
          { ingredientId: 'sticker', qty: 1 },
        ].filter((l) => d.ingredients.some((i) => i.id === l.ingredientId)),
        active: true,
        tone: 'latte',
      });
      return d;
    });
  const remove = (p: Product) => {
    if (data.orders.some((o) => o.items.some((i) => i.productId === p.id))) {
      alert('This product is used in orders. Turn it off (inactive) instead of deleting.');
      return;
    }
    if (confirm(`Delete ${p.code}?`)) update((d) => ({ ...d, products: d.products.filter((x) => x.id !== p.id) }));
  };

  return (
    <>
      <div className="grid g2">
        {data.products.map((p) => {
          const cost = productCost(data, p);
          const bom = productBOM(data, p);
          return (
            <div className="card" key={p.id} style={{ opacity: p.active ? 1 : 0.7 }}>
              <div className="card-head">
                <div className="row" style={{ gap: 10 }}>
                  <span className={`chip ${p.tone}`} style={{ height: 28, fontSize: 13 }}>
                    {p.code}
                  </span>
                  <span className="small muted">{p.variant}</span>
                </div>
                <Switch checked={p.active} onChange={(v) => patch(p.id, { active: v })} label={<span className="small">{p.active ? 'On menu' : 'Off'}</span>} />
              </div>
              <div className="form-grid">
                <Field label="Code (short)">
                  <input className="input" value={p.code} onChange={(e) => patch(p.id, { code: e.target.value })} />
                </Field>
                <Field label="Variant">
                  <input className="input" value={p.variant} onChange={(e) => patch(p.id, { variant: e.target.value })} />
                </Field>
                <Field label="Selling price">
                  <MoneyInput value={p.price} onChange={(v) => patch(p.id, { price: v })} />
                </Field>
                <Field label="Size (ml)">
                  <input className="input num" inputMode="numeric" value={p.sizeMl} onChange={(e) => patch(p.id, { sizeMl: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
                </Field>
                <Field label="Recipe">
                  <select className="input" value={p.recipeId} onChange={(e) => patch(p.id, { recipeId: e.target.value })}>
                    {data.recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Recipe portions per bottle">
                  <input
                    className="input num"
                    inputMode="decimal"
                    value={p.recipeScale}
                    onChange={(e) => patch(p.id, { recipeScale: Number(e.target.value.replace(',', '.')) || 0 })}
                  />
                </Field>
                <Field label="Bottle">
                  <select
                    className="input"
                    value={p.packaging[0]?.ingredientId ?? ''}
                    onChange={(e) => patch(p.id, { packaging: [{ ingredientId: e.target.value, qty: 1 }, ...p.packaging.slice(1)] })}
                  >
                    {data.ingredients
                      .filter((i) => i.unit === 'pcs')
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Label colour">
                  <select className="input" value={p.tone} onChange={(e) => patch(p.id, { tone: e.target.value as Product['tone'] })}>
                    <option value="honey">Honey (bare sugar)</option>
                    <option value="sky">Sky (normal sugar)</option>
                    <option value="latte">Latte</option>
                    <option value="mint">Mint</option>
                  </select>
                </Field>
              </div>
              <div className="total-box section-gap">
                <div>
                  <div className="small muted">HPP {formatRp(cost)}</div>
                  <div className="tiny muted">
                    {bom.map((l) => `${ings.get(l.ingredientId)?.name ?? '?'} ${formatNum(l.qty)}${ings.get(l.ingredientId)?.unit ?? ''}`).join(' · ')}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="amt num">{formatRp(p.price - cost)}</div>
                  <div className="tiny muted">margin {pct(p.price ? (p.price - cost) / p.price : 0)}</div>
                </div>
              </div>
              <div className="row section-gap">
                <span className="spacer" />
                <button className="btn sm ghost danger" onClick={() => remove(p)}>
                  <IconTrash /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button className="btn" onClick={add} style={{ alignSelf: 'flex-start' }}>
        <IconPlus /> Add product
      </button>
    </>
  );
}

function Recipes() {
  const { data, update } = useStore();
  const ings = ingredientMap(data);
  const patch = (id: string, fn: (r: Recipe) => void) =>
    update((d) => {
      const r = d.recipes.find((x) => x.id === id);
      if (r) fn(r);
      return d;
    });
  const add = () =>
    update((d) => {
      d.recipes.push({ id: uid('r-'), name: 'New recipe', note: '', lines: [], steps: [] });
      return d;
    });
  const remove = (r: Recipe) => {
    if (data.products.some((p) => p.recipeId === r.id)) return alert('A product still uses this recipe.');
    if (confirm(`Delete ${r.name}?`)) update((d) => ({ ...d, recipes: d.recipes.filter((x) => x.id !== r.id) }));
  };

  return (
    <>
      <div className="grid g2">
        {data.recipes.map((r) => {
          const cost = r.lines.reduce((s, l) => s + (ings.get(l.ingredientId) ? unitCost(ings.get(l.ingredientId)!) * l.qty : 0), 0);
          return (
            <div className="card" key={r.id}>
              <div className="stack" style={{ gap: 12 }}>
                <Field label="Recipe name">
                  <input className="input" value={r.name} onChange={(e) => patch(r.id, (x) => (x.name = e.target.value))} />
                </Field>
                <Field label="Note / result">
                  <input className="input" value={r.note} onChange={(e) => patch(r.id, (x) => (x.note = e.target.value))} />
                </Field>
                <div>
                  <div className="row between" style={{ marginBottom: 6 }}>
                    <h3>Per 250 ml portion</h3>
                    <span className="small muted">ingredients {formatRp(cost)}</span>
                  </div>
                  <div className="stack" style={{ gap: 8 }}>
                    {r.lines.map((l, i) => (
                      <div key={i} className="row" style={{ gap: 8 }}>
                        <select
                          className="input"
                          value={l.ingredientId}
                          onChange={(e) => patch(r.id, (x) => (x.lines[i].ingredientId = e.target.value))}
                          style={{ flex: 1 }}
                        >
                          {data.ingredients.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                        <input
                          className="input num"
                          inputMode="decimal"
                          style={{ width: 90 }}
                          value={l.qty}
                          onChange={(e) => patch(r.id, (x) => (x.lines[i].qty = Number(e.target.value.replace(',', '.')) || 0))}
                          aria-label="Quantity"
                        />
                        <span className="small muted" style={{ width: 26 }}>
                          {ings.get(l.ingredientId)?.unit}
                        </span>
                        <button className="btn sm ghost icon" aria-label="Remove" onClick={() => patch(r.id, (x) => x.lines.splice(i, 1))}>
                          <IconTrash />
                        </button>
                      </div>
                    ))}
                    <button
                      className="btn sm"
                      style={{ alignSelf: 'flex-start' }}
                      onClick={() => patch(r.id, (x) => x.lines.push({ ingredientId: data.ingredients[0]?.id ?? '', qty: 0 }))}
                    >
                      <IconPlus /> Ingredient
                    </button>
                  </div>
                </div>
                <Field label="Steps (one per line)">
                  <textarea
                    className="input"
                    rows={7}
                    value={r.steps.join('\n')}
                    onChange={(e) => patch(r.id, (x) => (x.steps = e.target.value.split('\n')))}
                  />
                </Field>
                <div className="row">
                  <span className="spacer" />
                  <button className="btn sm ghost danger" onClick={() => remove(r)}>
                    <IconTrash /> Delete recipe
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button className="btn" onClick={add} style={{ alignSelf: 'flex-start' }}>
        <IconPlus /> New recipe (R&D)
      </button>
    </>
  );
}

function Ingredients() {
  const { data, update } = useStore();
  const patch = (id: string, p: Partial<Ingredient>) =>
    update((d) => {
      const t = d.ingredients.find((x) => x.id === id);
      if (t) Object.assign(t, p);
      return d;
    });
  const add = () =>
    update((d) => {
      d.ingredients.push({ id: uid('i-'), name: 'New ingredient', unit: 'g', packSize: 1, packPrice: 0, stock: null });
      return d;
    });
  const used = (id: string) => data.recipes.some((r) => r.lines.some((l) => l.ingredientId === id)) || data.products.some((p) => p.packaging.some((l) => l.ingredientId === id));
  const remove = (i: Ingredient) => {
    if (used(i.id)) return alert('Used in a recipe or product. Remove it there first.');
    if (confirm(`Delete ${i.name}?`)) update((d) => ({ ...d, ingredients: d.ingredients.filter((x) => x.id !== i.id) }));
  };

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>Ingredients & packaging</h2>
          <div className="sub">Price per pack → cost per gram/pcs → HPP. Leave stock empty if you don't want to track it.</div>
        </div>
        <button className="btn sm" onClick={add}>
          <IconPlus /> Add
        </button>
      </div>
      <div className="stack" style={{ gap: 0 }}>
        {data.ingredients.map((i) => (
          <div key={i.id} className="list-row" style={{ flexWrap: 'wrap', alignItems: 'flex-end', padding: '12px 0' }}>
            <Field label="Name" className="ing-name">
              <input className="input" value={i.name} onChange={(e) => patch(i.id, { name: e.target.value })} style={{ minWidth: 180 }} />
            </Field>
            <Field label="Unit">
              <select className="input" value={i.unit} style={{ width: 80 }} onChange={(e) => patch(i.id, { unit: e.target.value as Unit })}>
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="pcs">pcs</option>
              </select>
            </Field>
            <Field label="Pack size">
              <input
                className="input num"
                inputMode="decimal"
                style={{ width: 100 }}
                value={i.packSize}
                onChange={(e) => patch(i.id, { packSize: Number(e.target.value.replace(',', '.')) || 0 })}
              />
            </Field>
            <Field label="Pack price">
              <div style={{ width: 140 }}>
                <MoneyInput value={i.packPrice} onChange={(v) => patch(i.id, { packPrice: v })} />
              </div>
            </Field>
            <Field label="Stock">
              <input
                className="input num"
                inputMode="decimal"
                style={{ width: 100 }}
                placeholder="—"
                value={i.stock ?? ''}
                onChange={(e) => patch(i.id, { stock: e.target.value === '' ? null : Number(e.target.value.replace(',', '.')) || 0 })}
              />
            </Field>
            <div style={{ minWidth: 110, paddingBottom: 10 }} className="small">
              <b className="num">Rp{formatNum(unitCost(i))}</b>
              <span className="muted"> / {i.unit}</span>
            </div>
            <button className="btn sm ghost icon" style={{ marginBottom: 4 }} aria-label="Delete" onClick={() => remove(i)}>
              <IconTrash />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
