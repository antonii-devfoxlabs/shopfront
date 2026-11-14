# Design

Where the next change to Shopfront goes, and why each pattern is
there. A name such as `payments.Card` is a part of the store (the
file named payments in your language's folder) and a name defined in
it, the same in Python, JavaScript and TypeScript. Each language's
tests check that every such name is still defined where the note
says.

## Where a change goes

- **A way to pay**: a row in `payments.PAYMENT_METHODS`. A new kind
  of payment is a class beside `payments.Card`, then a row.
- **A coupon**: a row in `pricing.COUPONS`. A new kind of rule is a
  wrapper in `pricing`, then a row.
- **A free-shipping offer**: a row in `shipping.OFFERS`.
- **A shipping provider**: an adapter in `providers`, added to the
  providers `main` hands `shipping.Shipping`.
- **A job round a service** (a timer, a cache): a wrapper, as
  `taxes.CachedRates` is round the tax service.
- **Something to do when an order is placed**: a listener in
  `listeners`, subscribed to `orders.OrderEvents` in `main`.
- **A part of an order**: a step on `orders.OrderBuilder`.
- **A step of buying a cart**: in `checkout.Checkout`, which runs
  the steps in their order.
- **A cart edit**: a kind in `edits`, and its case in `edits.apply`.
  This one edits old code: edits are plain data so that they can be
  written down, and one function runs them all.
- **A collection to walk**: a cursor, as `catalog.Catalog` has.
- **An export format**: a subclass of `exports.OrderExport`.

## Kept, for now

`orders.OrderBook` is one book for the whole store, a Singleton:
the support team's page, outside Shopfront, finds the shop's orders
there. Once that page goes, hand the book in, as the shop's settings
and the gateway are.

## Dropped

Factory Method, in `returns`: a gift's return differed from any
other only in where its money went. A `returns.Return` is handed
that now.
