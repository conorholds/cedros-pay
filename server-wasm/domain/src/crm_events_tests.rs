use super::*;
use serde_json::json;

#[test]
fn subscription_signup_carries_only_explicit_login_identity() {
    for login in [None, Some("login-1")] {
        let action =
            subscription_created_action("evt-1", "customer-1", "sub-1", "price-1", 1, login)
                .unwrap();
        let crate::durable_effects::Action::Crm { payload, .. } = action else {
            panic!("CRM action")
        };
        assert_eq!(payload["customerId"], "customer-1");
        assert_eq!(
            payload.get("cedrosLoginUserId").and_then(Value::as_str),
            login
        );
        assert_eq!(payload["subscriptionRef"], "sub-1");
    }
}

#[test]
fn paid_invoice_maps_trusted_signup_identity_for_both_stripe_payload_shapes() {
    for path in ["subscription_details", "parent"] {
        for trusted in [false, true] {
            let details =
                json!({"metadata": {"user_id": "login-1", "user_id_trusted": trusted.to_string()}});
            let mut invoice = json!({"id":"in-1", "customer":"cus-1", "subscription":"sub-1", "amount_paid":12900, "currency":"usd"});
            invoice[path] = if path == "parent" {
                json!({"subscription_details": details})
            } else {
                details
            };
            let action = subscription_renewed_action("evt-1", &invoice, 1).unwrap();
            let crate::durable_effects::Action::Crm { payload, .. } = action else {
                panic!("CRM action")
            };
            assert_eq!(
                payload.get("cedrosLoginUserId").and_then(Value::as_str),
                trusted.then_some("login-1")
            );
            assert_eq!(payload["invoiceRef"], "in-1");
            assert_eq!(payload["amountCents"], 12900);
        }
    }
}

#[test]
fn invoice_does_not_combine_identity_and_trust_from_different_metadata_objects() {
    let invoice = json!({"customer":"cus-1", "metadata":{"user_id_trusted":"true"},
        "subscription_details":{"metadata":{"user_id":"not-trusted"}}});
    let action = subscription_renewed_action("evt-1", &invoice, 1).unwrap();
    let crate::durable_effects::Action::Crm { payload, .. } = action else {
        panic!("CRM action")
    };
    assert!(payload.get("cedrosLoginUserId").is_none());
}

#[test]
fn skips_submit_without_deterministic_identity() {
    let action = payment_succeeded_action(
        "stripe",
        "evt_1",
        &json!({ "metadata": {} }),
        100,
        "USD",
        1,
        "ord",
    );

    assert!(action.is_none());
}

#[test]
fn submits_identity_and_excludes_raw_wallet() {
    let object = json!({
        "id": "pi_1",
        "metadata": {
            "customerId": "cust_1",
            "wallet": "raw-wallet",
            "walletAddressHash": "hash_1",
            "routePath": "/shop",
            "productId": "prod_1"
        }
    });

    let action =
        payment_succeeded_action("stripe", "evt_1", &object, 1200, "USD", 1, "ord_1").unwrap();
    let crate::durable_effects::Action::Crm {
        event_type,
        payload,
    } = action
    else {
        panic!("expected CRM action")
    };
    assert_eq!(event_type, ids::CRM_EVENT_PURCHASE_COMPLETED);
    assert_eq!(payload["customerId"], "cust_1");
    assert_eq!(payload["walletAddressHash"], "hash_1");
    assert!(payload.get("wallet").is_none());
    assert!(payload.get("walletAddress").is_none());
}

#[test]
fn submits_dispute_fields_and_drops_raw_evidence() {
    let mut payload = Map::new();
    payload.insert("customerId".into(), Value::String("cust_1".into()));
    payload.insert("disputeId".into(), Value::String("disp_1".into()));
    payload.insert(
        "disputeStatus".into(),
        Value::String("needs_response".into()),
    );
    payload.insert("disputeReason".into(), Value::String("fraudulent".into()));
    payload.insert("disputedAmountCents".into(), Value::from(2500));
    payload.insert("disputedCurrency".into(), Value::String("USD".into()));
    payload.insert(
        "evidenceDueAt".into(),
        Value::String("2026-06-05T00:00:00Z".into()),
    );
    payload.insert("walletAddress".into(), Value::String("raw-wallet".into()));
    payload.insert(
        "rawEvidence".into(),
        Value::String("private evidence".into()),
    );

    let action = dispute_action(ids::CRM_EVENT_DISPUTE_UPDATED, "evt_disp_1", 1, payload).unwrap();
    let crate::durable_effects::Action::Crm {
        event_type,
        payload,
    } = action
    else {
        panic!("expected CRM action")
    };
    assert_eq!(event_type, ids::CRM_EVENT_DISPUTE_UPDATED);
    assert_eq!(payload["customerId"], "cust_1");
    assert_eq!(payload["disputeId"], "disp_1");
    assert_eq!(payload["disputedAmountCents"], 2500);
    assert!(payload.get("walletAddress").is_none());
    assert!(payload.get("rawEvidence").is_none());
}
