// What the rest of the store does once an order is placed: each maker
// gives back a listener, a function that is told the order.

import { formatMoney, packingSlip } from './orders.js';

/** @typedef {import('./orders.js').OrderListener} OrderListener */

/**
 * Thank the shopper for the order, from the shop's own address.
 * @param {import('./vendor/mailer.js').Mailer} mailer
 * @param {import('./settings.js').Settings} shop
 * @returns {OrderListener}
 */
export function emailShopper(mailer, shop) {
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

/**
 * Tell analytics that an order was placed, and its total.
 * @param {import('./vendor/analytics.js').Analytics} analytics
 * @returns {OrderListener}
 */
export function trackOrder(analytics) {
  return (order) => {
    analytics.track('order_placed', {
      order_id: order.orderId,
      total_cents: order.totalCents,
    });
  };
}

/**
 * Text the shop's warehouse what to pack.
 * @param {import('./vendor/sms.js').Sms} sms
 * @param {import('./settings.js').Settings} shop
 * @returns {OrderListener}
 */
export function textWarehouse(sms, shop) {
  return (order) => {
    sms.send({
      to: shop.warehousePhone,
      text: `Pack ${order.orderId}: ${packingSlip(order).join(', ')}`,
    });
  };
}

/**
 * The warehouse is closed: take its listener off the list.
 * @param {import('./orders.js').OrderEvents} events
 * @param {OrderListener} warehouse
 */
export function closeWarehouse(events, warehouse) {
  events.unsubscribe(warehouse);
}

/**
 * The warehouse is open again: put its listener back.
 * @param {import('./orders.js').OrderEvents} events
 * @param {OrderListener} warehouse
 */
export function openWarehouse(events, warehouse) {
  events.subscribe(warehouse);
}
