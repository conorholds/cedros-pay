use super::*;

#[test]
fn fixture_pins_registered_production_transport_contract() {
    let fixture: serde_json::Value = serde_json::from_str(include_str!(
        "../../../../docs/versioned-cart-write-v1-contract.json"
    ))
    .unwrap();
    assert_eq!(fixture["contractId"], CONTRACT_ID);
    assert_eq!(fixture["storageModels"]["carts"], CART_MODEL_ID);
    assert_eq!(fixture["storageModels"]["generations"], GENERATION_MODEL_ID);
    assert_eq!(fixture["storageModels"]["operations"], OPERATION_MODEL_ID);
    assert_eq!(fixture["storageModels"]["tombstones"], TOMBSTONE_MODEL_ID);
    assert_eq!(fixture["storageModels"]["lanes"], LANE_MODEL_ID);
    assert_eq!(fixture["registered"], true);
    assert_eq!(fixture["active"], true);
    assert_eq!(fixture["implementationReady"], true);
    assert_eq!(fixture["transport"]["registered"], true);
    assert_eq!(
        fixture["transport"]["authoritativeCatalogValidationBound"],
        true
    );
    assert_eq!(
        fixture["transport"]["authoritativeHoldValidationBound"],
        false
    );
    assert_eq!(fixture["transport"]["hostRequestRatePolicyBound"], true);
    assert_eq!(fixture["transport"]["fixedLane"], DEFAULT_LANE);
    assert_eq!(
        fixture["requestFixture"]["operationId"]
            .as_str()
            .unwrap()
            .len(),
        67
    );
    assert_eq!(
        fixture["transport"]["routeBindings"],
        json!([
            [ROUTE_OPEN, "POST", "/cart/open"],
            [ROUTE_READ, "POST", "/cart/read"],
            [ROUTE_ROTATE, "POST", "/cart/rotate"],
            [ROUTE_APPLY, "POST", "/cart/apply"],
        ])
    );
    assert_eq!(
        fixture["limits"]["maxLanesPerSubjectProvider"],
        lane_admission::MAX_LANES
    );
    assert_eq!(
        fixture["authority"]["customerIdentity"],
        "authenticated-pay-subject"
    );
    assert_eq!(fixture["authority"]["generation"], "host-entry-revision");
    assert_eq!(
        fixture["storage"]["maxCommittedOperationsPerLane"],
        validation::MAX_CART_VERSION
    );
    assert_eq!(
        fixture["ratePolicy"]["windowSeconds"],
        rate_policy::WINDOW_SECONDS
    );
    assert_eq!(
        fixture["shopConformanceReference"]["sourceCommit"],
        "6f08586"
    );
    assert_eq!(
        fixture["shopConformanceReference"]["reportCommit"],
        "ab06fa7"
    );
}
