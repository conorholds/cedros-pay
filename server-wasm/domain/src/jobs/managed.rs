//! Bounded host-scheduled health checks and explicit unsupported job outcomes.
//! Retired job IDs stay registered for compatibility, but never report work
//! that Pay cannot perform through a published owner contract.

use serde_json::json;

use crate::db::{Db, Query};
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::reqresp::{JobExecution, JobOutcome};
use crate::seams::HostSeams;
use crate::time;

pub const UNSUPPORTED_JOBS: &[&str] = &[
    ids::JOB_SANCTIONS_REFRESH,
    ids::JOB_SANCTIONS_SWEEP,
    ids::JOB_BALANCE_ALERT,
    ids::JOB_EMAIL,
];

pub fn health_check<S: HostSeams>(seams: &S, exec: &JobExecution) -> AppResult<JobOutcome> {
    let metadata = exec.metadata();
    if !metadata.is_object()
        || metadata
            .get("includeProviders")
            .is_some_and(|value| !value.is_boolean())
    {
        return Err(AppError::bad_request(
            "health metadata requires an optional includeProviders boolean",
        ));
    }
    if metadata["includeProviders"] == true {
        return Ok(JobOutcome::failed(
            "provider health checks are unavailable; request a database-only check",
        ));
    }
    let db = Db::new(seams, ids::DB_ACCESS);
    let ledger_count = db.count(ids::MODEL_LEDGER, &Query::new())?;
    Ok(JobOutcome::succeeded(json!({
        "checkedAt": time::iso8601(seams.now_unix_secs()),
        "ledgerCount": ledger_count,
        "includeProviders": false,
    })))
}

pub fn subscription_sync<S: HostSeams>(seams: &S, exec: &JobExecution) -> AppResult<JobOutcome> {
    super::subscription_sync::run(seams, exec)
}

pub fn sanctions_refresh<S: HostSeams>(_seams: &S, _exec: &JobExecution) -> AppResult<JobOutcome> {
    Ok(JobOutcome::failed(
        "sanctions refresh requires a published Cedros Compliance binding",
    ))
}

pub fn sanctions_sweep<S: HostSeams>(_seams: &S, _exec: &JobExecution) -> AppResult<JobOutcome> {
    Ok(JobOutcome::failed(
        "sanctions screening requires a published Cedros Compliance binding",
    ))
}

pub fn balance_alert<S: HostSeams>(_seams: &S, _exec: &JobExecution) -> AppResult<JobOutcome> {
    Ok(JobOutcome::failed("balance alert delivery is unavailable"))
}

pub fn email<S: HostSeams>(_seams: &S, _exec: &JobExecution) -> AppResult<JobOutcome> {
    Ok(JobOutcome::failed(
        "transactional email queue delivery is unavailable",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fake::FakeSeams;
    use crate::reqresp::JobStatus;

    #[test]
    fn unsupported_jobs_fail_without_claiming_work_or_calling_providers() {
        for job_id in UNSUPPORTED_JOBS {
            let seams = FakeSeams::new();
            // Even plausible configuration cannot activate an unpublished implementation.
            let exec = JobExecution {
                job_id: (*job_id).into(),
                metadata_json: json!({"source":"configured","thresholdCents":100,"batchSize":1})
                    .to_string(),
                attempt: 1,
            };
            let outcome = crate::run_job(&seams, exec);
            assert_eq!(outcome.status, JobStatus::Failed, "{job_id}");
            let details: serde_json::Value = serde_json::from_str(&outcome.details_json).unwrap();
            assert!(details["failed"].is_string());
            assert!(details.get("checkedCount").is_none());
            assert!(details.get("sentCount").is_none());
            assert!(seams.http_requests.borrow().is_empty());
            assert!(seams.provider_requests.borrow().is_empty());
            assert_eq!(seams.db_batch_request_count(), 0);
        }
    }

    #[test]
    fn health_check_reports_only_database_work_and_rejects_unsupported_checks() {
        let seams = FakeSeams::new();
        let out = health_check(&seams, &JobExecution::default()).unwrap();
        assert_eq!(out.status, JobStatus::Succeeded);
        let details: serde_json::Value = serde_json::from_str(&out.details_json).unwrap();
        assert_eq!(details["ledgerCount"], 0);
        assert_eq!(details["includeProviders"], false);
        let out = health_check(
            &seams,
            &JobExecution {
                metadata_json: json!({"includeProviders":true}).to_string(),
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(out.status, JobStatus::Failed);
        for metadata in ["null", "broken", r#"{"includeProviders":"true"}"#] {
            assert_eq!(
                health_check(
                    &seams,
                    &JobExecution {
                        metadata_json: metadata.into(),
                        ..Default::default()
                    }
                )
                .unwrap_err()
                .status,
                400
            );
        }
    }
}
