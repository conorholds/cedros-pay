use std::sync::Arc;

use axum::{
    extract::State,
    http::header::HeaderMap,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};

use super::response::json_ok;
use crate::handlers::paywall::AppState;
use crate::middleware::tenant::TenantContext;
use crate::storage::Store;

/// POST /paywall/v1/compliance-check
///
/// Pre-flight compliance check for Stripe purchases. Returns whether the
/// caller is cleared to purchase the given resources, or the reasons they
/// are blocked (KYC, sanctions, accredited-investor).
///
/// Body: `{ "resources": ["product-1"] }`
/// Auth: Optional `Authorization` header (cedros-login JWT)
/// Always returns 200 with JSON body — the UI decides rendering.

#[derive(Debug, Deserialize)]
pub struct ComplianceCheckRequest {
    pub resources: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct ComplianceCheckResponse {
    pub cleared: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reasons: Option<Vec<String>>,
}

pub async fn check<S: Store + 'static>(
    State(state): State<Arc<AppState<S>>>,
    tenant: TenantContext,
    headers: HeaderMap,
    Json(req): Json<ComplianceCheckRequest>,
) -> impl IntoResponse {
    // No compliance checker configured → always cleared
    let checker = match &state.paywall_service.compliance_checker {
        Some(c) => c,
        None => return json_ok(ComplianceCheckResponse { cleared: true, reasons: None }),
    };

    // Collect compliance requirements from all requested products
    let mut reqs_list = Vec::new();
    for resource_id in &req.resources {
        if let Ok(product) = state
            .product_repo
            .get_product(&tenant.tenant_id, resource_id)
            .await
        {
            reqs_list.push(
                product
                    .compliance_requirements
                    .clone()
                    .unwrap_or_default(),
            );
        }
    }

    if reqs_list.is_empty() {
        // No products found or none have requirements → cleared
        return json_ok(ComplianceCheckResponse { cleared: true, reasons: None });
    }

    let refs: Vec<&crate::models::compliance::ComplianceRequirements> = reqs_list.iter().collect();
    let merged =
        crate::services::compliance_checker::ComplianceChecker::merge_requirements(&refs);

    // Extract user_id from Authorization header (same as stripe.rs create_session)
    let auth = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default();
    let user_id = state
        .paywall_service
        .extract_user_id_from_auth_header(auth)
        .await;

    // Stripe users typically have no wallet — pass empty string.
    // Sanctions wallet-check will be a no-op; KYC/accredited work via user_id.
    let result = checker
        .check_compliance(
            &tenant.tenant_id,
            "",
            user_id.as_deref(),
            &merged,
        )
        .await;

    match result {
        crate::services::compliance_checker::ComplianceResult::Cleared => {
            json_ok(ComplianceCheckResponse { cleared: true, reasons: None })
        }
        crate::services::compliance_checker::ComplianceResult::Blocked { reasons } => {
            json_ok(ComplianceCheckResponse {
                cleared: false,
                reasons: Some(reasons),
            })
        }
    }
}
