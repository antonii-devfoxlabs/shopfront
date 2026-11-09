// An order, and what happens once it is placed.

import type { Catalog } from './catalog.ts';
import { settings } from './settings.ts';
import type { Analytics } from './vendor/analytics.ts';
import type { Mailer } from './vendor/mailer.ts';

export type OrderStatus = 'placed' | 'cancelled' | 'returned';

let lastOrderNumber = 0;

export function nextOrderId(): string {
  lastOrderNumber += 1;
  return `SF-${String(lastOrderNumber).padStart(5, '0')}`;
}

export class Order {
  readonly orderId: string;
  readonly customerEmail: string;
  readonly lines: Map<string, number>;
  readonly subtotalCents: number;
  readonly discountCents: number;
  readonly taxCents: number;
  readonly shippingCents: number;
  readonly shippingCountry: string;
  readonly paymentMethod: string;
  readonly transactionId: string;
  status: OrderStatus = 'placed';

  constructor(
    orderId: string,
    customerEmail: string,
    lines: Iterable<[string, number]>,
    subtotalCents: number,
    discountCents: number,
    taxCents: number,
    shippingCents: number,
    shippingCountry: string,
    paymentMethod: string,
    transactionId: string,
  ) {
    this.orderId = orderId;
    this.customerEmail = customerEmail;
    this.lines = new Map(lines);
    this.subtotalCents = subtotalCents;
    this.discountCents = discountCents;
    this.taxCents = taxCents;
    this.shippingCents = shippingCents;
    this.shippingCountry = shippingCountry;
    this.paymentMethod = paymentMethod;
    this.transactionId = transactionId;
  }

  get totalCents(): number {
    return (
      this.subtotalCents -
      this.discountCents +
      this.taxCents +
      this.shippingCents
    );
  }
}

export function placeOrder(
  order: Order,
  catalog: Catalog,
  mailer: Mailer,
  analytics: Analytics,
): void {
  catalog.takeAllFromStock(order.lines);
  mailer.send({
    from: settings.storeEmail,
    to: order.customerEmail,
    subject: `${settings.storeName}: order ${order.orderId}`,
    body:
      `Thank you! We have your order ${order.orderId}, ` +
      `${formatMoney(order.totalCents)} in all.`,
  });
  analytics.track('order_placed', {
    order_id: order.orderId,
    total_cents: order.totalCents,
  });
}

export function formatMoney(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const euros = Math.floor(Math.abs(cents) / 100);
  const rest = String(Math.abs(cents) % 100).padStart(2, '0');
  return `${sign}${euros}.${rest} ${settings.currency}`;
}
