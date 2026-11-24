import { describe, expect, it } from 'vitest';
import { findUnavailableLines } from '@/features/cart/unavailable';
import type { MenuItem } from '@/features/menu/schema';
import { mapServerFieldErrors } from './formErrors';
import { validateOrderDraft } from './orderDraft';
import { receiptFromV1, receiptFromV2 } from './receipt';

const validDraft = {
  outletId: 'OUT-01',
  tableCode: 'T-05',
  customerName: '  Budi  ',
  items: [{ menuItemId: 'm1', quantity: 2 }],
};

describe('validateOrderDraft', () => {
  it('accepts a valid draft and trims the customer name', () => {
    const result = validateOrderDraft(validDraft);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.customerName).toBe('Budi');
  });

  it('reports every missing field at once', () => {
    const result = validateOrderDraft({
      ...validDraft,
      customerName: ' ',
      tableCode: '',
      items: [],
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        customerName: 'Silakan masukkan nama Anda',
        tableCode: 'Silakan pilih meja Anda',
        items: 'Tambahkan minimal satu hidangan ke pesanan Anda',
      },
    });
  });

  it('rejects a table code that does not match the backend pattern', () => {
    const result = validateOrderDraft({ ...validDraft, tableCode: 'TABLE-5' });
    expect(result.ok).toBe(false);
  });
});

describe('mapServerFieldErrors', () => {
  it('maps flat v1 and nested v2 field paths to the same form fields', () => {
    expect(
      mapServerFieldErrors([
        { field: 'customerName', message: 'must not be blank' },
        { field: 'location.tableCode', message: 'does not exist' },
        { field: 'items[0].menuItemId', message: 'Item is unavailable' },
      ]),
    ).toEqual({
      customerName: 'must not be blank',
      tableCode: 'does not exist',
      items: 'Item is unavailable',
    });
    expect(mapServerFieldErrors([{ field: 'customer.name', message: 'too long' }])).toEqual({
      customerName: 'too long',
    });
  });

  it('ignores fields the form does not show', () => {
    expect(mapServerFieldErrors([{ field: 'unknown', message: 'x' }])).toEqual({});
  });
});

const items = [
  { menuItemId: 'm1', name: 'Mie Suit', unitPrice: 25000, quantity: 2, subtotal: 50000 },
];
const times = { createdAt: '2026-11-23T10:00:00Z', updatedAt: '2026-11-23T10:00:00Z' };

describe('receipts', () => {
  it('normalizes the flat v1 response', () => {
    const receipt = receiptFromV1({
      id: 'o1',
      orderNumber: 'ORD-0042',
      outletId: 'OUT-01',
      tableCode: 'T-05',
      customerName: 'Budi',
      status: 'PENDING',
      items,
      totalAmount: 50000,
      ...times,
    });
    expect(receipt).toMatchObject({ version: 'v1', customerName: 'Budi', totalAmount: 50000 });
  });

  it('normalizes the nested v2 response', () => {
    const receipt = receiptFromV2({
      id: 'o1',
      orderNumber: 'ORD-0042',
      status: 'PENDING',
      customer: { name: 'Budi' },
      location: { outletId: 'OUT-01', tableCode: 'T-05' },
      items,
      paymentSummary: { totalAmount: 50000, paymentStatus: 'UNPAID' },
      ...times,
    });
    expect(receipt).toMatchObject({ version: 'v2', tableCode: 'T-05', totalAmount: 50000 });
  });
});

describe('findUnavailableLines', () => {
  it('returns lines that are sold out or missing from the fresh menu', () => {
    const menu: MenuItem[] = [
      {
        id: 'm1',
        outletId: 'OUT-01',
        name: 'A',
        description: null,
        price: 1,
        category: 'Mie',
        available: false,
      },
      {
        id: 'm2',
        outletId: 'OUT-01',
        name: 'B',
        description: null,
        price: 1,
        category: 'Mie',
        available: true,
      },
    ];
    const lines = [
      { menuItemId: 'm1', name: 'A', unitPrice: 1, quantity: 1 },
      { menuItemId: 'm2', name: 'B', unitPrice: 1, quantity: 1 },
      { menuItemId: 'm3', name: 'C', unitPrice: 1, quantity: 1 },
    ];
    expect(findUnavailableLines(lines, menu).map((line) => line.menuItemId)).toEqual(['m1', 'm3']);
  });
});
