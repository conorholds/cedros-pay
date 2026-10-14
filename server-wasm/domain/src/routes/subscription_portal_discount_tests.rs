use super::*;

fn offer(end: i64) -> Value {
    json!({"id":"sub_offer", "customer":"cus_1", "status":"active",
        "metadata":{"invite_discount_duration":"fixed_months"}, "discounts":[{"end":end}]})
}

fn configuration() -> Value {
    json!({"id":"bpc_offer", "active":true, "is_default":false, "metadata":{"cedros_invite_policy":"fixed_months_v1"},
        "features":{"subscription_update":{"enabled":false}, "invoice_history":{"enabled":true},
            "payment_method_update":{"enabled":true},
            "subscription_cancel":{"enabled":true,"mode":"at_period_end","proration_behavior":"none"}}})
}

fn default_configuration() -> Value {
    json!({"id":"bpc_default", "active":true, "is_default":true})
}

fn push_list(s: &FakeSeams, rows: Vec<Value>, more: bool) {
    s.push_http_response(200, &json!({"data":rows,"has_more":more}).to_string());
}

fn open(s: &FakeSeams) -> AppResult<RouteResponse> {
    handle(
        s,
        &portal_req(json!({"subscriptionId":"sub_1","returnUrl":"https://app.example/account"})),
    )
}

#[test]
fn active_offer_on_any_customer_subscription_uses_restricted_portal() {
    let s = seams();
    seed_sub(&s);
    s.set_now(1000);
    push_list(&s, vec![offer(2000)], false);
    push_list(&s, vec![configuration()], false);
    s.push_http_response(
        200,
        r#"{"url":"https://billing.stripe.com/p/session/offer"}"#,
    );
    assert_eq!(open(&s).unwrap().status, 200);
    let requests = s.http_requests.borrow();
    assert!(requests[0]["url"]
        .as_str()
        .unwrap()
        .contains("expand%5B%5D=data.discounts"));
    assert!(requests[2]["body"]
        .as_str()
        .unwrap()
        .contains("configuration=bpc_offer"));
    assert_eq!(requests.len(), 3);
}

#[test]
fn expired_removed_lifetime_and_canceled_offers_keep_standard_portal() {
    let mut lifetime = offer(2000);
    lifetime["metadata"]["invite_discount_duration"] = json!("subscription_lifetime");
    let mut removed = offer(2000);
    removed["discounts"] = Value::Null;
    let mut empty = offer(2000);
    empty["discounts"] = json!([]);
    let mut canceled = offer(2000);
    canceled["status"] = json!("canceled");
    for subscription in [offer(999), offer(1000), lifetime, removed, empty, canceled] {
        let s = seams();
        seed_sub(&s);
        s.set_now(1000);
        push_list(&s, vec![subscription], false);
        s.push_http_response(
            200,
            r#"{"url":"https://billing.stripe.com/p/session/normal"}"#,
        );
        assert_eq!(open(&s).unwrap().status, 200);
        let requests = s.http_requests.borrow();
        assert_eq!(requests.len(), 2);
        assert!(!requests[1]["body"]
            .as_str()
            .unwrap()
            .contains("configuration="));
    }
}

#[test]
fn offer_and_policy_pagination_and_safe_policy_creation_are_wired() {
    let s = seams();
    seed_sub(&s);
    s.set_now(1000);
    push_list(&s, vec![offer(900)], true);
    let mut active = offer(2000);
    active["id"] = json!("sub_offer2");
    push_list(&s, vec![active], false);
    push_list(&s, vec![default_configuration()], true);
    push_list(&s, vec![], false);
    s.push_http_response(200, &configuration().to_string());
    s.push_http_response(200, r#"{"url":"https://billing.stripe.com/p/session/new"}"#);
    assert_eq!(open(&s).unwrap().status, 200);
    let requests = s.http_requests.borrow();
    assert!(requests[1]["url"]
        .as_str()
        .unwrap()
        .contains("starting_after=sub_offer"));
    assert!(requests[3]["url"]
        .as_str()
        .unwrap()
        .contains("starting_after=bpc_default"));
    let body = requests[4]["body"].as_str().unwrap();
    for field in [
        "features%5Bsubscription_update%5D%5Benabled%5D=false",
        "features%5Binvoice_history%5D%5Benabled%5D=true",
        "features%5Bpayment_method_update%5D%5Benabled%5D=true",
        "features%5Bsubscription_cancel%5D%5Bmode%5D=at_period_end",
    ] {
        assert!(body.contains(field), "missing {field}");
    }
    assert!(requests[5]["body"]
        .as_str()
        .unwrap()
        .contains("configuration=bpc_offer"));
}

#[test]
fn malformed_or_unavailable_discount_state_never_opens_unrestricted_portal() {
    let mut wrong_customer = offer(2000);
    wrong_customer["customer"] = json!("cus_other");
    let mut unexpanded = offer(2000);
    unexpanded["discounts"] = json!(["di_unexpanded"]);
    let mut missing_end = offer(2000);
    missing_end["discounts"] = json!([{"end":null}]);
    let mut missing_discounts = offer(2000);
    missing_discounts
        .as_object_mut()
        .unwrap()
        .remove("discounts");
    for row in [wrong_customer, unexpanded, missing_end, missing_discounts] {
        let s = seams();
        seed_sub(&s);
        s.set_now(1000);
        push_list(&s, vec![row], false);
        assert_eq!(open(&s).unwrap_err().status, 502);
        assert_eq!(s.http_requests.borrow().len(), 1);
    }
    for (status, body) in [
        (503, "{}"),
        (200, "not json"),
        (200, "{}"),
        (200, r#"{"data":[],"has_more":true}"#),
    ] {
        let s = seams();
        seed_sub(&s);
        s.push_http_response(status, body);
        assert_eq!(open(&s).unwrap_err().status, 502);
        assert_eq!(s.http_requests.borrow().len(), 1);
    }
}

#[test]
fn unsafe_existing_or_created_policy_and_provider_failure_fail_closed() {
    for create in [false, true] {
        for status in [200, 503] {
            let s = seams();
            seed_sub(&s);
            s.set_now(1000);
            push_list(&s, vec![offer(2000)], false);
            let mut unsafe_policy = configuration();
            unsafe_policy["features"]["subscription_update"]["enabled"] = json!(true);
            if create {
                push_list(&s, vec![default_configuration()], false);
                s.push_http_response(status, &unsafe_policy.to_string());
            } else {
                s.push_http_response(
                    status,
                    &json!({"data":[unsafe_policy],"has_more":false}).to_string(),
                );
            }
            assert_eq!(open(&s).unwrap_err().status, 502);
            assert!(s
                .http_requests
                .borrow()
                .iter()
                .all(|req| !req["url"].as_str().unwrap().ends_with("/sessions")));
        }
    }
}

#[test]
fn missing_default_never_creates_an_offer_policy_as_the_account_default() {
    for rows in [
        vec![],
        vec![json!({"id":"bpc_other", "active":true, "is_default":false})],
        vec![json!({"id":"bpc_default", "active":false, "is_default":true})],
    ] {
        let s = seams();
        seed_sub(&s);
        s.set_now(1000);
        push_list(&s, vec![offer(2000)], false);
        push_list(&s, rows, false);
        assert_eq!(open(&s).unwrap_err().status, 502);
        assert_eq!(s.http_requests.borrow().len(), 2);
    }
}

#[test]
fn default_or_unknown_default_status_offer_policy_is_rejected() {
    for default in [json!(true), Value::Null] {
        for create in [false, true] {
            let s = seams();
            seed_sub(&s);
            s.set_now(1000);
            push_list(&s, vec![offer(2000)], false);
            let mut policy = configuration();
            policy["is_default"] = default.clone();
            if create {
                push_list(&s, vec![default_configuration()], false);
                s.push_http_response(200, &policy.to_string());
            } else {
                push_list(&s, vec![policy], false);
            }
            assert_eq!(open(&s).unwrap_err().status, 502);
            assert_eq!(s.http_requests.borrow().len(), if create { 3 } else { 2 });
        }
    }
}

#[test]
fn pagination_is_bounded_and_repeated_cursor_fails_closed() {
    for repeated in [false, true] {
        let s = seams();
        seed_sub(&s);
        s.set_now(1000);
        for index in 0..10 {
            let mut row = offer(900);
            row["id"] = json!(format!("sub_{}", if repeated { 0 } else { index }));
            push_list(&s, vec![row], true);
        }
        assert_eq!(open(&s).unwrap_err().status, 502);
        assert_eq!(
            s.http_requests.borrow().len(),
            if repeated { 2 } else { 10 }
        );
    }
}

#[test]
fn retry_after_offer_activation_cannot_replay_unrestricted_provider_session() {
    let s = seams();
    seed_sub(&s);
    s.set_now(1000);
    push_list(&s, vec![], false);
    s.push_http_response(200, r#"{"url":"https://billing.stripe.com/p/session/old"}"#);
    assert_eq!(open(&s).unwrap().status, 200);
    push_list(&s, vec![offer(2000)], false);
    push_list(&s, vec![configuration()], false);
    s.push_http_response(200, r#"{"url":"https://billing.stripe.com/p/session/new"}"#);
    let response = open(&s).unwrap();
    assert!(response.body.contains("/session/new"));
    let requests = s.http_requests.borrow();
    assert_ne!(requests[1]["headers"], requests[4]["headers"]);
    assert!(requests[4]["body"]
        .as_str()
        .unwrap()
        .contains("configuration=bpc_offer"));
}
