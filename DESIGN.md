# Design

One line per pattern: where it lives, and why it is there.

- Registry: `payments.py`, `PAYMENT_METHODS`. Ways to pay keep coming.
- Factory Method: `returns.py`, `GiftReturn`. A gift goes onto a card.
- Builder: `orders.py`, `OrderBuilder`. An order has ten parts.
- Singleton: `orders.py`, `OrderBook`. The support page reads it.
- Adapter: `providers.py`. Each provider has its own API.
- Decorator: `taxes.py`, `CachedRates`. A rate is asked for once.
- Facade: `checkout.py`, `Checkout`. A page makes one call.
- Strategy: `pricing.py`, `COUPONS`. Marketing's rules keep changing.
- Observer: `listeners.py`. Placing an order names no listener.
- Iterator: `catalog.py`, `Catalog.cursor`. Products come one by one.
- Command: `edits.py`, a class per edit. Undo needs each edit kept.
- Template Method: `exports.py`, `OrderExport`. One export routine.
