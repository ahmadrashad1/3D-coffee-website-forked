import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SiteScripts from "@/components/SiteScripts";

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

          <div className="menu-category" data-reveal>
            <h2 className="menu-category-title">Espresso</h2>
            <div className="menu-list">
              <div className="menu-row">
                <div>
                  <strong>Espresso</strong>
                  <span className="menu-desc">
                    Single or double shot, pulled to order.
                  </span>
                </div>
                <span className="menu-price">$3.50</span>
              </div>
              <div className="menu-row">
                <div>
                  <strong>Cortado</strong>
                  <span className="menu-desc">
                    Espresso softened with warm milk, equal parts.
                  </span>
                </div>
                <span className="menu-price">$4.50</span>
              </div>
              <div className="menu-row">
                <div>
                  <strong>Cappuccino</strong>
                  <span className="menu-desc">
                    Espresso, steamed milk, a proper cap of foam.
                  </span>
                </div>
                <span className="menu-price">$5.00</span>
              </div>
              <div className="menu-row">
                <div>
                  <strong>Flat White</strong>
                  <span className="menu-desc">
                    Double ristretto, microfoam, no nonsense.
                  </span>
                </div>
                <span className="menu-price">$5.25</span>
              </div>
            </div>
          </div>

          <div className="menu-category" data-reveal>
            <h2 className="menu-category-title">Filter</h2>
            <div className="menu-list">
              <div className="menu-row">
                <div>
                  <strong>Pour Over</strong>
                  <span className="menu-desc">
                    Today&apos;s single-estate lot, brewed to order.
                  </span>
                </div>
                <span className="menu-price">$5.50</span>
              </div>
              <div className="menu-row">
                <div>
                  <strong>Batch Brew</strong>
                  <span className="menu-desc">
                    Our house blend, always fresh, always on.
                  </span>
                </div>
                <span className="menu-price">$3.75</span>
              </div>
              <div className="menu-row">
                <div>
                  <strong>Drip</strong>
                  <span className="menu-desc">
                    Classic filter coffee, brewed by the pot.
                  </span>
                </div>
                <span className="menu-price">$3.25</span>
              </div>
            </div>
          </div>

          <div className="menu-category" data-reveal>
            <h2 className="menu-category-title">Cold Brew</h2>
            <div className="menu-list">
              <div className="menu-row">
                <div>
                  <strong>Cold Brew</strong>
                  <span className="menu-desc">
                    Steeped 18 hours, served over ice.
                  </span>
                </div>
                <span className="menu-price">$5.00</span>
              </div>
              <div className="menu-row">
                <div>
                  <strong>Iced Latte</strong>
                  <span className="menu-desc">
                    Espresso, cold milk, plenty of ice.
                  </span>
                </div>
                <span className="menu-price">$5.50</span>
              </div>
              <div className="menu-row">
                <div>
                  <strong>Sparkling Cold Brew</strong>
                  <span className="menu-desc">
                    Cold brew, soda, a citrus twist.
                  </span>
                </div>
                <span className="menu-price">$6.00</span>
              </div>
            </div>
          </div>

          <div className="menu-category" data-reveal>
            <h2 className="menu-category-title">Pastries</h2>
            <div className="menu-list">
              <div className="menu-row">
                <div>
                  <strong>Butter Croissant</strong>
                  <span className="menu-desc">Baked fresh each morning.</span>
                </div>
                <span className="menu-price">$3.75</span>
              </div>
              <div className="menu-row">
                <div>
                  <strong>Almond Financier</strong>
                  <span className="menu-desc">
                    Toasted almond, brown butter.
                  </span>
                </div>
                <span className="menu-price">$4.00</span>
              </div>
              <div className="menu-row">
                <div>
                  <strong>Banana Bread</strong>
                  <span className="menu-desc">
                    Studded with toasted walnuts.
                  </span>
                </div>
                <span className="menu-price">$4.25</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer variant="menu" />
      <SiteScripts />
    </>
  );
}
