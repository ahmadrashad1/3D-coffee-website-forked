import Link from "next/link";
import CartButton from "@/components/CartButton";

export default function Nav({ variant }: { variant: "home" | "menu" }) {
  const base = variant === "menu" ? "/" : "";
  return (
    <nav
      id="brandnav"
      className={variant === "menu" ? "nav-dark" : undefined}
      aria-label="Primary navigation"
    >
      {variant === "menu" ? (
        <a className="wordmark" href="/">
          <strong>EMBER</strong>
          <small>ROASTERS</small>
        </a>
      ) : (
        <Link className="wordmark" href="#top">
          <strong>EMBER</strong>
          <small>ROASTERS</small>
        </Link>
      )}
      <div className="links">
        {variant === "menu" ? (
          <a href={`${base}#story`}>Our coffee</a>
        ) : (
          <Link href="#story">Our coffee</Link>
        )}
        {variant === "menu" ? (
          <a href={`${base}#craft`}>The roast</a>
        ) : (
          <Link href="#craft">The roast</Link>
        )}
        {variant === "menu" ? (
          <a href={`${base}#gallery`}>Journal</a>
        ) : (
          <Link href="#gallery">Journal</Link>
        )}
        <a href="/menu">Menu</a>
        {variant === "menu" ? (
          <a href={`${base}#about`}>About</a>
        ) : (
          <Link href="#about">About</Link>
        )}
        <a href="mailto:hello@ember.coffee">Contact</a>
      </div>
      <div className="nav-actions">
        <CartButton />
        <a className="navcta" href="/menu">
          Order ahead
        </a>
      </div>
    </nav>
  );
}
