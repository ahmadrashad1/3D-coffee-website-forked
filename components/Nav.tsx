import Link from "next/link";

export default function Nav({ variant }: { variant: "home" | "menu" }) {
  const base = variant === "menu" ? "/" : "";
  return (
    <nav
      id="brandnav"
      className={variant === "menu" ? "nav-dark" : undefined}
      aria-label="Primary navigation"
    >
      <Link className="wordmark" href={variant === "menu" ? "/" : "#top"}>
        <strong>EMBER</strong>
        <small>ROASTERS</small>
      </Link>
      <div className="links">
        <Link href={`${base}#story`}>Our coffee</Link>
        <Link href={`${base}#craft`}>The roast</Link>
        <Link href={`${base}#gallery`}>Journal</Link>
        <Link href="/menu">Menu</Link>
        <Link href={`${base}#about`}>About</Link>
        <a href="mailto:hello@ember.coffee">Contact</a>
      </div>
      <Link className="navcta" href={`${base}#reserve`}>
        Order ahead
      </Link>
    </nav>
  );
}
