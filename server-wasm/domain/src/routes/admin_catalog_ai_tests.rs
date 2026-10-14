use serde_json::{json, Value};

use crate::fake::FakeSeams;
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};

#[test]
fn capacity_activation_status_reports_gates_without_billing_identifiers() {
    let seams = FakeSeams::new();
    seams.set_setting("stripe.mode", "\"live\"");
    seams.set_setting("stripe.enabled", "true");
    seams.set_setting(
        crate::capacity::config::SETTING,
        &json!({
            "payInstallationId":"private-install", "environment":"live",
            "salesEnabled":true, "jointActivationVerified":true,
            "stripePortalConfigurationId":"bpc_private",
            "portalOrigin":"https://portal.example", "recoveryPath":"/upgrade",
            "organizations":{
                "private-org":{
                    "stripeCustomerId":"cus_private", "baseSubscriptionIds":["sub_private"],
                    "commercialVerified":true, "runtimeReady":true, "accountingVersion":2
                }
            }
        })
        .to_string(),
    );
    let response = call(
        &seams,
        capability_request(
            ids::ROUTE_ADMIN_CAPACITY_ACTIVATION_STATUS,
            "POST",
            "/extensions/cedros-pay/admin/capacity/activation/status",
            json!({}),
        ),
    );
    assert_eq!(response.status, 200, "{}", response.body);
    let status = response_body(&response);
    assert_eq!(status["stripeMode"], "live");
    assert_eq!(status["capacityLoadable"], true);
    assert_eq!(status["readyOrganizationCount"], 1);
    assert!(!response.body.contains("private-org"));
    assert!(!response.body.contains("cus_private"));
    assert!(!response.body.contains("private-install"));
}

#[test]
fn capacity_activation_status_fails_closed_for_absent_config_and_extra_input() {
    let seams = FakeSeams::new();
    let request = || {
        capability_request(
            ids::ROUTE_ADMIN_CAPACITY_ACTIVATION_STATUS,
            "POST",
            "/extensions/cedros-pay/admin/capacity/activation/status",
            json!({}),
        )
    };
    let response = call(&seams, request());
    assert_eq!(response.status, 200, "{}", response.body);
    let status = response_body(&response);
    assert_eq!(status["capacityConfigurationPresent"], false);
    assert_eq!(status["capacityLoadable"], false);
    assert_eq!(status["readyOrganizationCount"], 0);

    let mut extra = request();
    extra.body = json!({"organizationId":"private-org"}).to_string();
    assert_eq!(call(&seams, extra).status, 400);
}

#[test]
fn capacity_tax_readiness_reports_tax_code_gap_without_private_stripe_data() {
    let seams = FakeSeams::new();
    seams.set_setting("stripe.mode", "\"live\"");
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_live_private");
    seams.seed(
        ids::MODEL_CATALOG,
        "cedros-addon-sites",
        json!({
            "stableHandle":"cedros-addon-sites", "productType":"capacityAddOn",
            "stripeProductId":"prod_sites", "status":"draft"
        }),
    );
    seams.push_http_response(
        200,
        &json!({
            "object":"tax.settings", "livemode":true, "status":"active",
            "defaults":{"tax_code":"txcd_10000000","tax_behavior":"exclusive"}
        })
        .to_string(),
    );
    seams.push_http_response(200, &json!({
        "data":[{"object":"tax.registration","livemode":true,"status":"active"}],"has_more":false
    }).to_string());
    seams.push_http_response(
        200,
        &json!({
            "id":"prod_sites", "livemode":true, "tax_code":null
        })
        .to_string(),
    );
    let response = call(
        &seams,
        capability_request(
            ids::ROUTE_ADMIN_CAPACITY_TAX_READINESS,
            "POST",
            "/extensions/cedros-pay/admin/capacity/tax/readiness",
            json!({}),
        ),
    );
    assert_eq!(response.status, 200, "{}", response.body);
    let readiness = response_body(&response);
    assert_eq!(readiness["taxSettingsStatus"], "active");
    assert_eq!(readiness["activeRegistrationCount"], 1);
    assert_eq!(
        readiness["linkedAddOnMissingTaxCodeHandles"],
        json!(["cedros-addon-sites"])
    );
    assert!(!response.body.contains("sk_live_private"));
    assert!(!response.body.contains("prod_sites"));
    assert_eq!(seams.http_requests.borrow().len(), 3);
}

#[test]
fn capacity_tax_readiness_rejects_provider_mode_mismatch_and_extra_input() {
    let seams = FakeSeams::new();
    seams.set_setting("stripe.mode", "\"live\"");
    seams.set_secret(ids::SECRET_STRIPE_KEY, "sk_live_private");
    seams.push_http_response(
        200,
        &json!({
            "object":"tax.settings", "livemode":false, "status":"active",
            "defaults":{"tax_code":"txcd_10000000","tax_behavior":"exclusive"}
        })
        .to_string(),
    );
    let request = || {
        capability_request(
            ids::ROUTE_ADMIN_CAPACITY_TAX_READINESS,
            "POST",
            "/extensions/cedros-pay/admin/capacity/tax/readiness",
            json!({}),
        )
    };
    assert_eq!(call(&seams, request()).status, 503);
    let mut extra = request();
    extra.body = json!({"includeCustomerIds":true}).to_string();
    assert_eq!(call(&seams, extra).status, 400);
}

fn request(route_id: &str, method: &str, path: &str, body: Value) -> RouteRequest {
    RouteRequest {
        route_id: route_id.into(),
        method: method.into(),
        path: path.into(),
        body: body.to_string(),
        context_json: json!({
            "authenticated": true,
            "systemAdmin": true,
            "csrfVerified": true,
            "permissionClaims": [ids::ROUTE_ADMIN]
        })
        .to_string(),
        ..Default::default()
    }
}

fn capability_request(route_id: &str, method: &str, path: &str, body: Value) -> RouteRequest {
    RouteRequest {
        route_id: route_id.into(),
        method: method.into(),
        path: path.into(),
        body: body.to_string(),
        context_json: json!({
            "authenticated": true,
            "csrfVerified": false,
            "authScheme": "bearer-token",
            "permissionClaims": ["data:settings:read"],
            "capabilityClaims": [route_id]
        })
        .to_string(),
        ..Default::default()
    }
}

fn call(seams: &FakeSeams, request: RouteRequest) -> RouteResponse {
    crate::router::handle_route(seams, request)
}

fn response_body(response: &RouteResponse) -> Value {
    serde_json::from_str(&response.body).expect("JSON response")
}

fn draft_product(handle: &str, display_name: &str) -> Value {
    json!({
        "product": {
            "stableHandle": handle,
            "displayName": display_name,
            "description": "One primary operator.",
            "status": "draft",
            "public": false,
            "purchasable": false,
            "productType": "subscription",
            "metadata": {"accountModel": "individual"}
        }
    })
}

fn monthly_price(amount: i64) -> Value {
    json!({
        "productHandle": "cedros-individual",
        "price": {
            "stableHandle": "monthly",
            "unitAmountCents": amount,
            "currency": "USD",
            "billingInterval": "month",
            "billingIntervalCount": 1,
            "status": "active",
            "public": true,
            "purchasable": true,
            "trialDays": 3,
            "metadata": {"billingPeriod": "monthly"}
        }
    })
}

fn create_active_program(seams: &FakeSeams, handle: &str, program: &str) {
    let response = call(
        seams,
        request(
            ids::ROUTE_ADMIN_PROGRAM_ENTITLEMENT_UPSERT,
            "PUT",
            "/admin/catalog/program-entitlements/upsert",
            json!({
                "entitlement": {
                    "stableHandle": handle,
                    "displayName": "Approved Program",
                    "program": program,
                    "status": "active",
                    "monthlyPriceCents": 1_900,
                    "annualPriceCents": 18_000
                }
            }),
        ),
    );
    assert_eq!(response.status, 200, "{}", response.body);
}

#[test]
fn product_and_price_upserts_are_idempotent_and_read_back_metadata() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");

    let create = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT,
            "PUT",
            "/admin/catalog/products/upsert",
            draft_product("cedros-individual", "Individual"),
        ),
    );
    assert_eq!(create.status, 200, "{}", create.body);
    assert_eq!(response_body(&create)["created"], true);

    let first_price = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_PRICE_UPSERT,
            "PUT",
            "/admin/catalog/prices/upsert",
            monthly_price(2_900),
        ),
    );
    assert_eq!(first_price.status, 200, "{}", first_price.body);
    let price_id = response_body(&first_price)["priceId"]
        .as_str()
        .expect("price id")
        .to_string();

    let update_price = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_PRICE_UPSERT,
            "PUT",
            "/admin/catalog/prices/upsert",
            monthly_price(3_100),
        ),
    );
    assert_eq!(update_price.status, 200, "{}", update_price.body);
    assert_eq!(response_body(&update_price)["created"], false);
    assert_eq!(response_body(&update_price)["priceId"], price_id);

    let mut active = draft_product("cedros-individual", "Individual");
    active["product"]["status"] = json!("active");
    active["product"]["public"] = json!(true);
    active["product"]["purchasable"] = json!(true);
    let activate = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT,
            "PUT",
            "/admin/catalog/products/upsert",
            active,
        ),
    );
    assert_eq!(activate.status, 200, "{}", activate.body);
    assert_eq!(response_body(&activate)["created"], false);

    let query = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_RECORDS_QUERY,
            "POST",
            "/admin/catalog/records/query",
            json!({"stableHandle":"cedros-individual","includeArchived":true}),
        ),
    );
    assert_eq!(query.status, 200, "{}", query.body);
    let body = response_body(&query);
    assert_eq!(body["count"], 1);
    assert_eq!(body["records"][0]["metadata"]["accountModel"], "individual");
    assert_eq!(body["records"][0]["prices"].as_array().unwrap().len(), 1);
    assert_eq!(body["records"][0]["prices"][0]["unitAmountCents"], 3_100);
}

#[test]
fn catalog_query_preserves_active_private_offer_identity_and_terms() {
    let seams = FakeSeams::new();
    seams.seed(
        ids::MODEL_CATALOG,
        "private-service",
        json!({
            "stableHandle": "private-service",
            "recordType": "product",
            "status": "active",
            "active": true,
            "public": false,
            "purchasable": true,
            "prices": [{
                "id": "offer-annual",
                "stableHandle": "annual",
                "status": "active",
                "active": true,
                "public": false,
                "purchasable": true,
                "unitAmountCents": 7_250,
                "currency": "USD",
                "billingInterval": "year",
                "billingIntervalCount": 1
            }]
        }),
    );

    let response = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_RECORDS_QUERY,
            "POST",
            "/admin/catalog/records/query",
            json!({"stableHandle":"private-service"}),
        ),
    );
    assert_eq!(response.status, 200, "{}", response.body);
    let body = response_body(&response);
    let product = &body["records"][0];
    let offer = &product["prices"][0];
    assert_eq!(product["id"], "private-service");
    assert_eq!(product["active"], true);
    assert_eq!(product["public"], false);
    assert_eq!(offer["id"], "offer-annual");
    assert_eq!(offer["unitAmountCents"], 7_250);
    assert_eq!(offer["currency"], "USD");
    assert_eq!(offer["active"], true);
    assert_eq!(offer["billingInterval"], "year");
    assert_eq!(offer["billingIntervalCount"], 1);
}

#[test]
fn price_upsert_clears_existing_stripe_price_id_when_terms_change() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");

    let create = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT,
            "PUT",
            "/admin/catalog/products/upsert",
            draft_product("cedros-individual", "Individual"),
        ),
    );
    assert_eq!(create.status, 200, "{}", create.body);

    let mut initial_price = monthly_price(2_900);
    initial_price["price"]["stripePriceId"] = json!("price_old_2900");
    let first_price = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_PRICE_UPSERT,
            "PUT",
            "/admin/catalog/prices/upsert",
            initial_price,
        ),
    );
    assert_eq!(first_price.status, 200, "{}", first_price.body);
    assert_eq!(
        response_body(&first_price)["price"]["stripePriceId"],
        "price_old_2900"
    );

    let update_price = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_PRICE_UPSERT,
            "PUT",
            "/admin/catalog/prices/upsert",
            monthly_price(3_100),
        ),
    );
    assert_eq!(update_price.status, 200, "{}", update_price.body);
    let updated = response_body(&update_price);
    assert_eq!(updated["price"]["unitAmountCents"], 3_100);
    assert!(updated["price"].get("stripePriceId").is_some());
    assert!(updated["price"]["stripePriceId"].is_null());
}

#[test]
fn price_upsert_preserves_existing_stripe_price_id_when_terms_match() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");

    let create = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT,
            "PUT",
            "/admin/catalog/products/upsert",
            draft_product("cedros-individual", "Individual"),
        ),
    );
    assert_eq!(create.status, 200, "{}", create.body);

    let mut initial_price = monthly_price(2_900);
    initial_price["price"]["stripePriceId"] = json!("price_current_2900");
    let first_price = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_PRICE_UPSERT,
            "PUT",
            "/admin/catalog/prices/upsert",
            initial_price,
        ),
    );
    assert_eq!(first_price.status, 200, "{}", first_price.body);

    let mut update = monthly_price(2_900);
    update["price"]["public"] = json!(false);
    let update_price = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_PRICE_UPSERT,
            "PUT",
            "/admin/catalog/prices/upsert",
            update,
        ),
    );
    assert_eq!(update_price.status, 200, "{}", update_price.body);
    assert_eq!(
        response_body(&update_price)["price"]["stripePriceId"],
        "price_current_2900"
    );
}

#[test]
fn exact_host_attested_capability_can_read_and_write_only_its_route() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");

    let create = call(
        &seams,
        capability_request(
            ids::ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT,
            "PUT",
            "/admin/catalog/products/upsert",
            draft_product("cedros-capability-test", "Capability Test"),
        ),
    );
    assert_eq!(create.status, 200, "{}", create.body);

    let query = call(
        &seams,
        capability_request(
            ids::ROUTE_ADMIN_CATALOG_RECORDS_QUERY,
            "POST",
            "/admin/catalog/records/query",
            json!({"stableHandle":"cedros-capability-test"}),
        ),
    );
    assert_eq!(query.status, 200, "{}", query.body);
    assert_eq!(response_body(&query)["count"], 1);

    let mut wrong_claim = capability_request(
        ids::ROUTE_ADMIN_CATALOG_RECORDS_QUERY,
        "POST",
        "/admin/catalog/records/query",
        json!({}),
    );
    wrong_claim.context_json = json!({
        "authenticated": true,
        "csrfVerified": true,
        "authScheme": "bearer-token",
        "capabilityClaims": [ids::ROUTE_ADMIN_CATALOG_PRICE_UPSERT]
    })
    .to_string();
    assert_eq!(call(&seams, wrong_claim).status, 403);
}

#[test]
fn product_active_and_delete_capabilities_match_admin_catalog_actions() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    let mut active_product = draft_product("mcp-catalog-product", "MCP Catalog Product");
    active_product["product"]["status"] = json!("active");

    let create = call(
        &seams,
        capability_request(
            ids::ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT,
            "PUT",
            "/admin/catalog/products/upsert",
            active_product,
        ),
    );
    assert_eq!(create.status, 200, "{}", create.body);

    let mut wrong_claim = capability_request(
        ids::ROUTE_ADMIN_CATALOG_PRODUCT_ACTIVE_SET,
        "POST",
        "/admin/catalog/products/active",
        json!({"productId":"mcp-catalog-product","active":false}),
    );
    wrong_claim.context_json = json!({
        "authenticated": true,
        "csrfVerified": false,
        "authScheme": "bearer-token",
        "capabilityClaims": [ids::ROUTE_ADMIN_CATALOG_PRODUCT_DELETE]
    })
    .to_string();
    assert_eq!(call(&seams, wrong_claim).status, 403);
    assert_eq!(
        seams
            .get_entry(ids::MODEL_CATALOG, "mcp-catalog-product")
            .unwrap()["active"],
        true
    );

    let deactivate = call(
        &seams,
        capability_request(
            ids::ROUTE_ADMIN_CATALOG_PRODUCT_ACTIVE_SET,
            "POST",
            "/admin/catalog/products/active",
            json!({"productId":"mcp-catalog-product","active":false}),
        ),
    );
    assert_eq!(deactivate.status, 200, "{}", deactivate.body);
    assert_eq!(response_body(&deactivate)["active"], false);
    assert_eq!(response_body(&deactivate)["product"]["active"], false);
    assert_eq!(
        response_body(&deactivate)["product"]["title"],
        "MCP Catalog Product"
    );

    let unconfirmed = call(
        &seams,
        capability_request(
            ids::ROUTE_ADMIN_CATALOG_PRODUCT_DELETE,
            "POST",
            "/admin/catalog/products/delete",
            json!({"productId":"mcp-catalog-product","confirmed":false}),
        ),
    );
    assert_eq!(unconfirmed.status, 400, "{}", unconfirmed.body);
    assert!(seams
        .get_entry(ids::MODEL_CATALOG, "mcp-catalog-product")
        .is_some());

    let delete = call(
        &seams,
        capability_request(
            ids::ROUTE_ADMIN_CATALOG_PRODUCT_DELETE,
            "POST",
            "/admin/catalog/products/delete",
            json!({"productId":"mcp-catalog-product","confirmed":true}),
        ),
    );
    assert_eq!(delete.status, 200, "{}", delete.body);
    assert_eq!(response_body(&delete)["deleted"], true);
    assert!(seams
        .get_entry(ids::MODEL_CATALOG, "mcp-catalog-product")
        .is_none());

    let replay = call(
        &seams,
        capability_request(
            ids::ROUTE_ADMIN_CATALOG_PRODUCT_DELETE,
            "POST",
            "/admin/catalog/products/delete",
            json!({"productId":"mcp-catalog-product","confirmed":true}),
        ),
    );
    assert_eq!(replay.status, 200, "{}", replay.body);
    assert_eq!(response_body(&replay)["deleted"], false);
}

#[test]
fn public_product_requires_a_verified_price() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    let mut active = draft_product("cedros-business", "Business");
    active["product"]["status"] = json!("active");
    active["product"]["public"] = json!(true);
    active["product"]["purchasable"] = json!(true);

    let response = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT,
            "PUT",
            "/admin/catalog/products/upsert",
            active,
        ),
    );

    assert_eq!(response.status, 422, "{}", response.body);
    assert!(seams
        .get_entry(ids::MODEL_CATALOG, "cedros-business")
        .is_none());
}

#[test]
fn draft_program_entitlement_enforces_separate_identity_and_referral_purposes() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    let response = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_PROGRAM_ENTITLEMENT_UPSERT,
            "PUT",
            "/admin/catalog/program-entitlements/upsert",
            json!({
                "entitlement": {
                    "stableHandle": "cedros-program-affiliate",
                    "displayName": "Affiliate Program",
                    "program": "affiliate",
                    "status": "draft",
                    "metadata": {"approvalRequired": true}
                }
            }),
        ),
    );

    assert_eq!(response.status, 200, "{}", response.body);
    let record = &response_body(&response)["record"];
    assert_eq!(record["public"], false);
    assert_eq!(record["purchasable"], false);
    assert_eq!(record["pricing"]["configured"], false);
    assert_eq!(
        record["activation"]["activationCodePurpose"],
        "programEntitlementActivation"
    );
    assert_eq!(
        record["activation"]["referralCodePurpose"],
        "customerReferralAttribution"
    );
    assert_ne!(
        record["activation"]["activationCodePurpose"],
        record["activation"]["referralCodePurpose"]
    );
}

#[test]
fn active_program_entitlement_records_interval_prices_and_affiliate_renewal_policy() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    let response = call(
        &seams,
        capability_request(
            ids::ROUTE_ADMIN_PROGRAM_ENTITLEMENT_UPSERT,
            "PUT",
            "/admin/catalog/program-entitlements/upsert",
            json!({
                "entitlement": {
                    "stableHandle": "cedros-program-affiliate",
                    "displayName": "Affiliate Program",
                    "program": "affiliate",
                    "status": "active",
                    "monthlyPriceCents": 1_900,
                    "annualPriceCents": 18_000,
                    "renewalRequired": true,
                    "minimumQualifiedSalesPerMonth": 1,
                    "fallbackPlanHandle": "cedros-individual"
                }
            }),
        ),
    );

    assert_eq!(response.status, 200, "{}", response.body);
    let record = &response_body(&response)["record"];
    assert_eq!(record["pricing"]["configured"], true);
    assert_eq!(record["pricing"]["monthly"]["unitAmountCents"], 1_900);
    assert_eq!(record["pricing"]["annual"]["unitAmountCents"], 18_000);
    assert_eq!(record["pricing"]["annual"]["monthlyEquivalentCents"], 1_500);
    assert_eq!(
        record["activation"]["eligibilityPolicy"]["minimumQualifiedSales"],
        1
    );
    assert_eq!(
        record["activation"]["eligibilityPolicy"]["fallbackPlanHandle"],
        "cedros-individual"
    );
}

#[test]
fn program_prices_and_affiliate_policy_fail_closed_when_incomplete_or_misapplied() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    for entitlement in [
        json!({
            "stableHandle": "cedros-program-ambassador",
            "displayName": "Ambassador Program",
            "program": "ambassador",
            "status": "active",
            "monthlyPriceCents": 500
        }),
        json!({
            "stableHandle": "cedros-program-ambassador",
            "displayName": "Ambassador Program",
            "program": "ambassador",
            "status": "active",
            "monthlyPriceCents": 500,
            "annualPriceCents": 4_800,
            "renewalRequired": true,
            "minimumQualifiedSalesPerMonth": 1,
            "fallbackPlanHandle": "cedros-individual"
        }),
        json!({
            "stableHandle": "cedros-program-affiliate",
            "displayName": "Affiliate Program",
            "program": "affiliate",
            "status": "active",
            "monthlyPriceCents": 1_900,
            "annualPriceCents": 18_000,
            "renewalRequired": false,
            "minimumQualifiedSalesPerMonth": 1,
            "fallbackPlanHandle": "cedros-individual"
        }),
    ] {
        let response = call(
            &seams,
            capability_request(
                ids::ROUTE_ADMIN_PROGRAM_ENTITLEMENT_UPSERT,
                "PUT",
                "/admin/catalog/program-entitlements/upsert",
                json!({"entitlement": entitlement}),
            ),
        );
        assert_eq!(response.status, 422, "{}", response.body);
    }
}

#[test]
fn program_invites_are_idempotent_redacted_and_revocable() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    create_active_program(&seams, "cedros-program-ambassador", "ambassador");
    let body = json!({
        "invite": {
            "stableHandle": "ambassador-invite-1",
            "programHandle": "cedros-program-ambassador",
            "subjectId": "user-123",
            "activationCodeSha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            "status": "active",
            "expiresAt": "2027-01-01T00:00:00Z"
        }
    });

    let create = call(
        &seams,
        capability_request(
            ids::ROUTE_ADMIN_PROGRAM_INVITE_UPSERT,
            "PUT",
            "/admin/catalog/program-invites/upsert",
            body.clone(),
        ),
    );
    assert_eq!(create.status, 200, "{}", create.body);
    let created = response_body(&create);
    assert_eq!(created["created"], true);
    assert_eq!(created["recordId"], "ambassador-invite-1");
    assert_eq!(created["record"]["activationCodeConfigured"], true);
    assert!(created["record"].get("activationCodeSha256").is_none());

    let replay = call(
        &seams,
        capability_request(
            ids::ROUTE_ADMIN_PROGRAM_INVITE_UPSERT,
            "PUT",
            "/admin/catalog/program-invites/upsert",
            body,
        ),
    );
    assert_eq!(replay.status, 200, "{}", replay.body);
    assert_eq!(response_body(&replay)["created"], false);
    assert_eq!(response_body(&replay)["recordId"], created["recordId"]);

    let transfer = call(
        &seams,
        capability_request(
            ids::ROUTE_ADMIN_PROGRAM_INVITE_UPSERT,
            "PUT",
            "/admin/catalog/program-invites/upsert",
            json!({
                "invite": {
                    "stableHandle": "ambassador-invite-1",
                    "programHandle": "cedros-program-ambassador",
                    "subjectId": "user-456",
                    "status": "active"
                }
            }),
        ),
    );
    assert_eq!(transfer.status, 409, "{}", transfer.body);

    let admin_redeem = call(
        &seams,
        capability_request(
            ids::ROUTE_ADMIN_PROGRAM_INVITE_UPSERT,
            "PUT",
            "/admin/catalog/program-invites/upsert",
            json!({
                "invite": {
                    "stableHandle": "ambassador-invite-1",
                    "programHandle": "cedros-program-ambassador",
                    "subjectId": "user-123",
                    "status": "redeemed"
                }
            }),
        ),
    );
    assert_eq!(admin_redeem.status, 422, "{}", admin_redeem.body);

    let revoke = call(
        &seams,
        capability_request(
            ids::ROUTE_ADMIN_PROGRAM_INVITE_UPSERT,
            "PUT",
            "/admin/catalog/program-invites/upsert",
            json!({
                "invite": {
                    "stableHandle": "ambassador-invite-1",
                    "programHandle": "cedros-program-ambassador",
                    "subjectId": "user-123",
                    "status": "revoked"
                }
            }),
        ),
    );
    assert_eq!(revoke.status, 200, "{}", revoke.body);
    assert_eq!(response_body(&revoke)["record"]["status"], "revoked");
    assert_eq!(
        seams
            .get_entry(ids::MODEL_PROGRAM_ACCESS, "ambassador-invite-1")
            .unwrap()["activationCodeSha256"],
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    );
}

#[test]
fn program_membership_admin_route_uses_one_stable_subject_record() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    create_active_program(&seams, "cedros-program-affiliate", "affiliate");
    create_active_program(&seams, "cedros-program-ambassador", "ambassador");
    let active = json!({
        "membership": {
            "subjectId": "affiliate-user-1",
            "programHandle": "cedros-program-affiliate",
            "status": "active",
            "transitionPlanHandle": "cedros-individual"
        }
    });

    let create = call(
        &seams,
        capability_request(
            ids::ROUTE_ADMIN_PROGRAM_MEMBERSHIP_UPSERT,
            "PUT",
            "/admin/catalog/program-memberships/upsert",
            active,
        ),
    );
    assert_eq!(create.status, 200, "{}", create.body);
    let record_id = response_body(&create)["recordId"].clone();
    assert_eq!(response_body(&create)["record"]["active"], true);

    let stacked = call(
        &seams,
        capability_request(
            ids::ROUTE_ADMIN_PROGRAM_MEMBERSHIP_UPSERT,
            "PUT",
            "/admin/catalog/program-memberships/upsert",
            json!({
                "membership": {
                    "subjectId": "affiliate-user-1",
                    "programHandle": "cedros-program-ambassador",
                    "status": "active"
                }
            }),
        ),
    );
    assert_eq!(stacked.status, 409, "{}", stacked.body);

    let revoke = call(
        &seams,
        capability_request(
            ids::ROUTE_ADMIN_PROGRAM_MEMBERSHIP_UPSERT,
            "PUT",
            "/admin/catalog/program-memberships/upsert",
            json!({
                "membership": {
                    "subjectId": "affiliate-user-1",
                    "programHandle": "cedros-program-affiliate",
                    "status": "revoked",
                    "transitionPlanHandle": "cedros-individual"
                }
            }),
        ),
    );
    assert_eq!(revoke.status, 200, "{}", revoke.body);
    assert_eq!(response_body(&revoke)["created"], false);
    assert_eq!(response_body(&revoke)["recordId"], record_id);
    assert_eq!(response_body(&revoke)["record"]["active"], false);
    assert_eq!(response_body(&revoke)["record"]["status"], "revoked");
}

#[test]
fn program_access_admin_capabilities_reject_wrong_exact_route_claim() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    let mut wrong = capability_request(
        ids::ROUTE_ADMIN_PROGRAM_INVITE_UPSERT,
        "PUT",
        "/admin/catalog/program-invites/upsert",
        json!({}),
    );
    wrong.context_json = json!({
        "authenticated": true,
        "csrfVerified": true,
        "authScheme": "bearer-token",
        "capabilityClaims": [ids::ROUTE_ADMIN_PROGRAM_MEMBERSHIP_UPSERT]
    })
    .to_string();

    assert_eq!(call(&seams, wrong).status, 403);
}

#[test]
fn active_program_without_approved_price_is_rejected_without_a_record() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    let response = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_PROGRAM_ENTITLEMENT_UPSERT,
            "PUT",
            "/admin/catalog/program-entitlements/upsert",
            json!({
                "entitlement": {
                    "stableHandle": "cedros-program-ambassador",
                    "displayName": "Ambassador Program",
                    "program": "ambassador",
                    "status": "active"
                }
            }),
        ),
    );

    assert_eq!(response.status, 422, "{}", response.body);
    assert!(seams
        .get_entry(ids::MODEL_CATALOG, "cedros-program-ambassador")
        .is_none());
}

#[test]
fn duplicate_stable_handles_fail_closed() {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).expect("guarded policy fixture");
    seams.seed(
        ids::MODEL_CATALOG,
        "first-id",
        json!({"stableHandle":"duplicate-handle","recordType":"product","title":"First"}),
    );
    seams.seed(
        ids::MODEL_CATALOG,
        "second-id",
        json!({"stableHandle":"duplicate-handle","recordType":"product","title":"Second"}),
    );
    let response = call(
        &seams,
        request(
            ids::ROUTE_ADMIN_CATALOG_PRODUCT_UPSERT,
            "PUT",
            "/admin/catalog/products/upsert",
            draft_product("duplicate-handle", "Duplicate"),
        ),
    );

    assert_eq!(response.status, 409, "{}", response.body);
}

#[test]
fn stripe_and_x402_config_routes_are_bound_for_read_and_write() {
    let routes = crate::router::list_routes();
    for (route_id, method, path) in [
        (
            ids::ROUTE_ADMIN_CONFIG_STRIPE_GET,
            "GET",
            "/admin/config/stripe",
        ),
        (
            ids::ROUTE_ADMIN_CONFIG_STRIPE_UPDATE,
            "PUT",
            "/admin/config/stripe",
        ),
        (
            ids::ROUTE_ADMIN_CONFIG_X402_GET,
            "GET",
            "/admin/config/x402",
        ),
        (
            ids::ROUTE_ADMIN_CONFIG_X402_UPDATE,
            "PUT",
            "/admin/config/x402",
        ),
    ] {
        assert!(
            routes.iter().any(|route| {
                route.route_id == route_id && route.method == method && route.path == path
            }),
            "missing route binding {method} {path}"
        );
    }
}
