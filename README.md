# AZKOI Hub

All-in-one business hub for **AZKOI** — ready to go milktea, Surabaya.
Works on phone, iPad and laptop, and can be added to the home screen like an app.

| Page | What it does |
|---|---|
| **Dashboard** | Break-even tracker ("R&D left"), today's and tomorrow's brew, revenue charts, best days, top customers |
| **Orders** | Trello-style board: *Order masuk → Lagi diseduh → Siap → Selesai*. Drag cards (hold on touch) or tap →. Paid / unpaid toggle, WhatsApp confirmation, list view, CSV export |
| **Brew plan** | Bottles to make for any date + extra walk-in stock, total ingredients (gram), HPP, step-by-step checklist, copy summary for WhatsApp |
| **Finance** | Total spent vs cash in, cash-flow per month, spending by category, unit economics (price vs HPP), ledger for purchases & other income |
| **Customers** | Built from orders: repeat buyers, total spent, favourite drink, WhatsApp button |
| **Menu & HPP** | Products & prices, recipes per 250 ml, ingredient pack prices and optional stock |
| **Tasks** | To-do board for content, restock, R&D experiments |
| **Settings** | Open days, WhatsApp message template, theme, cloud sync, backup / restore |

The first load is filled with the data from `AZKOI.xlsx` (Sales, finance, R & D sheets).

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Put it online (GitHub Pages)

1. Merge into `main`.
2. In the repo: **Settings → Pages → Source: GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` builds and publishes it to
   `https://<username>.github.io/azkoi-management/`.
4. On iPhone/iPad open that link in Safari → Share → **Add to Home Screen**.

## Data & sync between devices

By default, data is saved in the browser of each device. To have the **same data on phone, iPad and laptop**, connect a free Supabase project:

1. Create a project at <https://supabase.com>.
2. In **SQL Editor**, run:

   ```sql
   create table azkoi_state (
     id text primary key,
     data jsonb not null,
     updated_at timestamptz not null default now()
   );
   alter table azkoi_state enable row level security;
   create policy "workspace access" on azkoi_state
     for all using (true) with check (true);
   ```

3. Copy **Project URL** and the **anon public key** (Project Settings → API).
4. In the app: **Settings → Sync**, paste both and choose a long, hard-to-guess workspace code.
   First device: **Upload this device**. Other devices: same values, then **Pull from cloud**.

Anyone who knows the URL, key *and* workspace code can read the data, so keep the workspace code private.
Use **Settings → Backup** to download a JSON copy any time.
