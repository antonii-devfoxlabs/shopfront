// What the rest of the store does once an order is placed, dispatched,
// refunded or cancelled: each maker gives back a listener, a function that
// is told the order.

import { formatMoney } from './money.js';
import { packingSlip } from './packing.js';

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
 * Text the shop's warehouse what is coming back.
 * @param {import('./vendor/sms.js').Sms} sms
 * @param {import('./settings.js').Settings} shop
 * @returns {OrderListener}
 */
export function expectReturn(sms, shop) {
  return (order) => {
    sms.send({
      to: shop.warehousePhone,
      text: `Expect ${order.orderId} back: ${packingSlip(order).join(', ')}`,
    });
  };
}

/**
 * Tell the shopper the parcel is on its way, and where to follow it.
 * @param {import('./vendor/mailer.js').Mailer} mailer
 * @param {import('./settings.js').Settings} shop
 * @returns {OrderListener}
 */
export function emailParcelSent(mailer, shop) {
  return (order) => {
    const link = order.trackingLink();
    if (link === null) return;
    mailer.send({
      from: shop.storeEmail,
      to: order.customerEmail,
      subject: `${shop.storeName}: ${order.orderId} is on its way`,
      body:
        `Hi ${order.customerName}, your parcel is on its way. ` +
        `Follow it at ${link}`,
    });
  };
}

/**
 * Text the shop's warehouse not to pack a cancelled order.
 * @param {import('./vendor/sms.js').Sms} sms
 * @param {import('./settings.js').Settings} shop
 * @returns {OrderListener}
 */
export function stopPacking(sms, shop) {
  return (order) => {
    sms.send({
      to: shop.warehousePhone,
      text: `Do not pack ${order.orderId}`,
    });
  };
}
