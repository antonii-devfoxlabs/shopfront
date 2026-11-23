# Design

Where the next change to Shopfront goes, and why each pattern is
there. A name such as `payments.Card` is a part of the store (the
file named payments in your language's folder) and a name defined in
it, the same in Python, JavaScript and TypeScript. Each language's
tests check that every such name is still defined where the note
says.

## Where a change goes

Each kind of change has the shape that fits what differs between its
cases: a number is a row of a table, a refusal is an `if`, and a class
or a function per case is for cases whose code differs. A new case
takes its kind's shape; a kind whose cases start to differ in code
changes shape then, not before. A slot, a parameter or a hook is
added with the case that needs it, never for one nobody has asked for.

- **A way to pay**: a row in `payments.PAYMENT_METHODS`. A new kind
  of payment is a class beside `payments.Card`, then a row.
- **A coupon**: a row in `pricing.COUPONS`. A new kind of rule is a
  wrapper in `pricing`, then a row.
- **A free-shipping offer**: a row in `shipping.OFFERS`.
- **A shipping provider**: an adapter in `providers`, added to the
  providers `main` hands `shipping.Shipping`.
- **A job round a service** (a timer, a cache): a wrapper, as
  `taxes.CachedRates` is round the tax service.
- **A service that may not answer in time**: one wrapper round it asks
  again, as `taxes.RetriedRates` does round the tax service, and only
  after a timeout, the failure that asking again can fix. `main` sets
  how many tries and how long each may wait, side by side, so that all
  of them fit inside the time the shop's web page waits. No other part
  asks again: tries in two layers multiply.
- **Something to do when an order is placed, dispatched, refunded or
  cancelled**: a listener in `listeners`, subscribed to
  `orders.OrderEvents` in `main`. A new way to tell someone is one more
  listener.
- **A part of an order**: a step on `orders.OrderBuilder`.
- **A status of an order**: a row in `orders.STATUSES`, which says
  whether it is a sale, can be sent back, dispatched or cancelled.
- **A move of an order**, such as cancelling it: a method of
  `orders.Order`, the only code that changes its status. It refuses a
  move its status's row does not allow; the rest of the store asks the
  order to move, and only reads its status.
- **An exchange**, a product sent back for the same one: in
  `returns.Exchange`, which gives no money back and marks the order
  exchanged. It is not a kind of `returns.Return`: the rest of the
  store reads a returned order as money paid back.
- **A goodwill credit**, part of an order's money given back for a
  parcel that went wrong: a row in `returns.GOODWILL_PERCENT`, given
  by its own call on `returns.Refunds`, beside the refund. It runs
  none of a return's steps: it marks nothing and announces nothing.
  The support form's list is made from the table's rows.
- **A courier**: a constant beside `parcels.PARCELNOW`. A parcel
  makes its own tracking link, in `parcels.Parcel`; the rest of the
  store asks an order for its link and never builds one.
- **How money is written**: in `money`, which every price, email and
  report the store shows goes through.
- **What goes into a parcel**: the packing slip in `packing`, with its
  free sample, `packing.SAMPLE`.
- **The owner's Monday line**: the sales report, in `reports`.
- **A step of buying a cart**: in `checkout.Checkout`, which runs
  the steps in their order.
- **A cart edit**: a kind in `edits`, and its case in `edits.apply`.
  This one edits old code: edits are plain data so that they can be
  written down, and one function runs them all.
- **A collection to walk**: a cursor, as `catalog.Catalog` has.
- **An export format**: a subclass of `exports.OrderExport`.

## Dropped

The order book's Singleton, in `orders`, and the lookup by name that
came after it: `main` makes the store's one `orders.OrderBook` and
hands it to every part that keeps or finds orders, as it hands them
the shop and the gateway.

Factory Method, in `returns`: a gift's return differed from any
other only in where its money went. A `returns.Return` is handed
that now.
