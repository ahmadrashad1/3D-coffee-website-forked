import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SiteScripts from "@/components/SiteScripts";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/menu-data";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);

  if (!Number.isInteger(orderId)) {
    notFound();
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    notFound();
  }

  return (
    <>
      <Nav variant="menu" />
      <main id="confirmation-content">
        <section className="section">
          <div className="blend-head" data-reveal>
            <div>
              <p className="kicker">Order #{order.id}</p>
              <h1 className="display">
                Thanks,
                <br />
                <em>{order.customerName}.</em>
              </h1>
            </div>
            <p className="lead">Pickup time: {order.pickupTime}</p>
          </div>

          <ul className="cart-drawer-list">
            {order.items.map((item) => (
              <li key={item.id} className="checkout-summary-row">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>{formatPrice(item.priceCents * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="cart-drawer-total">Total: {formatPrice(order.totalCents)}</div>
        </section>
      </main>
      <Footer variant="menu" />
      <SiteScripts />
    </>
  );
}
