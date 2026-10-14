//! Exercises the actual Wasm exports and extension-services import. Synthetic
//! fixtures prove transport/persistence behavior, not installed commercial readiness.
use cedros_pay_extension_domain::guarded_policy;
use cedros_pay_extension_hostsim::{component_path, Sim};
use serde_json::{json, Value};
fn configure(sim: &Sim) {
    let mut s = sim.store();
    s.seed(guarded_policy::CONTROL_MODEL,guarded_policy::MARKER_KEY,json!({"schemaVersion":1,"capabilityId":guarded_policy::CAPABILITY_ID,"minCedrosDataVersion":guarded_policy::MIN_DATA_VERSION,"requestSchemaVersion":1,"hostCommit":guarded_policy::HOST_COMMIT,"models":guarded_policy::GUARDED_MODELS,"modelSetSha256":guarded_policy::MODEL_SET_SHA256,"policy":"guarded-only","active":true,"hostTimestamp":"2026-09-09T00:00:00Z"}));
    s.set_setting("stripe.mode", "test");
    s.set_setting("subscriptions.capacity_v1",&json!({"payInstallationId":"fixture-install","environment":"test","salesEnabled":false,"jointActivationVerified":false,"stripePortalConfigurationId":"bpc_fixture","portalOrigin":"https://portal.example","recoveryPath":"/upgrade","organizations":{"org-a":{"stripeCustomerId":"cus_org","baseSubscriptionIds":["base-a"],"commercialVerified":false,"runtimeReady":false}}}).to_string());
}
fn context(principal: &str, capability: &str, org: &str) -> String {
    json!({"authenticated":true,"principalId":principal,"actorId":principal,"authScheme":"extension-service","permissionClaims":[capability],"orgId":org}).to_string()
}
#[tokio::test(flavor = "current_thread")]
async fn packaged_offers_use_host_service_adapter_and_fail_closed_on_outage() {
    let sim = Sim::load(&component_path()).unwrap();
    configure(&sim);
    let target =
        json!({"scope":{"organizationId":"org-a","siteId":null},"baseSubscriptionId":"base-a"});
    {
        let mut s = sim.store();
        s.service_responses.push_back((200,json!({"contractVersion":"1.0.0","actingUserId":"buyer-a","organizationId":"org-a","payInstallationId":"fixture-install","environment":"test","authority":"Read","expiresAt":cedros_pay_extension_domain::time::iso8601(std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs() as i64+300)}).to_string()));
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        s.service_responses.push_back((200,json!({"contractVersion":"1.0.0","target":target,"buyerUserId":"buyer-a","payInstallationId":"fixture-install","environment":"test","authorized":true,"checkedAt":cedros_pay_extension_domain::time::iso8601(now)}).to_string()));
    }
    let body=json!({"contractVersion":"1.0.0","operationId":"capacity.offers","delegationId":"fixture-delegation","requestKey":null,"command":target}).to_string();
    let ctx = context("cedros-portal", "cedros-pay:capacity-offers-v1", "org-a");
    let (status, out) = sim
        .handle(
            "POST",
            "/extensions/cedros-pay/capacity/v1/offers",
            "cedros-pay:capacity-offers-v1",
            vec![],
            vec![],
            &body,
            &ctx,
        )
        .await
        .unwrap();
    assert_eq!(status, 200, "{out}");
    let value: Value = serde_json::from_str(&out).unwrap();
    assert_eq!(value["offers"].as_array().unwrap().len(), 4);
    assert!(value["offers"]
        .as_array()
        .unwrap()
        .iter()
        .all(|o| o["purchasable"] == false));
    {
        let s = sim.store();
        assert_eq!(s.service_requests.len(), 2);
        assert_eq!(s.service_requests[0]["targetExtensionId"], "cedros-data");
        assert_eq!(
            s.service_requests[0]["routeId"],
            "cedros-data:capacity-delegation-check-v1"
        );
        assert_eq!(
            s.service_requests[1]["path"],
            "/runtime/portal-capacity/v1/scope/check"
        );
        assert_eq!(s.http_fetch_calls, 0);
    }
    let (status, out) = sim
        .handle(
            "POST",
            "/extensions/cedros-pay/capacity/v1/offers",
            "cedros-pay:capacity-offers-v1",
            vec![],
            vec![],
            &body,
            &ctx,
        )
        .await
        .unwrap();
    assert_eq!(status, 503, "{out}");
    let (status, _) = sim
        .handle(
            "POST",
            "/extensions/cedros-pay/capacity/v1/offers",
            "cedros-pay:capacity-offers-v1",
            vec![],
            vec![],
            &body,
            "{}",
        )
        .await
        .unwrap();
    assert_eq!(status, 403);
}
#[tokio::test(flavor = "current_thread")]
async fn packaged_snapshot_is_durable_and_native_scope_is_required() {
    let sim = Sim::load(&component_path()).unwrap();
    configure(&sim);
    let body=json!({"contractVersion":"1.0.0","operationId":"capacity.grants.snapshot","delegationId":null,"requestKey":null,"command":{"organizationId":"org-a","cursor":null}}).to_string();
    let ctx = context(
        "cedros-data",
        "cedros-pay:capacity-grants-snapshot-v1",
        "org-a",
    );
    let (status, out) = sim
        .handle(
            "POST",
            "/extensions/cedros-pay/capacity/v1/grants/snapshot",
            "cedros-pay:capacity-grants-snapshot-v1",
            vec![],
            vec![],
            &body,
            &ctx,
        )
        .await
        .unwrap();
    assert_eq!(status, 200, "{out}");
    let value: Value = serde_json::from_str(&out).unwrap();
    assert_eq!(value["sourceRevision"], 0);
    assert_eq!(value["grants"], json!([]));
    assert_eq!(value["complete"], true);
    assert!(sim.store().service_requests.is_empty());
    assert!(sim.store().mutation_calls > 0);
    let bad = context(
        "cedros-data",
        "cedros-pay:capacity-grants-snapshot-v1",
        "org-b",
    );
    let (status, _) = sim
        .handle(
            "POST",
            "/extensions/cedros-pay/capacity/v1/grants/snapshot",
            "cedros-pay:capacity-grants-snapshot-v1",
            vec![],
            vec![],
            &body,
            &bad,
        )
        .await
        .unwrap();
    assert_eq!(status, 404);
    // All 17 exact public/internal IDs are exported from the compiled component.
    let routes = sim.list_routes().await.unwrap();
    assert_eq!(
        routes
            .iter()
            .filter(|r| r.0.starts_with("cedros-pay:capacity-"))
            .count(),
        17
    );
}

fn digest(value: &Value) -> String {
    use sha2::{Digest, Sha256};
    format!(
        "sha256:{:x}",
        Sha256::digest(serde_json::to_vec(value).unwrap())
    )
}
#[tokio::test(flavor = "current_thread")]
async fn packaged_purchase_replays_across_instances_and_keys_without_another_redemption() {
    let sim = Sim::load(&component_path()).unwrap();
    configure(&sim);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let iso = cedros_pay_extension_domain::time::iso8601;
    let fixtures: Value = serde_json::from_str(include_str!(
        "../../../docs/contracts/capacity-v1/fixtures/portal-usage-capacity-v1.fixtures.json"
    ))
    .unwrap();
    let mut quote = fixtures["fixtures"]
        .as_array()
        .unwrap()
        .iter()
        .find(|f| f["id"] == "immutable-full-quote")
        .unwrap()["value"]["quote"]
        .clone();
    quote["quoteId"] = "fixture-quote".into();
    quote["binding"]["payInstallationId"] = "fixture-install".into();
    quote["binding"]["buyerUserId"] = "buyer-a".into();
    quote["binding"]["scope"]["organizationId"] = "org-a".into();
    quote["binding"]["baseSubscriptionId"] = "base-a".into();
    quote["capacityIncrease"]["meter"]["scope"]["organizationId"] = "org-a".into();
    for field in ["createdAt", "effectiveAt"] {
        quote[field] = iso(now).into();
    }
    quote["expiresAt"] = iso(now + 300).into();
    quote["paidThrough"] = iso(now + 30 * 86400).into();
    quote["renewalAt"] = quote["paidThrough"].clone();
    quote["capacityIncrease"]["effectiveAt"] = quote["effectiveAt"].clone();
    quote["capacityIncrease"]["expiresAt"] = quote["paidThrough"].clone();
    let snapshot = json!({"quoteDigest":digest(&quote),"quote":quote});
    let quote_key = format!(
        "capacity:quote:{}",
        digest(&json!("fixture-quote")).trim_start_matches("sha256:")
    );
    let scope = json!({"payInstallationId":"fixture-install","environment":"test","organizationId":"org-a"});
    {
        let mut s = sim.store();
        s.set_setting("subscriptions.capacity_v1",&json!({"payInstallationId":"fixture-install","environment":"test","salesEnabled":true,"jointActivationVerified":true,"stripePortalConfigurationId":"bpc_fixture","portalOrigin":"https://portal.example","recoveryPath":"/upgrade","organizations":{"org-a":{"stripeCustomerId":"cus_org","baseSubscriptionIds":["base-a"],"commercialVerified":true,"runtimeReady":true}}}).to_string());
        s.seed(cedros_pay_extension_domain::ids::MODEL_SUBSCRIPTIONS,&quote_key,json!({"capacityRecordType":"quote","capacityScope":scope,"data":{"snapshot":snapshot,"material":{},"stripeCustomerId":"cus_org"}}));
    }
    let id = format!(
        "capp_{}",
        digest(&json!(["fixture-install", "test", "fixture-quote"])).trim_start_matches("sha256:")
    );
    let ctx = context("cedros-portal", "cedros-pay:capacity-purchase-v1", "org-a");
    for (index, key) in ["first-key", "first-key", "new-key"].iter().enumerate() {
        {
            let mut s = sim.store();
            s.service_responses.push_back((200,json!({"contractVersion":"1.0.0","actingUserId":"buyer-a","organizationId":"org-a","payInstallationId":"fixture-install","environment":"test","authority":"BillingManage","expiresAt":iso(now+300)}).to_string()));
            s.service_responses.push_back((200,json!({"contractVersion":"1.0.0","target":{"scope":{"organizationId":"org-a","siteId":null},"baseSubscriptionId":"base-a"},"buyerUserId":"buyer-a","payInstallationId":"fixture-install","environment":"test","authorized":true,"checkedAt":iso(now)}).to_string()));
            if index == 0 {
                s.service_responses.push_back((201,json!({"contractVersion":"1.0.0","authorizationId":"fixture-auth","purchaseId":id,"quoteId":"fixture-quote","quoteDigest":snapshot["quoteDigest"],"acceptedAt":iso(now),"replayed":false}).to_string()));
            }
        }
        let body=json!({"contractVersion":"1.0.0","operationId":"capacity.purchase","delegationId":"fixture-delegation","requestKey":key,"command":{"authorizationId":"fixture-auth","quoteId":"fixture-quote","quoteDigest":snapshot["quoteDigest"]}}).to_string();
        let (status, out) = sim
            .handle(
                "POST",
                "/extensions/cedros-pay/capacity/v1/purchase",
                "cedros-pay:capacity-purchase-v1",
                vec![],
                vec![],
                &body,
                &ctx,
            )
            .await
            .unwrap();
        assert_eq!(status, if index == 0 { 201 } else { 200 }, "{out}");
        let value: Value = serde_json::from_str(&out).unwrap();
        assert_eq!(value["purchaseId"], id);
        assert!(value["initialAttempt"].is_null());
    }
    let s = sim.store();
    assert_eq!(
        s.service_requests
            .iter()
            .filter(|r| r["routeId"] == "cedros-data:capacity-authorization-redeem-v1")
            .count(),
        1
    );
    assert_eq!(s.http_fetch_calls, 0);
}

#[tokio::test(flavor = "current_thread")]
async fn packaged_binding_is_native_complete_and_recoverable_without_data_callback() {
    let sim = Sim::load(&component_path()).unwrap();
    configure(&sim);
    let capability = "cedros-pay:capacity-binding-read-v1";
    let path = "/extensions/cedros-pay/capacity/v1/binding/read";
    let command = json!({"contractVersion":"1.0.0","operationId":"capacity.binding.read","delegationId":null,"requestKey":null,"command":{"organizationId":"org-a"}}).to_string();
    let ctx = context("cedros-data", capability, "org-a");
    let (status, _) = sim
        .handle("POST", path, capability, vec![], vec![], &command, &ctx)
        .await
        .unwrap();
    assert_eq!(status, 503); // Operator binding exists but its base record is unavailable.
    {
        let mut store = sim.store();
        store.set_setting("subscriptions.capacity_v1",&json!({"payInstallationId":"fixture-install","environment":"test","salesEnabled":false,"jointActivationVerified":false,"stripePortalConfigurationId":"bpc_fixture","portalOrigin":"https://portal.example","recoveryPath":"/upgrade","organizations":{"org-a":{"stripeCustomerId":"cus_org","baseSubscriptionIds":["base-a"],"baseCustomerRefs":{"base-a":"buyer-a"},"commercialVerified":false,"runtimeReady":false}}}).to_string());
        store.seed(
            "cedros-pay:catalog",
            "plan-a",
            json!({"productType":"subscription","title":"Existing base"}),
        );
        store.seed("cedros-pay:subscriptions","base-a",json!({"subscriptionId":"base-a","customerRef":"buyer-a","productId":"plan-a","status":"active","currentPeriodEnd":"2099-01-01T00:00:00Z"}));
    }
    let (status, out) = sim
        .handle("POST", path, capability, vec![], vec![], &command, &ctx)
        .await
        .unwrap();
    assert_eq!(status, 200, "{out}");
    let first: Value = serde_json::from_str(&out).unwrap();
    assert_eq!(first["subscriptions"].as_array().unwrap().len(), 1);
    assert_eq!(first["subscriptions"][0]["status"], "eligible");
    assert!(first["subscriptions"][0]["includedAllowances"]
        .as_array()
        .unwrap()
        .iter()
        .all(|a| a["limitState"] == "unconfigured" && a["included"].is_null()));
    // Drop the response and retry through another guest instance.
    let (status, out) = sim
        .handle("POST", path, capability, vec![], vec![], &command, &ctx)
        .await
        .unwrap();
    assert_eq!(status, 200, "{out}");
    assert_eq!(
        serde_json::from_str::<Value>(&out).unwrap()["bindingRevision"],
        first["bindingRevision"]
    );
    for ctx in [
        context("cedros-portal", capability, "org-a"),
        context("cedros-data", capability, "org-b"),
        context(
            "cedros-data",
            "cedros-pay:capacity-purchase-read-v1",
            "org-a",
        ),
    ] {
        let (status, _) = sim
            .handle("POST", path, capability, vec![], vec![], &command, &ctx)
            .await
            .unwrap();
        assert_eq!(status, 403);
    }
    let store = sim.store();
    assert!(store.service_requests.is_empty());
    assert_eq!(store.http_fetch_calls, 0);
}

#[path = "support/capacity_lifecycle.rs"]
mod lifecycle;
