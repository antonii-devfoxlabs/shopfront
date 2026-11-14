import asyncio

from shopfront.vendor.wholesaler import Wholesaler
from shopfront.wholesale import WholesaleCatalog


def skus(numbers: range) -> list[str]:
    return [f"W-{number:05d}" for number in numbers]


def test_a_wholesale_page_holds_the_products_after_the_sku_in_its_link():
    catalog = WholesaleCatalog(Wholesaler(250))
    first = asyncio.run(catalog.page(20))
    later = asyncio.run(catalog.page(20, after="W-00120"))
    assert [product.sku for product in first] == skus(range(1, 21))
    assert [product.sku for product in later] == skus(range(121, 141))
