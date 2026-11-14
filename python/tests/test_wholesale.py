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


def test_the_first_wholesale_page_sends_one_request():
    wholesaler = Wholesaler(50_000)
    asyncio.run(WholesaleCatalog(wholesaler).page(20))
    assert wholesaler.requests == 1


def test_an_async_for_walks_every_wholesale_product():
    async def walk(catalog: WholesaleCatalog) -> list[str]:
        return [product.sku async for product in catalog]

    catalog = WholesaleCatalog(Wholesaler(250))
    assert asyncio.run(walk(catalog)) == skus(range(1, 251))
