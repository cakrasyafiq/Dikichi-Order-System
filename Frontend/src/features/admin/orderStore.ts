import type { V1Order } from '@/features/order/schema';

const STORAGE_KEY = 'dikichi.admin.orders.v1';

const STATUS_RANK: Readonly<Record<string, number>> = {
  PENDING: 0,
  ACCEPTED: 1,
  PREPARING: 2,
  READY: 3,
  COMPLETED: 4,
  CANCELLED: 5,
};

let memoryOrders: V1Order[] = [];

function rankOf(status: string): number {
  return STATUS_RANK[status] ?? -1;
}

function readAll(): V1Order[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryOrders;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as V1Order[]) : memoryOrders;
  } catch {
    return memoryOrders;
  }
}

function writeAll(orders: V1Order[]): void {
  memoryOrders = orders;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // WHY: private browsing or quota limits must not break the dashboard workflow.
  }
}

export function readCachedOrders(outletId: string): V1Order[] {
  return readAll()
    .filter((order) => order.outletId === outletId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function upsertCachedOrder(order: V1Order): V1Order {
  const all = readAll();
  const next = all.some((item) => item.id === order.id)
    ? all.map((item) => (item.id === order.id ? order : item))
    : [...all, order];
  writeAll(next);
  return order;
}

export function mergeServerOrders(outletId: string, serverOrders: readonly V1Order[]): V1Order[] {
  const all = readAll();
  const byId = new Map<string, V1Order>();

  for (const existing of all) {
    byId.set(existing.id, existing);
  }

  for (const incoming of serverOrders) {
    const current = byId.get(incoming.id);
    if (!current) {
      byId.set(incoming.id, incoming);
      continue;
    }
    // WHY: in the unified dashboard a single staff session may advance an order further than the role's backend queue.
    if (rankOf(incoming.status) >= rankOf(current.status)) {
      byId.set(incoming.id, incoming);
    }
  }

  const merged = [...byId.values()];
  writeAll(merged);
  return merged
    .filter((order) => order.outletId === outletId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function clearCachedOrders(): void {
  memoryOrders = [];
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage removal errors in restricted environments
  }
}
