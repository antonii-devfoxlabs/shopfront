"""Stand-ins for the services Shopfront talks to.

Each module here plays the part of a third-party SDK: a shipping
provider, a payment gateway, a mailer. They keep everything in
memory, so the project runs and its tests pass without a network
or an account anywhere. Shopfront's own code treats them exactly as
it would treat the real thing.
"""
