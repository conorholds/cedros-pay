use super::settlement_effect_test_support::{settle_credits, setup_credits};
use crate::{
    db::{Db, Filter, Op, Query},
    ids,
};
use serde_json::{json, Value};
#[test]
fn canonical_settlement_atomically_persists_one_real_order_and_replay_preserves_it() {
    let seams = setup_credits();
    let operation = settle_credits(&seams, "portal-order");
    assert_eq!(settle_credits(&seams, "portal-order"), operation);
    let db = Db::new(&seams, ids::DB_ACCESS);
    let orders = db
        .read(
            ids::MODEL_LEDGER,
            &Query::new().filter(Filter::new("kind", Op::Eq, "order")),
        )
        .unwrap();
    assert_eq!(orders.len(), 1);
    assert_eq!(orders[0].payload["paymentReference"], operation);
    let response=crate::handle_route(&seams,crate::reqresp::RouteRequest {route_id:crate::commerce_orders::DETAIL.into(),method:"GET".into(),path:format!("/portal-source/v1/orders/{}",orders[0].entry_key),context_json:json!({"authenticated":true,"actorId":"owner-a","principalId":"cedros-core:portal-orders","authScheme":"managed-source","capabilityClaims":[crate::commerce_orders::DETAIL],"siteId":"site-a"}).to_string(),..Default::default()});
    assert_eq!(response.status, 200, "{}", response.body);
    let value: Value = serde_json::from_str(&response.body).unwrap();
    assert_eq!(value["item"]["paymentStatus"], "paid");
    assert_eq!(value["item"]["lines"][0]["quantity"], 2);
}

#[test]
fn incomplete_historical_order_history_is_explicit_and_never_repaired_by_reading() {
    let seams = setup_credits();
    settle_credits(&seams, "legacy-history");
    let db = Db::new(&seams, ids::DB_ACCESS);
    super::require_complete_order_history(&db).unwrap();
    let order = db
        .read(
            ids::MODEL_LEDGER,
            &Query::new().filter(Filter::new("kind", Op::Eq, "order")),
        )
        .unwrap()
        .remove(0);
    seams.seed(
        ids::MODEL_LEDGER,
        &order.entry_key,
        json!({"kind":"deleted-legacy-order"}),
    );
    let before = seams.db_batch_request_count();
    assert_eq!(
        super::require_complete_order_history(&db)
            .unwrap_err()
            .status,
        503
    );
    assert_eq!(before, seams.db_batch_request_count());
}

#[test]
fn pre_canonical_settled_payments_cannot_silently_disappear_from_orders() {
    let seams = crate::fake::FakeSeams::new();
    let db = Db::new(&seams, ids::DB_ACCESS);
    let mut payment = crate::models::LedgerEntry {
        reference: "legacy-payment".into(),
        kind: "payment".into(),
        status: "pending".into(),
        gross_cents: 1250,
        currency: "USD".into(),
        provider: "stripe".into(),
        ..Default::default()
    };
    seams.seed(
        ids::MODEL_LEDGER,
        &payment.reference,
        serde_json::to_value(&payment).unwrap(),
    );
    super::require_complete_order_history(&db).unwrap();
    payment.status = "succeeded".into();
    seams.seed(
        ids::MODEL_LEDGER,
        &payment.reference,
        serde_json::to_value(&payment).unwrap(),
    );
    let writes = seams.db_batch_request_count();
    let error = super::require_complete_order_history(&db).unwrap_err();
    assert_eq!(error.status, 503);
    assert_eq!(error.code, "order_history_requires_recovery");
    assert_eq!(writes, seams.db_batch_request_count());
    assert!(seams.http_requests.borrow().is_empty());
}
