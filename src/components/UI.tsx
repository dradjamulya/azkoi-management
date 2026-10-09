import { useEffect, type ReactNode } from 'react';
import type { OrderStatus, Product } from '../types';
import { IconX } from './Icons';

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide,
  sub,
}: {
  title: ReactNode;
  sub?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div style={{ minWidth: 0 }}>
            <h2>{title}</h2>
            {sub && <div className="small muted">{sub}</div>}
          </div>
          <button className="btn ghost icon" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label="Close">
            <IconX />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`field ${className ?? ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="check">
      <span className="switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <i />
      </span>
      {label}
    </label>
  );
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Qty({ value, onChange, min = 0 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="qty">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label="Less">
        −
      </button>
      <input inputMode="numeric" value={value} onChange={(e) => onChange(Math.max(min, Number(e.target.value.replace(/\D/g, '')) || 0))} />
      <button type="button" onClick={() => onChange(value + 1)} aria-label="More">
        +
      </button>
    </div>
  );
}

/** Rupiah input that shows thousands separators while typing. */
export function MoneyInput({ value, onChange, placeholder }: { value: number; onChange: (v: number) => void; placeholder?: string }) {
  return (
    <input
      className="input num"
      inputMode="numeric"
      placeholder={placeholder ?? 'Rp0'}
      value={value ? `Rp${value.toLocaleString('id-ID')}` : ''}
      onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '')) || 0)}
    />
  );
}

export function ProductChip({ product, qty }: { product?: Product; qty?: number }) {
  if (!product) return <span className="chip">Unknown</span>;
  return (
    <span className={`chip ${product.tone}`}>
      {qty !== undefined && <b>{qty}×</b>}
      {product.code}
    </span>
  );
}

export const STATUS_META: Record<OrderStatus, { label: string; short: string; tone: string; color: string }> = {
  new: { label: 'Order masuk', short: 'New', tone: 'sky', color: 'var(--s2)' },
  brewing: { label: 'Lagi diseduh', short: 'Brewing', tone: 'honey', color: '#d79a12' },
  ready: { label: 'Siap diambil / kirim', short: 'Ready', tone: 'mint', color: 'var(--s3)' },
  done: { label: 'Selesai', short: 'Done', tone: 'latte', color: 'var(--s1)' },
  cancelled: { label: 'Batal', short: 'Cancelled', tone: 'rose', color: 'var(--bad)' },
};

export function StatusChip({ status }: { status: OrderStatus }) {
  const m = STATUS_META[status];
  return <span className={`chip ${m.tone}`}>{m.short}</span>;
}

export function PaidChip({ paid }: { paid: boolean }) {
  return paid ? <span className="chip mint">Lunas</span> : <span className="chip rose">Belum bayar</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <img src="img/mark-brown.png" alt="" />
      <div>{children}</div>
    </div>
  );
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}
