// What the rest of the store does once an order is placed: each maker
// gives back a listener, a function that is told the order.

import { type OrderListener, formatMoney, packingSlip } from './orders.ts';
import type { Settings } from './settings.ts';
import type { Analytics } from './vendor/analytics.ts';
import type { Mailer } from './vendor/mailer.ts';
import type { Sms } from './vendor/sms.ts';

// Thank the shopper for the order, from the shop's own address.
export function emailShopper(mailer: Mailer, shop: Settings): OrderListener {
  return (order) => {
    mailer.send({
      from: shop.storeEmail,
      to: order.customerEmail,
      subject: `${shop.storeName}: order ${order.orderId}`,
      body:
        `Hi ${order.customerName}, thank you! ` +
        `We have your order ${order.orderId}, ` +
        `${formatMoney(order.totalCents, shop)} in all.`,
    });
  };
}

// Tell analytics that an order was placed, and its total.
export function trackOrder(analytics: Analytics): OrderListener {
  return (order) => {
    analytics.track('order_placed', {
      order_id: order.orderId,
      total_cents: order.totalCents,
    });
  };
}

// Text the shop's warehouse what to pack.
export function textWarehouse(sms: Sms, shop: Settings): OrderListener {
  return (order) => {
    sms.send({
      to: shop.warehousePhone,
      text: `Pack ${order.orderId}: ${packingSlip(order).join(', ')}`,
    });
  };
}

// The warehouse is closed: take its listener off the list.
export function closeWarehouse(
  listeners: OrderListener[],
  warehouse: OrderListener,
): void {
  listeners.splice(listeners.indexOf(warehouse), 1);
}

// The warehouse is open again: put its listener back.
export function openWarehouse(
  listeners: OrderListener[],
  warehouse: OrderListener,
): void {
  listeners.push(warehouse);
}
