//! Cedros Pay server extension — WebAssembly component.
//!
//! Generates the `cedros:extension` guest bindings, adapts the real host imports
//! to [`cedros_pay_extension_domain::HostSeams`] (in [`host_seams`]), and
//! forwards the inbound route/job surfaces into the domain crate. All business
//! logic lives in `domain` (host-target-tested); this crate is wiring only.

wit_bindgen::generate!({
    path: "wit",
    world: "extension",
});

mod host_seams;

use cedros_pay_extension_domain as domain;
use host_seams::HostAdapter;

use exports::cedros::extension::jobs::{
    Guest as JobsGuest, JobExecution as WitJobExecution, JobOutcome as WitJobOutcome,
    JobSpec as WitJobSpec, JobStatus as WitJobStatus,
};
use exports::cedros::extension::routes::{
    Guest as RoutesGuest, RouteRequest as WitRouteRequest, RouteResponse as WitRouteResponse,
    RouteSpec as WitRouteSpec,
};

struct Component;

impl RoutesGuest for Component {
    fn list_routes() -> Vec<WitRouteSpec> {
        domain::list_routes()
            .into_iter()
            .map(|spec| WitRouteSpec {
                route_id: spec.route_id.to_string(),
                method: spec.method.to_string(),
                path: spec.path.to_string(),
            })
            .collect()
    }

    fn handle_route(request: WitRouteRequest) -> WitRouteResponse {
        let req = domain::RouteRequest {
            route_id: request.route_id,
            method: request.method,
            path: request.path,
            headers: request.headers,
            query: request.query,
            body: request.body,
            context_json: request.context_json,
        };
        let resp = domain::handle_route(&HostAdapter, req);
        WitRouteResponse {
            status: resp.status,
            headers: resp.headers,
            body: resp.body,
        }
    }
}

impl JobsGuest for Component {
    fn list_jobs() -> Vec<WitJobSpec> {
        domain::list_jobs()
            .into_iter()
            .map(|spec| WitJobSpec {
                job_id: spec.job_id.to_string(),
            })
            .collect()
    }

    fn run_job(execution: WitJobExecution) -> WitJobOutcome {
        let exec = domain::JobExecution {
            job_id: execution.job_id,
            metadata_json: execution.metadata_json,
            attempt: execution.attempt,
        };
        let outcome = domain::run_job(&HostAdapter, exec);
        WitJobOutcome {
            status: match outcome.status {
                domain::JobStatus::Succeeded => WitJobStatus::Succeeded,
                domain::JobStatus::Failed => WitJobStatus::Failed,
                domain::JobStatus::Retryable => WitJobStatus::Retryable,
            },
            details_json: outcome.details_json,
        }
    }
}

export!(Component);
