type InventoryRow = {
  id?: string;
  name?: string;
  stock?: number | string;
  unit?: string | null;
  low_stock_threshold?: number | string;
};

type DatabaseWebhook = {
  type?: string;
  schema?: string;
  table?: string;
  record?: InventoryRow | null;
  old_record?: InventoryRow | null;
};

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const expectedSecret = process.env.LOW_STOCK_WEBHOOK_SECRET;
  const receivedSecret = request.headers.get('x-low-stock-secret');
  if (!expectedSecret || !receivedSecret || receivedSecret !== expectedSecret) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    return Response.json({ error: 'Telegram is not configured.' }, { status: 503 });
  }

  let event: DatabaseWebhook;
  try {
    event = (await request.json()) as DatabaseWebhook;
  } catch {
    return Response.json({ error: 'Invalid webhook payload.' }, { status: 400 });
  }

  if (
    event.schema !== 'public' ||
    event.table !== 'inventory_items' ||
    !['INSERT', 'UPDATE'].includes(event.type ?? '') ||
    !event.record
  ) {
    return Response.json({ ignored: true });
  }

  const item = event.record;
  const stock = Number(item.stock);
  const threshold = Number(item.low_stock_threshold);
  if (!item.name || !Number.isFinite(stock) || !Number.isFinite(threshold)) {
    return Response.json({ error: 'Inventory row is missing stock fields.' }, { status: 400 });
  }

  const isLow = stock <= threshold;
  const previouslyLow = event.type === 'UPDATE' && event.old_record
    ? Number(event.old_record.stock) <= Number(event.old_record.low_stock_threshold)
    : false;
  if (!isLow || previouslyLow) {
    return Response.json({ sent: false, reason: 'No new low-stock transition.' });
  }

  const unit = item.unit || 'units';
  const text = [
    `LOW STOCK: ${item.name}`,
    `Remaining: ${stock} ${unit}`,
    `Alert threshold: ${threshold} ${unit}`,
  ].join('\n');

  try {
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
        cache: 'no-store',
      },
    );
    const result = (await telegramResponse.json()) as { ok?: boolean; description?: string };
    if (!telegramResponse.ok || !result.ok) {
      console.error('Telegram low-stock delivery failed:', result.description || telegramResponse.status);
      return Response.json({ error: 'Telegram could not send the message.' }, { status: 502 });
    }
    return Response.json({ sent: true });
  } catch {
    console.error('Could not connect to Telegram for low-stock alert.');
    return Response.json({ error: 'Could not connect to Telegram.' }, { status: 502 });
  }
}
