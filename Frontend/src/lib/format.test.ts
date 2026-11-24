import { describe, expect, it } from 'vitest';
import { formatClock, formatRupiah } from './format';

describe('formatRupiah', () => {
  it('groups thousands with dots and no space after the prefix', () => {
    expect(formatRupiah(45000)).toBe('Rp45.000');
    expect(formatRupiah(1234567)).toBe('Rp1.234.567');
  });

  it('handles zero and small amounts', () => {
    expect(formatRupiah(0)).toBe('Rp0');
    expect(formatRupiah(900)).toBe('Rp900');
  });
});

describe('formatClock', () => {
  it('formats a timestamp as a 24 hour HH:MM clock', () => {
    expect(formatClock(Date.UTC(2026, 10, 24, 8, 5))).toMatch(/^\d{2}:\d{2}$/);
  });
});
