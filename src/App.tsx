import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ComponentType, type SVGProps } from 'react';
import { useStore } from './store';
import type { Order } from './types';
import { OrderForm } from './components/OrderForm';
import {
  IconBoard,
  IconBook,
  IconChecklist,
  IconCloud,
  IconCup,
  IconHome,
  IconMore,
  IconPlus,
  IconSettings,
  IconUsers,
  IconWallet,
} from './components/Icons';
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { Brew } from './pages/Brew';
import { Finance } from './pages/Finance';
import { Customers } from './pages/Customers';
import { MenuPage } from './pages/Menu';
import { Tasks } from './pages/Tasks';
import { SettingsPage } from './pages/Settings';
import { More } from './pages/More';
import { todayISO } from './lib/format';

type Route = 'home' | 'orders' | 'brew' | 'finance' | 'customers' | 'menu' | 'tasks' | 'settings' | 'more';

interface NavItem {
  route: Route;
  label: string;
  title: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const NAV: NavItem[] = [
  { route: 'home', label: 'Home', title: 'Dashboard', icon: IconHome },
  { route: 'orders', label: 'Orders', title: 'Orders', icon: IconBoard },
  { route: 'brew', label: 'Brew', title: 'Brew plan', icon: IconCup },
  { route: 'finance', label: 'Finance', title: 'Finance', icon: IconWallet },
  { route: 'customers', label: 'Customers', title: 'Customers', icon: IconUsers },
  { route: 'menu', label: 'Menu & HPP', title: 'Menu, recipes & HPP', icon: IconBook },
  { route: 'tasks', label: 'Tasks', title: 'Tasks', icon: IconChecklist },
  { route: 'settings', label: 'Settings', title: 'Settings', icon: IconSettings },
];
const MOBILE_TABS: Route[] = ['home', 'orders', 'brew', 'finance', 'more'];

function readRoute(): Route {
  const r = window.location.hash.replace(/^#\/?/, '').split('?')[0] as Route;
  return r && ([...NAV.map((n) => n.route), 'more'] as string[]).includes(r) ? r : 'home';
}

export const href = (r: Route) => `#/${r === 'home' ? '' : r}`;

interface UI {
  openOrder: (order?: Order, date?: string) => void;
  go: (r: Route) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}
type Theme = 'system' | 'light' | 'dark';
const UICtx = createContext<UI | null>(null);
export const useUI = () => useContext(UICtx)!;

function loadTheme(): Theme {
  try {
    return (localStorage.getItem('azkoi-hub-theme') as Theme) || 'system';
  } catch {
    return 'system';
  }
}

export default function App() {
  const { data, sync, toastMsg } = useStore();
  const [route, setRoute] = useState<Route>(readRoute);
  const [modal, setModal] = useState<{ order?: Order; date?: string } | null>(null);
  const [theme, setThemeState] = useState<Theme>(loadTheme);

  useEffect(() => {
    const on = () => {
      setRoute(readRoute());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('azkoi-hub-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const openOrder = useCallback((order?: Order, date?: string) => setModal({ order, date }), []);
  const go = useCallback((r: Route) => {
    window.location.hash = href(r);
  }, []);
  const ui = useMemo(() => ({ openOrder, go, theme, setTheme: setThemeState }), [openOrder, go, theme]);

  const today = todayISO();
  const openCount = data.orders.filter((o) => o.status === 'new' || o.status === 'brewing' || o.status === 'ready').length;
  const lateCount = data.orders.filter((o) => o.date < today && ['new', 'brewing', 'ready'].includes(o.status)).length;
  const current = NAV.find((n) => n.route === route) ?? { title: 'More', label: 'More' };

  let page;
  switch (route) {
    case 'orders': page = <Orders />; break;
    case 'brew': page = <Brew />; break;
    case 'finance': page = <Finance />; break;
    case 'customers': page = <Customers />; break;
    case 'menu': page = <MenuPage />; break;
    case 'tasks': page = <Tasks />; break;
    case 'settings': page = <SettingsPage />; break;
    case 'more': page = <More />; break;
    default: page = <Dashboard />;
  }

  return (
    <UICtx.Provider value={ui}>
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <img src="img/mark-cream.png" alt="" />
            <div>
              <div className="brand-name">{data.settings.businessName}</div>
              <div className="brand-sub">business hub</div>
            </div>
          </div>
          <nav className="nav">
            {NAV.map((n) => (
              <a key={n.route} href={href(n.route)} className={route === n.route ? 'active' : ''}>
                <n.icon />
                {n.label}
                {n.route === 'orders' && openCount > 0 && <span className="badge">{openCount}</span>}
              </a>
            ))}
          </nav>
          <div className="sidebar-photo">
            <img src="img/bottles.jpg" alt="AZKOI bottles" />
          </div>
          <div className="sidebar-foot">
            <div className="row">
              <IconCloud width={16} height={16} />
              <span>{sync.message || 'Saved on this device'}</span>
            </div>
            <div>{data.settings.tagline} · {data.settings.city}</div>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <a className="mobile-brand" href={href('home')} aria-label="Home">
              <img src="img/mark-cream.png" alt="" />
            </a>
            <div className="topbar-title">
              <h1>{current.title}</h1>
            </div>
            <div className="topbar-actions">
              {sync.status === 'error' && (
                <a className="chip rose hide-sm" href={href('settings')} title={sync.message}>
                  Sync error
                </a>
              )}
              <button className="btn primary hide-sm" onClick={() => openOrder()}>
                <IconPlus /> New order
              </button>
            </div>
          </header>
          <main className="content">{page}</main>
        </div>

        <nav className="bottom-nav">
          {MOBILE_TABS.map((r) => {
            const item = NAV.find((n) => n.route === r);
            const Icon = item?.icon ?? IconMore;
            const active = route === r || (r === 'more' && !MOBILE_TABS.includes(route));
            return (
              <a key={r} href={href(r)} className={active ? 'active' : ''}>
                <Icon />
                {item?.label ?? 'More'}
                {r === 'orders' && lateCount > 0 && <span className="dot" />}
              </a>
            );
          })}
        </nav>
        <button className="fab" onClick={() => openOrder()} aria-label="New order">
          <IconPlus />
        </button>
      </div>
      {modal && <OrderForm order={modal.order} defaultDate={modal.date} onClose={() => setModal(null)} />}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </UICtx.Provider>
  );
}
