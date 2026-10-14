use serde_json::{json, Value};

use crate::fake::FakeSeams;
use crate::ids;
use crate::reqresp::{RouteRequest, RouteResponse};

pub(super) fn request(
    route_id: &str,
    method: &str,
    path: &str,
    body: Value,
    key: &str,
) -> RouteRequest {
    RouteRequest {
        route_id: route_id.into(),
        method: method.into(),
        path: path.into(),
        body: body.to_string(),
        headers: vec![("Idempotency-Key".into(), key.into())],
        context_json: json!({
            "authenticated": true, "systemAdmin": true, "csrfVerified": true,
            "actorId": "operator@example.invalid", "permissionClaims": ["*"]
        })
        .to_string(),
        ..Default::default()
    }
}

pub(super) fn response(req: RouteRequest, seams: &FakeSeams) -> RouteResponse {
    crate::router::handle_route(seams, req)
}

pub(super) fn body(response: &RouteResponse) -> Value {
    serde_json::from_str(&response.body).expect("JSON response")
}

pub(super) fn seed_product(seams: &FakeSeams) {
    crate::guarded_policy::enroll(seams).expect("guarded policy fixture");
    seams.seed(
        ids::MODEL_CATALOG,
        "product-1",
        json!({
            "id": "product-1", "title": "Product", "inventoryQuantity": 99,
            "inventoryStatus": "in_stock",
            "variants": [
                {"id":"variant-1","title":"Small","inventoryQuantity":88,"inventoryStatus":"in_stock"},
                {"id":"variant-2","title":"Large"}
            ]
        }),
    );
}
