// Taking the money, in whichever way the shopper chose.

import { settings } from './settings.ts';
import { PaymentGateway } from './vendor/paymentGateway.ts';

export class UnsupportedPaymentMethodError extends Error {
  override name = 'UnsupportedPaymentMethodError';
}

export class MissingPaymentDetailError extends Error {
  override name = 'MissingPaymentDetailError';
}

// Every way to pay needs something different, so every field is
// optional and each branch checks the one it needs.
export interface PaymentDetails {
  cardToken?: string;
  payerEmail?: string;
  walletToken?: string;
  orderId?: string;
  code?: string;
}

export const gateway = new PaymentGateway({
  merchant: settings.merchantId,
});

// Charge the shopper and return the gateway's transaction id.
export function pay(
  method: string,
  amountCents: number,
  details: PaymentDetails,
): string {
  if (method === 'card') {
    const cardToken = required(details.cardToken, 'cardToken');
    return gateway.chargeCard(cardToken, amountCents);
  } else if (method === 'paypal') {
    const payerEmail = required(details.payerEmail, 'payerEmail');
    return gateway.chargePaypal(payerEmail, amountCents);
  } else if (method === 'apple_pay') {
    const walletToken = required(details.walletToken, 'walletToken');
    return gateway.chargeWallet('apple_pay', walletToken, amountCents);
  } else if (method === 'google_pay') {
    const walletToken = required(details.walletToken, 'walletToken');
    return gateway.chargeWallet('google_pay', walletToken, amountCents);
  } else if (method === 'bank_transfer') {
    const orderId = required(details.orderId, 'orderId');
    return gateway.expectTransfer(amountCents, `SHOPFRONT-${orderId}`);
  } else if (method === 'gift_card') {
    const code = required(details.code, 'code');
    return gateway.redeemGiftCard(code, amountCents);
  } else {
    throw new UnsupportedPaymentMethodError(method);
  }
}

function required(value: string | undefined, name: string): string {
  if (value === undefined) throw new MissingPaymentDetailError(name);
  return value;
}
