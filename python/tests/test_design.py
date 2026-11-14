import re
from pathlib import Path

import pytest

HERE = Path(__file__).parent
NOTE = (HERE.parent.parent / "DESIGN.md").read_text(encoding="utf-8")
# A name such as `payments.Card`: a part of the store, and a name in it.
NAMES = sorted(set(re.findall(r"`([a-z]+)\.(\w+)`", NOTE)))


def defined(name: str, source: str) -> bool:
    """Whether a line of the source starts by defining name."""
    found = re.search(rf"^(class |def )?{name}\b", source, re.MULTILINE)
    return found is not None


def test_the_design_note_names_parts_of_the_store():
    assert len(NAMES) > 0


@pytest.mark.parametrize(("part", "name"), NAMES)
def test_each_name_in_the_design_note_is_defined_in_its_part(part, name):
    source = (HERE.parent / "shopfront" / f"{part}.py").read_text(
        encoding="utf-8"
    )
    assert defined(name, source), f"{part}.{name} is not in {part}.py"
