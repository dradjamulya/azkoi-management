import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { customers } from '../lib/calc';
import { formatNum, formatRp, relativeDay, waLink } from '../lib/format';
import { Empty, initials } from '../components/UI';
import { IconSearch, IconWA } from '../components/Icons';

export function Customers() {
  const { data } = useStore();
  const [q, setQ] = useState('');
  const all = useMemo(() => customers(data), [data]);
  const named = all.filter((c) => c.name !== 'Walk-in');
  const repeat = named.filter((c) => c.orders > 1);
  const list = all.filter((c) => !q || `${c.name} ${c.contact}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="stack">
      <div className="grid g3">
        <div className="card tile">
          <span className="t-label">Customers</span>
          <span className="t-value num">{named.length}</span>
          <span className="t-sub">named buyers (walk-ins excluded)</span>
        </div>
        <div className="card tile">
          <span className="t-label">Came back</span>
          <span className="t-value num">{repeat.length}</span>
          <span className="t-sub">{named.length ? Math.round((repeat.length / named.length) * 100) : 0}% ordered more than once</span>
        </div>
        <div className="card tile">
          <span className="t-label">Avg. spend / customer</span>
          <span className="t-value num">{formatRp(named.reduce((s, c) => s + c.spent, 0) / Math.max(1, named.length))}</span>
          <span className="t-sub">{formatNum(named.reduce((s, c) => s + c.bottles, 0) / Math.max(1, named.length))} bottles each</span>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>All customers</h2>
            <div className="sub">Built automatically from your orders</div>
          </div>
          <div className="search">
            <IconSearch />
            <input className="input" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {list.length ? (
          <div className="list">
            {list.map((c) => {
              const wa = waLink(c.contact);
              return (
                <div className="list-row" key={c.key}>
                  <div className="avatar">{initials(c.name)}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="row" style={{ gap: 6 }}>
                      <span className="bold truncate">{c.name}</span>
                      {c.orders > 1 && <span className="chip mint">Repeat ×{c.orders}</span>}
                    </div>
                    <div className="tiny muted">
                      {c.bottles} bottles · fav {c.favourite} · last {relativeDay(c.last)}
                    </div>
                  </div>
                  <div className="bold num small">{formatRp(c.spent)}</div>
                  {wa ? (
                    <a className="btn sm icon" href={wa} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${c.name}`}>
                      <IconWA />
                    </a>
                  ) : (
                    <span style={{ width: 32 }} />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <Empty>No customers yet.</Empty>
        )}
        <div className="tiny muted section-gap">Tip: add a WhatsApp number on an order and the chat button appears here.</div>
      </div>
    </div>
  );
}
