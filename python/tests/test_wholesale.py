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


def test_a_late_wholesale_page_sends_one_request():
    wholesaler = Wholesaler(50_000)
    page = asyncio.run(WholesaleCatalog(wholesaler).page(20, "W-40000"))
    assert [product.sku for product in page] == skus(range(40_001, 40_021))
    assert wholesaler.requests == 1


def test_the_more_link_still_works_once_its_product_is_gone():
    wholesaler = Wholesaler(250)
    wholesaler.stop_selling("W-00020")
    page = asyncio.run(WholesaleCatalog(wholesaler).page(20, "W-00020"))
    assert page[0].sku == "W-00021"


def test_the_teas_box_holds_the_first_teas_under_the_price_in_one_request():
    wholesaler = Wholesaler(50_000)
    lines = asyncio.run(WholesaleCatalog(wholesaler).teas(1_000, 20))
    assert len(lines) == 20
    assert lines[0] == "W-00002  Green tea, 100 g"
    assert lines[-1] == "W-00097  Green tea, 100 g"
    assert wholesaler.requests == 1
