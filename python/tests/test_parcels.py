from shopfront.parcels import PARCELNOW, Parcel


def test_a_parcel_links_to_its_couriers_page_for_it():
    parcel = Parcel(courier=PARCELNOW, number="PN-58213")
    assert (
        parcel.tracking_link() == "https://parcelnow.example/track/PN-58213"
    )
