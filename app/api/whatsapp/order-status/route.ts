import { createClient } from '@supabase/supabase-js';

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const STATUS_LABELS: Record<string, string> = {
  preparing: 'Preparing',
  ready: 'Ready for pickup',
  delivered: 'Delivered',
  finished: 'Delivered',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

function toWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return `213${digits.slice(1)}`;
  if (digits.startsWith('213')) return digits;
  return digits;
}

export async function POST(request: Request) {
  let body: { orderCode?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const orderCode = typeof body.orderCode === 'string' ? body.orderCode.trim() : '';
  const status = typeof body.status === 'string' ? body.status : '';
  if (!isUuid(orderCode) || !STATUS_LABELS[status]) {
    return Response.json({ error: 'Valid order code and status are required.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_STATUS_TEMPLATE;
  const languageCode = process.env.WHATSAPP_STATUS_LANGUAGE || 'en';
  const apiVersion = process.env.WHATSAPP_API_VERSION;
  if (!supabaseUrl || !serviceRoleKey || !accessToken || !phoneNumberId || !templateName || !apiVersion) {
    return Response.json({ error: 'WhatsApp status notifications are not configured.' }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status, customer_id, tracking_whatsapp_opt_in, tracking_whatsapp_last_status')
    .eq('id', orderCode)
    .maybeSingle();

  if (orderError) {
    console.error('Could not look up order for WhatsApp status:', orderError.message);
    return Response.json({ error: 'Could not look up the order.' }, { status: 500 });
  }
  if (!order) return Response.json({ error: 'Order not found.' }, { status: 404 });
  if (order.status !== status) {
    return Response.json({ error: 'The order status has changed; refresh and try again.' }, { status: 409 });
  }
  if (!order.tracking_whatsapp_opt_in) {
    return Response.json({ sent: false, reason: 'Customer did not opt in.' });
  }
  if (order.tracking_whatsapp_last_status === status) {
    return Response.json({ sent: false, alreadySent: true });
  }

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('name, contact')
    .eq('id', order.customer_id)
    .maybeSingle();
  if (customerError) {
    console.error('Could not look up customer for WhatsApp status:', customerError.message);
    return Response.json({ error: 'Could not look up the customer.' }, { status: 500 });
  }
  const phone = customer?.contact ? toWhatsAppNumber(customer.contact) : '';
  if (!phone || phone.length < 8) {
    return Response.json({ error: 'The order has no valid customer phone number.' }, { status: 400 });
  }

  const trackUrl = new URL(`/track?code=${encodeURIComponent(orderCode)}`, request.url).toString();
  try {
    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: customer?.name || 'Customer' },
              { type: 'text', text: STATUS_LABELS[status] },
              { type: 'text', text: orderCode },
              { type: 'text', text: trackUrl },
            ],
          }],
        },
      }),
      cache: 'no-store',
    });

    const result = (await response.json()) as { error?: { message?: string } };
    if (!response.ok) {
      console.error('WhatsApp status delivery failed:', result.error?.message || response.status);
      return Response.json({ error: 'WhatsApp could not send the status update.' }, { status: 502 });
    }

    const { error: saveError } = await supabase
      .from('orders')
      .update({ tracking_whatsapp_last_status: status })
      .eq('id', orderCode);
    if (saveError) console.error('WhatsApp sent, but status was not recorded:', saveError.message);
    return Response.json({ sent: true });
  } catch {
    console.error('Could not connect to WhatsApp for order status.');
    return Response.json({ error: 'Could not connect to WhatsApp.' }, { status: 502 });
  }
}
