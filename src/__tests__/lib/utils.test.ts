import { formatCurrency } from '@/lib/utils';

describe('formatCurrency', () => {
  it('should format a number to IRT correctly', () => {
    expect(formatCurrency(12345, 'IRT')).toBe('۱۲٬۳۴۵ تومان');
  });

  it('should handle zero correctly', () => {
    expect(formatCurrency(0, 'IRT')).toBe('۰ تومان');
  });

  it('should format a number to USD correctly', () => {
    expect(formatCurrency(123.45, 'USD')).toBe('$123.45');
  });
});
