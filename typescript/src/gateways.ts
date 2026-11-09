// Wrappers round the payment gateway: each adds one job, and asks the same.
// Each wrapper fills the ways to pay's slot, Gateway, and holds another
// object that fills it, its inner one. It offers every method of the slot,
// does its own job and passes each call on, so neither payments nor the
// gateway's SDK changes.

import type { Gateway } from './payments.ts';

// Logs the name of each gateway call and how long it took.
export class TimedGateway implements Gateway {
  readonly inner: Gateway;
  readonly log: (line: string) => void;

  constructor(inner: Gateway, log: (line: string) => void) {
    this.inner = inner;
    this.log = log;
  }

  chargeCard(cardToken: string, amountCents: number): string {
    return this.#timed('chargeCard', () =>
      this.inner.chargeCard(cardToken, amountCents),
    );
  }

  chargePaypal(payerEmail: string, amountCents: number): string {
    return this.#timed('chargePaypal', () =>
      this.inner.chargePaypal(payerEmail, amountCents),
    );
  }

  chargeWallet(
    wallet: string,
    walletToken: string,
    amountCents: number,
  ): string {
    return this.#timed('chargeWallet', () =>
      this.inner.chargeWallet(wallet, walletToken, amountCents),
    );
  }

  expectTransfer(amountCents: number, reference: string): string {
    return this.#timed('expectTransfer', () =>
      this.inner.expectTransfer(amountCents, reference),
    );
  }

  redeemGiftCard(code: string, amountCents: number): string {
    return this.#timed('redeemGiftCard', () =>
      this.inner.redeemGiftCard(code, amountCents),
    );
  }

  refundCard(cardToken: string, amountCents: number): string {
    return this.#timed('refundCard', () =>
      this.inner.refundCard(cardToken, amountCents),
    );
  }

  refundPaypal(payerEmail: string, amountCents: number): string {
    return this.#timed('refundPaypal', () =>
      this.inner.refundPaypal(payerEmail, amountCents),
    );
  }

  refundWallet(
    wallet: string,
    walletToken: string,
    amountCents: number,
  ): string {
    return this.#timed('refundWallet', () =>
      this.inner.refundWallet(wallet, walletToken, amountCents),
    );
  }

  sendTransfer(amountCents: number, reference: string): string {
    return this.#timed('sendTransfer', () =>
      this.inner.sendTransfer(amountCents, reference),
    );
  }

  topUpGiftCard(code: string, amountCents: number): string {
    return this.#timed('topUpGiftCard', () =>
      this.inner.topUpGiftCard(code, amountCents),
    );
  }

  #timed(name: string, call: () => string): string {
    const started = performance.now();
    const answer = call();
    const tookMs = performance.now() - started;
    this.log(`gateway ${name} in ${tookMs.toFixed(0)} ms`);
    return answer;
  }
}
