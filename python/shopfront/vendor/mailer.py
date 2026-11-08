"""The mail provider's SDK. It keeps what it sends in an outbox."""


class Mailer:
    def __init__(self) -> None:
        self.outbox: list[dict] = []

    def send(self, sender: str, to: str, subject: str, body: str) -> None:
        self.outbox.append(
            {"from": sender, "to": to, "subject": subject, "body": body}
        )
