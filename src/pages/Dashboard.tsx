import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { href, useUI } from '../App';
import {
  brewNeeds,
  customers,
  financeSummary,
  isActive,
  isLow,
  isRevenue,
  orderBottles,
  orderTotal,
  productMap,
  revenueByDay,
} from '../lib/calc';
import { WEEKDAYS, addDays, formatDate, formatNum, formatRp, formatRpShort, monthKey, parseISO, pct, relativeDay, todayISO } from '../lib/format';
import { ColumnChart, HBarList, Meter, TableView } from '../components/Charts';
import { Empty, PaidChip, ProductChip, Seg, StatusChip, initials } from '../components/UI';
import { IconAlert, IconArrowR } from '../components/Icons';

type Range = '14' | '30' | 'month' | 'all';

export function Dashboard() {
  const { data } = useStore();
  const { openOrder } = useUI();
  const [range, setRange] = useState<Range>('30');
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  const products = productMap(data);

  const all = useMemo(() => financeSummary(data), [data]);
  const firstOrder = data.orders.map((o) => o.date).filter(Boolean).sort()[0] ?? today;
  const from =
    range === '14' ? addDays(today, -13) : range === '30' ? addDays(today, -29) : range === 'month' ? `${monthKey(today)}-01` : firstOrder < today ? firstOrder : today;
  const lastOrder = data.orders.map((o) => o.date).sort().pop() ?? today;
  const to = lastOrder > today && range !== 'month' ? (lastOrder < addDays(today, 7) ? lastOrder : today) : today;
  const period = useMemo(() => financeSummary(data, from, to), [data, from, to]);
  const daily = useMemo(() => revenueByDay(data, from, to), [data, from, to]);

  const periodOrders = data.orders.filter((o) => o.date >= from && o.date <= to && isRevenue(o));
  const byProduct = data.products
    .map((p) => ({
      label: <ProductChip product={p} />,
      code: p.code,
      value: periodOrders.reduce((s, o) => s + o.items.filter((i) => i.productId === p.id).reduce((a, i) => a + i.qty, 0), 0),
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  const weekday = WEEKDAYS.map((d, i) => ({
    day: d,
    value: periodOrders.filter((o) => parseISO(o.date).getDay() === i).reduce((s, o) => s + orderTotal(o), 0),
  }));
  const weekOrder = [1, 2, 3, 4, 5, 6, 0].map((i) => weekday[i]);

  const todayNeed = brewNeeds(data, today, today);
  const tomorrowNeed = brewNeeds(data, tomorrow, tomorrow);
  const upcoming = data.orders
    .filter((o) => o.date >= today && ['new', 'brewing', 'ready'].includes(o.status))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .slice(0, 6);
  const late = data.orders.filter((o) => o.date < today && ['new', 'brewing', 'ready'].includes(o.status));
  const unpaid = data.orders.filter((o) => !o.paid && isActive(o));
  const lowStock = data.ingredients.filter(isLow);
  const top = customers(data).filter((c) => c.name !== 'Walk-in').slice(0, 5);
  const aov = period.salesRevenue / Math.max(1, periodOrders.length);
  const margin = period.salesRevenue ? period.grossProfit / period.salesRevenue : 0;

  return (
    <div className="stack">
      <section className="hero">
        <img className="hero-mark" src="img/mark-cream.png" alt="" />
        <div>
          <div className="label">{all.leftToRecover > 0 ? 'Left to break even (R&D left)' : 'Profit after recovering all spending'}</div>
          <div className="big num">{formatRp(all.leftToRecover > 0 ? all.leftToRecover : all.netCash)}</div>
          <div className="small" style={{ opacity: 0.85 }}>
            Sales go back to modal first, then R&D — {pct(Math.min(1, all.recoveredRatio))} recovered so far.
          </div>
          <Meter value={all.recoveredRatio} label="Spending recovered" />
          <div className="hero-stats">
            <div>
              <span style={{ opacity: 0.75 }}>Total spent (R&D)</span>
              <b className="num">{formatRp(all.spent)}</b>
            </div>
            <div>
              <span style={{ opacity: 0.75 }}>Total cash in</span>
              <b className="num">{formatRp(all.cashIn)}</b>
            </div>
            <div>
              <span style={{ opacity: 0.75 }}>Bottles sold</span>
              <b className="num">{formatNum(all.bottles)}</b>
            </div>
          </div>
        </div>
        <div className="hero-photo">
          <img src="img/bottle-flowers.jpg" alt="AZKOI bottle" />
        </div>
      </section>

      {(late.length > 0 || unpaid.length > 0) && (
        <div className="card row wrap" style={{ gap: 12, borderColor: 'color-mix(in srgb, var(--bad) 40%, var(--border))' }}>
          <IconAlert width={20} height={20} style={{ color: 'var(--bad)' }} />
          {late.length > 0 && (
            <span>
              <b>{late.length}</b> order{late.length > 1 ? 's' : ''} past their date but not done.
            </span>
          )}
          {unpaid.length > 0 && (
            <span>
              <b>{unpaid.length}</b> unpaid ({formatRp(unpaid.reduce((s, o) => s + orderTotal(o), 0))}).
            </span>
          )}
          <a className="btn sm" href={href('orders')} style={{ marginLeft: 'auto' }}>
            Review <IconArrowR />
          </a>
        </div>
      )}

      {lowStock.length > 0 && (
        <div className="card row wrap" style={{ gap: 12, borderColor: 'color-mix(in srgb, var(--warn) 45%, var(--border))' }}>
          <IconAlert width={20} height={20} style={{ color: 'var(--warn)' }} />
          <span>
            <b>Stok menipis:</b> {lowStock.map((i) => `${i.name} (${formatNum(i.stock ?? 0)} ${i.unit})`).join(', ')}
          </span>
          <a className="btn sm" href={`${href('menu')}?tab=ingredients`} style={{ marginLeft: 'auto' }}>
            Update stock <IconArrowR />
          </a>
        </div>
      )}

      <div className="grid g2">
        {[
          { label: 'Today', date: today, need: todayNeed },
          { label: 'Tomorrow', date: tomorrow, need: tomorrowNeed },
        ].map(({ label, date, need }) => {
          const todo = [...need.counts.entries()].filter(([, c]) => c.todo > 0);
          const totalTodo = todo.reduce((s, [, c]) => s + c.todo, 0);
          return (
            <div className="card" key={label}>
              <div className="card-head">
                <div>
                  <h2>
                    {label} · {formatDate(date)}
                  </h2>
                  <div className="sub">
                    {need.orders.length} order{need.orders.length === 1 ? '' : 's'} ·{' '}
                    {totalTodo ? `${totalTodo} bottle${totalTodo > 1 ? 's' : ''} to brew` : 'nothing left to brew'}
                  </div>
                </div>
                <a className="btn sm" href={`${href('brew')}?d=${date}`}>
                  Brew plan <IconArrowR />
                </a>
              </div>
              {todo.length ? (
                <div className="row wrap">
                  {todo.map(([pid, c]) => (
                    <ProductChip key={pid} product={products.get(pid)} qty={c.todo} />
                  ))}
                </div>
              ) : (
                <div className="small muted">
                  {need.orders.length ? 'All orders for this day are ready or done ✓' : 'No orders yet.'}{' '}
                  <button className="btn ghost sm" onClick={() => openOrder(undefined, date)}>
                    + Add order
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="row between wrap">
        <h2>Performance</h2>
        <Seg
          value={range}
          onChange={setRange}
          options={[
            { value: '14', label: '14 days' },
            { value: '30', label: '30 days' },
            { value: 'month', label: 'This month' },
            { value: 'all', label: 'All time' },
          ]}
        />
      </div>

      <div className="grid g4">
        <div className="card tile">
          <span className="t-label">Revenue</span>
          <span className="t-value num">{formatRpShort(period.salesRevenue)}</span>
          <span className="t-sub">paid orders · {formatDate(from)} – {formatDate(to)}</span>
        </div>
        <div className="card tile">
          <span className="t-label">Bottles sold</span>
          <span className="t-value num">{formatNum(period.bottles)}</span>
          <span className="t-sub">{periodOrders.length} orders</span>
        </div>
        <div className="card tile">
          <span className="t-label">Avg. order</span>
          <span className="t-value num">{formatRpShort(aov)}</span>
          <span className="t-sub">{formatNum(period.bottles / Math.max(1, periodOrders.length))} bottles / order</span>
        </div>
        <div className="card tile">
          <span className="t-label">Gross margin (est.)</span>
          <span className="t-value num">{pct(margin)}</span>
          <span className="t-sub">{formatRpShort(period.grossProfit)} after HPP</span>
        </div>
      </div>

      <div className="grid g3">
        <div className="card span2">
          <div className="card-head">
            <div>
              <h2>Daily revenue</h2>
              <div className="sub">Paid orders by pickup date</div>
            </div>
          </div>
          <ColumnChart
            data={daily}
            series={[{ key: 'revenue', label: 'Revenue', color: 'var(--s1)' }]}
            value={(d) => d.revenue}
            xLabel={(d) => String(parseISO(d.date).getDate())}
            tooltipTitle={(d) => `${formatDate(d.date)} · ${d.bottles} bottles`}
            format={formatRp}
            formatAxis={formatRpShort}
            highlight={(d) => d.date === today}
          />
          <TableView head={['Date', 'Orders', 'Bottles', 'Revenue']} rows={daily.filter((d) => d.orders).map((d) => [formatDate(d.date), d.orders, d.bottles, formatRp(d.revenue)])} />
        </div>
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Bottles by product</h2>
              <div className="sub">Same period</div>
            </div>
          </div>
          <HBarList rows={byProduct} format={(n) => `${n} btl`} />
          <TableView head={['Product', 'Bottles']} rows={byProduct.map((r) => [r.code, r.value])} />
        </div>
      </div>

      <div className="grid g3">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Best days</h2>
              <div className="sub">Revenue by weekday</div>
            </div>
          </div>
          <ColumnChart
            data={weekOrder}
            series={[{ key: 'v', label: 'Revenue', color: 'var(--s1)' }]}
            value={(d) => d.value}
            xLabel={(d) => d.day}
            format={formatRp}
            formatAxis={formatRpShort}
            height={190}
            labelEvery={1}
            highlight={(d) => data.settings.openDays.includes(WEEKDAYS.indexOf(d.day))}
          />
          <TableView head={['Day', 'Revenue']} rows={weekOrder.map((d) => [d.day, formatRp(d.value)])} />
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h2>Coming up</h2>
              <div className="sub">Open orders from today</div>
            </div>
            <a className="btn sm ghost" href={href('orders')}>
              All <IconArrowR />
            </a>
          </div>
          {upcoming.length ? (
            <div className="list">
              {upcoming.map((o) => (
                <button
                  key={o.id}
                  className="list-row"
                  style={{ background: 'none', border: 0, borderTop: '1px solid var(--border)', textAlign: 'left', cursor: 'pointer', padding: '10px 0' }}
                  onClick={() => openOrder(o)}
                >
                  <div className="avatar">{initials(o.buyer || 'W')}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="bold truncate">{o.buyer || 'Walk-in'}</div>
                    <div className="tiny muted">
                      {relativeDay(o.date)} · {orderBottles(o)} btl · {formatRp(orderTotal(o))}
                    </div>
                  </div>
                  <div className="stack" style={{ gap: 4, alignItems: 'flex-end' }}>
                    <StatusChip status={o.status} />
                    {!o.paid && <PaidChip paid={false} />}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <Empty>No open orders. Time to post a story? ✨</Empty>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h2>Top customers</h2>
              <div className="sub">By total spent</div>
            </div>
            <a className="btn sm ghost" href={href('customers')}>
              All <IconArrowR />
            </a>
          </div>
          <div className="list">
            {top.map((c) => (
              <div className="list-row" key={c.key}>
                <div className="avatar">{initials(c.name)}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="bold truncate">{c.name}</div>
                  <div className="tiny muted">
                    {c.orders} order{c.orders > 1 ? 's' : ''} · fav {c.favourite}
                  </div>
                </div>
                <div className="bold num small">{formatRp(c.spent)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
