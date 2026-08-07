import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/menu-data";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true, user: { select: { email: true } } },
  });

  return (
    <main className="admin-orders">
      <section className="section">
        <p className="kicker">Demo only — not authenticated</p>
        <h1 className="display">Orders</h1>
        <div className="admin-orders-table-wrap">
          <table className="admin-orders-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Account</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Pickup</th>
                <th>Items</th>
                <th>Total</th>
                <th>Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{order.user.email}</td>
                  <td>{order.customerName}</td>
                  <td>{order.contact}</td>
                  <td>{order.pickupTime}</td>
                  <td>{order.items.map((item) => `${item.name} ×${item.quantity}`).join(", ")}</td>
                  <td>{formatPrice(order.totalCents)}</td>
                  <td>{order.createdAt.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
