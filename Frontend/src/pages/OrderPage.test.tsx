import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrderPage } from './OrderPage';

const OUTLETS = [{ id: 'OUT-01', name: 'Dikichi Outlet 01', address: 'Jl. Contoh No. 1, Malang' }];
const TABLES = [{ id: 't5', outletId: 'OUT-01', code: 'T-05' }];
const MENU = [
  {
    id: 'm1',
    outletId: 'OUT-01',
    name: 'Mie Suit',
    description: null,
    price: 25000,
    category: 'Mie',
    imageUrl: '/api/v1/menu-images/menu_1.png',
    available: true,
  },
  {
    id: 'm2',
    outletId: 'OUT-01',
    name: 'Lumpia',
    description: null,
    price: 12000,
    category: 'Dimsum',
    imageUrl: null,
    available: false,
  },
];
const ORDER = {
  id: 'o1',
  orderNumber: 'ORD-0042',
  outletId: 'OUT-01',
  tableCode: 'T-05',
  customerName: 'Budi',
  status: 'PENDING',
  items: [{ menuItemId: 'm1', name: 'Mie Suit', unitPrice: 25000, quantity: 2, subtotal: 50000 }],
  totalAmount: 50000,
  createdAt: '2026-11-23T10:00:00Z',
  updatedAt: '2026-11-23T10:00:00Z',
};

const GET_RESPONSES: Record<string, unknown> = {
  '/api/v1/outlets': OUTLETS,
  '/api/v1/outlets/OUT-01/tables': TABLES,
  '/api/v1/outlets/OUT-01/menu-items': MENU,
};

function stubApi() {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return new Response(JSON.stringify(ORDER), { status: 201 });
    const body = GET_RESPONSES[url];
    if (body === undefined) return new Response('{}', { status: 404 });
    return new Response(JSON.stringify(body));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <OrderPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OrderPage', () => {
  it('lets a guest order from a QR link and shows the receipt with the API version used', async () => {
    const fetchMock = stubApi();
    renderPage('/order?outlet=OUT-01&table=T-05');

    const add = await screen.findByRole('button', { name: 'Tambah, Mie Suit' });
    const menuImages = document.querySelectorAll('img[src="/api/v1/menu-images/menu_1.png"]');
    expect(menuImages.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(add);
    fireEvent.click(add);
    fireEvent.change(screen.getByLabelText('Nama Anda'), { target: { value: 'Budi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Pesanan' }));

    expect(await screen.findByText('ORD-0042')).toBeInTheDocument();
    expect(screen.getByText('API v1')).toBeInTheDocument();

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(post?.[0]).toBe('/api/v1/orders');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      outletId: 'OUT-01',
      tableCode: 'T-05',
      customerName: 'Budi',
      items: [{ menuItemId: 'm1', quantity: 2 }],
    });
  });

  it('blocks adding sold-out dishes and asks for a table when none is chosen', async () => {
    stubApi();
    renderPage('/order');

    fireEvent.click(await screen.findByRole('button', { name: 'Dimsum' }));
    expect(screen.getByRole('button', { name: 'Habis, Lumpia' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Mie' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tambah, Mie Suit' }));
    fireEvent.change(screen.getByLabelText('Nama Anda'), { target: { value: 'Budi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Pesanan' }));

    expect(await screen.findByText('Silakan pilih meja Anda')).toBeInTheDocument();
  });
});
