import pytest

from shopfront import services


def test_a_service_is_found_by_the_name_it_was_registered_under():
    services.register("clock", "the shop's clock")
    assert services.get("clock") == "the shop's clock"


def test_an_unknown_name_is_refused():
    with pytest.raises(services.UnknownServiceError, match="no_such_part"):
        services.get("no_such_part")
