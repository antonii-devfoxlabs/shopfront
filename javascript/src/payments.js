// Taking the money, in whichever way the shopper chose.

import { settings } from './settings.js';
import { PaymentGateway } from './vendor/paymentGateway.js';

export class UnsupportedPaymentMethodError extends Error {
  name = 'UnsupportedPaymentMethodError';
}

export class MissingPaymentDetailError extends Error {
  name = 'MissingPaymentDetailError';
}

export const gateway = new PaymentGateway({
  merchant: settings.merchantId,
});

// Charge the shopper and return the gateway's transaction id.
export function pay(method, amountCents, details) {
  if (method === 'card') {
    return gateway.chargeCard(required(details, 'cardToken'), amountCents);
  } else if (method === 'paypal') {
    return gateway.chargePaypal(required(details, 'payerEmail'), amountCents);
  } else if (method === 'apple_pay') {
    return gateway.chargeWallet(
      'apple_pay',
      required(details, 'walletToken'),
      amountCents,
    );
  } else if (method === 'google_pay') {
    return gateway.chargeWallet(
      'google_pay',
      required(details, 'walletToken'),
      amountCents,
    );
  } else if (method === 'samsung_pay') {
    return gateway.chargeWallet(
      'samsung_pay',
      required(details, 'walletToken'),
      amountCents,
    );
  } else if (method === 'bank_transfer') {
    const reference = `SHOPFRONT-${required(details, 'orderId')}`;
    return gateway.expectTransfer(amountCents, reference);
  } else if (method === 'gift_card') {
    return gateway.redeemGiftCard(required(details, 'code'), amountCents);
  } else {
    throw new UnsupportedPaymentMethodError(method);
  }
}

function required(details, name) {
  if (details[name] === undefined) {
    throw new MissingPaymentDetailError(name);
  }
  return details[name];
}
