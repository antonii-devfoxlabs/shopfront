"""The catalog file the owner edits: the one module that reads it."""

import json
from pathlib import Path

from shopfront.catalog import Catalog, Product


def load_catalog(path: Path) -> Catalog:
    """Read the owner's catalog file into a Catalog."""
    rows = json.loads(path.read_text(encoding="utf-8"))
    return Catalog([_product(row) for row in rows])


def _product(row: dict) -> Product:
    """One row of the file, in the file's words, as a Product."""
    return Product(
        sku=row["sku"],
        name=row["name"],
        price_cents=row["price_cents"],
        weight_grams=row["weight_grams"],
        stock=row["stock"],
    )
