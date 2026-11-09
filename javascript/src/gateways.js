// Wrappers round the payment gateway: each adds one job, and asks the same.
// Each wrapper fills the ways to pay's slot, Gateway, and holds another
// object that fills it, its inner one. It offers every method of the slot,
// does its own job and passes each call on, so neither payments nor the
// gateway's SDK changes.

/** @import { Gateway } from './payments.js' */

// Logs the name of each gateway call and how long it took.
export class TimedGateway {
  /**
   * @param {Gateway} inner
   * @param {(line: string) => void} log
   */
  constructor(inner, log) {
    this.inner = inner;
    this.log = log;
  }

  chargeCard(cardToken, amountCents) {
    return this.#timed('chargeCard', () =>
      this.inner.chargeCard(cardToken, amountCents),
    );
  }

  chargePaypal(payerEmail, amountCents) {
    return this.#timed('chargePaypal', () =>
      this.inner.chargePaypal(payerEmail, amountCents),
    );
  }

  chargeWallet(wallet, walletToken, amountCents) {
    return this.#timed('chargeWallet', () =>
      this.inner.chargeWallet(wallet, walletToken, amountCents),
    );
  }

  expectTransfer(amountCents, reference) {
    return this.#timed('expectTransfer', () =>
      this.inner.expectTransfer(amountCents, reference),
    );
  }

  redeemGiftCard(code, amountCents) {
    return this.#timed('redeemGiftCard', () =>
      this.inner.redeemGiftCard(code, amountCents),
    );
  }

  refundCard(cardToken, amountCents) {
    return this.#timed('refundCard', () =>
      this.inner.refundCard(cardToken, amountCents),
    );
  }

  refundPaypal(payerEmail, amountCents) {
    return this.#timed('refundPaypal', () =>
      this.inner.refundPaypal(payerEmail, amountCents),
    );
  }

  refundWallet(wallet, walletToken, amountCents) {
    return this.#timed('refundWallet', () =>
      this.inner.refundWallet(wallet, walletToken, amountCents),
    );
  }

  sendTransfer(amountCents, reference) {
    return this.#timed('sendTransfer', () =>
      this.inner.sendTransfer(amountCents, reference),
    );
  }

  topUpGiftCard(code, amountCents) {
    return this.#timed('topUpGiftCard', () =>
      this.inner.topUpGiftCard(code, amountCents),
    );
  }

  #timed(name, call) {
    const started = performance.now();
    const answer = call();
    const tookMs = performance.now() - started;
    this.log(`gateway ${name} in ${tookMs.toFixed(0)} ms`);
    return answer;
  }
}
