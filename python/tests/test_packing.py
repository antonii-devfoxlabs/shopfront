from shopfront.orders import Order, OrderBuilder, reorder
from shopfront.packing import packing_slip


def an_order(
    lines: dict[str, int] | None = None, order_id: str = "SF-00007"
) -> Order:
    return (
        OrderBuilder(order_id)
        .email("ada@example.com")
        .name("Ada")
        .lines(lines or {"MUG-01": 2})
        .subtotal(2_500)
        .discount(250)
        .tax(428)
        .shipping(490)
        .country("DE")
        .paid_by("card")
        .transaction("txn-0001")
        .build()
    )


def test_a_packing_slip_lists_every_line():
    assert packing_slip(an_order()) == ["2 x MUG-01"]


def test_a_packing_slip_lists_the_products_in_sku_order():
    order = an_order({"TEA-02": 1, "KTL-03": 1, "MUG-01": 2})
    assert packing_slip(order) == ["1 x KTL-03", "2 x MUG-01", "1 x TEA-02"]


def test_a_parcel_of_40_eur_or_more_gets_a_free_sample():
    order = (
        reorder(an_order(), "SF-00011")
        .lines({"MUG-01": 4})
        .subtotal(5_000)
        .tax(950)
        .shipping(0)
        .paid_by("card")
        .transaction("txn-0003")
        .build()
    )
    assert packing_slip(order) == ["4 x MUG-01", "1 x TEA-SAMPLE"]
