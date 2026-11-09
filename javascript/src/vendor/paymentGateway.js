// The payment gateway's SDK: one client, a call per way to pay or refund.

export const DECLINED_TOKEN = 'declined';

export class PaymentDeclinedError extends Error {
  name = 'PaymentDeclinedError';
}

export class PaymentGateway {
  charges = [];
  refunds = [];
  giftCards = new Map([['GIFT-2026-0001', 5_000]]);

  constructor({ merchant }) {
    this.merchant = merchant;
  }

  chargeCard(cardToken, amountCents) {
    if (cardToken === DECLINED_TOKEN) {
      throw new PaymentDeclinedError('The card was declined');
    }
    return this.#record('card', amountCents, null);
  }

  chargePaypal(payerEmail, amountCents) {
    return this.#record('paypal', amountCents, payerEmail);
  }

  chargeWallet(wallet, walletToken, amountCents) {
    if (walletToken === DECLINED_TOKEN) {
      throw new PaymentDeclinedError(`${wallet} declined the payment`);
    }
    return this.#record(wallet, amountCents, null);
  }

  expectTransfer(amountCents, reference) {
    return this.#record('bank_transfer', amountCents, reference);
  }

  redeemGiftCard(code, amountCents) {
    const balance = this.giftCards.get(code);
    if (balance === undefined) {
      throw new PaymentDeclinedError(`No gift card ${code}`);
    }
    if (balance < amountCents) {
      throw new PaymentDeclinedError('Not enough left on the gift card');
    }
    this.giftCards.set(code, balance - amountCents);
    return this.#record('gift_card', amountCents, code);
  }

  refundCard(cardToken, amountCents) {
    return this.#recordRefund('card', amountCents, null);
  }

  refundPaypal(payerEmail, amountCents) {
    return this.#recordRefund('paypal', amountCents, payerEmail);
  }

  refundWallet(wallet, walletToken, amountCents) {
    return this.#recordRefund(wallet, amountCents, null);
  }

  sendTransfer(amountCents, reference) {
    return this.#recordRefund('bank_transfer', amountCents, reference);
  }

  topUpGiftCard(code, amountCents) {
    const balance = this.giftCards.get(code);
    if (balance === undefined) {
      throw new PaymentDeclinedError(`No gift card ${code}`);
    }
    this.giftCards.set(code, balance + amountCents);
    return this.#recordRefund('gift_card', amountCents, code);
  }

  #record(kind, amountCents, detail) {
    const id = `txn-${String(this.charges.length + 1).padStart(4, '0')}`;
    this.charges.push({ id, kind, amount: amountCents, detail });
    return id;
  }

  #recordRefund(kind, amountCents, detail) {
    const id = `rfd-${String(this.refunds.length + 1).padStart(4, '0')}`;
    this.refunds.push({ id, kind, amount: amountCents, detail });
    return id;
  }
}
