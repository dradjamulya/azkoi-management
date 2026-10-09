import type { AppData } from './types';

// Starter data: menu, recipes and ingredient prices from AZKOI.xlsx.
// Orders and ledger entries are NOT stored here (this repo is public) —
// restore them from your private backup file in Settings → Backup.

const NOW = '2026-10-09T08:00:00.000Z';
/** Old timestamp so a fresh device never overwrites real data in the cloud. */
const STARTER_TIME = '2000-01-01T00:00:00.000Z';

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
    updatedAt: STARTER_TIME,
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
    orders: [],
    txns: [],
    campaigns: [],
    tasks: [
      { id: 'T-001', title: 'Plan IG content for this weekend', notes: 'Story menu + order rules, Thu–Sun.', tag: 'Content', due: '2026-10-09', status: 'todo', createdAt: NOW },
      { id: 'T-002', title: 'Restock Max Creamer', notes: '', tag: 'Restock', due: '', status: 'todo', createdAt: NOW },
      { id: 'T-003', title: 'R&D: test a new flavor', notes: '', tag: 'R&D', due: '', status: 'doing', createdAt: NOW },
    ],
  };
}
