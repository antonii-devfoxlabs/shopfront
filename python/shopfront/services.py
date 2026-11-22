"""Where every part of the store finds what it shares, by name.

main registers each service once; a part gets it with get(name).
"""

from typing import Any


class UnknownServiceError(LookupError):
    pass


_services: dict[str, Any] = {}


def register(name: str, service: Any) -> None:
    """Keep a service under its name; the same name again replaces it."""
    _services[name] = service


def get(name: str) -> Any:
    """The service registered under this name."""
    service = _services.get(name)
    if service is None:
        raise UnknownServiceError(name)
    return service


def reset() -> None:
    """For tests only: forget every service."""
    _services.clear()
