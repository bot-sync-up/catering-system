import { prisma } from '@/server/db';
import { STATUS_LABELS_HE, fromPrismaStatus } from '@/domain/order/statusMap';
import { OrderActions } from './OrderActions';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: true,
      payments: true,
      invoice: true,
      shipmentDoc: true,
      kitchenTasks: true,
      delivery: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!order) notFound();

  return (
    <>
      <div className="card">
        <h2>
          הזמנה {order.orderNumber}{' '}
          <span className={`badge badge-${order.status}`}>
            {STATUS_LABELS_HE[fromPrismaStatus(order.status as never)]}
          </span>
        </h2>
        <p className="muted">
          {order.customer.fullName} — {order.customer.phone}
        </p>
        {order.eventDate && (
          <p>תאריך אירוע: {new Date(order.eventDate).toLocaleString('he-IL')}</p>
        )}
        {order.eventLocation && <p>מיקום: {order.eventLocation}</p>}
        <p><strong>סך הכל: {order.totalAmount.toFixed(2)} ₪</strong> (כולל מע"מ {order.taxAmount.toFixed(2)} ₪)</p>
        <OrderActions orderId={order.id} status={order.status} />
      </div>

      <div className="card">
        <h3>פריטים</h3>
        <table>
          <thead>
            <tr>
              <th>מק"ט</th>
              <th>שם</th>
              <th>כמות</th>
              <th>מחיר יח'</th>
              <th>סכום</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id}>
                <td>{it.productSku}</td>
                <td>{it.productName}</td>
                <td>{it.quantity}</td>
                <td>{it.unitPrice.toFixed(2)}</td>
                <td>{it.totalPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {order.invoice && (
        <div className="card">
          <h3>חשבונית</h3>
          <p>מספר: {order.invoice.invoiceNumber}</p>
          <p>סכום: {order.invoice.totalAmount.toFixed(2)} ₪</p>
        </div>
      )}

      {order.shipmentDoc && (
        <div className="card">
          <h3>תעודת משלוח (הצ"מ)</h3>
          <p>מספר: {order.shipmentDoc.docNumber}</p>
        </div>
      )}

      {order.kitchenTasks.length > 0 && (
        <div className="card">
          <h3>משימות מטבח</h3>
          <ul>
            {order.kitchenTasks.map((t) => (
              <li key={t.id}>
                <strong>{t.title}</strong> — {t.status}
                {t.description && <div className="muted">{t.description}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {order.delivery && (
        <div className="card">
          <h3>משלוח</h3>
          <p>סטטוס: {order.delivery.status}</p>
          <p>כתובת: {order.delivery.address}</p>
        </div>
      )}

      <div className="card">
        <h3>היסטוריית סטטוס</h3>
        <ul>
          {order.statusHistory.map((h) => (
            <li key={h.id}>
              {new Date(h.createdAt).toLocaleString('he-IL')} —{' '}
              {h.fromStatus ?? '∅'} → {h.toStatus}
              {h.actor && <> (ע"י {h.actor})</>}
              {h.reason && <> — {h.reason}</>}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
