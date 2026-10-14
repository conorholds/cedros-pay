//! Route and job dispatch — the single entry points the guest forwards into.
//!
//! Handler errors are logged using stable operation/status fields and mapped
//! to sanitized responses. Raw downstream causes remain in memory. Job errors map
//! by status: 5xx → retryable (transient), 4xx → failed (won't fix on retry).

use crate::error::AppError;
use crate::ids;
use crate::jobs;
use crate::reqresp::{JobExecution, JobOutcome, JobSpec, RouteRequest, RouteResponse, RouteSpec};
use crate::routes;
use crate::seams::HostSeams;

#[path = "router_dispatch.rs"]
mod route_dispatch;

/// Every route the guest serves. Each `route_id` must be in
/// `surfaces.server.routes[]`; the host binds each at `/extensions/{id}{path}`.
pub fn list_routes() -> Vec<RouteSpec> {
    let mut specs = Vec::new();
    for group in [
        crate::capacity::ROUTES,
        crate::ucp::ROUTES,
        crate::commerce_orders::ROUTES,
        routes::stats::ROUTES,
        routes::webhooks::ROUTES,
        routes::credits::ROUTES,
        routes::entitlements::ROUTES,
        routes::guarded_policy_enrollment::ROUTES,
        routes::canonical_checkout::ROUTES,
        routes::domain_checkout::ROUTES,
        routes::assistant_x402::ROUTES,
        routes::access_pass::ROUTES,
        crate::versioned_cart::ROUTES,
        routes::payments::ROUTES,
        routes::paywall::ROUTES,
        routes::stripe_session::ROUTES,
        routes::subscription_session::ROUTES,
        routes::subscription_selection::ROUTES,
        routes::subscription_entitlements::ROUTES,
        routes::x402::ROUTES,
        routes::compliance_check::ROUTES,
        routes::cart::ROUTES,
        routes::cart_credits::ROUTES,
        routes::cart_checkout::ROUTES,
        routes::native_store::ROUTES,
        routes::native_store_notifications::ROUTES,
        routes::purchases::ROUTES,
        routes::refunds::ROUTES,
        routes::products::ROUTES,
        routes::program_access::ROUTES,
        routes::subscriptions::ROUTES,
        routes::admin::ROUTES,
        routes::admin_affiliate_payouts::ROUTES,
        routes::admin_dashboard::ROUTES,
        routes::admin_config::ROUTES,
        routes::admin_shipping_tax::ROUTES,
        routes::admin_site_settings::ROUTES,
    ] {
        specs.extend(
            group
                .iter()
                .filter(|spec| crate::conditional_mutations::route_discoverable(spec.route_id))
                .cloned(),
        );
    }
    specs
}

/// Every job the guest runs. Each id must be in `surfaces.server.jobs[]`.
pub fn list_jobs() -> Vec<JobSpec> {
    let specs = vec![
        JobSpec {
            job_id: ids::JOB_STATS_ROLLUP,
        },
        JobSpec {
            job_id: ids::JOB_WEBHOOK_DELIVERY,
        },
        JobSpec {
            job_id: ids::JOB_CLEANUP,
        },
        JobSpec {
            job_id: ids::JOB_CATALOG_SYNC,
        },
        JobSpec {
            job_id: ids::JOB_SUBSCRIPTION_SYNC,
        },
        JobSpec {
            job_id: ids::JOB_SANCTIONS_REFRESH,
        },
        JobSpec {
            job_id: ids::JOB_SANCTIONS_SWEEP,
        },
        JobSpec {
            job_id: ids::JOB_BALANCE_ALERT,
        },
        JobSpec {
            job_id: ids::JOB_HEALTH_CHECK,
        },
        JobSpec {
            job_id: ids::JOB_EMAIL,
        },
        JobSpec {
            job_id: ids::JOB_X402_RECONCILE,
        },
    ];
    specs
}

pub fn handle_route<S: HostSeams>(seams: &S, req: RouteRequest) -> RouteResponse {
    match dispatch(seams, &req) {
        Ok(response) => response,
        Err(error) => {
            if error.internal.is_some() {
                let operation = list_routes()
                    .into_iter()
                    .find(|spec| spec.route_id == req.route_id)
                    .map(|spec| spec.route_id)
                    .unwrap_or("unknown");
                log_error(seams, "route", operation, &error);
            }
            error.into_response()
        }
    }
}

fn dispatch<S: HostSeams>(seams: &S, req: &RouteRequest) -> Result<RouteResponse, AppError> {
    route_dispatch::dispatch(seams, req)
}

pub fn run_job<S: HostSeams>(seams: &S, exec: JobExecution) -> JobOutcome {
    let result = crate::conditional_mutations::require_job(seams, &exec.job_id)
        .and_then(|()| dispatch_job(seams, &exec));
    finish_job(seams, &exec, result)
}

fn dispatch_job<S: HostSeams>(seams: &S, exec: &JobExecution) -> Result<JobOutcome, AppError> {
    match exec.job_id.as_str() {
        ids::JOB_STATS_ROLLUP => jobs::rollup::run(seams, exec),
        ids::JOB_WEBHOOK_DELIVERY => jobs::delivery::run(seams, exec),
        ids::JOB_CLEANUP => jobs::cleanup::run(seams, exec),
        ids::JOB_CATALOG_SYNC => routes::admin_dashboard::sync_stripe_catalog(seams, exec),
        ids::JOB_SUBSCRIPTION_SYNC => jobs::managed::subscription_sync(seams, exec),
        ids::JOB_SANCTIONS_REFRESH => jobs::managed::sanctions_refresh(seams, exec),
        ids::JOB_SANCTIONS_SWEEP => jobs::managed::sanctions_sweep(seams, exec),
        ids::JOB_BALANCE_ALERT => jobs::managed::balance_alert(seams, exec),
        ids::JOB_HEALTH_CHECK => jobs::managed::health_check(seams, exec),
        ids::JOB_EMAIL => jobs::managed::email(seams, exec),
        ids::JOB_X402_RECONCILE => jobs::x402_reconcile::run(seams, exec),
        other => Err(AppError::not_found(format!(
            "no handler for job id {other}"
        ))),
    }
}

fn finish_job<S: HostSeams>(
    seams: &S,
    exec: &JobExecution,
    result: Result<JobOutcome, AppError>,
) -> JobOutcome {
    match result {
        Ok(outcome) => outcome,
        Err(error) => {
            if error.internal.is_some() {
                let operation = list_jobs()
                    .into_iter()
                    .find(|spec| spec.job_id == exec.job_id)
                    .map(|spec| spec.job_id)
                    .unwrap_or("unknown");
                log_error(seams, "job", operation, &error);
            }
            if error.status >= 500 {
                JobOutcome::retryable(error.message)
            } else {
                JobOutcome::failed(error.message)
            }
        }
    }
}

// Host errors and concrete request paths may contain credentials or buyer data.
// Only compiled identifiers and numeric status cross the logging boundary.
fn log_error<S: HostSeams>(seams: &S, surface: &str, operation: &str, error: &AppError) {
    seams.log(
        "error",
        &serde_json::json!({
            "message": "Cedros Pay operation failed",
            "surface": surface,
            "operation": operation,
            "status": error.status,
            "code": error.code,
        })
        .to_string(),
    );
}

#[cfg(test)]
#[path = "router_contract_tests.rs"]
mod contract_tests;

#[cfg(test)]
#[path = "router_activation_tests.rs"]
mod activation_tests;
