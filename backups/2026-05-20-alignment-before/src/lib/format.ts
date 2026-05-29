/** Indian-style price formatting (lakhs/crores). */
export function formatINR(n: number, withSymbol = true) {
  if (Number.isNaN(n) || n == null) return withSymbol ? '₹ 0' : '0';
  const abs = Math.abs(n);
  const fixed = abs.toFixed(0);
  // Use Indian numbering: last 3 digits, then groups of 2.
  const lastThree = fixed.slice(-3);
  const others = fixed.slice(0, -3);
  const formatted = others
    ? others.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
    : lastThree;
  const sign = n < 0 ? '-' : '';
  return `${sign}${withSymbol ? '₹ ' : ''}${formatted}`;
}

export function formatCompact(n: number) {
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
