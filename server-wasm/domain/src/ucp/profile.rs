use crate::reqresp::RouteResponse;
use serde_json::{json, Map, Value};
pub(super) fn response<S: crate::seams::HostSeams>(
    seams: &S,
    origin: &str,
) -> crate::error::AppResult<RouteResponse> {
    let signing_ready = super::signing::configured(seams)?;
    let mut capabilities = Map::new();
    for capability in ["checkout", "catalog.search", "catalog.lookup"] {
        if capability == "checkout" && !signing_ready {
            continue;
        }
        let schema = capability.replace('.', "_");
        capabilities.insert(format!("dev.ucp.shopping.{capability}"),json!([{
            "version":super::VERSION,
            "spec":format!("https://ucp.dev/{}/specification/{}",super::VERSION,capability.replace('.',"/")),
            "schema":format!("https://ucp.dev/{}/schemas/shopping/{schema}.json",super::VERSION)
        }]));
    }
    let keys = if signing_ready {
        vec![super::signing::public_key(seams)?]
    } else {
        Vec::new()
    };
    let value = json!({"ucp":{
        "version":super::VERSION,
        "services":{"dev.ucp.shopping":[{"version":super::VERSION,
            "spec":format!("https://ucp.dev/{}/specification/overview",super::VERSION),
            "schema":format!("https://ucp.dev/{}/services/shopping/rest.openapi.json",super::VERSION),
            "transport":"rest","endpoint":format!("{origin}/extensions/cedros-pay/ucp/v1")} ]},
        "capabilities":Value::Object(capabilities)
    },"signing_keys":keys});
    let mut response =
        RouteResponse::ok(&value).with_header("cache-control", "public, max-age=300");
    response.headers.retain(|(k, _)| k != "x-robots-tag");
    Ok(response)
}
