export function formatRupiah(amount: number): string {
  const grouped = Math.trunc(Math.abs(amount))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${amount < 0 ? '-' : ''}Rp${grouped}`;
}

export function formatClock(timestampMs: number): string {
  return new Date(timestampMs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
