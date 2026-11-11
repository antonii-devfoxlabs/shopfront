"""The text message provider's SDK. It keeps what it sends in an outbox."""


class Sms:
    def __init__(self) -> None:
        self.outbox: list[dict] = []

    def send(self, to: str, text: str) -> None:
        self.outbox.append({"to": to, "text": text})
