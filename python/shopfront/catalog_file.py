"""The catalog file the owner edits: the one module that reads it."""

import json
from pathlib import Path

from shopfront.catalog import Catalog, Product


class CatalogError(Exception):
    """The catalog cannot be read: the message says where, and why."""


def load_catalog(path: Path) -> Catalog:
    """Read the owner's catalog file into a Catalog, or say what is
    wrong with it."""
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError as error:
        raise CatalogError(f"{path}: no such file") from error
    try:
        rows = json.loads(text)
    except json.JSONDecodeError as error:
        raise CatalogError(
            f"{path}, line {error.lineno}: {error.msg}"
        ) from error
    return _catalog_from(rows, str(path))


def _catalog_from(rows: object, where: str) -> Catalog:
    """The rows, wherever they were read from, checked into a Catalog."""
    if not isinstance(rows, list):
        raise CatalogError(f"{where}: not a list of products")
    return Catalog(
        [
            _product(row, f"{where}, product {number}")
            for number, row in enumerate(rows, start=1)
        ]
    )


def _product(row: object, where: str) -> Product:
    """One row of the file, in the file's words, as a Product."""
    if not isinstance(row, dict):
        raise CatalogError(f"{where}: not a product")
    return Product(
        sku=_text_field(row, "sku", where),
        name=_text_field(row, "name", where),
        price_cents=_whole_number_field(row, "price_cents", where),
        weight_grams=_whole_number_field(row, "weight_grams", where),
        stock=_whole_number_field(row, "stock", where),
    )


def _text_field(row: dict, field: str, where: str) -> str:
    value = row.get(field)
    if not isinstance(value, str):
        raise CatalogError(f"{where}: {field} must be text")
    return value


def _whole_number_field(row: dict, field: str, where: str) -> int:
    value = row.get(field)
    # JSON's true and false arrive as True and False, which are ints too.
    if isinstance(value, bool) or not isinstance(value, int):
        raise CatalogError(f"{where}: {field} must be a whole number")
    return value
