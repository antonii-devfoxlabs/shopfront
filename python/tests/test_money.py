from shopfront.money import format_money
from shopfront.settings import GERMAN_SHOP


def test_money_is_shown_in_euros():
    assert format_money(3_168, GERMAN_SHOP) == "31.68 EUR"
    assert format_money(5, GERMAN_SHOP) == "0.05 EUR"
    assert format_money(-205, GERMAN_SHOP) == "-2.05 EUR"


def test_thousands_are_set_apart_with_commas():
    assert format_money(125_000, GERMAN_SHOP) == "1,250.00 EUR"
    assert format_money(-123_456_789, GERMAN_SHOP) == "-1,234,567.89 EUR"
