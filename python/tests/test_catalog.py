from itertools import islice
from pathlib import Path

import pytest

from shopfront.catalog import (
    OutOfStockError,
    UnknownProductError,
    reorder_list,
    starter_catalog,
)
from shopfront.catalog_file import load_catalog


def test_finds_a_product_by_its_sku():
    catalog = starter_catalog()
    assert catalog.find("MUG-01").name == "Enamel mug"


def test_an_unknown_sku_is_an_error():
    with pytest.raises(UnknownProductError):
        starter_catalog().find("NOPE-99")


def test_taking_from_stock_lowers_it():
    catalog = starter_catalog()
    catalog.take_from_stock("KTL-03", 3)
    assert catalog.find("KTL-03").stock == 5


def test_cannot_take_more_than_is_left():
    catalog = starter_catalog()
    with pytest.raises(OutOfStockError, match="9 wanted, 8 left"):
        catalog.take_from_stock("KTL-03", 9)


def test_lists_every_product():
    assert len(list(starter_catalog())) == 5


def test_a_cursor_hands_over_every_product_in_order():
    cursor = starter_catalog().cursor()
    skus = [product.sku for product in cursor]
    assert skus == ["MUG-01", "TEA-02", "KTL-03", "CUP-04", "FLT-05"]
    assert next(cursor, None) is None


def test_every_for_loop_walks_the_catalog_from_the_first():
    catalog = starter_catalog()
    first = [product.sku for product in catalog]
    assert [product.sku for product in catalog] == first
    assert first[0] == "MUG-01"


def test_each_cursor_keeps_its_own_place():
    catalog = starter_catalog()
    first = catalog.cursor()
    next(first)
    next(first)
    second = catalog.cursor()
    assert next(second) == catalog.find("MUG-01")
    assert next(first) == catalog.find("KTL-03")


def test_a_page_takes_the_next_products_from_its_cursor():
    cursor = starter_catalog().cursor()
    assert [product.sku for product in list(islice(cursor, 2))] == [
        "MUG-01",
        "TEA-02",
    ]
    assert [product.sku for product in list(islice(cursor, 2))] == [
        "KTL-03",
        "CUP-04",
    ]
    assert [product.sku for product in list(islice(cursor, 2))] == ["FLT-05"]
    assert list(islice(cursor, 2)) == []


def test_search_finds_names_whatever_the_case():
    found = starter_catalog().search("CUP", limit=20)
    assert [product.sku for product in found] == ["CUP-04"]


def test_search_shows_no_more_than_its_limit():
    found = starter_catalog().search("E", limit=2)
    assert [product.sku for product in found] == ["MUG-01", "TEA-02"]


def test_the_reorder_list_holds_every_product_under_the_line():
    short = reorder_list(starter_catalog(), under=30)
    assert [product.sku for product in short] == ["KTL-03", "CUP-04"]


def test_taking_several_lines_takes_none_if_one_is_short():
    catalog = starter_catalog()
    with pytest.raises(OutOfStockError):
        catalog.take_all_from_stock({"MUG-01": 2, "KTL-03": 9})
    assert catalog.find("MUG-01").stock == 40


def test_checking_the_stock_takes_nothing():
    catalog = starter_catalog()
    catalog.check_stock({"MUG-01": 40})
    with pytest.raises(OutOfStockError):
        catalog.check_stock({"MUG-01": 2, "KTL-03": 9})
    assert catalog.find("MUG-01").stock == 40


def test_the_shops_catalog_file_holds_what_it_sells():
    catalog = load_catalog(Path("catalog.json"))
    assert list(catalog) == list(starter_catalog())
