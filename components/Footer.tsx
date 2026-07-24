import Link from "next/link";

export default function Footer({ variant }: { variant: "home" | "menu" }) {
  const base = variant === "menu" ? "/" : "";
  return (
    <footer data-bg={variant === "home" ? "dark" : undefined}>
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-mark">EMBER</div>
            <p className="footer-tag">Coffee for mornings already in motion.</p>
          </div>
          <div className="footer-col">
            <h3>Explore</h3>
            <Link href={`${base}#story`}>Our story</Link>
            <Link href={`${base}#craft`}>The roast</Link>
            <Link href={`${base}#blend`}>The blend</Link>
            <a href="/menu">Menu</a>
          </div>
          <div className="footer-col">
            <h3>Visit</h3>
            <Link href={`${base}#gallery`}>Journal</Link>
            <a href="mailto:hello@ember.coffee">Cafés</a>
            <a href="mailto:hello@ember.coffee">Stockists</a>
          </div>
          <div className="footer-col">
            <h3>Follow</h3>
            <a href="mailto:hello@ember.coffee">Instagram</a>
            <a href="mailto:hello@ember.coffee">Contact</a>
            <a href="mailto:hello@ember.coffee">Wholesale</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 EMBER Coffee</span>
          <span>Roasted slowly · carried daily</span>
        </div>
      </div>
    </footer>
  );
}
