//! Admin handlers for compliance management (token holders, freeze/thaw, reports).

use std::sync::Arc;

use axum::{
    extract::{Query, State},
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use solana_sdk::pubkey::Pubkey;

use crate::errors::{error_response, ErrorCode};
use crate::handlers::admin::audit;
use crate::handlers::response::{json_error, json_ok};
use crate::middleware::TenantContext;
use crate::models::compliance::ComplianceAction;
use crate::services::token22::Token22Service;
use crate::storage::Store;

/// Shared state for compliance admin routes.
pub struct ComplianceAdminState {
    pub token22: Arc<Token22Service>,
    pub store: Arc<dyn Store>,
}

// ─── Query / request types ──────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListHoldersQuery {
    pub status: Option<String>,
    pub wallet: Option<String>,
    pub collection_id: Option<String>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListActionsQuery {
    pub action_type: Option<String>,
    pub wallet: Option<String>,
    pub from: Option<DateTime<Utc>>,
    pub to: Option<DateTime<Utc>>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FreezeRequest {
    pub holder_id: String,
    pub reason: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThawRequest {
    pub holder_id: String,
    pub reason: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportQuery {
    pub from: Option<DateTime<Utc>>,
    pub to: Option<DateTime<Utc>>,
}

// ─── Handlers ───────────────────────────────────────────────────────────────

/// GET /admin/compliance/holders — paginated list with filters.
pub async fn list_holders(
    State(state): State<Arc<ComplianceAdminState>>,
    tenant: TenantContext,
    Query(q): Query<ListHoldersQuery>,
) -> impl IntoResponse {
    let limit = q.limit.unwrap_or(50).min(200);
    let offset = q.offset.unwrap_or(0).max(0);

    match state
        .store
        .list_token_holders(
            &tenant.tenant_id,
            q.status.as_deref(),
            q.wallet.as_deref(),
            q.collection_id.as_deref(),
            limit,
            offset,
        )
        .await
    {
        Ok(holders) => json_ok(serde_json::json!({ "holders": holders })).into_response(),
        Err(e) => {
            tracing::error!(error = %e, "Failed to list token holders");
            let (status, body) =
                error_response(ErrorCode::DatabaseError, Some("Failed to list holders".into()), None);
            json_error(status, body).into_response()
        }
    }
}

/// GET /admin/compliance/actions — paginated audit trail.
pub async fn list_actions(
    State(state): State<Arc<ComplianceAdminState>>,
    tenant: TenantContext,
    Query(q): Query<ListActionsQuery>,
) -> impl IntoResponse {
    let limit = q.limit.unwrap_or(50).min(200);
    let offset = q.offset.unwrap_or(0).max(0);

    match state
        .store
        .list_compliance_actions(
            &tenant.tenant_id,
            q.action_type.as_deref(),
            q.wallet.as_deref(),
            q.from,
            q.to,
            limit,
            offset,
        )
        .await
    {
        Ok(actions) => json_ok(serde_json::json!({ "actions": actions })).into_response(),
        Err(e) => {
            tracing::error!(error = %e, "Failed to list compliance actions");
            let (status, body) = error_response(
                ErrorCode::DatabaseError,
                Some("Failed to list actions".into()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

/// POST /admin/compliance/freeze — freeze a holder's token account.
pub async fn freeze_holder(
    State(state): State<Arc<ComplianceAdminState>>,
    tenant: TenantContext,
    Json(req): Json<FreezeRequest>,
) -> impl IntoResponse {
    if req.reason.is_empty() || req.reason.len() > 1024 {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("reason must be 1-1024 characters".into()),
            None,
        );
        return json_error(status, body).into_response();
    }

    let holder = match state
        .store
        .get_token_holder(&tenant.tenant_id, &req.holder_id)
        .await
    {
        Ok(Some(h)) => h,
        Ok(None) => {
            let (status, body) =
                error_response(ErrorCode::ResourceNotFound, Some("Holder not found".into()), None);
            return json_error(status, body).into_response();
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to get token holder");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            return json_error(status, body).into_response();
        }
    };

    if holder.status == "frozen" {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("Holder is already frozen".into()),
            None,
        );
        return json_error(status, body).into_response();
    }

    let (mint_pk, owner_pk) = match parse_pubkeys(&holder.mint_address, &holder.wallet_address) {
        Ok(pks) => pks,
        Err(resp) => return resp,
    };

    let sig = match crate::services::token22::freeze_account(&state.token22, &mint_pk, &owner_pk)
        .await
    {
        Ok(sig) => sig,
        Err(e) => {
            tracing::error!(error = %e, "Freeze account tx failed");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some(format!("Freeze failed: {e}")),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    let now = Utc::now();
    if let Err(e) = state
        .store
        .update_token_holder_status(
            &tenant.tenant_id,
            &req.holder_id,
            "frozen",
            Some(now),
            Some(&sig),
            None,
        )
        .await
    {
        tracing::error!(error = %e, "Failed to update holder status after freeze");
    }

    let actor = tenant.admin_actor.clone().unwrap_or_default();
    let action = ComplianceAction {
        id: uuid::Uuid::new_v4().to_string(),
        tenant_id: tenant.tenant_id.clone(),
        action_type: "freeze".to_string(),
        wallet_address: holder.wallet_address.clone(),
        mint_address: holder.mint_address.clone(),
        holder_id: Some(req.holder_id.clone()),
        reason: req.reason,
        actor: actor.clone(),
        tx_signature: Some(sig.clone()),
        report_reference: None,
        created_at: now,
    };
    if let Err(e) = state.store.record_compliance_action(action).await {
        tracing::error!(error = %e, "Failed to record compliance action");
    }

    audit(
        &*state.store,
        &tenant,
        "compliance",
        &req.holder_id,
        "freeze",
        Some(serde_json::json!({ "tx": &sig })),
    )
    .await;

    json_ok(serde_json::json!({ "frozen": true, "txSignature": sig })).into_response()
}

/// POST /admin/compliance/thaw — thaw a frozen holder's token account.
pub async fn thaw_holder(
    State(state): State<Arc<ComplianceAdminState>>,
    tenant: TenantContext,
    Json(req): Json<ThawRequest>,
) -> impl IntoResponse {
    if req.reason.is_empty() || req.reason.len() > 1024 {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("reason must be 1-1024 characters".into()),
            None,
        );
        return json_error(status, body).into_response();
    }

    let holder = match state
        .store
        .get_token_holder(&tenant.tenant_id, &req.holder_id)
        .await
    {
        Ok(Some(h)) => h,
        Ok(None) => {
            let (status, body) =
                error_response(ErrorCode::ResourceNotFound, Some("Holder not found".into()), None);
            return json_error(status, body).into_response();
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to get token holder");
            let (status, body) = error_response(ErrorCode::DatabaseError, None, None);
            return json_error(status, body).into_response();
        }
    };

    if holder.status != "frozen" {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("Holder is not frozen".into()),
            None,
        );
        return json_error(status, body).into_response();
    }

    let (mint_pk, owner_pk) = match parse_pubkeys(&holder.mint_address, &holder.wallet_address) {
        Ok(pks) => pks,
        Err(resp) => return resp,
    };

    let sig = match crate::services::token22::thaw_account(&state.token22, &mint_pk, &owner_pk)
        .await
    {
        Ok(sig) => sig,
        Err(e) => {
            tracing::error!(error = %e, "Thaw account tx failed");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some(format!("Thaw failed: {e}")),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    if let Err(e) = state
        .store
        .update_token_holder_status(
            &tenant.tenant_id,
            &req.holder_id,
            "thawed",
            None,
            None,
            Some(&sig),
        )
        .await
    {
        tracing::error!(error = %e, "Failed to update holder status after thaw");
    }

    let actor = tenant.admin_actor.clone().unwrap_or_default();
    let action = ComplianceAction {
        id: uuid::Uuid::new_v4().to_string(),
        tenant_id: tenant.tenant_id.clone(),
        action_type: "thaw".to_string(),
        wallet_address: holder.wallet_address.clone(),
        mint_address: holder.mint_address.clone(),
        holder_id: Some(req.holder_id.clone()),
        reason: req.reason,
        actor,
        tx_signature: Some(sig.clone()),
        report_reference: None,
        created_at: Utc::now(),
    };
    if let Err(e) = state.store.record_compliance_action(action).await {
        tracing::error!(error = %e, "Failed to record compliance action");
    }

    audit(
        &*state.store,
        &tenant,
        "compliance",
        &req.holder_id,
        "thaw",
        Some(serde_json::json!({ "tx": &sig })),
    )
    .await;

    json_ok(serde_json::json!({ "thawed": true, "txSignature": sig })).into_response()
}

/// GET /admin/compliance/report — generate a compliance report for a date range.
pub async fn generate_report(
    State(state): State<Arc<ComplianceAdminState>>,
    tenant: TenantContext,
    Query(q): Query<ReportQuery>,
) -> impl IntoResponse {
    let actions = match state
        .store
        .list_compliance_actions(&tenant.tenant_id, None, None, q.from, q.to, 1000, 0)
        .await
    {
        Ok(a) => a,
        Err(e) => {
            tracing::error!(error = %e, "Failed to list actions for report");
            let (status, body) =
                error_response(ErrorCode::DatabaseError, Some("Failed to generate report".into()), None);
            return json_error(status, body).into_response();
        }
    };

    let total_holders = state
        .store
        .count_token_holders(&tenant.tenant_id, None)
        .await
        .unwrap_or(0);
    let total_frozen = state
        .store
        .count_token_holders(&tenant.tenant_id, Some("frozen"))
        .await
        .unwrap_or(0);

    let freeze_count = actions.iter().filter(|a| a.action_type == "freeze").count();
    let thaw_count = actions.iter().filter(|a| a.action_type == "thaw").count();
    let sweep_count = actions.iter().filter(|a| a.action_type == "sweep_freeze").count();

    let report = ComplianceReport {
        generated_at: Utc::now(),
        from: q.from,
        to: q.to,
        total_holders,
        total_frozen,
        actions_in_period: actions.len() as i64,
        freeze_count: freeze_count as i64,
        thaw_count: thaw_count as i64,
        sweep_freeze_count: sweep_count as i64,
        actions,
    };

    // Record that a report was generated
    let report_ref = uuid::Uuid::new_v4().to_string();
    let _ = state
        .store
        .record_compliance_action(ComplianceAction {
            id: uuid::Uuid::new_v4().to_string(),
            tenant_id: tenant.tenant_id.clone(),
            action_type: "report_generated".to_string(),
            wallet_address: String::new(),
            mint_address: String::new(),
            holder_id: None,
            reason: "Compliance report generated".to_string(),
            actor: tenant.admin_actor.clone().unwrap_or_default(),
            tx_signature: None,
            report_reference: Some(report_ref),
            created_at: Utc::now(),
        })
        .await;

    json_ok(serde_json::json!({ "report": report })).into_response()
}

// ─── Helpers ────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ComplianceReport {
    generated_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    from: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    to: Option<DateTime<Utc>>,
    total_holders: i64,
    total_frozen: i64,
    actions_in_period: i64,
    freeze_count: i64,
    thaw_count: i64,
    sweep_freeze_count: i64,
    actions: Vec<ComplianceAction>,
}

fn parse_pubkeys(mint: &str, wallet: &str) -> Result<(Pubkey, Pubkey), axum::response::Response> {
    let mint_pk = mint.parse::<Pubkey>().map_err(|e| {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some(format!("Invalid mint address: {e}")),
            None,
        );
        json_error(status, body).into_response()
    })?;
    let owner_pk = wallet.parse::<Pubkey>().map_err(|e| {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some(format!("Invalid wallet address: {e}")),
            None,
        );
        json_error(status, body).into_response()
    })?;
    Ok((mint_pk, owner_pk))
}
