import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { QueryView } from '@/lib/queryView';
import { SelectedOutletCard } from './SelectedOutletCard';
import type { Outlet } from './schema';

const outlet: Outlet = { id: 'OUT-01', name: 'Dikichi Outlet 01', address: 'Jl. Contoh No. 1' };

function view(overrides: Partial<QueryView<Outlet[]>>): QueryView<Outlet[]> {
  return {
    data: [outlet],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...overrides,
  };
}

describe('SelectedOutletCard', () => {
  it('shows the selected outlet without a branch picker when there is only one', () => {
    render(<SelectedOutletCard outlets={view({})} selected={outlet} onSelect={vi.fn()} />);
    expect(screen.getByText('Dikichi Outlet 01')).toBeInTheDocument();
    expect(screen.getByText('Jl. Contoh No. 1')).toBeInTheDocument();
    expect(screen.queryByLabelText('Pilih cabang')).not.toBeInTheDocument();
  });

  it('offers a branch picker when several outlets exist', () => {
    const other: Outlet = { id: 'OUT-02', name: 'Dikichi Outlet 02', address: 'Malang' };
    const onSelect = vi.fn();
    render(
      <SelectedOutletCard
        outlets={view({ data: [outlet, other] })}
        selected={outlet}
        onSelect={onSelect}
      />,
    );
    fireEvent.change(screen.getByLabelText('Pilih cabang'), { target: { value: 'OUT-02' } });
    expect(onSelect).toHaveBeenCalledWith('OUT-02');
  });

  it('shows a busy skeleton while loading', () => {
    render(
      <SelectedOutletCard
        outlets={view({ data: undefined, isPending: true })}
        selected={undefined}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Outlet terpilih')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows a readable error and retries on request', () => {
    const refetch = vi.fn();
    render(
      <SelectedOutletCard
        outlets={view({ data: undefined, isError: true, refetch })}
        selected={undefined}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText('Detail outlet tidak tersedia')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state with a refresh action when no kitchen exists', () => {
    render(
      <SelectedOutletCard outlets={view({ data: [] })} selected={undefined} onSelect={vi.fn()} />,
    );
    expect(screen.getByText('Belum ada outlet yang buka')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Muat ulang' })).toBeInTheDocument();
  });
});
