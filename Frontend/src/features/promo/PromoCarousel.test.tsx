import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MenuItem } from '@/features/menu/schema';
import type { QueryView } from '@/lib/queryView';
import { PromoCarousel } from './PromoCarousel';

const ITEMS: MenuItem[] = [
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
    name: 'Lemon Tea',
    description: 'Teh dengan rasa lemon',
    price: 6000,
    category: 'minuman',
    imageUrl: '/api/v1/menu-images/menu_14.png',
    available: true,
  },
];

function view(overrides: Partial<QueryView<MenuItem[]>>): QueryView<MenuItem[]> {
  return {
    data: ITEMS,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

describe('PromoCarousel', () => {
  it('shows database menu items and switches slides', () => {
    render(<PromoCarousel menu={view({})} items={ITEMS} />);

    expect(screen.getByText('Crispy Chicken Ori Besar')).toBeInTheDocument();
    expect(screen.getByText('Rp10.000')).toBeInTheDocument();
    expect(screen.getByAltText('Crispy Chicken Ori Besar')).toHaveAttribute(
      'src',
      '/api/v1/menu-images/menu_1.png',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Slide 2' }));
    expect(screen.getByText('Lemon Tea')).toBeInTheDocument();
    expect(screen.getByText('Rp6.000')).toBeInTheDocument();
    expect(screen.getByAltText('Lemon Tea')).toHaveAttribute(
      'src',
      '/api/v1/menu-images/menu_14.png',
    );
  });

  it('shows a busy skeleton while loading', () => {
    render(<PromoCarousel menu={view({ data: undefined, isPending: true })} items={[]} />);
    expect(screen.getByLabelText('Menu unggulan')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows an empty message when no menu items are available', () => {
    render(<PromoCarousel menu={view({ data: [] })} items={[]} />);
    expect(screen.getByText('Belum ada menu yang tersedia di outlet ini.')).toBeInTheDocument();
  });
});
