"""The payment gateway's SDK: one client, a call per way to pay or refund."""

DECLINED_TOKEN = "declined"


class PaymentDeclinedError(Exception):
    pass


class PaymentGateway:
    def __init__(self, merchant: str) -> None:
        self.merchant = merchant
        self.charges: list[dict] = []
        self.refunds: list[dict] = []
        self.gift_cards: dict[str, int] = {"GIFT-2026-0001": 5_000}

    def charge_card(self, card_token: str, amount_cents: int) -> str:
        if card_token == DECLINED_TOKEN:
            raise PaymentDeclinedError("The card was declined")
        return self._record("card", amount_cents, None)

    def charge_paypal(self, payer_email: str, amount_cents: int) -> str:
        return self._record("paypal", amount_cents, payer_email)

    def charge_wallet(
        self, wallet: str, wallet_token: str, amount_cents: int
    ) -> str:
        if wallet_token == DECLINED_TOKEN:
            raise PaymentDeclinedError(f"{wallet} declined the payment")
        return self._record(wallet, amount_cents, None)

    def expect_transfer(self, amount_cents: int, reference: str) -> str:
        return self._record("bank_transfer", amount_cents, reference)

    def redeem_gift_card(self, code: str, amount_cents: int) -> str:
        if code not in self.gift_cards:
            raise PaymentDeclinedError(f"No gift card {code}")
        balance = self.gift_cards[code]
        if balance < amount_cents:
            raise PaymentDeclinedError("Not enough left on the gift card")
        self.gift_cards[code] = balance - amount_cents
        return self._record("gift_card", amount_cents, code)

    def refund_card(self, card_token: str, amount_cents: int) -> str:
        return self._record_refund("card", amount_cents, None)

    def refund_paypal(self, payer_email: str, amount_cents: int) -> str:
        return self._record_refund("paypal", amount_cents, payer_email)

    def refund_wallet(
        self, wallet: str, wallet_token: str, amount_cents: int
    ) -> str:
        return self._record_refund(wallet, amount_cents, None)

    def send_transfer(self, amount_cents: int, reference: str) -> str:
        return self._record_refund("bank_transfer", amount_cents, reference)

    def top_up_gift_card(self, code: str, amount_cents: int) -> str:
        if code not in self.gift_cards:
            raise PaymentDeclinedError(f"No gift card {code}")
        self.gift_cards[code] += amount_cents
        return self._record_refund("gift_card", amount_cents, code)

    def _record(
        self, kind: str, amount_cents: int, detail: str | None
    ) -> str:
        transaction_id = f"txn-{len(self.charges) + 1:04d}"
        self.charges.append(
            {
                "id": transaction_id,
                "kind": kind,
                "amount": amount_cents,
                "detail": detail,
            }
        )
        return transaction_id

    def _record_refund(
        self, kind: str, amount_cents: int, detail: str | None
    ) -> str:
        refund_id = f"rfd-{len(self.refunds) + 1:04d}"
        self.refunds.append(
            {
                "id": refund_id,
                "kind": kind,
                "amount": amount_cents,
                "detail": detail,
            }
        )
        return refund_id
