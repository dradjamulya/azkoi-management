import { NAV, href } from '../App';
import { useStore } from '../store';

export function More() {
  const { data, sync } = useStore();
  return (
    <div className="stack">
      <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', background: '#5b330a', color: '#fff8ec', border: 0 }}>
        <img src="img/mark-cream.png" alt="" style={{ width: 52 }} />
        <div>
          <div className="bold" style={{ fontSize: 18 }}>{data.settings.businessName}</div>
          <div className="small" style={{ opacity: 0.8 }}>{sync.message || 'Saved on this device'}</div>
        </div>
      </div>
      <div className="card list" style={{ padding: '6px 18px' }}>
        {NAV.filter((n) => !['home', 'orders', 'brew', 'finance'].includes(n.route)).map((n) => (
          <a key={n.route} href={href(n.route)} className="list-row" style={{ textDecoration: 'none', padding: '14px 0' }}>
            <n.icon width={22} height={22} />
            <span className="bold">{n.title}</span>
            <span className="spacer" />
            <span className="muted">›</span>
          </a>
        ))}
      </div>
      <div className="photo-strip">
        <img src="img/bottles.jpg" alt="" />
        <img src="img/bottle-flowers.jpg" alt="" />
        <img src="img/pattern.jpg" alt="" />
      </div>
    </div>
  );
}
