import type { Metadata } from "next";
import Script from "next/script";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SiteScripts from "@/components/SiteScripts";

export const metadata: Metadata = {
  title: "EMBER — Carry the ritual",
  description:
    "EMBER is coffee for mornings already in motion—roasted with depth and made to travel.",
  openGraph: {
    title: "EMBER — Carry the ritual",
    description: "A considered coffee ritual for mornings already in motion.",
    images: ["/images/hero.webp"],
  },
};

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#story">
        Skip to brand story
      </a>
      <div id="loader" aria-live="polite">
        <div className="loader-mark">EMBER</div>
        <div className="loader-line">
          <i id="loadbar"></i>
        </div>
        <span className="loader-copy">Preparing your ritual</span>
      </div>
      <Nav variant="home" />
      <div id="track">
        <div id="stage" data-bg="dark">
          <canvas
            id="film"
            aria-label="Coffee cup film controlled by scrolling"
          ></canvas>
          <div id="vignette"></div>
          <div id="grain"></div>
          <div
            className="caption cap-center"
            data-in="-0.05"
            data-hold="0.025"
            data-out="0.075"
          >
            <p className="eyebrow">Small-batch coffee · Est. 2026</p>
            <h1>
              EMBER
              <em>Coffee</em>
            </h1>
            <p>Carry the ritual.</p>
          </div>
          <div
            className="caption cap-left"
            data-in="0.03"
            data-hold="0.07"
            data-out="0.12"
          >
            <p className="eyebrow">01 · Begin</p>
            <h2>
              Start with
              <em>something real.</em>
            </h2>
            <p>Roasted for depth. Built for the first quiet minute.</p>
          </div>
          <div
            className="caption cap-right"
            data-in="0.15"
            data-hold="0.25"
            data-out="0.37"
          >
            <p className="eyebrow">02 · Open</p>
            <h2>
              The lid lifts.
              <em>The day opens.</em>
            </h2>
            <p>A small ritual, made to travel well.</p>
          </div>
          <div
            className="caption cap-left"
            data-in="0.42"
            data-hold="0.50"
            data-out="0.58"
          >
            <p className="eyebrow">03 · Hold</p>
            <h2>
              Warmth,
              <em>held close.</em>
            </h2>
            <p>Quiet materials. A cup made to stay in your hand.</p>
          </div>
          <div
            className="caption cap-right"
            data-in="0.60"
            data-hold="0.68"
            data-out="0.76"
          >
            <p className="eyebrow">04 · Taste</p>
            <h2>
              Deep roast.
              <em>Clean finish.</em>
            </h2>
            <p>Cacao, toasted sugar, and a measured edge.</p>
          </div>
          <div
            className="caption cap-left"
            data-in="0.78"
            data-hold="0.86"
            data-out="0.94"
          >
            <p className="eyebrow">05 · Move</p>
            <h2>
              For mornings
              <em>in motion.</em>
            </h2>
            <p>Make the everyday feel considered.</p>
          </div>
          <div id="scroll-cue">Scroll to explore</div>
        </div>
      </div>
      <main id="story">
        <section className="section manifesto" data-bg="dark">
          <span className="manifesto-index">01 / 05</span>
          <div className="manifesto-inner">
            <div data-reveal>
              <p className="kicker">The philosophy</p>
              <h2 className="display">
                Coffee should <em>follow you.</em>
              </h2>
            </div>
            <p className="lead" data-reveal>
              EMBER began with a simple belief: the coffee you carry should
              feel as intentional as the coffee you sit down for. Deeply
              roasted, quietly designed, always ready to move.
            </p>
          </div>
        </section>
        <section className="section">
          <div className="feature">
            <div className="visual" data-reveal>
              <img
                src="/images/coffee-shop.jpg"
                alt="EMBER coffee cup in warm light"
                loading="lazy"
              />
            </div>
            <div className="feature-copy" data-reveal>
              <div className="section-no">02 · Origin</div>
              <p className="kicker">Made for the first minute</p>
              <h2>
                A slower start
                <br />
                <em>to moving days.</em>
              </h2>
              <p className="lead">
                Small-batch beans meet precise roasting and a generous
                finish. The result is coffee with presence—rich enough to
                wake you, balanced enough to stay with you.
              </p>
              <a className="text-link" href="#blend">
                Meet the blend
              </a>
            </div>
          </div>
        </section>
        <section className="section" id="craft">
          <div className="feature reverse">
            <div className="visual" data-reveal>
              <img
                src="/images/coffee-image.jpg"
                alt="Roasted coffee beans around the EMBER cup"
                loading="lazy"
              />
            </div>
            <div className="feature-copy" data-reveal>
              <div className="section-no">03 · Craft</div>
              <p className="kicker">Roasted with restraint</p>
              <h2>
                Depth without
                <br />
                <em>the heaviness.</em>
              </h2>
              <p className="lead">
                We develop sweetness first: cacao, toasted sugar, and a
                gentle fruit brightness. The finish stays clean, whether you
                drink it black or soften it with milk.
              </p>
            </div>
          </div>
        </section>
        <div className="roast-panel" data-bg="dark">
          <section className="section">
            <div data-reveal>
              <p className="kicker">Tasting notes</p>
              <h2 className="display">
                Dark, warm,
                <br />
                <em>quietly bright.</em>
              </h2>
              <p className="lead">
                A medium-dark profile built for everyday brewing—structured,
                soft, and never overworked.
              </p>
            </div>
            <div className="notes" data-reveal>
              <div className="note">
                <strong>Cacao</strong>
                <span>Foundation</span>
              </div>
              <div className="note">
                <strong>Toffee</strong>
                <span>Sweetness</span>
              </div>
              <div className="note">
                <strong>Red plum</strong>
                <span>Finish</span>
              </div>
            </div>
          </section>
        </div>
        <section className="section blend" id="blend">
          <div className="blend-head" data-reveal>
            <div>
              <p className="kicker">The daily blend</p>
              <h2 className="display">
                One roast.
                <br />
                <em>Every ritual.</em>
              </h2>
            </div>
            <p className="lead">
              Built to perform across espresso, filter, and the cup you take
              with you. Freshly roasted and packed in small runs.
            </p>
          </div>
          <div className="spec-list" data-reveal>
            <div className="spec-row">
              <span>01</span>
              <strong>Profile</strong>
              <span>Dark chocolate · toasted sugar · red plum</span>
            </div>
            <div className="spec-row">
              <span>02</span>
              <strong>Roast</strong>
              <span>Medium-dark, developed for sweetness</span>
            </div>
            <div className="spec-row">
              <span>03</span>
              <strong>Origin</strong>
              <span>Seasonal single-estate lots</span>
            </div>
            <div className="spec-row">
              <span>04</span>
              <strong>Format</strong>
              <span>Whole bean · ground to order</span>
            </div>
          </div>
        </section>
        <section className="section quote">
          <div data-reveal>
            <p className="kicker">Words from the counter</p>
            <blockquote>
              “A coffee ritual with the volume turned down.”
            </blockquote>
            <cite>Early owner · Lisbon</cite>
          </div>
        </section>
        <section className="cta-band" id="reserve">
          <div className="cta-band-inner">
            <div data-reveal>
              <p className="kicker">Your next cup</p>
              <h2 className="display">
                Carry the <em>ritual.</em>
              </h2>
            </div>
            <div className="cta-band-actions" data-reveal>
              <p className="lead">
                Freshly roasted. Packed in small batches. Ready for wherever
                morning takes you.
              </p>
              <a className="cta" href="/menu">
                Shop the blend
              </a>
            </div>
          </div>
        </section>
        <div className="about-hero" id="about" data-bg="dark">
          <section className="section">
            <div className="feature">
              <div className="visual" data-reveal>
                <img
                  src="/images/coffee-barista.jpg"
                  alt="EMBER barista preparing coffee behind the counter"
                  loading="lazy"
                />
              </div>
              <div className="feature-copy" data-reveal>
                <div className="section-no">About · EMBER</div>
                <p className="kicker">Behind the counter</p>
                <h2 className="display">
                  It&apos;s our pleasure
                  <br />
                  <em>serving you the best coffee in town.</em>
                </h2>
                <p className="lead">
                  Behind every order is a barista who&apos;s tasted the
                  batch, dialed the grind, and knows exactly what a good
                  morning should taste like. That care is the actual
                  product.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer variant="home" />
      <Script src="/main.js" strategy="afterInteractive" />
      <SiteScripts />
    </>
  );
}
