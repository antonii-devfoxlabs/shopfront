import re

import pytest

from shopfront.orders import format_money
from shopfront.providers import boxroute_quote
from shopfront.settings import GERMAN_SHOP
from shopfront.shipping import NoShippingError
from shopfront.timing import timed


def test_a_timed_function_gives_the_same_answer():
    quote = timed("boxroute quote", boxroute_quote, lambda line: None)
    assert quote(2_500, "PL") == 650


def test_a_timed_function_logs_each_call_and_its_time():
    lines: list[str] = []
    quote = timed("boxroute quote", boxroute_quote, lines.append)
    quote(2_500, "PL")
    quote(700, "PL")
    assert len(lines) == 2
    assert re.fullmatch(r"boxroute quote in \d+ ms", lines[0])
    assert re.fullmatch(r"boxroute quote in \d+ ms", lines[1])


def test_wrapping_a_function_calls_nothing_yet():
    asked: list[str] = []
    lines: list[str] = []

    def quote(grams: int, country: str) -> int:
        asked.append(country)
        return 700

    timed_quote = timed("a quote", quote, lines.append)
    assert asked == []
    assert lines == []
    assert timed_quote(700, "DE") == 700
    assert asked == ["DE"]


def test_a_refusal_still_reaches_the_caller():
    lines: list[str] = []
    quote = timed("boxroute quote", boxroute_quote, lines.append)
    with pytest.raises(NoShippingError):
        quote(700, "ES")
    assert lines == []


def test_any_function_can_be_timed():
    lines: list[str] = []
    money = timed("format money", format_money, lines.append)
    assert money(4_121, shop=GERMAN_SHOP) == "41.21 EUR"
    assert re.fullmatch(r"format money in \d+ ms", lines[0])
