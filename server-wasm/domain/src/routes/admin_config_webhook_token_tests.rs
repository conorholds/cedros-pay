use serde_json::{json, Value};

use super::*;
use crate::fake::FakeSeams;
use crate::reqresp::RouteRequest;
use crate::routes::admin_config::handle;

fn admin_request(method: &str, route_id: &str, body: Value) -> RouteRequest {
    let mut body = body;
    let mut headers = Vec::new();
    if method == "PUT" {
        body["mutationId"] = json!("rotate-webhook-token");
        body["expectedRevision"] = Value::Null;
        headers.push((
            "Idempotency-Key".into(),
            "extension-config:rotate-webhook-token".into(),
        ));
    }
    RouteRequest {
        route_id: route_id.into(),
        method: method.into(),
        path: "/admin/config/stripe".into(),
        headers,
        body: body.to_string(),
        context_json: json!({
            "authenticated": true,
            "permissionClaims": [ids::ROUTE_ADMIN],
            "csrfVerified": true
        })
        .to_string(),
        ..Default::default()
    }
}

fn read_endpoint(seams: &FakeSeams) -> Value {
    let response = handle(
        seams,
        &admin_request("GET", ids::ROUTE_ADMIN_CONFIG_STRIPE_GET, Value::Null),
    )
    .unwrap();
    serde_json::from_str::<Value>(&response.body).unwrap()["webhookEndpoint"].clone()
}

#[test]
fn first_read_mints_one_token_and_later_reads_reuse_it() {
    let seams = FakeSeams::new();
    let first = ensure_token(&seams).unwrap();
    assert!(is_webhook_token(&first));
    assert_eq!(ensure_token(&seams).unwrap(), first);
    assert_eq!(
        seams.secret_get(ids::SECRET_STRIPE_WEBHOOK_TOKEN).unwrap(),
        Some(first)
    );
}

#[test]
fn malformed_stored_tokens_are_replaced_rather_than_served() {
    let seams = FakeSeams::new();
    seams.set_secret(ids::SECRET_STRIPE_WEBHOOK_TOKEN, "not-a-token");
    let token = ensure_token(&seams).unwrap();
    assert!(is_webhook_token(&token));
    assert_eq!(
        seams.secret_get(ids::SECRET_STRIPE_WEBHOOK_TOKEN).unwrap(),
        Some(token)
    );
}

#[test]
fn endpoint_carries_the_token_and_the_projected_event_list() {
    let seams = FakeSeams::new();
    let endpoint = read_endpoint(&seams);
    let token = seams
        .secret_get(ids::SECRET_STRIPE_WEBHOOK_TOKEN)
        .unwrap()
        .unwrap();
    assert_eq!(
        endpoint["path"],
        format!("{ENDPOINT_PATH}?token={token}")
    );
    let events: Vec<&str> = endpoint["events"]
        .as_array()
        .unwrap()
        .iter()
        .map(|value| value.as_str().unwrap())
        .collect();
    assert_eq!(events, STRIPE_EVENTS);
    assert!(events.contains(&"checkout.session.completed"));
    assert!(events.contains(&"charge.dispute.funds_withdrawn"));
}

#[test]
fn clearing_the_token_rotates_it_on_the_next_read() {
    let seams = FakeSeams::new();
    let before = read_endpoint(&seams)["path"].as_str().unwrap().to_string();
    let response = handle(
        &seams,
        &admin_request(
            "PUT",
            ids::ROUTE_ADMIN_CONFIG_STRIPE_UPDATE,
            json!({"config": {"webhook_token": null}}),
        ),
    )
    .unwrap();
    assert_eq!(response.status, 200);
    assert_eq!(
        seams.secret_get(ids::SECRET_STRIPE_WEBHOOK_TOKEN).unwrap(),
        None
    );
    let after = read_endpoint(&seams)["path"].as_str().unwrap().to_string();
    assert_ne!(before, after);
    assert!(after.starts_with(&format!("{ENDPOINT_PATH}?token=")));
}
