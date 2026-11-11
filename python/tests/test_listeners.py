from shopfront.catalog import starter_catalog
from shopfront.listeners import (
    close_warehouse,
    email_shopper,
    open_warehouse,
    text_warehouse,
    track_order,
)
from shopfront.orders import Order, OrderBuilder, place_order
from shopfront.settings import DUTCH_SHOP, GERMAN_SHOP
from shopfront.vendor.analytics import Analytics
from shopfront.vendor.mailer import Mailer
from shopfront.vendor.sms import Sms


def an_order(order_id: str = "SF-00007") -> Order:
    return (
        OrderBuilder(order_id)
        .email("ada@example.com")
        .name("Ada")
        .lines({"MUG-01": 2})
        .subtotal(2_500)
        .discount(250)
        .tax(428)
        .shipping(490)
        .country("DE")
        .paid_by("card")
        .transaction("txn-0001")
        .build()
    )


def test_the_email_listener_thanks_the_shopper():
    mailer = Mailer()
    email_shopper(mailer, GERMAN_SHOP)(an_order())
    assert mailer.outbox[0]["from"] == "orders@shopfront.example"
    assert mailer.outbox[0]["to"] == "ada@example.com"
    assert mailer.outbox[0]["body"].startswith("Hi Ada, thank you!")
    assert "31.68 EUR" in mailer.outbox[0]["body"]


def test_the_email_listener_writes_from_the_shops_own_address():
    mailer = Mailer()
    email_shopper(mailer, DUTCH_SHOP)(an_order())
    assert mailer.outbox[0]["from"] == "orders.nl@shopfront.example"
    assert mailer.outbox[0]["subject"] == "Shopfront NL: order SF-00007"


def test_the_analytics_listener_tracks_the_order_and_its_total():
    analytics = Analytics()
    track_order(analytics)(an_order())
    assert analytics.events == [
        ("order_placed", {"order_id": "SF-00007", "total_cents": 3_168})
    ]


def test_the_warehouse_listener_texts_what_to_pack():
    sms = Sms()
    text_warehouse(sms, DUTCH_SHOP)(an_order())
    assert sms.outbox == [
        {"to": "+44 7700 900200", "text": "Pack SF-00007: 2 x MUG-01"}
    ]


def test_a_closed_warehouse_gets_no_text_until_it_opens_again():
    sms, catalog = Sms(), starter_catalog()
    warehouse = text_warehouse(sms, GERMAN_SHOP)
    listeners = [warehouse]
    close_warehouse(listeners, warehouse)
    place_order(an_order("SF-00001"), catalog, listeners)
    open_warehouse(listeners, warehouse)
    place_order(an_order("SF-00002"), catalog, listeners)
    assert [text["text"] for text in sms.outbox] == [
        "Pack SF-00002: 2 x MUG-01"
    ]
