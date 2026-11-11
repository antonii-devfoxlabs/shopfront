"""What the rest of the store does once an order is placed: each maker
gives back a listener, a function that is told the order."""

from shopfront.orders import (
    Order,
    OrderEvents,
    OrderListener,
    format_money,
    packing_slip,
)
from shopfront.settings import Settings
from shopfront.vendor.analytics import Analytics
from shopfront.vendor.mailer import Mailer
from shopfront.vendor.sms import Sms


def email_shopper(mailer: Mailer, shop: Settings) -> OrderListener:
    """Thank the shopper for the order, from the shop's own address."""

    def send_email(order: Order) -> None:
        mailer.send(
            sender=shop.store_email,
            to=order.customer_email,
            subject=f"{shop.store_name}: order {order.order_id}",
            body=(
                f"Hi {order.customer_name}, thank you! "
                f"We have your order {order.order_id}, "
                f"{format_money(order.total_cents, shop)} in all."
            ),
        )

    return send_email


def track_order(analytics: Analytics) -> OrderListener:
    """Tell analytics that an order was placed, and its total."""

    def track(order: Order) -> None:
        analytics.track(
            "order_placed",
            {"order_id": order.order_id, "total_cents": order.total_cents},
        )

    return track


def text_warehouse(sms: Sms, shop: Settings) -> OrderListener:
    """Text the shop's warehouse what to pack."""

    def send_text(order: Order) -> None:
        sms.send(
            to=shop.warehouse_phone,
            text=f"Pack {order.order_id}: {', '.join(packing_slip(order))}",
        )

    return send_text


def close_warehouse(events: OrderEvents, warehouse: OrderListener) -> None:
    """The warehouse is closed: take its listener off the list."""
    events.unsubscribe(warehouse)


def open_warehouse(events: OrderEvents, warehouse: OrderListener) -> None:
    """The warehouse is open again: put its listener back."""
    events.subscribe(warehouse)
