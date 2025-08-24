export const PRODUCTS = {
  baseline: {
    label: 'Baseline',
    cents: parseInt(process.env.NEXT_PUBLIC_PRICE_BASELINE_CENTS || '6500', 10)
  },
  package4: {
    label: 'Package (4 weekly sessions)',
    cents: parseInt(process.env.NEXT_PUBLIC_PRICE_PACKAGE4_CENTS || '19900', 10)
  }
};
export function centsFor(productKey) {
  return (PRODUCTS[productKey]?.cents ?? PRODUCTS.baseline.cents);
}
