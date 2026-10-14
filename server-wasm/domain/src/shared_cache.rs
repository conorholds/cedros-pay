//! Site-scoped Core shared-cache client for safe, redacted backend reads.

use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::conditional_batch;
use crate::error::{AppError, AppResult};
use crate::ids;
use crate::seams::HostSeams;

const GET: &str = "extension.cache.get";
const CLAIM_FILL: &str = "extension.cache.claim-fill";
const PUT: &str = "extension.cache.put";
const INVALIDATE: &str = "extension.cache.invalidate";
const LEASE_SECONDS: i64 = 10;

pub fn get_or_fill<S: HostSeams, F>(
    seams: &S,
    site_id: &str,
    request_id: &str,
    cache_key: &str,
    ttl_seconds: i64,
    load: F,
) -> AppResult<Value>
where
    F: FnOnce() -> AppResult<Value>,
{
    let scope_key = site_scope(site_id);
    let get = conditional_batch::execute(
        seams,
        ids::CACHE_DB_ACCESS,
        GET,
        json!({"scopeKey": scope_key, "cacheKey": cache_key}),
    );
    match get {
        Ok(output) if output["outcome"] == "hit" => return Ok(output["value"].clone()),
        Ok(_) => {}
        Err(error) => {
            seams.log("warn", "shared cache get failed; loading authoritatively");
            if error.status == 409 {
                seams.log("debug", "shared cache get conflict");
            }
            return load();
        }
    }

    let lease_owner = format!("request:{}", digest(request_id));
    let claim = conditional_batch::execute(
        seams,
        ids::CACHE_DB_ACCESS,
        CLAIM_FILL,
        json!({
            "scopeKey": scope_key,
            "cacheKey": cache_key,
            "leaseOwner": lease_owner,
            "leaseSeconds": LEASE_SECONDS,
        }),
    );
    let claim = match claim {
        Ok(output) if output["outcome"] == "hit" => return Ok(output["value"].clone()),
        Ok(output) => output,
        Err(_) => {
            seams.log(
                "warn",
                "shared cache fill claim failed; loading authoritatively",
            );
            return load();
        }
    };

    if claim["outcome"] == "follower" {
        // One race-closing read, then backpressure. Never run another loader
        // while a healthy cache explicitly reports an active fill lease.
        match conditional_batch::execute(
            seams,
            ids::CACHE_DB_ACCESS,
            GET,
            json!({"scopeKey": scope_key, "cacheKey": cache_key}),
        ) {
            Ok(output) if output["outcome"] == "hit" => return Ok(output["value"].clone()),
            Ok(_) => {
                seams.log("debug", "shared cache fill pending; retry request");
                return Err(AppError::new(
                    503,
                    "shared_cache_fill_pending",
                    "Configuration is refreshing; retry shortly",
                ));
            }
            Err(_) => {
                seams.log(
                    "warn",
                    "shared cache follower read failed; loading authoritatively",
                );
                return load();
            }
        }
    }

    let value = load()?;
    if claim["outcome"] == "leader" {
        let put = conditional_batch::execute(
            seams,
            ids::CACHE_DB_ACCESS,
            PUT,
            json!({
                "scopeKey": scope_key,
                "cacheKey": cache_key,
                "leaseOwner": lease_owner,
                "leaseToken": claim["leaseToken"],
                "ttlSeconds": ttl_seconds,
                "value": value,
            }),
        );
        if put.is_err() {
            seams.log("warn", "shared cache fill publish failed");
        }
    }
    Ok(value)
}

pub fn invalidate<S: HostSeams>(seams: &S, site_id: &str, cache_key: &str) {
    let result = conditional_batch::execute(
        seams,
        ids::CACHE_DB_ACCESS,
        INVALIDATE,
        json!({"scopeKey": site_scope(site_id), "cacheKey": cache_key}),
    );
    if result.is_err() {
        seams.log(
            "warn",
            "shared cache invalidation failed after authoritative commit",
        );
    }
}

fn site_scope(site_id: &str) -> String {
    format!("site:{}", digest(site_id))
}

fn digest(value: &str) -> String {
    hex::encode(&Sha256::digest(value.as_bytes())[..16])
}

#[cfg(test)]
mod tests {
    use std::cell::Cell;

    use super::*;
    use crate::fake::FakeSeams;

    #[test]
    fn shared_hit_avoids_the_authoritative_loader() {
        let seams = FakeSeams::new();
        seams.push_conditional_result(GET, json!({"outcome": "hit", "value": {"count": 7}}));
        let calls = Cell::new(0);

        let value = get_or_fill(&seams, "site-a", "request-a", "summary", 5, || {
            calls.set(calls.get() + 1);
            Ok(json!({"count": 8}))
        })
        .unwrap();

        assert_eq!(value["count"], 7);
        assert_eq!(calls.get(), 0);
    }

    #[test]
    fn leader_publishes_and_follower_reuses_the_completed_fill() {
        let leader = FakeSeams::new();
        leader.push_conditional_result(GET, json!({"outcome": "miss"}));
        leader.push_conditional_result(
            CLAIM_FILL,
            json!({"outcome": "leader", "leaseToken": "11111111-1111-1111-1111-111111111111"}),
        );
        leader.push_conditional_result(PUT, json!({"outcome": "stored"}));
        assert_eq!(
            get_or_fill(&leader, "site-a", "request-a", "summary", 5, || Ok(
                json!({"v": 1})
            ))
            .unwrap()["v"],
            1
        );
        assert_eq!(leader.db_batch_request_count(), 3);

        let follower = FakeSeams::new();
        follower.push_conditional_result(GET, json!({"outcome": "miss"}));
        follower.push_conditional_result(CLAIM_FILL, json!({"outcome": "follower"}));
        follower.push_conditional_result(GET, json!({"outcome": "hit", "value": {"v": 1}}));
        let calls = Cell::new(0);
        let value = get_or_fill(&follower, "site-a", "request-b", "summary", 5, || {
            calls.set(calls.get() + 1);
            Ok(json!({"v": 2}))
        })
        .unwrap();
        assert_eq!(value["v"], 1);
        assert_eq!(calls.get(), 0);
        assert_eq!(follower.db_batch_request_count(), 3);
    }

    #[test]
    fn cache_errors_are_recorded_before_direct_fallback() {
        let seams = FakeSeams::new();
        seams.push_conditional_error("cache unavailable");

        let value = get_or_fill(&seams, "site-a", "request-a", "summary", 5, || {
            Ok(json!({"authoritative": true}))
        })
        .unwrap();

        assert_eq!(value["authoritative"], true);
        assert!(seams
            .logs
            .borrow()
            .iter()
            .any(|(_, message)| message.contains("cache get failed")));
    }
    #[test]
    fn active_fill_lease_never_starts_a_duplicate_loader() {
        for _ in 0..100 {
            let seams = FakeSeams::new();
            seams.push_conditional_result(GET, json!({"outcome":"miss"}));
            seams.push_conditional_result(CLAIM_FILL, json!({"outcome":"follower"}));
            seams.push_conditional_result(GET, json!({"outcome":"miss"}));
            let result = get_or_fill(&seams, "site-a", "request-b", "summary", 5, || {
                panic!("follower must not call loader")
            });
            assert_eq!(result.unwrap_err().code, "shared_cache_fill_pending");
            assert_eq!(seams.db_batch_request_count(), 3);
        }
    }
}
