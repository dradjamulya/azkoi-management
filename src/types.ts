export type Unit = 'g' | 'ml' | 'pcs';

export interface Ingredient {
  id: string;
  name: string;
  unit: Unit;
  /** Size of one purchase pack, in `unit` (e.g. 125 for a 125 g tea pack). */
  packSize: number;
  /** Price paid for one pack, in Rupiah. */
  packPrice: number;
  /** On-hand stock in `unit`. null = not tracked. */
  stock: number | null;
}

export interface RecipeLine {
  ingredientId: string;
  qty: number;
}

export interface Recipe {
  id: string;
  name: string;
  note: string;
  /** Ingredients for ONE 250 ml bottle. */
  lines: RecipeLine[];
  steps: string[];
}

export interface Product {
  id: string;
  code: string;
  name: string;
  variant: string;
  sizeMl: number;
  price: number;
  recipeId: string;
  /** How many recipe portions go into one bottle (250 ml = 1, 1 L = 4). */
  recipeScale: number;
  packaging: RecipeLine[];
  active: boolean;
  /** Label colour for the bottle chip ("honey" = bare sugar, "sky" = normal sugar). */
  tone: 'honey' | 'sky' | 'latte' | 'mint';
}

export type OrderStatus = 'new' | 'brewing' | 'ready' | 'done' | 'cancelled';

export interface OrderItem {
  productId: string;
  qty: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  /** Pickup / delivery date, YYYY-MM-DD. This is the day the bottles must be ready. */
  date: string;
  buyer: string;
  contact: string;
  items: OrderItem[];
  discount: number;
  status: OrderStatus;
  paid: boolean;
  payment: '' | 'cash' | 'transfer' | 'qris';
  fulfilment: 'pickup' | 'delivery';
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type TxnType = 'expense' | 'income';

export const EXPENSE_CATEGORIES = [
  'R&D',
  'Ingredients',
  'Packaging',
  'Equipment',
  'Marketing',
  'Operational',
  'Other',
] as const;
export const INCOME_CATEGORIES = ['Other sales', 'Capital in', 'Other income'] as const;

export interface Txn {
  id: string;
  date: string;
  type: TxnType;
  category: string;
  description: string;
  qtyNote: string;
  amount: number;
  createdAt: string;
}

export type TaskStatus = 'todo' | 'doing' | 'done';
export const TASK_TAGS = ['Marketing', 'Content', 'R&D', 'Restock', 'Ops', 'Finance'] as const;

export interface Task {
  id: string;
  title: string;
  notes: string;
  tag: string;
  due: string;
  status: TaskStatus;
  createdAt: string;
}

export interface Settings {
  businessName: string;
  tagline: string;
  city: string;
  /** JS weekday numbers the shop is open (0 = Sunday). */
  openDays: number[];
  waTemplate: string;
}

export interface AppData {
  version: 1;
  updatedAt: string;
  settings: Settings;
  ingredients: Ingredient[];
  recipes: Recipe[];
  products: Product[];
  orders: Order[];
  txns: Txn[];
  tasks: Task[];
}
