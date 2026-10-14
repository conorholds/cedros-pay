use super::*;
use crate::{
    db::{Db, Query},
    fake::FakeSeams,
    models::{LedgerEntry, TokenSettlement},
    reqresp::RouteRequest,
};
use serde_json::{json, Value};

pub(crate) fn request(route: &str, path: &str) -> RouteRequest {
    RouteRequest {
        route_id: route.into(),
        method: "GET".into(),
        path: path.into(),
        context_json: json!({
            "authenticated":true,"actorId":"owner-a","principalId":"cedros-core:portal-orders",
            "authScheme":"managed-source","capabilityClaims":[route],"siteId":"site-a"
        })
        .to_string(),
        ..Default::default()
    }
}
pub(super) fn seed(seams: &FakeSeams, reference: &str) -> Order {
    let order = Order {
        schema_version: 1,
        kind: "order".into(),
        reference: order_id(reference),
        payment_reference: reference.into(),
        customer_name: "Customer".into(),
        asset: Some("USD".into()),
        asset_decimals: Some(2),
        token_mint: None,
        total_atomic: "9007199254741103".into(),
        subtotal_atomic: Some("9007199254740993".into()),
        tax_atomic: Some("10".into()),
        shipping_atomic: Some("0".into()),
        tip_atomic: Some("100".into()),
        discount_atomic: Some("0".into()),
        lines: vec![OrderLine {
            name: "Original name".into(),
            quantity: 2,
            total_atomic: Some("9007199254740993".into()),
            delivered: 0,
        }],
        digital: Some(false),
        cancelled: false,
        created_at: "2026-05-01T00:00:00Z".into(),
        updated_at: "2026-05-01T00:00:00Z".into(),
    };
    seams.seed(
        ids::MODEL_LEDGER,
        reference,
        serde_json::to_value(LedgerEntry {
            reference: reference.into(),
            kind: "payment".into(),
            status: "succeeded".into(),
            gross_cents: 9_007_199_254_741_103,
            currency: "USD".into(),
            provider: "stripe".into(),
            created_at: order.created_at.clone(),
            processed_at: order.updated_at.clone(),
            ..Default::default()
        })
        .unwrap(),
    );
    seams.seed(
        ids::MODEL_LEDGER,
        &order.reference,
        serde_json::to_value(&order).unwrap(),
    );
    order
}
#[test]
fn exact_receipts_are_read_only_and_do_not_expose_payment_material() {
    let seams = FakeSeams::new();
    let order = seed(&seams, "cs_private");
    let before = seams.db_batch_request_count();
    let response = crate::handle_route(
        &seams,
        request(
            DETAIL,
            &format!("/portal-source/v1/orders/{}", order.reference),
        ),
    );
    assert_eq!(response.status, 200, "{}", response.body);
    let value: Value = serde_json::from_str(&response.body).unwrap();
    assert_eq!(value["item"]["totalAtomic"], "9007199254741103");
    assert_eq!(value["item"]["tipAtomic"], "100");
    assert_eq!(value["item"]["paymentStatus"], "paid");
    assert_eq!(value["item"]["fulfillmentStatus"], "unfulfilled");
    assert!(!response.body.contains("cs_private"));
    assert!(!response.body.contains("paymentReference"));
    assert_eq!(seams.db_batch_request_count(), before);
    assert!(seams.http_requests.borrow().is_empty());
    assert!(seams.secret_reads.borrow().is_empty());
}
#[test]
fn forged_headers_and_admin_context_do_not_authorize_source_reads() {
    let seams = FakeSeams::new();
    seed(&seams, "p");
    for context in [
        json!({}),
        json!({"authenticated":true,"systemAdmin":true}),
        json!({"authenticated":true,"actorId":"owner-a","principalId":"cedros-core:portal-orders","authScheme":"admin-session","capabilityClaims":[LIST],"siteId":"site-a"}),
    ] {
        let mut req = request(LIST, "/portal-source/v1/orders");
        req.context_json = context.to_string();
        req.headers = vec![
            ("x-actor-id".into(), "owner-a".into()),
            ("x-tenant-id".into(), "site-a".into()),
        ];
        assert_eq!(crate::handle_route(&seams, req).status, 403);
    }
    let mut req = request(LIST, "/portal-source/v1/orders");
    req.query = vec![("tenant_id".into(), "site-b".into())];
    assert_eq!(crate::handle_route(&seams, req).status, 400);
}
#[test]
fn historical_missing_details_and_inconsistent_amounts_fail_explicitly() {
    let seams = FakeSeams::new();
    let mut order = seed(&seams, "p");
    order.digital = None;
    seams.seed(
        ids::MODEL_LEDGER,
        &order.reference,
        serde_json::to_value(&order).unwrap(),
    );
    assert_eq!(
        crate::handle_route(&seams, request(LIST, "/portal-source/v1/orders")).status,
        503
    );
    order.digital = Some(false);
    order.tip_atomic = Some("101".into());
    seams.seed(
        ids::MODEL_LEDGER,
        &order.reference,
        serde_json::to_value(&order).unwrap(),
    );
    assert_eq!(
        crate::handle_route(
            &seams,
            request(
                DETAIL,
                &format!("/portal-source/v1/orders/{}", order.reference)
            )
        )
        .status,
        503
    );
}
#[test]
fn token_receipts_use_persisted_asset_and_exact_settlement_without_fiat_conversion() {
    for decimals in [0, 6, 18] {
        let seams = FakeSeams::new();
        let mut order = seed(&seams, "tx");
        order.asset = Some("USDC".into());
        order.asset_decimals = Some(decimals);
        order.token_mint = Some("original-mint".into());
        order.total_atomic = "123456789012345678".into();
        order.subtotal_atomic = None;
        order.tax_atomic = None;
        order.shipping_atomic = None;
        order.tip_atomic = None;
        order.discount_atomic = None;
        order.lines[0].total_atomic = None;
        seams.seed(
            ids::MODEL_LEDGER,
            &order.reference,
            serde_json::to_value(&order).unwrap(),
        );
        let mut payment: LedgerEntry =
            serde_json::from_value(seams.get_entry(ids::MODEL_LEDGER, "tx").unwrap()).unwrap();
        payment.provider = "x402".into();
        payment.token_settlement = Some(TokenSettlement {
            amount_atomic: 123456789012345678,
            mint: "original-mint".into(),
            decimals,
            transaction_base64: None,
            recent_blockhash: None,
            network: None,
        });
        payment.refund_cents = 100;
        seams.seed(
            ids::MODEL_LEDGER,
            "tx",
            serde_json::to_value(&payment).unwrap(),
        );
        seams.set_setting("token_symbol", "OTHER");
        seams.set_setting("token_decimals", "9");
        let result = crate::handle_route(
            &seams,
            request(
                DETAIL,
                &format!("/portal-source/v1/orders/{}", order.reference),
            ),
        );
        assert_eq!(result.status, 200, "{}", result.body);
        let item: Value = serde_json::from_str::<Value>(&result.body).unwrap()["item"].clone();
        assert_eq!(item["asset"], "USDC");
        assert_eq!(item["totalAtomic"], order.total_atomic);
        assert_eq!(item["refundedAtomic"], Value::Null);
        assert_eq!(item["paymentStatus"], "partially-refunded");
    }
}
#[test]
fn fulfillment_is_guarded_idempotent_and_independent_of_payment_status() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    let order = seed(&seams, "p");
    let entry = Db::new(&seams, ids::DB_ACCESS)
        .read_one(ids::MODEL_LEDGER, &order.reference)
        .unwrap()
        .unwrap();
    let mut req=RouteRequest {route_id:FULFILL.into(),method:"POST".into(),path:format!("/admin/orders/{}/fulfillment",order.reference),
        context_json:json!({"authenticated":true,"actorId":"owner","systemAdmin":true,"csrfVerified":true,"idempotencyKey":"shipment-one"}).to_string(),
        body:json!({"expectedVersion":entry.version,"delivered":[1],"cancelled":false}).to_string(),..Default::default()};
    let result = crate::handle_route(&seams, req.clone());
    assert_eq!(result.status, 200, "{}", result.body);
    assert_eq!(crate::handle_route(&seams, req.clone()).body, result.body);
    req.body =
        json!({"expectedVersion":entry.version,"delivered":[2],"cancelled":false}).to_string();
    assert_eq!(crate::handle_route(&seams, req).status, 409);
    let rows = Db::new(&seams, ids::DB_ACCESS)
        .read(ids::MODEL_LEDGER, &Query::new())
        .unwrap();
    assert_eq!(
        rows.iter()
            .filter(|row| row.payload["kind"] == "fulfillment")
            .count(),
        1
    );
    let detail = crate::handle_route(
        &seams,
        request(
            DETAIL,
            &format!("/portal-source/v1/orders/{}", order.reference),
        ),
    );
    let value: Value = serde_json::from_str(&detail.body).unwrap();
    assert_eq!(value["item"]["fulfillmentStatus"], "partial");
    assert_eq!(value["item"]["paymentStatus"], "paid");
}

#[test]
fn fiat_partial_refunds_and_unknown_breakdowns_remain_distinct_from_zero() {
    let seams = FakeSeams::new();
    let mut order = seed(&seams, "fiat-refund");
    order.tax_atomic = None;
    seams.seed(
        ids::MODEL_LEDGER,
        &order.reference,
        serde_json::to_value(&order).unwrap(),
    );
    let mut payment = seams.get_entry(ids::MODEL_LEDGER, "fiat-refund").unwrap();
    payment["refundCents"] = json!(123);
    seams.seed(ids::MODEL_LEDGER, "fiat-refund", payment.clone());
    let path = format!("/portal-source/v1/orders/{}", order.reference);
    let response = crate::handle_route(&seams, request(DETAIL, &path));
    assert_eq!(response.status, 200, "{}", response.body);
    let item = serde_json::from_str::<Value>(&response.body).unwrap()["item"].clone();
    assert_eq!(item["refundedAtomic"], "123");
    assert_eq!(item["paymentStatus"], "partially-refunded");
    assert_eq!(item["taxAtomic"], Value::Null);
    assert_eq!(item["shippingAtomic"], "0");
    payment.as_object_mut().unwrap().remove("refundCents");
    seams.seed(ids::MODEL_LEDGER, "fiat-refund", payment);
    let response = crate::handle_route(&seams, request(DETAIL, &path));
    assert_eq!(response.status, 200);
    assert_eq!(
        serde_json::from_str::<Value>(&response.body).unwrap()["item"]["refundedAtomic"],
        Value::Null
    );
}
