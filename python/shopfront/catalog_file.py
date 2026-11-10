"""The catalog file the owner edits: the one module that reads it."""

import json
from pathlib import Path

from shopfront.catalog import Catalog, Product


class CatalogFileError(Exception):
    """The owner's catalog file cannot be read: the message says where."""


def load_catalog(path: Path) -> Catalog:
    """Read the owner's catalog file into a Catalog, or say what is
    wrong with it."""
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError as error:
        raise CatalogFileError(f"{path}: no such file") from error
    try:
        rows = json.loads(text)
    except json.JSONDecodeError as error:
        raise CatalogFileError(
            f"{path}, line {error.lineno}: {error.msg}"
        ) from error
    if not isinstance(rows, list):
        raise CatalogFileError(f"{path}: not a list of products")
    return Catalog(
        [
            _product(row, f"{path}, product {number}")
            for number, row in enumerate(rows, start=1)
        ]
    )


def _product(row: object, where: str) -> Product:
    """One row of the file, in the file's words, as a Product."""
    if not isinstance(row, dict):
        raise CatalogFileError(f"{where}: not a product")
    return Product(
        sku=_text(row, "sku", where),
        name=_text(row, "name", where),
        price_cents=_whole_number(row, "price_cents", where),
        weight_grams=_whole_number(row, "weight_grams", where),
        stock=_whole_number(row, "stock", where),
    )


def _text(row: dict, field: str, where: str) -> str:
    value = row.get(field)
    if not isinstance(value, str):
        raise CatalogFileError(f"{where}: {field} must be text")
    return value


def _whole_number(row: dict, field: str, where: str) -> int:
    value = row.get(field)
    if not isinstance(value, int):
        raise CatalogFileError(f"{where}: {field} must be a whole number")
    return value
