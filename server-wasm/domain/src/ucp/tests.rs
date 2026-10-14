use super::*;
use crate::{fake::FakeSeams, reqresp::RouteRequest, seams::HostSeams};
use base64::{
    engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD},
    Engine,
};
use p256::ecdsa::{
    signature::{Signer, Verifier},
    Signature, SigningKey, VerifyingKey,
};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

fn setup() -> FakeSeams {
    let seams = FakeSeams::new();
    seams.set_setting("cedros_login.base_url", "https://shop.example");
    seams.set_secret(
        crate::ids::SECRET_CHECKOUT_CONTEXT_MAC,
        "test-only-checkout-context-mac-key-32-bytes",
    );
    seams.set_secret(
        crate::ids::SECRET_CHECKOUT_STRIPE_ACCOUNT,
        "acct_canonical_test",
    );
    seams.set_setting(
        crate::ids::SETTING_CHECKOUT_ALLOWED_RETURN_ORIGINS,
        r#"["https://shop.example"]"#,
    );
    crate::guarded_policy::enroll(&seams).unwrap();
    seams.seed(crate::ids::MODEL_CATALOG,"product-1",json!({"active":true,"title":"Public product","description":"Public description","price":{"amountCents":725,"currency":"USD"},"metadata":{"private":"never-export"}}));
    seams
}
fn request(route: &str, body: Value) -> RouteRequest {
    let route = ROUTES
        .iter()
        .find(|v| v.route_id == format!("cedros-pay:ucp-{route}"))
        .unwrap();
    RouteRequest {
        route_id: route.route_id.into(),
        method: route.method.into(),
        path: format!("/extensions/cedros-pay{}", route.path),
        body: if body.is_null() {
            String::new()
        } else {
            body.to_string()
        },
        context_json: json!({"siteId":"site-a","environment":"production","authenticated":false})
            .to_string(),
        ..Default::default()
    }
}
fn intent() -> Value {
    json!({"line_items":[{"item":{"id":catalog::item_id("site-a","product-1",None),"price":1},"quantity":2}]})
}
fn sign(seams: &FakeSeams, req: &mut RouteRequest, key: &str, profile: &str) {
    sign_with_timestamps(
        seams,
        req,
        key,
        profile,
        &format!(
            ";created={};expires={}",
            seams.now_unix_secs(),
            seams.now_unix_secs() + 300
        ),
    );
}
fn sign_with_timestamps(
    seams: &FakeSeams,
    req: &mut RouteRequest,
    key: &str,
    profile: &str,
    timestamps: &str,
) {
    let private = SigningKey::from_slice(&[3u8; 32]).unwrap();
    let point = private.verifying_key().to_encoded_point(false);
    let doc = json!({"ucp":{"version":VERSION,"capabilities":{"dev.ucp.shopping.checkout":[{"version":VERSION}]}},"signing_keys":[{"kid":"test-platform","kty":"EC","crv":"P-256","x":URL_SAFE_NO_PAD.encode(point.x().unwrap()),"y":URL_SAFE_NO_PAD.encode(point.y().unwrap())}]});
    seams.push_http_response(200, &doc.to_string());
    let agent = format!("profile=\"{profile}\"");
    let digest = format!(
        "sha-256=:{}:",
        STANDARD.encode(Sha256::digest(req.body.as_bytes()))
    );
    let mut components = vec!["@method", "@authority", "@path", "ucp-agent"];
    req.headers = vec![("ucp-agent".into(), agent.clone())];
    if req.method != "GET" {
        components.push("idempotency-key");
        req.headers.push(("idempotency-key".into(), key.into()));
    }
    if !req.body.is_empty() {
        components.extend(["content-digest", "content-type"]);
        req.headers.extend([
            ("content-digest".into(), digest.clone()),
            ("content-type".into(), "application/json".into()),
        ]);
    }
    let params = format!(
        "({}){timestamps};keyid=\"test-platform\"",
        components
            .iter()
            .map(|v| format!("\"{v}\""))
            .collect::<Vec<_>>()
            .join(" ")
    );
    let mut base = components
        .iter()
        .map(|c| {
            format!(
                "\"{c}\": {}",
                match *c {
                    "@method" => req.method.as_str(),
                    "@authority" => "shop.example",
                    "@path" => req.path.as_str(),
                    "ucp-agent" => &agent,
                    "idempotency-key" => key,
                    "content-digest" => &digest,
                    _ => "application/json",
                }
            )
        })
        .collect::<Vec<_>>();
    base.push(format!("\"@signature-params\": {params}"));
    let signature: Signature = private.sign(base.join("\n").as_bytes());
    req.headers.extend([
        ("signature-input".into(), format!("sig1={params}")),
        (
            "signature".into(),
            format!("sig1=:{}:", STANDARD.encode(signature.to_bytes())),
        ),
    ]);
}
fn call(seams: &FakeSeams, req: &RouteRequest) -> (u16, Value) {
    let response = handle(seams, req).unwrap();
    (
        response.status,
        serde_json::from_str(&response.body).unwrap(),
    )
}
fn signed_call(
    seams: &FakeSeams,
    route: &str,
    id: Option<&str>,
    body: Value,
    key: &str,
    profile: &str,
) -> (u16, Value) {
    let mut req = request(route, body);
    if let Some(id) = id {
        req.path = req.path.replace("{id}", id);
    }
    sign(seams, &mut req, key, profile);
    call(seams, &req)
}
const PLATFORM: &str = "https://agent.example/.well-known/ucp";

#[test]
fn public_discovery_and_catalog_need_no_mcp_or_login() {
    let seams = setup();
    let (status, profile) = call(&seams, &request("profile", Value::Null));
    assert_eq!(status, 200);
    assert_eq!(
        profile["ucp"]["services"]["dev.ucp.shopping"][0]["transport"],
        "rest"
    );
    assert!(profile["ucp"].get("payment_handlers").is_none());
    assert!(profile["signing_keys"][0].get("d").is_none());
    for (id, extra) in [
        ("draft", json!({"status":"draft"})),
        ("private", json!({"public":false})),
        ("inactive", json!({"active":false})),
    ] {
        let mut product =
            json!({"active":true,"title":"Hidden","price":{"amountCents":10,"currency":"USD"}});
        product
            .as_object_mut()
            .unwrap()
            .extend(extra.as_object().unwrap().clone());
        seams.seed(crate::ids::MODEL_CATALOG, id, product);
    }
    let (status, catalog) = call(&seams, &request("catalog-search", json!({})));
    assert_eq!(status, 200);
    assert_eq!(catalog["products"].as_array().unwrap().len(), 1);
    assert_eq!(
        catalog["products"][0]["variants"][0]["price"]["amount"],
        725
    );
    assert!(!catalog.to_string().contains("never-export"));
    assert!(seams.http_requests.borrow().is_empty());
    let id = catalog["products"][0]["variants"][0]["id"]
        .as_str()
        .unwrap();
    let (_, lookup) = call(&seams, &request("catalog-lookup", json!({"ids":[id]})));
    assert_eq!(lookup["products"][0]["variants"][0]["inputs"][0]["id"], id);
    assert_eq!(
        call(
            &seams,
            &request(
                "catalog-product",
                json!({"id":catalog::item_id("other-site","product-1",None)})
            )
        )
        .0,
        400
    );
}

#[test]
fn signed_checkout_uses_authoritative_prices_and_replays_atomically() {
    let seams = setup();
    let (status, created) = signed_call(
        &seams,
        "checkout-create",
        None,
        intent(),
        "create-1",
        PLATFORM,
    );
    assert_eq!(status, 201);
    assert_eq!(created["totals"][4]["amount"], 1450);
    assert_eq!(created["status"], "requires_escalation");
    assert!(created["continue_url"]
        .as_str()
        .unwrap()
        .starts_with("https://shop.example/extensions/cedros-pay/ucp/handoff/"));
    assert_eq!(
        signed_call(
            &seams,
            "checkout-complete",
            created["id"].as_str(),
            json!({"payment":{"credential":"never-charge-this"}}),
            "complete",
            PLATFORM
        )
        .0,
        422
    );
    let replay = signed_call(
        &seams,
        "checkout-create",
        None,
        intent(),
        "create-1",
        PLATFORM,
    );
    assert_eq!(replay.1, created);
    let mut changed = intent();
    changed["line_items"][0]["quantity"] = json!(3);
    assert_eq!(
        signed_call(
            &seams,
            "checkout-create",
            None,
            changed,
            "create-1",
            PLATFORM
        )
        .0,
        409
    );
    assert!(seams
        .http_requests
        .borrow()
        .iter()
        .all(|req| req["url"] == PLATFORM));
}

#[test]
fn session_ownership_cancellation_and_stale_handoff_fail_closed() {
    let seams = setup();
    let (_, created) = signed_call(
        &seams,
        "checkout-create",
        None,
        intent(),
        "create",
        PLATFORM,
    );
    let id = created["id"].as_str().unwrap();
    assert_eq!(
        signed_call(
            &seams,
            "checkout-get",
            Some(id),
            Value::Null,
            "",
            "https://other.example/.well-known/ucp"
        )
        .0,
        404
    );
    let (_, updated) = signed_call(
        &seams,
        "checkout-update",
        Some(id),
        intent(),
        "update",
        PLATFORM,
    );
    assert_ne!(updated["continue_url"], created["continue_url"]);
    let mut handoff = request("handoff", Value::Null);
    handoff.path = handoff.path.replace("{id}", id);
    handoff.query = vec![(
        "token".into(),
        created["continue_url"]
            .as_str()
            .unwrap()
            .split("token=")
            .nth(1)
            .unwrap()
            .into(),
    )];
    assert_eq!(handle(&seams, &handoff).unwrap().status, 404);
    let cancelled = signed_call(
        &seams,
        "checkout-cancel",
        Some(id),
        Value::Null,
        "cancel",
        PLATFORM,
    );
    assert_eq!(cancelled.0, 200);
    assert_eq!(cancelled.1["status"], "canceled");
    assert_eq!(
        signed_call(
            &seams,
            "checkout-cancel",
            Some(id),
            Value::Null,
            "cancel",
            PLATFORM
        ),
        cancelled
    );
    assert_eq!(
        signed_call(&seams, "checkout-get", Some(id), Value::Null, "", PLATFORM).1["status"],
        "canceled"
    );
}

#[test]
fn tampered_expired_and_unsigned_mutations_are_rejected() {
    let seams = setup();
    assert_eq!(call(&seams, &request("checkout-create", intent())).0, 401);
    let mut tampered = request("checkout-create", intent());
    sign(&seams, &mut tampered, "create", PLATFORM);
    tampered.body.push(' ');
    assert_eq!(call(&seams, &tampered).0, 401);
    let seams = setup();
    let mut old = request("checkout-create", intent());
    sign(&seams, &mut old, "create", PLATFORM);
    seams.set_now(seams.now_unix_secs() + 301);
    assert_eq!(call(&seams, &old).0, 401);
    let seams = setup();
    let mut duplicate = request("checkout-create", intent());
    sign(&seams, &mut duplicate, "create", PLATFORM);
    duplicate
        .headers
        .push(("idempotency-key".into(), "different".into()));
    assert_eq!(call(&seams, &duplicate).0, 401);
}

#[test]
fn response_signature_verifies_against_public_profile_and_raw_body() {
    let seams = setup();
    let public = signing::public_key(&seams).unwrap();
    let mut point = vec![4];
    point.extend(
        URL_SAFE_NO_PAD
            .decode(public["x"].as_str().unwrap())
            .unwrap(),
    );
    point.extend(
        URL_SAFE_NO_PAD
            .decode(public["y"].as_str().unwrap())
            .unwrap(),
    );
    let key = VerifyingKey::from_sec1_bytes(&point).unwrap();
    let response = handle(&seams, &request("catalog-search", json!({}))).unwrap();
    let header = |name: &str| {
        response
            .headers
            .iter()
            .find(|(n, _)| n == name)
            .unwrap()
            .1
            .as_str()
    };
    assert_eq!(
        header("content-digest"),
        format!(
            "sha-256=:{}:",
            STANDARD.encode(Sha256::digest(response.body.as_bytes()))
        )
    );
    let params = header("signature-input").strip_prefix("sig1=").unwrap();
    let base=format!("\"@status\": 200\n\"content-digest\": {}\n\"content-type\": application/json\n\"@signature-params\": {params}",header("content-digest"));
    let sig = STANDARD
        .decode(
            header("signature")
                .strip_prefix("sig1=:")
                .unwrap()
                .strip_suffix(':')
                .unwrap(),
        )
        .unwrap();
    key.verify(base.as_bytes(), &Signature::from_slice(&sig).unwrap())
        .unwrap();
    assert!(key
        .verify(b"tampered", &Signature::from_slice(&sig).unwrap())
        .is_err());
}

#[test]
fn handoff_get_is_read_only_and_foreign_origin_cannot_start_payment() {
    let seams = setup();
    let (_, created) = signed_call(
        &seams,
        "checkout-create",
        None,
        intent(),
        "create",
        PLATFORM,
    );
    let id = created["id"].as_str().unwrap();
    let mut req = request("handoff", Value::Null);
    req.path = req.path.replace("{id}", id);
    req.query = vec![(
        "token".into(),
        created["continue_url"]
            .as_str()
            .unwrap()
            .split("token=")
            .nth(1)
            .unwrap()
            .into(),
    )];
    let before = seams.http_requests.borrow().len();
    let response = handle(&seams, &req).unwrap();
    assert_eq!(response.status, 200);
    assert!(response.body.contains("Continue to payment"));
    assert_eq!(seams.http_requests.borrow().len(), before);
    req.method = "POST".into();
    req.route_id = "cedros-pay:ucp-handoff-submit".into();
    req.headers = vec![("origin".into(), "https://evil.example".into())];
    assert_eq!(handle(&seams, &req).unwrap().status, 403);
    assert_eq!(seams.http_requests.borrow().len(), before);
}

#[test]
fn expired_sessions_and_receipts_are_pruned_without_touching_financial_ledger() {
    let seams = setup();
    let (_, created) = signed_call(
        &seams,
        "checkout-create",
        None,
        intent(),
        "create",
        PLATFORM,
    );
    let id = created["id"].as_str().unwrap();
    seams.set_now(seams.now_unix_secs() + 73 * 60 * 60);
    assert_eq!(expired(&seams).unwrap(), 2);
    assert!(session_store::load(&seams, id).is_err());
}

#[test]
fn hosted_payment_retries_resolve_the_same_canonical_stripe_session() {
    let seams = setup();
    seams.set_secret(crate::ids::SECRET_STRIPE_KEY, "sk_test_ucp");
    let (_, created) = signed_call(
        &seams,
        "checkout-create",
        None,
        intent(),
        "create",
        PLATFORM,
    );
    let id = created["id"].as_str().unwrap();
    let mut request = request("handoff-submit", Value::Null);
    request.path = request.path.replace("{id}", id);
    request.query = vec![(
        "token".into(),
        created["continue_url"]
            .as_str()
            .unwrap()
            .split("token=")
            .nth(1)
            .unwrap()
            .into(),
    )];
    request.headers = vec![("origin".into(), "https://shop.example".into())];
    seams.push_http_response(
        200,
        r#"{"id":"cs_test_ucp","url":"https://checkout.stripe.com/c/pay/cs_test_ucp"}"#,
    );
    // Lose the first URL-retrieval response after provider creation. The
    // canonical operation must retain its provider identity across the retry.
    seams.push_http_error("simulated connection loss");
    assert_eq!(handle(&seams, &request).unwrap().status, 503);
    let requests = seams.http_requests.borrow();
    let create = requests
        .iter()
        .find(|v| {
            v["method"] == "POST" && v["url"] == "https://api.stripe.com/v1/checkout/sessions"
        })
        .unwrap();
    let fields = create["body"]
        .as_str()
        .unwrap()
        .split('&')
        .filter_map(|field| field.split_once('='))
        .collect::<std::collections::BTreeMap<_, _>>();
    let mut metadata = serde_json::Map::new();
    for (key, value) in &fields {
        if let Some(key) = key
            .strip_prefix("metadata%5B")
            .and_then(|s| s.strip_suffix("%5D"))
        {
            metadata.insert(key.into(), json!(decode_form_component(value)));
        }
    }
    assert!(!metadata.is_empty());
    let retrieval=json!({"id":"cs_test_ucp","url":"https://checkout.stripe.com/c/pay/cs_test_ucp","mode":"payment","status":"open","payment_status":"unpaid","amount_total":1450,"currency":"usd","expires_at":fields["expires_at"].parse::<i64>().unwrap(),"metadata":metadata}).to_string();
    drop(requests);
    for _ in 0..2 {
        seams.push_http_response(200, &retrieval);
        let response = handle(&seams, &request).unwrap();
        assert_eq!(response.status, 303, "{}", response.body);
        assert!(response
            .headers
            .iter()
            .any(|(name, value)| name == "location"
                && value == "https://checkout.stripe.com/c/pay/cs_test_ucp"));
    }
    assert_eq!(
        seams
            .http_requests
            .borrow()
            .iter()
            .filter(|v| v["method"] == "POST"
                && v["url"] == "https://api.stripe.com/v1/checkout/sessions")
            .count(),
        1
    );
    assert_eq!(
        signed_call(
            &seams,
            "checkout-cancel",
            Some(id),
            Value::Null,
            "cancel",
            PLATFORM
        )
        .0,
        409
    );
}

#[test]
fn discovery_and_catalog_work_before_checkout_is_configured() {
    let seams = FakeSeams::new();
    seams.set_setting("cedros_login.base_url", "https://shop.example");
    seams.seed(crate::ids::MODEL_CATALOG, "product-1", json!({"active":true,"title":"Public product","price":{"amountCents":725,"currency":"USD"}}));
    let (status, profile) = call(&seams, &request("profile", Value::Null));
    assert_eq!(status, 200);
    assert_eq!(profile["signing_keys"], json!([]));
    assert!(profile["ucp"]["capabilities"]
        .get("dev.ucp.shopping.checkout")
        .is_none());
    let (status, catalog) = call(&seams, &request("catalog-search", json!({})));
    assert_eq!(status, 200);
    assert_eq!(catalog["products"].as_array().unwrap().len(), 1);
}

#[test]
fn signatures_without_timestamps_and_replays_after_session_expiry_are_supported() {
    let seams = setup();
    let mut req = request("checkout-create", intent());
    sign_with_timestamps(&seams, &mut req, "create", PLATFORM, "");
    let created = call(&seams, &req);
    assert_eq!(created.0, 201);
    seams.set_now(seams.now_unix_secs() + 25 * 60 * 60);
    sign_with_timestamps(&seams, &mut req, "create", PLATFORM, "");
    assert_eq!(call(&seams, &req), created);
    let id = created.1["id"].as_str().unwrap();
    assert_eq!(
        signed_call(&seams, "checkout-get", Some(id), Value::Null, "", PLATFORM).1["status"],
        "canceled"
    );
}

#[test]
fn private_variants_are_neither_listed_nor_purchasable() {
    let seams = setup();
    seams.seed(
        crate::ids::MODEL_CATALOG,
        "product-1",
        json!({"active":true,"title":"Variants","variants":[
            {"id":"private","visibility":"private","price":{"amountCents":1,"currency":"USD"}},
            {"id":"public","price":{"amountCents":725,"currency":"USD"}}
        ]}),
    );
    let (_, catalog) = call(&seams, &request("catalog-search", json!({})));
    let variants = catalog["products"][0]["variants"].as_array().unwrap();
    assert_eq!(variants.len(), 1);
    assert_eq!(
        variants[0]["id"],
        catalog::item_id("site-a", "product-1", Some("public"))
    );
    let created = signed_call(
        &seams,
        "checkout-create",
        None,
        intent(),
        "public",
        PLATFORM,
    );
    assert_eq!(created.0, 201);
    assert_eq!(created.1["totals"][4]["amount"], 1450);
    let mut private = intent();
    private["line_items"][0]["item"]["id"] =
        json!(catalog::item_id("site-a", "product-1", Some("private")));
    assert_eq!(
        signed_call(
            &seams,
            "checkout-create",
            None,
            private,
            "private",
            PLATFORM
        )
        .0,
        422
    );
}

fn decode_form_component(value: &str) -> String {
    let mut bytes = value.bytes();
    let mut decoded = Vec::new();
    while let Some(byte) = bytes.next() {
        decoded.push(match byte {
            b'+' => b' ',
            b'%' => {
                let hex = [bytes.next().unwrap(), bytes.next().unwrap()];
                u8::from_str_radix(std::str::from_utf8(&hex).unwrap(), 16).unwrap()
            }
            other => other,
        });
    }
    String::from_utf8(decoded).unwrap()
}
