import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useStore } from '../store';
import { useUI } from '../App';
import type { Order, OrderStatus, Product } from '../types';
import { orderBottles, orderTotal, productMap } from '../lib/calc';
import { addDays, formatDate, formatRp, relativeDay, todayISO, waLink } from '../lib/format';
import { Empty, PaidChip, ProductChip, STATUS_META, Seg, StatusChip } from '../components/UI';
import { IconArrowR, IconBoard, IconBag, IconDownload, IconList, IconSearch, IconTruck, IconWA } from '../components/Icons';
import { waMessage } from '../components/OrderForm';

const COLUMNS: OrderStatus[] = ['new', 'brewing', 'ready', 'done'];
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { new: 'brewing', brewing: 'ready', ready: 'done' };

type When = 'open' | 'today' | 'tomorrow' | 'week' | 'all';

function useFiltered(when: When, q: string, paid: 'all' | 'unpaid') {
  const { data } = useStore();
  const today = todayISO();
  return useMemo(() => {
    const query = q.trim().toLowerCase();
    return data.orders
      .filter((o) => {
        if (when === 'today' && o.date !== today) return false;
        if (when === 'tomorrow' && o.date !== addDays(today, 1)) return false;
        if (when === 'week' && (o.date < today || o.date > addDays(today, 6))) return false;
        if (when === 'open' && (o.status === 'cancelled' || (o.status === 'done' && o.date < addDays(today, -3)))) return false;
        if (paid === 'unpaid' && o.paid) return false;
        if (query) {
          const hay = `${o.id} ${o.buyer} ${o.contact} ${o.notes} ${o.items.map((i) => i.productId).join(' ')}`.toLowerCase();
          if (!hay.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  }, [data.orders, when, q, paid, today]);
}

export function Orders() {
  const { data, update, toast } = useStore();
  const { openOrder } = useUI();
  const [view, setView] = useState<'board' | 'list'>('board');
  const [when, setWhen] = useState<When>('open');
  const [paid, setPaid] = useState<'all' | 'unpaid'>('all');
  const [q, setQ] = useState('');
  const orders = useFiltered(when, q, paid);
  const products = productMap(data);

  const move = (id: string, status: OrderStatus) => {
    const o = data.orders.find((x) => x.id === id);
    if (!o || o.status === status) return;
    update((d) => {
      const t = d.orders.find((x) => x.id === id);
      if (t) {
        t.status = status;
        t.updatedAt = new Date().toISOString();
      }
      return d;
    });
    toast(`${id} → ${STATUS_META[status].short}${status === 'done' && !o.paid ? ' · still unpaid!' : ''}`);
  };

  const togglePaid = (id: string) =>
    update((d) => {
      const t = d.orders.find((x) => x.id === id);
      if (t) t.paid = !t.paid;
      return d;
    });

  const exportCsv = () => {
    const rows = [['Order ID', 'Date', 'Item', 'Qty', 'Unit price', 'Total', 'Status', 'Paid', 'Buyer', 'Contact', 'Notes']];
    for (const o of orders)
      for (const it of o.items)
        rows.push([o.id, o.date, products.get(it.productId)?.code ?? it.productId, String(it.qty), String(it.unitPrice), String(it.qty * it.unitPrice), o.status, o.paid ? 'TRUE' : 'FALSE', o.buyer, o.contact, o.notes]);
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `azkoi-orders-${todayISO()}.csv`;
    a.click();
  };

  return (
    <div className="stack">
      <div className="row wrap" style={{ gap: 10 }}>
        <Seg
          value={view}
          onChange={setView}
          options={[
            { value: 'board', label: <span className="row" style={{ gap: 6 }}><IconBoard width={16} /> Board</span> },
            { value: 'list', label: <span className="row" style={{ gap: 6 }}><IconList width={16} /> List</span> },
          ]}
        />
        <div className="search">
          <IconSearch />
          <input className="input" placeholder="Search buyer, ID, notes…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn sm ghost" onClick={exportCsv} title="Export CSV (opens in Excel / Sheets)">
          <IconDownload /> CSV
        </button>
      </div>
      <div className="row wrap" style={{ gap: 10 }}>
        <Seg
          value={when}
          onChange={setWhen}
          options={[
            { value: 'open', label: 'Active' },
            { value: 'today', label: 'Today' },
            { value: 'tomorrow', label: 'Tomorrow' },
            { value: 'week', label: 'Next 7 days' },
            { value: 'all', label: 'All' },
          ]}
        />
        <Seg
          value={paid}
          onChange={setPaid}
          options={[
            { value: 'all', label: 'Any payment' },
            { value: 'unpaid', label: 'Unpaid' },
          ]}
        />
      </div>

      {view === 'board' ? (
        <Board orders={orders} products={products} onMove={move} onOpen={openOrder} onTogglePaid={togglePaid} />
      ) : (
        <ListView orders={orders} products={products} onOpen={openOrder} />
      )}
    </div>
  );
}

function Board({
  orders,
  products,
  onMove,
  onOpen,
  onTogglePaid,
}: {
  orders: Order[];
  products: Map<string, Product>;
  onMove: (id: string, s: OrderStatus) => void;
  onOpen: (o: Order) => void;
  onTogglePaid: (id: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const onEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (e.over) onMove(String(e.active.id), e.over.id as OrderStatus);
  };
  const active = orders.find((o) => o.id === activeId);
  const cancelled = orders.filter((o) => o.status === 'cancelled');

  return (
    <DndContext sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={onEnd} onDragCancel={() => setActiveId(null)}>
      <div className="small muted">Drag cards between columns (hold on touch), or tap the arrow to move to the next step.</div>
      <div className="board">
        {COLUMNS.map((status) => {
          const list = orders.filter((o) => o.status === status);
          const bottles = list.reduce((s, o) => s + orderBottles(o), 0);
          return (
            <Column key={status} status={status} count={list.length} bottles={bottles} total={list.reduce((s, o) => s + orderTotal(o), 0)}>
              {list.map((o) => (
                <DraggableCard key={o.id} order={o} products={products} onOpen={onOpen} onMove={onMove} onTogglePaid={onTogglePaid} />
              ))}
              {!list.length && <div className="small muted" style={{ padding: '18px 4px', textAlign: 'center' }}>Drop here</div>}
            </Column>
          );
        })}
      </div>
      {cancelled.length > 0 && (
        <div className="small muted">
          {cancelled.length} cancelled order{cancelled.length > 1 ? 's' : ''} hidden from the board — see List view.
        </div>
      )}
      <DragOverlay>{active ? <CardBody order={active} products={products} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}

function Column({ status, count, bottles, total, children }: { status: OrderStatus; count: number; bottles: number; total: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const m = STATUS_META[status];
  return (
    <section ref={setNodeRef} className={`column${isOver ? ' over' : ''}`} aria-label={m.label}>
      <div className="column-head">
        <span className="col-dot" style={{ background: m.color }} />
        <h3>{m.label}</h3>
        <span className="count">{count}</span>
      </div>
      <div className="column-meta num">
        {bottles} btl · {formatRp(total)}
      </div>
      {children}
    </section>
  );
}

function DraggableCard(props: {
  order: Order;
  products: Map<string, Product>;
  onOpen: (o: Order) => void;
  onMove: (id: string, s: OrderStatus) => void;
  onTogglePaid: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: props.order.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={{ outline: 'none' }}>
      <CardBody {...props} dragging={isDragging} />
    </div>
  );
}

function CardBody({
  order: o,
  products,
  onOpen,
  onMove,
  onTogglePaid,
  dragging,
  overlay,
}: {
  order: Order;
  products: Map<string, Product>;
  onOpen?: (o: Order) => void;
  onMove?: (id: string, s: OrderStatus) => void;
  onTogglePaid?: (id: string) => void;
  dragging?: boolean;
  overlay?: boolean;
}) {
  const { data } = useStore();
  const today = todayISO();
  const late = o.date < today && o.status !== 'done' && o.status !== 'cancelled';
  const next = NEXT[o.status];
  const wa = waLink(o.contact, waMessage(data, o));
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <article
      className={`kcard${dragging ? ' dragging' : ''}${overlay ? ' overlay-card' : ''}${late ? ' late' : ''}`}
      onClick={() => onOpen?.(o)}
    >
      <div className="k-top">
        <span className="k-id">{o.id}</span>
        <span className={`chip ${late ? 'rose' : o.date === today ? 'honey' : 'outline'}`} style={{ marginLeft: 'auto' }}>
          {late ? `Late · ${formatDate(o.date)}` : relativeDay(o.date)}
        </span>
      </div>
      <div className="k-buyer truncate">{o.buyer || 'Walk-in'}</div>
      <div className="k-items">
        {o.items.map((it, i) => (
          <ProductChip key={i} product={products.get(it.productId)} qty={it.qty} />
        ))}
      </div>
      {o.notes && <div className="small ink2" style={{ whiteSpace: 'pre-wrap' }}>{o.notes}</div>}
      <div className="k-foot">
        <button
          className="chip"
          style={{ border: 0, cursor: 'pointer', background: o.paid ? 'var(--mint-bg)' : 'var(--rose-bg)', color: o.paid ? 'var(--mint-ink)' : 'var(--rose-ink)' }}
          onPointerDown={stop}
          onClick={(e) => {
            stop(e);
            onTogglePaid?.(o.id);
          }}
          title="Toggle paid"
        >
          {o.paid ? 'Lunas' : 'Belum bayar'}
        </button>
        <span className="muted" title={o.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}>
          {o.fulfilment === 'delivery' ? <IconTruck width={16} height={16} /> : <IconBag width={16} height={16} />}
        </span>
        {wa && (
          <a className="muted" href={wa} target="_blank" rel="noreferrer" onPointerDown={stop} onClick={stop} aria-label="WhatsApp">
            <IconWA width={16} height={16} />
          </a>
        )}
        <span className="total num">{formatRp(orderTotal(o))}</span>
        {next && onMove && (
          <button
            className="btn sm icon"
            title={`Move to ${STATUS_META[next].short}`}
            aria-label={`Move to ${STATUS_META[next].short}`}
            onPointerDown={stop}
            onClick={(e) => {
              stop(e);
              onMove(o.id, next);
            }}
          >
            <IconArrowR />
          </button>
        )}
      </div>
    </article>
  );
}

function ListView({ orders, products, onOpen }: { orders: Order[]; products: Map<string, Product>; onOpen: (o: Order) => void }) {
  if (!orders.length) return <div className="card"><Empty>No orders match these filters.</Empty></div>;
  const groups = new Map<string, Order[]>();
  for (const o of orders) groups.set(o.date, [...(groups.get(o.date) ?? []), o]);
  return (
    <div className="card">
      <div className="table-wrap hide-sm-table">
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Buyer</th>
              <th>Items</th>
              <th>Status</th>
              <th>Payment</th>
              <th className="r">Total</th>
            </tr>
          </thead>
          <tbody>
            {[...groups.entries()].map(([date, list]) => (
              <Group key={date} date={date} list={list} products={products} onOpen={onOpen} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="only-sm list">
        {orders.map((o) => (
          <button
            key={o.id}
            className="list-row"
            style={{ background: 'none', border: 0, borderTop: '1px solid var(--border)', width: '100%', textAlign: 'left', cursor: 'pointer' }}
            onClick={() => onOpen(o)}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="row" style={{ gap: 6 }}>
                <span className="bold truncate">{o.buyer || 'Walk-in'}</span>
                <span className="tiny muted">{o.id}</span>
              </div>
              <div className="tiny muted">
                {formatDate(o.date)} · {o.items.map((i) => `${i.qty}× ${products.get(i.productId)?.code ?? i.productId}`).join(', ')}
              </div>
            </div>
            <div className="stack" style={{ gap: 4, alignItems: 'flex-end' }}>
              <span className="bold num small">{formatRp(orderTotal(o))}</span>
              <StatusChip status={o.status} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Group({ date, list, products, onOpen }: { date: string; list: Order[]; products: Map<string, Product>; onOpen: (o: Order) => void }) {
  const total = list.reduce((s, o) => s + orderTotal(o), 0);
  return (
    <>
      <tr className="group-head">
        <td colSpan={5}>
          {relativeDay(date)} {relativeDay(date) !== formatDate(date) && <span className="muted">· {formatDate(date)}</span>}
        </td>
        <td className="r num">{formatRp(total)}</td>
      </tr>
      {list.map((o) => (
        <tr key={o.id} className="click" onClick={() => onOpen(o)}>
          <td className="bold small">{o.id}</td>
          <td>{o.buyer || <span className="muted">Walk-in</span>}</td>
          <td>
            <div className="row wrap" style={{ gap: 4 }}>
              {o.items.map((it, i) => (
                <ProductChip key={i} product={products.get(it.productId)} qty={it.qty} />
              ))}
            </div>
          </td>
          <td>
            <StatusChip status={o.status} />
          </td>
          <td>
            <PaidChip paid={o.paid} />
          </td>
          <td className="r num bold">{formatRp(orderTotal(o))}</td>
        </tr>
      ))}
    </>
  );
}
