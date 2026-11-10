import json

import pytest

from shopfront.catalog import (
    OutOfStockError,
    Product,
    UnknownProductError,
    starter_catalog,
)


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
    assert len(starter_catalog().all_products()) == 5


def test_search_finds_names_whatever_the_case():
    found = starter_catalog().search("CUP")
    assert [product.sku for product in found] == ["CUP-04"]


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
    with open("catalog.json", encoding="utf-8") as file:
        rows = json.load(file)
    products = [
        Product(
            sku=row["sku"],
            name=row["name"],
            price_cents=row["price_cents"],
            weight_grams=row["weight_grams"],
            stock=row["stock"],
        )
        for row in rows
    ]
    assert products == starter_catalog().all_products()
