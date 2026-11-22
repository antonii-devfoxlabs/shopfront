"""How the store writes an amount of money, wherever it shows one."""

from shopfront.settings import Settings


def format_money(cents: int, shop: Settings) -> str:
    """Whole cents as the shop writes them: 1,250.00 EUR."""
    sign = "-" if cents < 0 else ""
    euros, rest = divmod(abs(cents), 100)
    # A comma between thousands, so the accountant reads 1,250.00 at once.
    return f"{sign}{euros:,}.{rest:02d} {shop.currency}"
