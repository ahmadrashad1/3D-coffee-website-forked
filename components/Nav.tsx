import Link from "next/link";
import CartButton from "@/components/CartButton";
import AuthButton from "@/components/AuthButton";
import MobileNav from "@/components/MobileNav";

export default function Nav({ variant }: { variant: "home" | "menu" }) {
  const base = variant === "menu" ? "/" : "";
  const mobileLinks = [
    { label: "Our coffee", href: `${base}#story` },
    { label: "The roast", href: `${base}#craft` },
    { label: "Menu", href: "/menu" },
    { label: "About", href: `${base}#about` },
    { label: "Contact", href: "mailto:hello@ember.coffee" },
  ];
  return (
    <nav
      id="brandnav"
      className={variant === "menu" ? "nav-dark" : undefined}
      aria-label="Primary navigation"
    >
      <MobileNav links={mobileLinks} />
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
        <a href="/menu">Menu</a>
        {variant === "menu" ? (
          <a href={`${base}#about`}>About</a>
        ) : (
          <Link href="#about">About</Link>
        )}
        <a href="mailto:hello@ember.coffee">Contact</a>
      </div>
      <div className="nav-actions">
        <AuthButton />
        <CartButton />
        <a className="navcta" href="/menu">
          Order ahead
        </a>
      </div>
    </nav>
  );
}
