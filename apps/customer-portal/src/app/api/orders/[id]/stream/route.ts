import { requireUser } from '@/lib/session';
import { bus, type Order } from '@/lib/store';
import { getOrder } from '@/lib/orders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user;
  try { user = await requireUser(); } catch { return new Response('unauthorized', { status: 401 }); }
  const initial = getOrder(id);
  if (!initial || initial.userId !== user.id) return new Response('not found', { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      // Initial snapshot
      send({ type: 'snapshot', order: initial });

      const handler = (o: Order) => send({ type: 'update', order: o });
      bus().on(`order:${id}`, handler);

      // Heartbeat every 15s so reverse proxies don't time out.
      const hb = setInterval(() => controller.enqueue(encoder.encode(`: ping\n\n`)), 15000);

      const close = () => {
        clearInterval(hb);
        bus().off(`order:${id}`, handler);
        try { controller.close(); } catch { /* already closed */ }
      };
      // Best-effort cleanup when the stream is cancelled.
      // @ts-expect-error - non-standard but handy
      controller._close = close;
    },
    cancel() {
      // @ts-expect-error - matches above
      this._close?.();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
