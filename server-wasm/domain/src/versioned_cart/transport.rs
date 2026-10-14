use serde::de::DeserializeOwned;

use super::authority_validation;
use super::rate_policy::DurableRatePolicy;
use super::transport_types::{LaneRequest, RotateRequest};
use super::{
    ApplyOutcome, CartAuthority, CartRateKey, CartRateOperation, CartRatePolicy, CartSnapshot,
    CartWriteRequest, ProductionCartAuthority, RotateCartOutcome, RotateGenerationOutcome,
    TrustedCartProvider, VersionedCartService,
};
use crate::auth;
use crate::ctx::RequestContext;
use crate::error::{AppError, AppResult};
use crate::reqresp::{RouteRequest, RouteResponse};
use crate::seams::HostSeams;

const MAX_REQUEST_BODY_BYTES: usize = 16 * 1024;
/// The sole public cart lane accepted by the Shop 3 contract.
pub const DEFAULT_LANE: &str = "default";

/// Authenticated production adapter; central discovery is coordinated separately.
pub struct AuthenticatedCartAdapter<'a, S: HostSeams> {
    seams: &'a S,
    authority: &'a dyn CartAuthority<S>,
    rate_policy: Option<&'a dyn CartRatePolicy>,
}

static PRODUCTION_AUTHORITY: ProductionCartAuthority = ProductionCartAuthority;

impl<'a, S: HostSeams> AuthenticatedCartAdapter<'a, S> {
    pub fn new(seams: &'a S) -> Self {
        Self {
            seams,
            authority: &PRODUCTION_AUTHORITY,
            rate_policy: None,
        }
    }

    /// Test-only policy injection; production always uses durable host storage.
    #[cfg(test)]
    pub(super) fn with_rate_policy(seams: &'a S, rate_policy: &'a dyn CartRatePolicy) -> Self {
        Self {
            seams,
            authority: &PRODUCTION_AUTHORITY,
            rate_policy: Some(rate_policy),
        }
    }

    /// Open or recover the current server-owned generation and cart.
    pub fn open(&self, request: &RouteRequest) -> AppResult<RouteResponse> {
        self.require_active()?;
        self.open_active(request)
    }

    pub(super) fn open_active(&self, request: &RouteRequest) -> AppResult<RouteResponse> {
        let body: LaneRequest = parse_body(request)?;
        require_default_lane(&body.lane)?;
        let service = self.service(request, CartRateOperation::Open)?;
        service.admit_lane(&body.lane)?;
        service.open_generation()?;
        snapshot_response(&service, &body.lane)
    }

    /// Read the current generation and authoritative cart state.
    pub fn read(&self, request: &RouteRequest) -> AppResult<RouteResponse> {
        self.require_active()?;
        self.read_active(request)
    }

    pub(super) fn read_active(&self, request: &RouteRequest) -> AppResult<RouteResponse> {
        let body: LaneRequest = parse_body(request)?;
        require_default_lane(&body.lane)?;
        let service = self.service(request, CartRateOperation::Read)?;
        service.require_lane(&body.lane)?;
        snapshot_response(&service, &body.lane)
    }

    /// Rotate the server-owned generation using its opaque host revision.
    pub fn rotate(&self, request: &RouteRequest) -> AppResult<RouteResponse> {
        self.require_active()?;
        self.rotate_active(request)
    }

    pub(super) fn rotate_active(&self, request: &RouteRequest) -> AppResult<RouteResponse> {
        let body: RotateRequest = parse_body(request)?;
        require_default_lane(&body.lane)?;
        super::validation::generation(&body.expected_generation)?;
        let service = self.service(request, CartRateOperation::Rotate)?;
        service.require_lane(&body.lane)?;
        let rotation = service.rotate_generation(&body.expected_generation)?;
        let (current, authoritative) = service.read_authoritative(&body.lane)?;
        let outcome = match rotation {
            RotateGenerationOutcome::Rotated { generation } if generation == current => {
                RotateCartOutcome::Rotated {
                    generation,
                    authoritative,
                }
            }
            RotateGenerationOutcome::Rotated { .. }
            | RotateGenerationOutcome::StaleGeneration { .. } => {
                RotateCartOutcome::StaleGeneration {
                    current_generation: current,
                    authoritative,
                }
            }
        };
        Ok(RouteResponse::ok(&outcome))
    }

    /// Apply one externally identified, version- and generation-guarded mutation.
    pub fn apply(&self, request: &RouteRequest) -> AppResult<RouteResponse> {
        self.require_active()?;
        self.apply_active(request)
    }

    pub(super) fn apply_active(&self, request: &RouteRequest) -> AppResult<RouteResponse> {
        let client: CartWriteRequest = authority_validation::canonicalize(parse_body(request)?)?;
        require_default_lane(&client.lane)?;
        let fingerprint = authority_validation::fingerprint(&client)?;
        let service = self.service(request, CartRateOperation::Apply)?;
        if let Some(outcome) =
            service.recorded_intent(&client.lane, &client.operation_id, &fingerprint)?
        {
            return Ok(RouteResponse::ok(&outcome));
        }
        if let Some(outcome) = service.preflight_intent(&client)? {
            return Ok(RouteResponse::ok(&outcome));
        }
        let resolved = self.authority.resolve(self.seams, &client)?;
        service.admit_lane(&client.lane)?;
        let outcome: ApplyOutcome = service.apply_with_fingerprint(
            &resolved.command,
            &fingerprint,
            &resolved.inventory_checks,
        )?;
        Ok(RouteResponse::ok(&outcome))
    }

    fn require_active(&self) -> AppResult<()> {
        crate::guarded_policy::require_active(self.seams).map(drop)
    }

    fn service(
        &self,
        request: &RouteRequest,
        operation: CartRateOperation,
    ) -> AppResult<VersionedCartService<'a, S>> {
        let buyer = auth::verify_buyer(self.seams, request)?;
        let context = RequestContext::parse(&request.context_json);
        let provider = TrustedCartProvider::from_host_context(&context)?;
        let key = CartRateKey::derive(&buyer.user_id, &provider, DEFAULT_LANE);
        match self.rate_policy {
            Some(policy) => policy.check(&key, operation)?,
            None => DurableRatePolicy::new(self.seams).check(&key, operation)?,
        }
        VersionedCartService::from_verified_buyer(self.seams, &buyer, provider)
    }
}

fn require_default_lane(lane: &str) -> AppResult<()> {
    if lane == DEFAULT_LANE {
        Ok(())
    } else {
        Err(AppError::unprocessable(
            "cart lane must be the fixed default lane",
        ))
    }
}

fn snapshot_response<S: HostSeams>(
    service: &VersionedCartService<'_, S>,
    lane: &str,
) -> AppResult<RouteResponse> {
    let (generation, authoritative) = service.read_authoritative(lane)?;
    Ok(RouteResponse::ok(&CartSnapshot {
        generation,
        authoritative,
    }))
}

fn parse_body<T: DeserializeOwned>(request: &RouteRequest) -> AppResult<T> {
    if request.body.len() > MAX_REQUEST_BODY_BYTES {
        return Err(AppError::new(
            413,
            "payload_too_large",
            "cart request body exceeds 16 KiB",
        ));
    }
    serde_json::from_value(request.json_body()?).map_err(|error| {
        AppError::bad_request("cart request body is invalid").with_internal(error.to_string())
    })
}
