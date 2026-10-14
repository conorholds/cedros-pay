//! Keep customer-wide portal sessions from moving an introductory offer to annual billing.
use serde_json::Value;

use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::seams::HostSeams;
use crate::stripe::api;

const POLICY: &str = "fixed_months_v1";
const MAX_PAGES: usize = 10;

fn unavailable() -> AppError {
    AppError::new(
        502,
        "provider_unavailable",
        "could not open the billing portal",
    )
}

fn fetch<S: HostSeams>(seams: &S, request: Value) -> AppResult<Value> {
    let raw = seams.http_fetch(&request.to_string())?;
    let (status, body) = api::unwrap_fetch(&raw).map_err(|_| unavailable())?;
    if !(200..300).contains(&status) {
        return Err(unavailable());
    }
    serde_json::from_str(&body).map_err(|_| unavailable())
}

fn page(value: &Value) -> AppResult<(&Vec<Value>, bool)> {
    Ok((
        value["data"].as_array().ok_or_else(unavailable)?,
        value["has_more"].as_bool().ok_or_else(unavailable)?,
    ))
}

fn next_cursor(rows: &[Value], previous: Option<&str>) -> AppResult<String> {
    let id = rows
        .last()
        .and_then(|row| row["id"].as_str())
        .ok_or_else(unavailable)?;
    if id.is_empty() || Some(id) == previous {
        return Err(unavailable());
    }
    Ok(id.to_string())
}

fn active_offer(subscription: &Value, customer: &str, now: i64) -> AppResult<bool> {
    if subscription["customer"].as_str() != Some(customer) {
        return Err(unavailable());
    }
    let status = subscription["status"].as_str().ok_or_else(unavailable)?;
    if matches!(status, "canceled" | "incomplete_expired")
        || subscription["metadata"]["invite_discount_duration"] != "fixed_months"
    {
        return Ok(false);
    }
    // Stripe removes expired discounts; end remains authoritative while one is attached.
    // Unexpected/unexpanded discount data must never enable plan changes.
    let discounts = subscription.get("discounts").ok_or_else(unavailable)?;
    if discounts.is_null() {
        return Ok(false);
    }
    for discount in discounts.as_array().ok_or_else(unavailable)? {
        let end = discount["end"].as_i64().ok_or_else(unavailable)?;
        if end > now {
            return Ok(true);
        }
    }
    Ok(false)
}

fn customer_has_offer<S: HostSeams>(seams: &S, key: &str, customer: &str) -> AppResult<bool> {
    let mut cursor: Option<String> = None;
    for _ in 0..MAX_PAGES {
        let value = fetch(
            seams,
            api::build_list_subscriptions_fetch(key, customer, cursor.as_deref(), true),
        )?;
        let (rows, more) = page(&value)?;
        for row in rows {
            if active_offer(row, customer, seams.now_unix_secs())? {
                return Ok(true);
            }
        }
        if !more {
            return Ok(false);
        }
        cursor = Some(next_cursor(rows, cursor.as_deref())?);
    }
    Err(unavailable())
}

fn safe_configuration(value: &Value) -> bool {
    let features = &value["features"];
    value["active"] == true
        && value["is_default"] == false
        && value["metadata"]["cedros_invite_policy"] == POLICY
        && value["id"]
            .as_str()
            .is_some_and(|id| id.starts_with("bpc_"))
        && features["subscription_update"]["enabled"] == false
        && features["invoice_history"]["enabled"] == true
        && features["payment_method_update"]["enabled"] == true
        && features["subscription_cancel"]["enabled"] == true
        && features["subscription_cancel"]["mode"] == "at_period_end"
        && features["subscription_cancel"]["proration_behavior"] == "none"
}

pub(super) fn configuration_for_customer<S: HostSeams>(
    seams: &S,
    key: &str,
    customer: &str,
    context: &RequestContext,
) -> AppResult<Option<String>> {
    if !customer_has_offer(seams, key, customer)? {
        return Ok(None);
    }
    let mut cursor: Option<String> = None;
    let mut has_default = false;
    for _ in 0..MAX_PAGES {
        let mut params = vec![
            ("active".into(), "true".into()),
            ("limit".into(), "100".into()),
        ];
        if let Some(cursor) = &cursor {
            params.push(("starting_after".into(), cursor.clone()));
        }
        let value = fetch(
            seams,
            api::stripe_get(
                key,
                &format!(
                    "/v1/billing_portal/configurations?{}",
                    api::form_encode(&params)
                ),
            ),
        )?;
        let (rows, more) = page(&value)?;
        for row in rows {
            has_default |= row["active"] == true
                && row["is_default"] == true
                && row["id"].as_str().is_some_and(|id| id.starts_with("bpc_"));
            if row["metadata"]["cedros_invite_policy"] == POLICY {
                // Never silently accept an operator-modified policy that permits plan changes.
                if !safe_configuration(row) {
                    return Err(unavailable());
                }
                return Ok(row["id"].as_str().map(str::to_string));
            }
        }
        if !more {
            // Stripe makes the first configuration the account default. Creating our
            // restricted policy first would keep ordinary/expired offers restricted
            // too. Require the operator's normal portal to be configured beforehand.
            if !has_default {
                return Err(unavailable());
            }
            let idempotency = super::super::checkout_claim::scoped_provider_key(
                context,
                "invite-discount-portal-policy",
                POLICY,
            )?;
            let params = [
                ("features[invoice_history][enabled]", "true"),
                ("features[payment_method_update][enabled]", "true"),
                ("features[subscription_cancel][enabled]", "true"),
                ("features[subscription_cancel][mode]", "at_period_end"),
                ("features[subscription_cancel][proration_behavior]", "none"),
                ("features[subscription_update][enabled]", "false"),
                (
                    "business_profile[headline]",
                    "Plan changes resume when your introductory offer ends.",
                ),
                ("metadata[cedros_invite_policy]", POLICY),
            ]
            .map(|(name, value)| (name.to_string(), value.to_string()));
            let configuration = fetch(
                seams,
                api::stripe_post(
                    key,
                    "/v1/billing_portal/configurations",
                    &idempotency,
                    &params,
                ),
            )?;
            if !safe_configuration(&configuration) {
                return Err(unavailable());
            }
            return Ok(configuration["id"].as_str().map(str::to_string));
        }
        cursor = Some(next_cursor(rows, cursor.as_deref())?);
    }
    Err(unavailable())
}
