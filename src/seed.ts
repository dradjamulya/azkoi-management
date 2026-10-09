import type { AppData, Order, OrderItem, Txn } from './types';

// Initial data imported from AZKOI.xlsx (sheets: finance, Sales, R & D).

const NOW = '2026-10-09T08:00:00.000Z';

const SALES_ROWS: [string, string, string, number, number, string][] = [
  // [Order ID, Date, Item, Qty, Total, Buyer]
  ['ORD-001', '2026-10-01', 'drom-bs', 1, 21000, 'TEMEN KOS AZK'],
  ['ORD-002', '2026-10-01', 'drom-bs', 1, 21000, ''],
  ['ORD-003', '2026-10-01', 'drom-bs', 1, 21000, 'MARKETING'],
  ['ORD-004', '2026-10-01', 'drom-bs', 1, 19000, 'SHEVI'],
  ['ORD-005', '2026-10-02', 'drom-bs', 1, 19000, ''],
  ['ORD-006', '2026-10-02', 'drom-bs', 1, 19000, ''],
  ['ORD-007', '2026-10-03', 'drom-bs', 2, 38000, 'RISA'],
  ['ORD-008', '2026-10-03', 'drom-ns', 1, 19000, 'TITA'],
  ['ORD-008', '2026-10-03', 'drom-bs', 1, 19000, 'TITA'],
  ['ORD-009', '2026-10-03', 'drom-ns', 1, 21000, 'PRINKA'],
  ['ORD-009', '2026-10-03', 'drom-bs', 3, 63000, 'PRINKA'],
  ['ORD-010', '2026-10-08', 'drom-bs', 2, 42000, 'AURA'],
  ['ORD-011', '2026-10-08', 'drom-ns', 1, 21000, 'BELLA'],
  ['ORD-012', '2026-10-08', 'drom-bs', 2, 42000, 'RISA'],
  ['ORD-013', '2026-10-09', 'drom-ns', 1, 21000, 'SHAINA'],
  ['ORD-014', '2026-10-10', 'drom-ns', 2, 42000, 'FARAH'],
  ['ORD-015', '2026-10-10', 'drom-ns-1l', 1, 77000, 'TITA'],
];

function seedOrders(): Order[] {
  const map = new Map<string, Order>();
  for (const [id, date, productId, qty, total, buyer] of SALES_ROWS) {
    const item: OrderItem = { productId, qty, unitPrice: total / qty };
    const existing = map.get(id);
    if (existing) {
      existing.items.push(item);
      continue;
    }
    const status = date < '2026-10-09' ? 'done' : date === '2026-10-09' ? 'ready' : 'new';
    map.set(id, {
      id,
      date,
      buyer,
      contact: '',
      items: [item],
      discount: 0,
      status,
      paid: true,
      payment: '',
      fulfilment: 'pickup',
      address: '',
      notes: '',
      createdAt: NOW,
      updatedAt: NOW,
    });
  }
  return [...map.values()];
}

const EXPENSE_ROWS: [string, string, string, number][] = [
  // [Category, Item, Qty note, Price] — "Total R&D" in the finance sheet
  ['R&D', 'Da Hong Pao Oolong Tea Organik', '15gr', 14990],
  ['R&D', 'Oolong Tea Dong Ding', '15gr', 11990],
  ['R&D', 'Diamond Richer Milk', '1l', 26000],
  ['R&D', 'Fiber Creamer', '', 15000],
  ['R&D', 'Carnation Susu Evaporasi', '', 17000],
  ['R&D', 'Roasted Oolong Milk Teazzi (benchmark)', 'medium size 1', 30000],
  ['R&D', 'Botol aesthetic', '12pcs', 27000],
  ['Ingredients', 'Fujian Oolong Tea', '125gr', 38900],
  ['Ingredients', 'Max Creamer', '500gr', 53900],
  ['Ingredients', 'Max Creamer', '150gr', 32500],
  ['Ingredients', 'Sunbay Evaporated Milk', '380gr', 17500],
  ['Ingredients', 'Gulaku Premium', '1000gr', 17500],
  ['Packaging', 'Botol Plastik', '1pcs', 17000],
  ['Equipment', 'Saringan Teh', '1pcs', 10000],
  ['Equipment', 'Gelas Takaran', '1pcs', 13000],
  ['Equipment', 'Box Penyimpanan', '1pcs', 9000],
  ['Equipment', 'Termometer Kopi', '1pcs', 36250],
  ['Marketing', 'Canva Premium', '1 month', 10000],
  ['Packaging', 'Sticker Victoria Printing', '2 lembar A3', 26000],
  ['Packaging', 'Sticker Spectrum', '2 lembar A4', 26000],
  ['Marketing', 'Marketing (feeds)', '', 10000],
  ['Packaging', 'Botol Plastik', '50pcs', 108000],
  ['Packaging', 'Plastik Packaging', '10, 15, dan 25x33', 39700],
  ['Packaging', 'Kabel Ties', '100pcs', 3800],
  ['Operational', 'E-Sim by.u', '', 35000],
  ['Ingredients', 'Stok Fujian Oolong Tea', '4x125gr', 160500],
  ['Ingredients', 'Stok Max Creamer', '2x500gr', 91000],
  ['R&D', 'Scaling Kompetitor', '3pcs', 56000],
  ['Packaging', 'Sticker', '9pcs A3', 112500],
  ['Packaging', 'Straw Sedotan', '150pcs', 24000],
  ['Ingredients', 'Stok Sunbay Evaporasi', '4x380gr', 70000],
  ['Equipment', 'Teko', '2L', 21000],
  ['Equipment', 'Corong', '1pcs', 30000],
  ['Packaging', 'Sedotan Triple Holes 21cm', '250pcs', 75000],
  ['Packaging', 'Botol 1 Liter', '40pcs', 113292],
  ['Equipment', 'Panci Air', '4.5L', 65800],
];

function seedTxns(): Txn[] {
  return EXPENSE_ROWS.map(([category, description, qtyNote, amount], i) => ({
    id: `TX-${String(i + 1).padStart(3, '0')}`,
    // The sheet has no purchase dates; everything was bought before the first sale.
    date: i < 7 ? '2026-09-15' : '2026-09-30',
    type: 'expense',
    category,
    description,
    qtyNote,
    amount,
    createdAt: NOW,
  }));
}

const STEPS = [
  'Rebus 450 ml air sampai mendidih (±85°C).',
  'Masukkan oolong tea ke wadah, lalu tuang air panas.',
  'Diamkan 10 menit (ditutup).',
  'Saring teh, campur dengan gula dan krimer.',
  'Letakkan wadah di es / air dingin, putar-putar, diamkan 10 menit.',
  'Setelah dingin, campurkan susu evaporasi lalu aduk.',
  'Diamkan di kulkas minimal 6 jam.',
];

export function createSeed(): AppData {
  return {
    version: 1,
    updatedAt: NOW,
    settings: {
      businessName: 'AZKOI',
      tagline: 'ready to go milktea!',
      city: 'Surabaya',
      openDays: [4, 5, 6, 0],
      waTemplate:
        'Halo {buyer}! Makasih udah order AZKOI 🤎\n\n{items}\nTotal: {total}\n\n{fulfilment} {date}. Ditunggu ya!',
    },
    ingredients: [
      { id: 'tea-fujian', name: 'Fujian Oolong Tea', unit: 'g', packSize: 125, packPrice: 38900, stock: null, lowAt: 50 },
      { id: 'creamer-max', name: 'Max Creamer', unit: 'g', packSize: 500, packPrice: 53900, stock: null, lowAt: 150 },
      { id: 'evap-sunbay', name: 'Sunbay Evaporated Milk', unit: 'g', packSize: 380, packPrice: 17500, stock: null, lowAt: 150 },
      { id: 'sugar-gulaku', name: 'Gulaku Premium', unit: 'g', packSize: 1000, packPrice: 17500, stock: null, lowAt: 200 },
      { id: 'water', name: 'Air mendidih', unit: 'ml', packSize: 1000, packPrice: 0, stock: null, lowAt: null },
      { id: 'bottle-250', name: 'Botol 250 ml', unit: 'pcs', packSize: 50, packPrice: 108000, stock: null, lowAt: 10 },
      { id: 'bottle-1l', name: 'Botol 1 Liter', unit: 'pcs', packSize: 40, packPrice: 113292, stock: null, lowAt: 5 },
      { id: 'sticker', name: 'Sticker label', unit: 'pcs', packSize: 1, packPrice: 640, stock: null, lowAt: 10 },
      { id: 'straw', name: 'Sedotan Triple Holes 21cm', unit: 'pcs', packSize: 250, packPrice: 75000, stock: null, lowAt: 20 },
    ],
    recipes: [
      {
        id: 'bare',
        name: 'Bare Sugar (low sugar)',
        note: 'Mirip Teazzi deep roasted oolong milk tea 30% sugar.',
        lines: [
          { ingredientId: 'tea-fujian', qty: 12 },
          { ingredientId: 'creamer-max', qty: 30 },
          { ingredientId: 'evap-sunbay', qty: 30 },
          { ingredientId: 'sugar-gulaku', qty: 25 },
          { ingredientId: 'water', qty: 450 },
        ],
        steps: STEPS,
      },
      {
        id: 'normal',
        name: 'Normal Sugar',
        note: 'Mirip Teazzi deep roasted oolong milk tea 50% sugar.',
        lines: [
          { ingredientId: 'tea-fujian', qty: 12 },
          { ingredientId: 'creamer-max', qty: 38 },
          { ingredientId: 'evap-sunbay', qty: 30 },
          { ingredientId: 'sugar-gulaku', qty: 40 },
          { ingredientId: 'water', qty: 450 },
        ],
        steps: STEPS,
      },
    ],
    products: [
      {
        id: 'drom-bs',
        code: 'DROM BS',
        name: 'Deep Roasted Oolong Milk Tea',
        variant: 'Bare Sugar',
        sizeMl: 250,
        price: 21000,
        priceOptions: [{ label: 'Promo / teman', price: 19000 }],
        recipeId: 'bare',
        recipeScale: 1,
        packaging: [
          { ingredientId: 'bottle-250', qty: 1 },
          { ingredientId: 'sticker', qty: 1 },
        ],
        active: true,
        tone: 'honey',
      },
      {
        id: 'drom-ns',
        code: 'DROM NS',
        name: 'Deep Roasted Oolong Milk Tea',
        variant: 'Normal Sugar',
        sizeMl: 250,
        price: 21000,
        priceOptions: [{ label: 'Promo / teman', price: 19000 }],
        recipeId: 'normal',
        recipeScale: 1,
        packaging: [
          { ingredientId: 'bottle-250', qty: 1 },
          { ingredientId: 'sticker', qty: 1 },
        ],
        active: true,
        tone: 'sky',
      },
      {
        id: 'drom-bs-1l',
        code: '1L DROM BS',
        name: 'Deep Roasted Oolong Milk Tea',
        variant: 'Bare Sugar · 1 Liter',
        sizeMl: 1000,
        price: 77000,
        priceOptions: [],
        recipeId: 'bare',
        recipeScale: 4,
        packaging: [
          { ingredientId: 'bottle-1l', qty: 1 },
          { ingredientId: 'sticker', qty: 1 },
        ],
        active: true,
        tone: 'honey',
      },
      {
        id: 'drom-ns-1l',
        code: '1L DROM NS',
        name: 'Deep Roasted Oolong Milk Tea',
        variant: 'Normal Sugar · 1 Liter',
        sizeMl: 1000,
        price: 77000,
        priceOptions: [],
        recipeId: 'normal',
        recipeScale: 4,
        packaging: [
          { ingredientId: 'bottle-1l', qty: 1 },
          { ingredientId: 'sticker', qty: 1 },
        ],
        active: true,
        tone: 'sky',
      },
    ],
    orders: seedOrders(),
    txns: seedTxns(),
    campaigns: [],
    tasks: [
      { id: 'T-001', title: 'Plan IG content for this weekend', notes: 'Story menu + order rules, Thu–Sun.', tag: 'Content', due: '2026-10-09', status: 'todo', createdAt: NOW },
      { id: 'T-002', title: 'Restock Max Creamer', notes: '', tag: 'Restock', due: '', status: 'todo', createdAt: NOW },
      { id: 'T-003', title: 'R&D: test a new flavor', notes: '', tag: 'R&D', due: '', status: 'doing', createdAt: NOW },
    ],
  };
}
