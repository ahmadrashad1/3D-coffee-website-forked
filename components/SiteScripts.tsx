"use client";

import { useEffect } from "react";

export default function SiteScripts() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach(
          (entry) => entry.isIntersecting && entry.target.classList.add("in")
        ),
      { threshold: 0.14 }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

    const revealNow = () => {
      document.querySelectorAll("[data-reveal]:not(.in)").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
          el.classList.add("in");
        }
      });
    };
    window.addEventListener("scroll", revealNow, { passive: true });
    revealNow();

    const nav = document.getElementById("brandnav");
    const filmEnd = () =>
      (document.getElementById("track")?.offsetHeight ?? window.innerHeight * 3) -
      window.innerHeight;
    const toggleOn = () =>
      nav?.classList.toggle("on", window.scrollY > filmEnd() * 0.96);
    window.addEventListener("scroll", toggleOn, { passive: true });

    const darkZones = [
      ...document.querySelectorAll<HTMLElement>('[data-bg="dark"]'),
    ];
    const updateNavTheme = () => {
      if (!nav) return;
      const navH = nav.offsetHeight;
      const overDark = darkZones.some((el) => {
        const r = el.getBoundingClientRect();
        return r.top < navH && r.bottom > 0;
      });
      nav.classList.toggle("nav-dark", !overDark);
    };
    window.addEventListener("scroll", updateNavTheme, { passive: true });
    updateNavTheme();

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", revealNow);
      window.removeEventListener("scroll", toggleOn);
      window.removeEventListener("scroll", updateNavTheme);
    };
  }, []);

  return null;
}
