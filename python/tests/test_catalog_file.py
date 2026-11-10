import json

import pytest

from shopfront.catalog_file import CatalogFileError, load_catalog

KETTLE = {
    "sku": "KTL-03",
    "name": "Pour-over kettle",
    "price_cents": 4900,
    "weight_grams": 1100,
    "stock": 8,
}


def test_a_typo_in_a_field_names_the_file_and_the_product(tmp_path):
    path = tmp_path / "catalog.json"
    typo = {
        "sku": "MUG-01",
        "name": "Enamel mug",
        "price_cent": 1250,
        "weight_grams": 350,
        "stock": 40,
    }
    path.write_text(json.dumps([KETTLE, typo]), encoding="utf-8")
    with pytest.raises(
        CatalogFileError,
        match=r"catalog\.json, product 2: price_cents must be a whole number",
    ):
        load_catalog(path)


def test_broken_json_names_the_file_and_the_line(tmp_path):
    path = tmp_path / "catalog.json"
    path.write_text('[\n  {"sku": "KTL-03"\n  "name": "Kettle"}\n]\n')
    with pytest.raises(
        CatalogFileError, match=r"catalog\.json, line 3: Expecting ','"
    ):
        load_catalog(path)


def test_a_missing_file_is_said_in_the_stores_words(tmp_path):
    with pytest.raises(
        CatalogFileError, match=r"catalog\.json: no such file"
    ):
        load_catalog(tmp_path / "catalog.json")
