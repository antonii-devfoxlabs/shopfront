"""The analytics provider's SDK. It keeps the events it is sent."""


class Analytics:
    def __init__(self) -> None:
        self.events: list[tuple[str, dict]] = []

    def track(self, event: str, properties: dict) -> None:
        self.events.append((event, properties))
