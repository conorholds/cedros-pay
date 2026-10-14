use super::*;
use crate::auth::Buyer;
use crate::fake::FakeSeams;
use serde_json::json;
use std::collections::BTreeMap;

#[path = "authority_tests.rs"]
mod authority_tests;
#[path = "concurrency_tests.rs"]
mod concurrency;
#[path = "contract_tests.rs"]
mod contract_tests;
#[path = "http_tests.rs"]
mod http_tests;
#[path = "lane_admission_tests.rs"]
mod lane_admission_tests;
#[path = "lifecycle_tests.rs"]
mod lifecycle;
#[path = "rate_cleanup_tests.rs"]
mod rate_cleanup_tests;
#[path = "rate_policy_tests.rs"]
mod rate_policy_tests;
#[path = "storage_split_tests.rs"]
mod storage_split_tests;
#[path = "transport_tests.rs"]
mod transport;
#[path = "transport_boundary_tests.rs"]
mod transport_boundary;
#[path = "transport_test_support.rs"]
mod transport_test_support;
#[path = "validation_tests.rs"]
mod validation_cases;

use transport_test_support::{storage_entry_count, transport_add};

fn buyer(subject: &str) -> Buyer {
    Buyer {
        user_id: subject.to_string(),
        claims: json!({}),
    }
}

fn service<'a>(
    seams: &'a FakeSeams,
    subject: &str,
    provider: TrustedCartProvider,
) -> VersionedCartService<'a, FakeSeams> {
    VersionedCartService::from_verified_buyer(seams, &buyer(subject), provider).unwrap()
}

fn provider_b() -> TrustedCartProvider {
    TrustedCartProvider::for_test("other-provider")
}

fn provider_a() -> TrustedCartProvider {
    TrustedCartProvider::for_test("test:local:cedros-shop")
}

fn add_command(
    generation: &GenerationState,
    lane: &str,
    expected_version: u64,
    operation_id: &str,
    product_id: &str,
    quantity: u64,
    unit_amount_cents: u64,
) -> CartCommand {
    CartCommand {
        lane: lane.to_string(),
        generation: generation.generation.clone(),
        expected_version,
        operation_id: operation_id.to_string(),
        mutation: CartMutation::Add {
            item: CartItemInput {
                product_id: product_id.to_string(),
                variant_id: None,
                quantity,
                unit_amount_cents,
                currency: "USD".to_string(),
                title_snapshot: product_id.to_string(),
                image_snapshot: None,
                payment_resource: Some(product_id.to_string()),
                metadata: BTreeMap::new(),
                hold_id: None,
                hold_expires_at: None,
            },
        },
    }
}

fn applied(outcome: ApplyOutcome) -> CartState {
    match outcome {
        ApplyOutcome::Applied { state } => state,
        other => panic!("expected applied, got {other:?}"),
    }
}

fn generation_key(service: &VersionedCartService<'_, FakeSeams>) -> String {
    identity::generation_key(&service.scope_hash)
}

fn keys(service: &VersionedCartService<'_, FakeSeams>, command: &CartCommand) -> identity::Keys {
    identity::keys(&service.scope_hash, command)
}

fn authenticated(seams: &FakeSeams, subject: &str) {
    seams.set_setting("cedros_login.base_url", "https://site.example");
    seams.push_http_response(200, &format!(r#"{{"user":{{"id":"{subject}"}}}}"#));
}

fn transport_request(body: serde_json::Value) -> crate::reqresp::RouteRequest {
    crate::reqresp::RouteRequest {
        headers: vec![("authorization".into(), "Bearer buyer-session".into())],
        body: body.to_string(),
        context_json: serde_json::json!({
            "siteId": "site-a",
            "environment": "production"
        })
        .to_string(),
        ..Default::default()
    }
}

fn response_json(response: crate::reqresp::RouteResponse) -> serde_json::Value {
    serde_json::from_str(&response.body).unwrap()
}

struct AllowRatePolicy;

impl CartRatePolicy for AllowRatePolicy {
    fn check(&self, _key: &CartRateKey, _operation: CartRateOperation) -> AppResult<()> {
        Ok(())
    }
}

static ALLOW_RATE_POLICY: AllowRatePolicy = AllowRatePolicy;

fn adapter(seams: &FakeSeams) -> AuthenticatedCartAdapter<'_, FakeSeams> {
    if seams
        .get_entry(
            crate::guarded_policy::CONTROL_MODEL,
            crate::guarded_policy::MARKER_KEY,
        )
        .is_none()
    {
        crate::guarded_policy::enroll(seams).unwrap();
    }
    AuthenticatedCartAdapter::with_rate_policy(seams, &ALLOW_RATE_POLICY)
}

fn seed_catalog_item(
    seams: &FakeSeams,
    resource: &str,
    amount_cents: u64,
    currency: &str,
    inventory: u64,
) {
    seams.seed(
        crate::ids::MODEL_CATALOG,
        resource,
        json!({
            "id": resource,
            "active": true,
            "public": true,
            "title": format!("Title {resource}"),
            "imageUrls": [format!("https://cdn.example/{resource}.jpg")],
            "paymentResource": format!("pay-{resource}"),
            "price": { "amountCents": amount_cents, "currency": currency },
            "variants": [{
                "id": "blue",
                "title": format!("Blue {resource}"),
                "imageUrls": [format!("https://cdn.example/{resource}-blue.jpg")],
                "price": { "amountCents": amount_cents + 50, "currency": currency }
            }]
        }),
    );
    crate::checkout_contract::inventory_admin::set(seams, resource, None, inventory).unwrap();
    crate::checkout_contract::inventory_admin::set(seams, resource, Some("blue"), inventory)
        .unwrap();
}
