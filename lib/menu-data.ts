export type MenuItem = {
  id: string;
  category: string;
  name: string;
  description: string;
  priceCents: number;
  image: string;
};

export const menuCategories = ["Espresso", "Filter", "Cold Brew", "Pastries"] as const;

export const menuItems: MenuItem[] = [
  { id: "espresso", category: "Espresso", name: "Espresso", description: "Single or double shot, pulled to order.", priceCents: 350, image: "/images/coffee-barista.jpg" },
  { id: "cortado", category: "Espresso", name: "Cortado", description: "Espresso softened with warm milk, equal parts.", priceCents: 450, image: "/images/coffee-image.jpg" },
  { id: "cappuccino", category: "Espresso", name: "Cappuccino", description: "Espresso, steamed milk, a proper cap of foam.", priceCents: 500, image: "/images/coffee-shop.jpg" },
  { id: "flat-white", category: "Espresso", name: "Flat White", description: "Double ristretto, microfoam, no nonsense.", priceCents: 525, image: "/images/detail-beans.webp" },
  { id: "pour-over", category: "Filter", name: "Pour Over", description: "Today's single-estate lot, brewed to order.", priceCents: 550, image: "/images/detail-lid.webp" },
  { id: "batch-brew", category: "Filter", name: "Batch Brew", description: "Our house blend, always fresh, always on.", priceCents: 375, image: "/images/gallery-final.webp" },
  { id: "drip", category: "Filter", name: "Drip", description: "Classic filter coffee, brewed by the pot.", priceCents: 325, image: "/images/gallery-wide.webp" },
  { id: "cold-brew", category: "Cold Brew", name: "Cold Brew", description: "Steeped 18 hours, served over ice.", priceCents: 500, image: "/images/bean-crop.webp" },
  { id: "iced-latte", category: "Cold Brew", name: "Iced Latte", description: "Espresso, cold milk, plenty of ice.", priceCents: 550, image: "/images/lid-crop.webp" },
  { id: "sparkling-cold-brew", category: "Cold Brew", name: "Sparkling Cold Brew", description: "Cold brew, soda, a citrus twist.", priceCents: 600, image: "/images/origin.webp" },
  { id: "butter-croissant", category: "Pastries", name: "Butter Croissant", description: "Baked fresh each morning.", priceCents: 375, image: "/images/coffee-shop.jpg" },
  { id: "almond-financier", category: "Pastries", name: "Almond Financier", description: "Toasted almond, brown butter.", priceCents: 400, image: "/images/coffee-barista.jpg" },
  { id: "banana-bread", category: "Pastries", name: "Banana Bread", description: "Studded with toasted walnuts.", priceCents: 425, image: "/images/coffee-shop.jpg" },
];

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function findMenuItem(id: string): MenuItem | undefined {
  return menuItems.find((item) => item.id === id);
}
