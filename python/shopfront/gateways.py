"""Wrappers round the payment gateway: each adds one job, and asks the same.

Each wrapper fills the ways to pay's slot, Gateway, and holds another
object that fills it, its inner one. It offers every method of the slot,
does its own job and passes each call on, so neither payments nor the
gateway's SDK changes.
"""

import time
from collections.abc import Callable

from shopfront.payments import Gateway


class TimedGateway:
    """Logs the name of each gateway call and how long it took."""

    def __init__(self, inner: Gateway, log: Callable[[str], None]) -> None:
        self.inner = inner
        self.log = log

    def charge_card(self, card_token: str, amount_cents: int) -> str:
        return self._timed(
            "charge_card",
            lambda: self.inner.charge_card(card_token, amount_cents),
        )

    def charge_paypal(self, payer_email: str, amount_cents: int) -> str:
        return self._timed(
            "charge_paypal",
            lambda: self.inner.charge_paypal(payer_email, amount_cents),
        )

    def charge_wallet(
        self, wallet: str, wallet_token: str, amount_cents: int
    ) -> str:
        return self._timed(
            "charge_wallet",
            lambda: self.inner.charge_wallet(
                wallet, wallet_token, amount_cents
            ),
        )

    def expect_transfer(self, amount_cents: int, reference: str) -> str:
        return self._timed(
            "expect_transfer",
            lambda: self.inner.expect_transfer(amount_cents, reference),
        )

    def redeem_gift_card(self, code: str, amount_cents: int) -> str:
        return self._timed(
            "redeem_gift_card",
            lambda: self.inner.redeem_gift_card(code, amount_cents),
        )

    def refund_card(self, card_token: str, amount_cents: int) -> str:
        return self._timed(
            "refund_card",
            lambda: self.inner.refund_card(card_token, amount_cents),
        )

    def refund_paypal(self, payer_email: str, amount_cents: int) -> str:
        return self._timed(
            "refund_paypal",
            lambda: self.inner.refund_paypal(payer_email, amount_cents),
        )

    def refund_wallet(
        self, wallet: str, wallet_token: str, amount_cents: int
    ) -> str:
        return self._timed(
            "refund_wallet",
            lambda: self.inner.refund_wallet(
                wallet, wallet_token, amount_cents
            ),
        )

    def send_transfer(self, amount_cents: int, reference: str) -> str:
        return self._timed(
            "send_transfer",
            lambda: self.inner.send_transfer(amount_cents, reference),
        )

    def top_up_gift_card(self, code: str, amount_cents: int) -> str:
        return self._timed(
            "top_up_gift_card",
            lambda: self.inner.top_up_gift_card(code, amount_cents),
        )

    def _timed(self, name: str, call: Callable[[], str]) -> str:
        started = time.perf_counter()
        answer = call()
        took_ms = (time.perf_counter() - started) * 1000
        self.log(f"gateway {name} in {took_ms:.0f} ms")
        return answer
