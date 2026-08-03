import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SiteScripts from "@/components/SiteScripts";
import AddToCartButton from "@/components/AddToCartButton";
import { menuCategories, menuItems, formatPrice } from "@/lib/menu-data";

export const metadata: Metadata = {
  title: "Menu — EMBER Coffee",
  description:
    "The EMBER menu — espresso, filter, cold brew, and pastries from small-batch, seasonal lots.",
  openGraph: {
    title: "Menu — EMBER Coffee",
    description: "Espresso, filter, cold brew, and pastries — order at the counter.",
    images: ["/images/hero.webp"],
  },
};

export default function MenuPage() {
  return (
    <>
      <a className="skip-link" href="#menu-content">
        Skip to menu
      </a>
      <Nav variant="menu" />
      <main id="menu-content">
        <section className="section">
          <div className="blend-head" data-reveal>
            <div>
              <p className="kicker">The menu</p>
              <h1 className="display">
                Order at
                <br />
                <em>the counter.</em>
              </h1>
            </div>
            <p className="lead">
              Small-batch, seasonal, and made to order — whether
              you&apos;re staying in or carrying it with you.
            </p>
          </div>

          {menuCategories.map((category) => (
            <div className="menu-category" data-reveal key={category}>
              <h2 className="menu-category-title">{category}</h2>
              <div className="menu-list">
                {menuItems
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <div className="menu-row" key={item.id}>
                      <img
                        className="menu-row-image"
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                      />
                      <div className="menu-row-info">
                        <strong>{item.name}</strong>
                        <span className="menu-desc">{item.description}</span>
                      </div>
                      <div className="menu-row-actions">
                        <span className="menu-price">{formatPrice(item.priceCents)}</span>
                        <AddToCartButton menuItemId={item.id} />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </section>
      </main>
      <Footer variant="menu" />
      <SiteScripts />
    </>
  );
}
