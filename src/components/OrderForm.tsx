import { useMemo, useState } from 'react';
import type { AppData, Order, OrderItem, OrderStatus } from '../types';
import { useStore } from '../store';
import { activeCampaigns, customers, nextOpenDay, nextOrderId, orderSubtotal, orderTotal, productMap } from '../lib/calc';
import { formatDate, formatRp, parseISO, todayISO, waLink } from '../lib/format';
import { Field, Modal, MoneyInput, Qty, STATUS_META, Seg, Switch } from './UI';
import { IconPlus, IconTrash, IconWA } from './Icons';

export function waMessage(data: AppData, o: Order): string {
  const products = productMap(data);
  const items = o.items
    .map((it) => `${it.qty}× ${products.get(it.productId)?.code ?? it.productId} — ${formatRp(it.qty * it.unitPrice)}`)
    .join('\n');
  return data.settings.waTemplate
    .replace(/\{buyer\}/g, o.buyer || 'kak')
    .replace(/\{items\}/g, items + (o.discount ? `\nDiskon: -${formatRp(o.discount)}` : ''))
    .replace(/\{total\}/g, formatRp(orderTotal(o)))
    .replace(/\{fulfilment\}/g, o.fulfilment === 'delivery' ? 'Dikirim' : 'Pickup')
    .replace(/\{date\}/g, parseISO(o.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }))
    .replace(/\{id\}/g, o.id);
}

function PriceChips({ item, date, onPick }: { item: OrderItem; date: string; onPick: (price: number) => void }) {
  const { data } = useStore();
  const p = data.products.find((x) => x.id === item.productId);
  if (!p) return null;
  const campaign = activeCampaigns(data, date)
    .filter((c) => c.productId === p.id)
    .map((c) => ({ label: c.name, price: c.promoPrice }));
  if (!p.priceOptions.length && !campaign.length) return null;
  const opts = [{ label: 'Normal', price: p.price }, ...campaign, ...p.priceOptions];
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {opts.map((o) => (
        <button
          key={o.label + o.price}
          type="button"
          className={`chip ${item.unitPrice === o.price ? 'mint' : 'outline'}`}
          style={{ cursor: 'pointer', height: 30 }}
          onClick={() => onPick(o.price)}
        >
          {o.label} · {formatRp(o.price)}
        </button>
      ))}
    </div>
  );
}

export function OrderForm({ order, onClose, defaultDate }: { order?: Order; onClose: () => void; defaultDate?: string }) {
  const { data, update, toast } = useStore();
  const activeProducts = data.products.filter((p) => p.active);
  const products = productMap(data);
  const isNew = !order;
  const [o, setO] = useState<Order>(
    () =>
      order ?? {
        id: nextOrderId(data.orders),
        date: defaultDate ?? nextOpenDay(data.settings.openDays),
        buyer: '',
        contact: '',
        items: activeProducts[0] ? [{ productId: activeProducts[0].id, qty: 1, unitPrice: activeProducts[0].price }] : [],
        discount: 0,
        status: 'new',
        paid: false,
        payment: '',
        fulfilment: 'pickup',
        address: '',
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
  );
  const set = <K extends keyof Order>(k: K, v: Order[K]) => setO((p) => ({ ...p, [k]: v }));
  const setItem = (i: number, patch: Partial<OrderItem>) =>
    setO((p) => ({ ...p, items: p.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));

  const known = useMemo(() => customers(data), [data]);

  const onBuyer = (name: string) => {
    const match = known.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    setO((p) => ({ ...p, buyer: name, contact: p.contact || match?.contact || '' }));
  };

  const valid = o.items.length > 0 && o.items.every((i) => i.qty > 0) && !!o.date;

  const save = () => {
    if (!valid) return;
    const clean = { ...o, items: o.items.filter((i) => i.qty > 0), updatedAt: new Date().toISOString() };
    update((d) => {
      const idx = d.orders.findIndex((x) => x.id === order?.id);
      if (idx >= 0) d.orders[idx] = clean;
      else {
        if (d.orders.some((x) => x.id === clean.id)) clean.id = nextOrderId(d.orders);
        d.orders.push(clean);
      }
      return d;
    });
    toast(isNew ? `${clean.id} added` : `${clean.id} saved`);
    onClose();
  };

  const remove = () => {
    if (!order || !confirm(`Delete ${order.id}? This can't be undone.`)) return;
    update((d) => ({ ...d, orders: d.orders.filter((x) => x.id !== order.id) }));
    toast(`${order.id} deleted`);
    onClose();
  };

  const wa = waLink(o.contact, waMessage(data, o));

  return (
    <Modal
      wide
      title={isNew ? 'New order' : `Order ${o.id}`}
      sub={isNew ? o.id : `Created ${formatDate(o.createdAt.slice(0, 10))}`}
      onClose={onClose}
      footer={
        <>
          {!isNew && (
            <button className="btn danger ghost" onClick={remove}>
              <IconTrash /> Delete
            </button>
          )}
          {wa && (
            <a className="btn" href={wa} target="_blank" rel="noreferrer">
              <IconWA /> WhatsApp
            </a>
          )}
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!valid} onClick={save}>
            {isNew ? 'Add order' : 'Save'}
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="form-grid">
          <Field label="Buyer">
            <input className="input" list="buyers" value={o.buyer} placeholder="Nama pembeli" onChange={(e) => onBuyer(e.target.value)} />
            <datalist id="buyers">
              {known.map((c) => (
                <option key={c.key} value={c.name} />
              ))}
            </datalist>
          </Field>
          <Field label="WhatsApp">
            <input className="input" inputMode="tel" value={o.contact} placeholder="08xx / wa.me/62…" onChange={(e) => set('contact', e.target.value)} />
          </Field>
          <Field label="Ready on (pickup / delivery date)">
            <input className="input" type="date" value={o.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Fulfilment">
            <Seg
              value={o.fulfilment}
              onChange={(v) => set('fulfilment', v)}
              options={[
                { value: 'pickup', label: 'Pickup' },
                { value: 'delivery', label: 'Delivery' },
              ]}
            />
          </Field>
          {o.fulfilment === 'delivery' && (
            <Field label="Address" className="full">
              <input className="input" value={o.address} onChange={(e) => set('address', e.target.value)} placeholder="Alamat / titik antar" />
            </Field>
          )}
        </div>

        <div className="stack" style={{ gap: 10 }}>
          <div className="row between">
            <h3>Items</h3>
            <button
              className="btn sm"
              onClick={() =>
                setO((p) => ({
                  ...p,
                  items: [...p.items, { productId: activeProducts[0]?.id ?? '', qty: 1, unitPrice: activeProducts[0]?.price ?? 0 }],
                }))
              }
            >
              <IconPlus /> Add item
            </button>
          </div>
          {o.items.map((it, i) => (
            <div key={i} className="stack" style={{ gap: 6 }}>
            <div className="item-row">
              <Field label="Product">
                <select
                  className="input"
                  value={it.productId}
                  onChange={(e) => setItem(i, { productId: e.target.value, unitPrice: products.get(e.target.value)?.price ?? it.unitPrice })}
                >
                  {data.products
                    .filter((p) => p.active || p.id === it.productId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} — {p.variant}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Qty">
                <Qty value={it.qty} onChange={(v) => setItem(i, { qty: v })} />
              </Field>
              <Field label="Price / bottle" className="price-field">
                <MoneyInput value={it.unitPrice} onChange={(v) => setItem(i, { unitPrice: v })} />
              </Field>
              <button
                className="btn ghost icon"
                aria-label="Remove item"
                onClick={() => setO((p) => ({ ...p, items: p.items.filter((_, j) => j !== i) }))}
              >
                <IconTrash />
              </button>
            </div>
            <PriceChips item={it} date={o.date} onPick={(unitPrice) => setItem(i, { unitPrice })} />
            </div>
          ))}
          <div className="form-grid">
            <Field label="Discount (Rp)">
              <MoneyInput value={o.discount} onChange={(v) => set('discount', v)} />
            </Field>
            <div className="total-box" style={{ alignSelf: 'end' }}>
              <div>
                <div className="small muted">Total</div>
                {o.discount > 0 && <div className="tiny muted">Subtotal {formatRp(orderSubtotal(o))}</div>}
              </div>
              <div className="amt num">{formatRp(orderTotal(o))}</div>
            </div>
          </div>
        </div>

        <div className="form-grid">
          <Field label="Status">
            <select className="input" value={o.status} onChange={(e) => set('status', e.target.value as OrderStatus)}>
              {(Object.keys(STATUS_META) as OrderStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].short} — {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment method">
            <select className="input" value={o.payment} onChange={(e) => set('payment', e.target.value as Order['payment'])}>
              <option value="">—</option>
              <option value="transfer">Transfer</option>
              <option value="qris">QRIS</option>
              <option value="cash">Cash</option>
            </select>
          </Field>
          <div className="full">
            <Switch checked={o.paid} onChange={(v) => set('paid', v)} label={o.paid ? 'Paid (lunas) — counts as revenue' : 'Not paid yet'} />
          </div>
          <Field label="Notes" className="full">
            <textarea className="input" value={o.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Less ice, jam ambil, dll." />
          </Field>
        </div>
        {o.date < todayISO() && o.status !== 'done' && o.status !== 'cancelled' && (
          <div className="chip rose" style={{ alignSelf: 'flex-start' }}>
            This order's date has passed — mark it done or reschedule.
          </div>
        )}
      </div>
    </Modal>
  );
}
