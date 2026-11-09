// The payment gateway's SDK: one client, a call per way to pay or refund.

export const DECLINED_TOKEN = 'declined';

export class PaymentDeclinedError extends Error {
  override name = 'PaymentDeclinedError';
}

export type Charge = {
  id: string;
  kind: string;
  amount: number;
  detail: string | null;
};

export class PaymentGateway {
  readonly merchant: string;
  readonly charges: Charge[] = [];
  readonly refunds: Charge[] = [];
  readonly giftCards = new Map([['GIFT-2026-0001', 5_000]]);

  constructor({ merchant }: { merchant: string }) {
    this.merchant = merchant;
  }

  chargeCard(cardToken: string, amountCents: number): string {
    if (cardToken === DECLINED_TOKEN) {
      throw new PaymentDeclinedError('The card was declined');
    }
    return this.#record('card', amountCents, null);
  }

  chargePaypal(payerEmail: string, amountCents: number): string {
    return this.#record('paypal', amountCents, payerEmail);
  }

  chargeWallet(
    wallet: string,
    walletToken: string,
    amountCents: number,
  ): string {
    if (walletToken === DECLINED_TOKEN) {
      throw new PaymentDeclinedError(`${wallet} declined the payment`);
    }
    return this.#record(wallet, amountCents, null);
  }

  expectTransfer(amountCents: number, reference: string): string {
    return this.#record('bank_transfer', amountCents, reference);
  }

  redeemGiftCard(code: string, amountCents: number): string {
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

  refundCard(cardToken: string, amountCents: number): string {
    return this.#recordRefund('card', amountCents, null);
  }

  refundPaypal(payerEmail: string, amountCents: number): string {
    return this.#recordRefund('paypal', amountCents, payerEmail);
  }

  refundWallet(
    wallet: string,
    walletToken: string,
    amountCents: number,
  ): string {
    return this.#recordRefund(wallet, amountCents, null);
  }

  sendTransfer(amountCents: number, reference: string): string {
    return this.#recordRefund('bank_transfer', amountCents, reference);
  }

  topUpGiftCard(code: string, amountCents: number): string {
    const balance = this.giftCards.get(code);
    if (balance === undefined) {
      throw new PaymentDeclinedError(`No gift card ${code}`);
    }
    this.giftCards.set(code, balance + amountCents);
    return this.#recordRefund('gift_card', amountCents, code);
  }

  #record(kind: string, amountCents: number, detail: string | null): string {
    const id = `txn-${String(this.charges.length + 1).padStart(4, '0')}`;
    this.charges.push({ id, kind, amount: amountCents, detail });
    return id;
  }

  #recordRefund(
    kind: string,
    amountCents: number,
    detail: string | null,
  ): string {
    const id = `rfd-${String(this.refunds.length + 1).padStart(4, '0')}`;
    this.refunds.push({ id, kind, amount: amountCents, detail });
    return id;
  }
}
