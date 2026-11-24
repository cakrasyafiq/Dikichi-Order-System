import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCachedOrders } from '@/features/admin/orderStore';
import type { V1Order } from '@/features/order/schema';
import { clearSession, setSession } from '@/lib/auth/session';
import { AdminDashboardPage } from './AdminDashboardPage';

const OUTLETS = [
  { id: 'OUT-01', name: 'Dikichi Outlet 01', address: 'Jl. Contoh No. 1, Malang' },
  { id: 'OUT-02', name: 'Dikichi Outlet 02', address: 'Jl. Contoh No. 2, Surabaya' },
];
const INITIAL_TABLES = [{ id: 't5', outletId: 'OUT-01', code: 'T-05' }];
const INITIAL_MENU = [
  {
    id: 'm1',
    outletId: 'OUT-01',
    name: 'Crispy Chicken Ori Besar',
    description: 'Dada goreng crispy',
    price: 10000,
    category: 'makanan',
    imageUrl: '/api/v1/menu-images/menu_1.png',
    available: true,
  },
  {
    id: 'm2',
    outletId: 'OUT-01',
    name: 'Es Teh Manis',
    description: 'Teh manis dingin',
    price: 5000,
    category: 'minuman',
    imageUrl: '/api/v1/menu-images/menu_2.png',
    available: false,
  },
];

function makeInitialOrders(): V1Order[] {
  return [
    {
      id: 'o1',
      orderNumber: 'ORD-0042',
      outletId: 'OUT-01',
      tableCode: 'T-05',
      customerName: 'Budi',
      status: 'PENDING',
      items: [
        {
          menuItemId: 'm1',
          name: 'Crispy Chicken Ori Besar',
          unitPrice: 10000,
          quantity: 2,
          subtotal: 20000,
        },
      ],
      totalAmount: 20000,
      createdAt: '2026-11-24T10:00:00Z',
      updatedAt: '2026-11-24T10:00:00Z',
    },
    {
      id: 'o2',
      orderNumber: 'ORD-0043',
      outletId: 'OUT-01',
      tableCode: 'T-05',
      customerName: 'Siti',
      status: 'PENDING',
      items: [
        {
          menuItemId: 'm1',
          name: 'Crispy Chicken Ori Besar',
          unitPrice: 10000,
          quantity: 1,
          subtotal: 10000,
        },
      ],
      totalAmount: 10000,
      createdAt: '2026-11-24T10:05:00Z',
      updatedAt: '2026-11-24T10:05:00Z',
    },
  ];
}

function stubBackend() {
  let orders = makeInitialOrders();
  let tables = [...INITIAL_TABLES];
  let menu = [...INITIAL_MENU];

  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};

    if (method === 'GET' && url === '/api/v1/outlets') {
      return new Response(JSON.stringify(OUTLETS));
    }
    if (method === 'GET' && url === '/api/v1/outlets/OUT-01/tables') {
      return new Response(JSON.stringify(tables));
    }
    if (method === 'GET' && url === '/api/v1/outlets/OUT-01/menu-items') {
      return new Response(JSON.stringify(menu));
    }
    if (method === 'GET' && url.startsWith('/api/v1/orders')) {
      return new Response(JSON.stringify(orders));
    }

    if (method === 'PUT' && url === '/api/v1/orders/o1') {
      const reqItems = (body.items as { menuItemId: string; quantity: number }[]) ?? [];
      const updatedItems = reqItems.map((line) => ({
        menuItemId: line.menuItemId,
        name: 'Crispy Chicken Ori Besar',
        unitPrice: 10000,
        quantity: line.quantity,
        subtotal: 10000 * line.quantity,
      }));
      const totalAmount = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);
      const updated: V1Order = {
        ...orders[0]!,
        customerName: String(body.customerName),
        tableCode: String(body.tableCode),
        items: updatedItems,
        totalAmount,
      };
      orders = orders.map((order) => (order.id === 'o1' ? updated : order));
      return new Response(JSON.stringify(updated));
    }

    if (method === 'PATCH' && url.endsWith('/status')) {
      const id = url.split('/')[4]!;
      const target = String(body.status);
      const existing = orders.find((order) => order.id === id)!;
      const updated: V1Order = { ...existing, status: target };
      orders = orders.map((order) => (order.id === id ? updated : order));
      return new Response(JSON.stringify(updated));
    }

    if (method === 'POST' && url.endsWith('/pay')) {
      const id = url.split('/')[4]!;
      const existing = orders.find((order) => order.id === id)!;
      const updated: V1Order = { ...existing, status: 'PREPARING' };
      orders = orders.map((order) => (order.id === id ? updated : order));
      return new Response(JSON.stringify(updated));
    }

    if (method === 'POST' && url === '/api/v1/outlets/OUT-01/tables') {
      const created = { id: 't6', outletId: 'OUT-01', code: String(body.code) };
      tables = [...tables, created];
      return new Response(JSON.stringify(created), { status: 201 });
    }

    if (method === 'PATCH' && url === '/api/v1/menu-items/m1/availability') {
      const updated = { ...menu[0]!, available: Boolean(body.available) };
      menu = menu.map((item) => (item.id === 'm1' ? updated : item));
      return new Response(JSON.stringify(updated));
    }

    return new Response('{}', { status: 404 });
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/cashier']}>
        <AdminDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  clearCachedOrders();
  setSession({
    token: 'jwt-token',
    expiresAt: Date.now() + 3_600_000,
    user: { outletId: 'OUT-01' },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearSession();
  clearCachedOrders();
});

describe('AdminDashboardPage', () => {
  it('supports Cashier edit/accept/cancel, unavailable menu list, Kitchen 3-column flow with color codes, and tabular History', async () => {
    stubBackend();
    renderDashboard();

    // 1. Cashier tab: navbar has no numbering, unavailable menu list is shown on the left
    const sidebar = screen.getByLabelText('Sidebar dasbor admin');
    expect(sidebar).toBeInTheDocument();
    expect(within(sidebar).queryByText(/1\. Cashier/)).not.toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: /Cashier/ })).toBeInTheDocument();

    const unavailablePanel = await screen.findByRole('complementary', {
      name: 'Menu Tidak Tersedia',
    });
    expect(await within(unavailablePanel).findByText('Es Teh Manis')).toBeInTheDocument();
    expect(within(unavailablePanel).queryByText('Crispy Chicken Ori Besar')).not.toBeInTheDocument();

    expect(screen.getByLabelText('Layar konten dasbor admin')).toBeInTheDocument();
    expect(await screen.findByText(/ORD-0042 — Budi/)).toBeInTheDocument();
    expect(screen.getByText(/ORD-0043 — Siti/)).toBeInTheDocument();

    const editButtons = screen.getAllByRole('button', { name: 'Edit Order' });
    fireEvent.click(editButtons[0]!);

    const nameInput = screen.getByLabelText('Nama Pelanggan');
    fireEvent.change(nameInput, { target: { value: 'Budi Santoso' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah Crispy Chicken Ori Besar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));

    expect(await screen.findByText(/ORD-0042 — Budi Santoso/)).toBeInTheDocument();
    expect(screen.getAllByText('Rp30.000').length).toBeGreaterThanOrEqual(1);

    // Cancel ORD-0043
    const cancelButtons = screen.getAllByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButtons[1]!);
    expect(await screen.findByText('1 Pesanan Pending')).toBeInTheDocument();

    // Accept ORD-0042 after payment
    fireEvent.click(screen.getByRole('button', { name: 'Accept (Terima Pembayaran)' }));
    expect(
      await screen.findByText('Belum ada pesanan berstatus Pending'),
    ).toBeInTheDocument();

    // 2. Switch to Orders (Kitchen 3-column queue with Blue/Yellow/Green color coding)
    fireEvent.click(within(sidebar).getByRole('button', { name: /Orders/ }));

    const acceptedCol = screen.getByLabelText('Kolom Accepted');
    const preparingCol = screen.getByLabelText('Kolom Preparing');
    const readyCol = screen.getByLabelText('Kolom Ready');
    expect(acceptedCol.className).toContain('bg-blue-50/70');
    expect(preparingCol.className).toContain('bg-yellow-50/80');
    expect(readyCol.className).toContain('bg-green-50/70');
    expect(within(acceptedCol).getByText('ORD-0042')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Geser ke Preparing .* ORD-0042/ }),
    );
    expect(await within(preparingCol).findByText('ORD-0042')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Geser ke Ready .* ORD-0042/ }));
    expect(await within(readyCol).findByText('ORD-0042')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Done (Selesai) ORD-0042' }));
    expect(
      await within(readyCol).findByText('Belum ada pesanan di kolom Ready'),
    ).toBeInTheDocument();

    // 3. Switch to History tab: verify ORD-0042 is rendered inside a table
    fireEvent.click(within(sidebar).getByRole('button', { name: /History/ }));
    const historyTable = await screen.findByRole('table');
    expect(within(historyTable).getByText('ORD-0042')).toBeInTheDocument();
    expect(within(historyTable).getByText('Budi Santoso')).toBeInTheDocument();
    expect(within(historyTable).getByText('Completed')).toBeInTheDocument();
    expect(within(historyTable).getByText('Rp30.000')).toBeInTheDocument();
  });

  it('lets staff add a new seat/table and update menu stock in Management tab', async () => {
    stubBackend();
    renderDashboard();

    await screen.findByText(/ORD-0042 — Budi/);
    const sidebar = screen.getByLabelText('Sidebar dasbor admin');
    fireEvent.click(within(sidebar).getByRole('button', { name: /Management/ }));

    // Add a new table T-06
    fireEvent.click(screen.getByRole('button', { name: '+ Tambah Kursi / Meja' }));
    expect(await screen.findByText('Meja / kursi T-06 berhasil ditambahkan.')).toBeInTheDocument();
    expect(screen.getByText('T-06')).toBeInTheDocument();

    // Update menu stock availability
    expect(screen.getByText('Stok Tersedia')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ubah stok Crispy Chicken Ori Besar' }));
    await waitFor(() => {
      expect(screen.getAllByText('Stok Habis')).toHaveLength(2);
    });
  });

  it('locks the dashboard to the logged-in outlet and does not allow switching to other outlets', async () => {
    const fetchMock = stubBackend();
    renderDashboard();

    expect(await screen.findByText('Dikichi Outlet 01')).toBeInTheDocument();
    expect(screen.queryByLabelText('Pilih outlet admin')).not.toBeInTheDocument();
    expect(screen.queryByText('Dikichi Outlet 02')).not.toBeInTheDocument();

    const calledUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(calledUrls.some((url) => url.includes('OUT-02'))).toBe(false);
  });
});
