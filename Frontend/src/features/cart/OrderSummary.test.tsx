import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SubmissionApi } from '@/features/order/useOrderSubmission';
import { OrderSummary } from './OrderSummary';
import { useCart } from './useCart';

function Harness({ submit }: { submit: SubmissionApi['submit'] }) {
  const cart = useCart();
  const submission: SubmissionApi = {
    submit,
    isPending: false,
    errors: {},
    formError: null,
    notice: null,
    receipt: null,
    dismissReceipt: vi.fn(),
    clearError: vi.fn(),
  };
  return (
    <>
      <button type="button" onClick={() => cart.add({ id: 'm1', name: 'Mie Suit', price: 25000 })}>
        seed
      </button>
      <OrderSummary cart={cart} tableCode="T-05" submission={submission} />
    </>
  );
}

describe('OrderSummary', () => {
  it('shows an empty state and blocks submitting an empty order', () => {
    render(<Harness submit={vi.fn()} />);
    expect(screen.getByText('Your order is empty. Add dishes from the menu.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Place Order' })).toBeDisabled();
  });

  it('shows line totals and submits the name with the chosen API version', () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    render(<Harness submit={submit} />);

    fireEvent.click(screen.getByRole('button', { name: 'seed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Mie Suit' }));
    expect(screen.getAllByText('Rp50.000')).toHaveLength(2);

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Budi' } });
    fireEvent.click(screen.getByRole('button', { name: 'v2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Place Order' }));

    expect(submit).toHaveBeenCalledWith({ customerName: 'Budi', version: 'v2' });
  });

  it('removes a line when its quantity is decreased from one', () => {
    render(<Harness submit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'seed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Mie Suit' }));
    expect(screen.getByText('Your order is empty. Add dishes from the menu.')).toBeInTheDocument();
  });
});
