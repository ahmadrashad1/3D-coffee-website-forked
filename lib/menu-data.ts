export type MenuItem = {
  id: string;
  category: string;
  name: string;
  description: string;
  priceCents: number;
};

export const menuCategories = ["Espresso", "Filter", "Cold Brew", "Pastries"] as const;

export const menuItems: MenuItem[] = [
  { id: "espresso", category: "Espresso", name: "Espresso", description: "Single or double shot, pulled to order.", priceCents: 350 },
  { id: "cortado", category: "Espresso", name: "Cortado", description: "Espresso softened with warm milk, equal parts.", priceCents: 450 },
  { id: "cappuccino", category: "Espresso", name: "Cappuccino", description: "Espresso, steamed milk, a proper cap of foam.", priceCents: 500 },
  { id: "flat-white", category: "Espresso", name: "Flat White", description: "Double ristretto, microfoam, no nonsense.", priceCents: 525 },
  { id: "pour-over", category: "Filter", name: "Pour Over", description: "Today's single-estate lot, brewed to order.", priceCents: 550 },
  { id: "batch-brew", category: "Filter", name: "Batch Brew", description: "Our house blend, always fresh, always on.", priceCents: 375 },
  { id: "drip", category: "Filter", name: "Drip", description: "Classic filter coffee, brewed by the pot.", priceCents: 325 },
  { id: "cold-brew", category: "Cold Brew", name: "Cold Brew", description: "Steeped 18 hours, served over ice.", priceCents: 500 },
  { id: "iced-latte", category: "Cold Brew", name: "Iced Latte", description: "Espresso, cold milk, plenty of ice.", priceCents: 550 },
  { id: "sparkling-cold-brew", category: "Cold Brew", name: "Sparkling Cold Brew", description: "Cold brew, soda, a citrus twist.", priceCents: 600 },
  { id: "butter-croissant", category: "Pastries", name: "Butter Croissant", description: "Baked fresh each morning.", priceCents: 375 },
  { id: "almond-financier", category: "Pastries", name: "Almond Financier", description: "Toasted almond, brown butter.", priceCents: 400 },
  { id: "banana-bread", category: "Pastries", name: "Banana Bread", description: "Studded with toasted walnuts.", priceCents: 425 },
];

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function findMenuItem(id: string): MenuItem | undefined {
  return menuItems.find((item) => item.id === id);
}
