use super::*;
use crate::ids;

fn promotion(_s: &FakeSeams, coupon: Value) -> Value {
    json!({"has_more":false,"data":[{"id":"promo_conor","code":"conor","active":true,"livemode":false,
        "customer":null,"expires_at":null,"restrictions":{"first_time_transaction":false},"coupon":coupon}]})
}
fn coupon() -> Value {
    json!({"id":"cedros_invite_100-conor", "valid":true,"livemode":false,
        "duration":"forever", "percent_off":100,"amount_off":null,"applies_to":null})
}
fn preview(provider: impl FnOnce(&FakeSeams) -> Value) -> (FakeSeams, RouteResponse, Value) {
    let s = setup();
    seed_catalog(&s);
    s.secret_set(ids::SECRET_STRIPE_KEY, "fixture-not-a-real-secret")
        .unwrap();
    let target = json!({"scope":{"organizationId":"example-org-a","siteId":null},"baseSubscriptionId":"example-base-subscription"});
    delegation(&s);
    scope(&s, &target);
    let offers = handle(&s, &request("capacity.offers", target.clone(), None, false));
    assert_eq!(offers.status, 200, "{}", offers.body);
    let offers: Value = serde_json::from_str(&offers.body).unwrap();
    let offer = &offers["offers"][0];
    let command = json!({"target":target,"offerId":offer["offerId"],"offerVersion":offer["offerVersion"],"quantity":3,"couponCode":"conor"});
    delegation(&s);
    scope(&s, &target);
    s.push_http_response(200,&json!({"id":"price_sites","product":"prod_sites","active":true,"livemode":false,
        "unit_amount":offer["terms"]["pricePerItemMinor"],"currency":offer["terms"]["currency"].as_str().unwrap().to_ascii_lowercase(),
        "recurring":{"interval":offer["terms"]["billingInterval"],"interval_count":1,"usage_type":"licensed"},
        "billing_scheme":"per_unit","tax_behavior":"exclusive"}).to_string());
    s.push_http_response(200,r#"{"id":"cus_org","livemode":false,"balance":0,"discount":null,"tax_exempt":"none","metadata":{"capacityOrganizationId":"example-org-a","capacityPayInstallationId":"example-pay-installation"}}"#);
    s.push_http_response(200, &provider(&s).to_string());
    let response = handle(
        &s,
        &request(
            "capacity.preview",
            command.clone(),
            Some("coupon-quote"),
            false,
        ),
    );
    (s, response, command)
}

#[test]
fn site_quote_uses_entered_coupon_and_replays_without_repricing() {
    let (s, response, command) = preview(|s| promotion(s, coupon()));
    assert_eq!(response.status, 201, "{}", response.body);
    let snap: Value = serde_json::from_str(&response.body).unwrap();
    assert_eq!(snap["quote"]["totalDueMinor"], 0);
    assert!(s.http_requests.borrow().last().unwrap()["url"]
        .as_str()
        .unwrap()
        .contains("expand%5B%5D=data.coupon.applies_to"));
    assert_eq!(snap["quote"]["renewalTotalMinor"], 0);
    assert_eq!(
        snap["quote"]["capacityIncrease"]["amount"],
        snap["quote"]["binding"]["terms"]["allowancePerItem"]
            .as_u64()
            .unwrap()
            * 3
    );
    let saved = purchase::quote(&s, snap["quote"]["quoteId"].as_str().unwrap()).unwrap();
    assert_eq!(
        saved.payload["data"]["material"]["selectedDiscount"]["couponId"],
        coupon()["id"]
    );
    delegation(&s);
    scope(&s, &command["target"]);
    let replay = handle(
        &s,
        &request("capacity.preview", command, Some("coupon-quote"), false),
    );
    assert_eq!(replay.status, 200, "{}", replay.body);
    assert_eq!(replay.body, response.body);
    assert_eq!(s.http_requests.borrow().len(), 3);
}

#[test]
fn quotes_support_partial_and_fixed_amount_coupons_and_no_discount() {
    for (pct, off) in [
        (json!(25), Value::Null),
        (json!(12.5), Value::Null),
        (Value::Null, json!(100)),
    ] {
        let (s, response, _) = preview(|s| {
            let mut c = coupon();
            c["percent_off"] = pct.clone();
            c["amount_off"] = off.clone();
            c["currency"] = "usd".into();
            promotion(s, c)
        });
        assert_eq!(response.status, 201, "{}", response.body);
        let snap: Value = serde_json::from_str(&response.body).unwrap();
        let gross = snap["quote"]["binding"]["terms"]["pricePerItemMinor"]
            .as_u64()
            .unwrap()
            * 3;
        let saved = purchase::quote(&s, snap["quote"]["quoteId"].as_str().unwrap()).unwrap();
        let d: discount::Discount =
            serde_json::from_value(saved.payload["data"]["material"]["selectedDiscount"].clone())
                .unwrap();
        assert_eq!(snap["quote"]["subtotalMinor"], d.subtotal(gross).unwrap());
        assert_eq!(
            snap["quote"]["renewalTotalMinor"],
            d.subtotal(gross).unwrap()
        );
    }
}

#[test]
fn coupons_cannot_cross_owner_environment_product_scope_or_remaining_term() {
    for mutation in [
        "customer",
        "environment",
        "product",
        "term",
        "valid",
        "stacked",
        "unexpanded",
        "missing",
        "expired",
        "first_transaction",
        "minimum",
        "wrong_code",
    ] {
        let (s, response, _) = preview(|s| {
            let mut sub = promotion(s, coupon());
            match mutation {
                "customer" => sub["data"][0]["customer"] = "cus_other".into(),
                "environment" => sub["data"][0]["livemode"] = true.into(),
                "product" => {
                    sub["data"][0]["coupon"]["applies_to"] = json!({"products":["prod_base_only"]})
                }
                "term" => sub["data"][0]["coupon"]["duration"] = "once".into(),
                "valid" => sub["data"][0]["coupon"]["valid"] = false.into(),
                "stacked" => sub["data"].as_array_mut().unwrap().push(json!({})),
                "unexpanded" => sub["data"][0]["coupon"] = json!("opaque"),
                "missing" => {
                    sub.as_object_mut().unwrap().remove("data");
                }
                "expired" => sub["data"][0]["expires_at"] = json!(s.now_unix_secs() - 1),
                "first_transaction" => {
                    sub["data"][0]["restrictions"]["first_time_transaction"] = json!(true)
                }
                "minimum" => {
                    sub["data"][0]["restrictions"] = json!({"first_time_transaction":false,"minimum_amount":999999,"minimum_amount_currency":"usd"})
                }
                "wrong_code" => sub["data"][0]["code"] = json!("other"),
                _ => unreachable!(),
            };
            sub
        });
        assert!(response.status >= 400, "{mutation}: {}", response.body);
        assert!(store::list(&s, "quote", None).unwrap().is_empty());
        assert!(!s
            .http_requests
            .borrow()
            .iter()
            .any(|r| r["method"] == "POST"));
    }
}

#[test]
fn discounted_dispatch_and_zero_dollar_paid_invoices_grant_sites_on_initial_and_renewal() {
    let (s, response, _) = preview(|s| promotion(s, coupon()));
    assert_eq!(response.status, 201, "{}", response.body);
    let snap: Value = serde_json::from_str(&response.body).unwrap();
    let quoted = purchase::quote(&s, snap["quote"]["quoteId"].as_str().unwrap()).unwrap();
    let id = accepted(&s);
    let row = purchase::read(&s, &id).unwrap();
    let mut value = row.payload.clone();
    value["data"]["snapshot"] = snap.clone();
    value["data"]["material"] = quoted.payload["data"]["material"].clone();
    value["data"]["providerSubscriptionId"] = Value::Null;
    s.seed(store::MODEL, &row.entry_key, value);
    s.push_http_response(
        200,
        &json!({"id":"sub_capacity","customer":"cus_org","livemode":false,
        "metadata":{"capacityPurchaseId":id,"capacityQuoteDigest":snap["quoteDigest"]}})
        .to_string(),
    );
    billing::dispatch(&s, &purchase::read(&s, &id).unwrap()).unwrap();
    let body = s.http_requests.borrow().last().unwrap()["body"]
        .as_str()
        .unwrap()
        .to_string();
    assert!(body.contains("discounts%5B0%5D%5Bpromotion_code%5D=promo_conor"));
    let gross = quoted.payload["data"]["material"]["initialSubtotalMinor"]
        .as_u64()
        .unwrap();
    assert!(body.contains(&format!(
        "add_invoice_items%5B0%5D%5Bprice_data%5D%5Bunit_amount%5D={gross}"
    )));
    for (kind, period) in [
        ("subscription_create", "in_initial"),
        ("subscription_cycle", "in_renewal"),
    ] {
        let mut inv = invoice(&s, &id, kind, period, true);
        inv["subtotal"] = gross.into();
        inv["total_discount_amounts"] = json!([{"amount":gross}]);
        inv["payment_intent"] = Value::Null;
        if kind == "subscription_cycle" {
            let end = wire::stamp(&snap["quote"], "paidThrough").unwrap();
            inv["lines"]["data"][0]["period"] = json!({"start":end,"end":end+30*86400});
        }
        let row = purchase::read(&s, &id).unwrap();
        let mut invalid = inv.clone();
        invalid["total_discount_amounts"][0]["amount"] = json!(gross - 1);
        assert!(grants::invoice(&s, &row, &invalid, None, None).is_err());
        invalid = inv.clone();
        invalid["paid_out_of_band"] = true.into();
        assert!(grants::invoice(&s, &row, &invalid, None, None).is_err());
        grants::invoice(&s, &row, &inv, None, None).unwrap();
    }
    let row = purchase::read(&s, &id).unwrap();
    assert_eq!(row.payload["data"]["grants"].as_array().unwrap().len(), 2);
    assert!(row.payload["data"]["grants"]
        .as_array()
        .unwrap()
        .iter()
        .all(
            |g| g["allowance"] == snap["quote"]["capacityIncrease"]["amount"]
                && g["state"] == "active"
        ));
}

#[test]
fn invalid_coupon_message_survives_the_real_transport_without_provider_details() {
    let (_, response, _) = preview(|_| json!({"has_more":false,"data":[]}));
    assert_eq!(response.status, 422);
    let body: Value = serde_json::from_str(&response.body).unwrap();
    assert_eq!(body["error"]["message"], discount::INVALID_COUPON_MESSAGE);
    assert!(!response.body.contains("secret"));
}

#[test]
fn entered_coupon_requires_expanded_product_scope_before_quote_or_charge() {
    let (s, response, _) = preview(|s| {
        let mut c = coupon();
        c.as_object_mut().unwrap().remove("applies_to");
        promotion(s, c)
    });
    assert_eq!(response.status, 503, "{}", response.body);
    assert!(s
        .http_requests
        .borrow()
        .iter()
        .all(|r| r["method"] == "GET"));
}
