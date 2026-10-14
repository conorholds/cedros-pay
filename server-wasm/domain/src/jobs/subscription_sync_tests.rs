use super::*;
use crate::fake::FakeSeams;

fn seed_subscription(
    s: &FakeSeams,
    key: &str,
    status: &str,
    provider: &str,
    current_period_end: &str,
    cancel_at_period_end: bool,
) {
    s.seed(
        ids::MODEL_SUBSCRIPTIONS,
        key,
        json!({
            "subscriptionId": key,
            "customerRef": "cus_1",
            "priceId": "price_1",
            "status": status,
            "provider": provider,
            "providerRef": key,
            "currentPeriodEnd": current_period_end,
            "cancelAtPeriodEnd": cancel_at_period_end,
            "createdAt": "2025-01-01T00:00:00Z",
            "updatedAt": "2025-01-01T00:00:00Z"
        }),
    );
}

#[test]
fn expires_stale_active_subscriptions_without_provider() {
    let s = FakeSeams::new();
    seed_subscription(
        &s,
        "sub_stale",
        "active",
        "stripe",
        "2026-01-01T00:00:00Z",
        false,
    );

    let out = run(&s, &JobExecution::default()).unwrap();

    assert_eq!(out.status, JobStatus::Succeeded);
    let details: Value = serde_json::from_str(&out.details_json).unwrap();
    assert_eq!(details["candidateCount"], 1);
    assert_eq!(details["syncedCount"], 1);
    assert_eq!(details["expiredCount"], 1);
    assert_eq!(details["updatedCount"], 1);
    assert_eq!(details["failedCount"], 0);
    assert_eq!(details["skippedReason"], "stripe_sync_not_configured");
    assert_eq!(s.http_requests.borrow().len(), 0);

    let stored = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_stale").unwrap();
    assert_eq!(stored["status"], "past_due");
    assert_eq!(stored["updatedAt"], "2026-05-31T12:00:00Z");
}

#[test]
fn dry_run_reports_expiry_without_writing() {
    let s = FakeSeams::new();
    seed_subscription(
        &s,
        "sub_dry",
        "trialing",
        "x402",
        "2026-01-01T00:00:00Z",
        true,
    );

    let out = run(
        &s,
        &JobExecution {
            metadata_json: json!({ "provider": "x402", "dryRun": true }).to_string(),
            ..Default::default()
        },
    )
    .unwrap();

    let details: Value = serde_json::from_str(&out.details_json).unwrap();
    assert_eq!(details["expiredCount"], 1);
    assert_eq!(details["updatedCount"], 0);
    assert_eq!(details["dryRun"], true);
    assert_eq!(details["skippedReason"], Value::Null);
    let stored = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_dry").unwrap();
    assert_eq!(stored["status"], "trialing");
    assert_eq!(stored["updatedAt"], "2025-01-01T00:00:00Z");
}

#[test]
fn rejects_invalid_metadata() {
    let s = FakeSeams::new();
    let err = run(
        &s,
        &JobExecution {
            metadata_json: json!({ "provider": "paypal" }).to_string(),
            ..Default::default()
        },
    )
    .unwrap_err();

    assert_eq!(err.status, 400);
    assert_eq!(err.code, "bad_request");
}

#[test]
fn reconciles_stripe_status_when_configured() {
    let s = FakeSeams::new();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    seed_subscription(
        &s,
        "sub_provider",
        "active",
        "stripe",
        "2026-12-01T00:00:00Z",
        false,
    );
    s.push_http_response(
        200,
        r#"{"id":"sub_provider","customer":"cus_1","status":"canceled","current_period_end":1796083200,"cancel_at_period_end":true}"#,
    );

    let out = run(
        &s,
        &JobExecution {
            metadata_json: json!({ "provider": "stripe", "limit": 10 }).to_string(),
            ..Default::default()
        },
    )
    .unwrap();

    assert_eq!(out.status, JobStatus::Succeeded);
    let details: Value = serde_json::from_str(&out.details_json).unwrap();
    assert_eq!(details["providerSyncedCount"], 1);
    assert_eq!(details["expiredCount"], 0);
    assert_eq!(details["updatedCount"], 1);
    let request = &s.http_requests.borrow()[0];
    assert_eq!(request["method"], "GET");
    assert_eq!(
        request["url"],
        "https://api.stripe.com/v1/subscriptions/sub_provider"
    );

    let stored = s
        .get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_provider")
        .unwrap();
    assert_eq!(stored["status"], "canceled");
    assert_eq!(stored["cancelAtPeriodEnd"], true);
}

#[test]
fn retries_past_due_subscription_and_recovers_provider_plan_and_access() {
    let s = FakeSeams::new();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    seed_subscription(
        &s,
        "sub_recovery",
        "past_due",
        "stripe",
        "2026-05-01T00:00:00Z",
        false,
    );
    s.push_http_response(
        200,
        r#"{"id":"sub_recovery","customer":"cus_1","status":"active","cancel_at_period_end":false,
            "items":{"data":[{"price":{"id":"price_recovered"},
            "current_period_end":1800000000}]}}"#,
    );

    let out = run(
        &s,
        &JobExecution {
            metadata_json: json!({ "provider": "stripe" }).to_string(),
            ..Default::default()
        },
    )
    .unwrap();

    assert_eq!(out.status, JobStatus::Succeeded);
    let stored = s
        .get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_recovery")
        .unwrap();
    assert_eq!(stored["status"], "active");
    assert_eq!(stored["priceId"], "price_recovered");
    assert_eq!(stored["currentPeriodEnd"], time::iso8601(1_800_000_000));
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
}

#[test]
fn reconciled_period_extension_submits_renewal_crm_event() {
    let s = FakeSeams::new();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    seed_subscription(
        &s,
        "sub_provider",
        "active",
        "stripe",
        "2026-06-01T00:00:00Z",
        false,
    );
    s.push_http_response(
        200,
        r#"{"id":"sub_provider","customer":"cus_1","status":"active","current_period_end":1800000000,"cancel_at_period_end":false}"#,
    );

    let out = run(
        &s,
        &JobExecution {
            metadata_json: json!({ "provider": "stripe" }).to_string(),
            ..Default::default()
        },
    )
    .unwrap();

    assert_eq!(out.status, JobStatus::Succeeded);
    let details: Value = serde_json::from_str(&out.details_json).unwrap();
    assert_eq!(details["updatedCount"], 1);
    assert_eq!(details["renewedCount"], 1);
    let stored = s
        .get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_provider")
        .unwrap();
    assert_eq!(stored["currentPeriodEnd"], time::iso8601(1800000000));

    let crm = s.crm_events.borrow();
    assert_eq!(crm[0].2, ids::CRM_EVENT_SUBSCRIPTION_RENEWED);
    assert_eq!(crm[0].3["customerId"], "cus_1");
    assert_eq!(crm[0].3["subscriptionRef"], "sub_provider");
    assert_eq!(crm[0].3["priceId"], "price_1");
    assert_eq!(
        crm[0].3["eventId"],
        format!(
            "subscription.renewed:sub_provider:{}",
            time::iso8601(1800000000)
        )
    );
}

#[test]
fn returns_retryable_for_provider_failures() {
    let s = FakeSeams::new();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    seed_subscription(
        &s,
        "sub_provider",
        "active",
        "stripe",
        "2026-12-01T00:00:00Z",
        false,
    );

    let out = run(&s, &JobExecution::default()).unwrap();

    assert_eq!(out.status, JobStatus::Retryable);
    let details: Value = serde_json::from_str(&out.details_json).unwrap();
    assert_eq!(details["failedCount"], 1);
    assert_eq!(details["updatedCount"], 0);
    assert_eq!(s.logs.borrow().len(), 1);
}

fn assert_candidates_respect_soonest_period_end(status: &str) {
    let s = FakeSeams::new();
    let late_a = format!("sub_{status}_a_late");
    let late_b = format!("sub_{status}_b_late");
    let soon = format!("sub_{status}_y_soon");
    let soonest = format!("sub_{status}_z_soonest");
    seed_subscription(&s, &late_a, status, "x402", "2026-04-30T00:00:00Z", false);
    seed_subscription(&s, &late_b, status, "x402", "2026-04-29T00:00:00Z", false);
    seed_subscription(&s, &soon, status, "x402", "2026-01-02T00:00:00Z", false);
    seed_subscription(&s, &soonest, status, "x402", "2026-01-01T00:00:00Z", false);

    let out = run(
        &s,
        &JobExecution {
            metadata_json: json!({ "provider": "x402", "limit": 2 }).to_string(),
            ..Default::default()
        },
    )
    .unwrap();

    assert_eq!(out.status, JobStatus::Succeeded);
    let details: Value = serde_json::from_str(&out.details_json).unwrap();
    assert_eq!(details["candidateCount"], 2);
    assert_eq!(details["expiredCount"], 2);
    assert_eq!(details["updatedCount"], 2);
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, &soonest).unwrap()["status"],
        "past_due"
    );
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, &soon).unwrap()["status"],
        "past_due"
    );
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, &late_a).unwrap()["status"],
        status
    );
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, &late_b).unwrap()["status"],
        status
    );
}

#[test]
fn active_candidates_respect_soonest_period_end_before_limit() {
    assert_candidates_respect_soonest_period_end("active");
}

#[test]
fn trialing_candidates_respect_soonest_period_end_before_limit() {
    assert_candidates_respect_soonest_period_end("trialing");
}

#[test]
fn sync_removes_stale_period_evidence_when_provider_period_is_absent() {
    let s = FakeSeams::new();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    seed_subscription(
        &s,
        "sub_basil",
        "active",
        "stripe",
        "2026-12-01T00:00:00Z",
        false,
    );
    // An active status with missing period evidence must not retain a stale
    // future deadline that would continue granting access.
    s.push_http_response(
        200,
        r#"{"id":"sub_basil","customer":"cus_1","status":"active","cancel_at_period_end":false}"#,
    );

    let out = run(
        &s,
        &JobExecution {
            metadata_json: json!({ "provider": "stripe", "limit": 10 }).to_string(),
            ..Default::default()
        },
    )
    .unwrap();

    assert_eq!(out.status, JobStatus::Succeeded);
    let stored = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_basil").unwrap();
    assert!(stored["currentPeriodEnd"].is_null());
    assert_eq!(stored["status"], "active");
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
}

#[test]
fn candidates_interleave_statuses_by_soonest_period_end() {
    let s = FakeSeams::new();
    // Two actives expiring later than the one trialing row. The old
    // active-bucket-first selection filled limit=2 with actives and starved
    // the trialing row indefinitely.
    seed_subscription(
        &s,
        "sub_active_a",
        "active",
        "x402",
        "2026-04-30T00:00:00Z",
        false,
    );
    seed_subscription(
        &s,
        "sub_active_b",
        "active",
        "x402",
        "2026-04-29T00:00:00Z",
        false,
    );
    seed_subscription(
        &s,
        "sub_trial_soon",
        "trialing",
        "x402",
        "2026-01-01T00:00:00Z",
        false,
    );

    let out = run(
        &s,
        &JobExecution {
            metadata_json: json!({ "provider": "x402", "limit": 2 }).to_string(),
            ..Default::default()
        },
    )
    .unwrap();

    assert_eq!(out.status, JobStatus::Succeeded);
    let details: Value = serde_json::from_str(&out.details_json).unwrap();
    assert_eq!(details["candidateCount"], 2);
    // The soonest-expiring across BOTH statuses were serviced...
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_trial_soon")
            .unwrap()["status"],
        "past_due"
    );
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_active_b")
            .unwrap()["status"],
        "past_due"
    );
    // ...and the latest-expiring active waits for the next batch.
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_active_a")
            .unwrap()["status"],
        "active"
    );
}

#[test]
fn stale_sync_cannot_overwrite_newer_terminal_projection_or_emit() {
    let s = FakeSeams::new();
    seed_subscription(
        &s,
        "sub_race",
        "active",
        "x402",
        "2026-01-01T00:00:00Z",
        false,
    );
    s.set_now(time::parse_iso("2026-02-01T00:00:00Z").unwrap());
    s.queue_guarded_race(vec![(
        ids::MODEL_SUBSCRIPTIONS,
        "sub_race",
        json!({
            "subscriptionId": "sub_race", "customerRef": "user-1", "priceId": "price-1",
            "status": "canceled", "provider": "x402", "providerRef": "sub_race",
            "currentPeriodEnd": "2027-01-01T00:00:00Z", "cancelAtPeriodEnd": true,
            "createdAt": "2025-01-01T00:00:00Z", "updatedAt": "2026-02-01T00:00:00Z"
        }),
    )]);

    let outcome = run(
        &s,
        &JobExecution {
            job_id: ids::JOB_SUBSCRIPTION_SYNC.into(),
            metadata_json: json!({ "provider": "x402" }).to_string(),
            ..Default::default()
        },
    )
    .unwrap();

    let stored = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_race").unwrap();
    assert_eq!(stored["status"], "canceled");
    assert_eq!(stored["currentPeriodEnd"], "2027-01-01T00:00:00Z");
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 0);
    let details: Value = serde_json::from_str(&outcome.details_json).unwrap();
    assert_eq!(details["updatedCount"], 0);
}

#[test]
fn rotating_passes_reach_unchanged_subscriptions_in_both_buckets() {
    let s = FakeSeams::new();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    for status in ["active", "trialing"] {
        for index in 0..7 {
            let id = format!("sub_{status}_{index}");
            seed_subscription(&s, &id, status, "stripe", "2027-01-01T00:00:00Z", false);
        }
    }
    let execution = JobExecution {
        metadata_json: json!({"limit":2}).to_string(),
        ..Default::default()
    };
    // Failed provider reads leave records unchanged. Sweep progress must still
    // reach every row instead of retrying the first two on every invocation.
    for _ in 0..16 {
        run(&s, &execution).unwrap();
    }
    let requests = s.http_requests.borrow();
    for status in ["active", "trialing"] {
        for index in 0..7 {
            let id = format!("sub_{status}_{index}");
            assert!(
                requests
                    .iter()
                    .any(|request| request["url"].as_str().unwrap().ends_with(&id)),
                "{id} was starved"
            );
        }
    }
}

#[test]
fn dry_run_does_not_advance_sweep_progress() {
    let s = FakeSeams::new();
    run(
        &s,
        &JobExecution {
            metadata_json: json!({"dryRun":true}).to_string(),
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(s.entry_count(ids::MODEL_SUBSCRIPTIONS), 0);
}

#[test]
fn provider_can_shorten_period_and_resume_cancellation() {
    let s = FakeSeams::new();
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    seed_subscription(
        &s,
        "sub_resume",
        "active",
        "stripe",
        "2030-01-01T00:00:00Z",
        true,
    );
    s.push_http_response(200, r#"{"id":"sub_resume","customer":"cus_1","status":"active","current_period_end":1800000000,"cancel_at_period_end":false}"#);
    run(&s, &JobExecution::default()).unwrap();
    let stored = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_resume").unwrap();
    assert_eq!(stored["currentPeriodEnd"], time::iso8601(1_800_000_000));
    assert_eq!(stored["cancelAtPeriodEnd"], false);
    assert_eq!(stored["lastProviderEventAt"], s.now_unix_secs());
    assert_eq!(s.event_count(ids::EVENT_ENTITLEMENT_CHANGED), 1);
}

#[test]
fn outage_at_cancel_deadline_does_not_prevent_later_provider_recovery() {
    let s = FakeSeams::new();
    seed_subscription(
        &s,
        "sub_resume",
        "active",
        "stripe",
        "2026-01-01T00:00:00Z",
        true,
    );
    run(&s, &JobExecution::default()).unwrap();
    assert_eq!(
        s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_resume").unwrap()["status"],
        "past_due"
    );
    s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
    s.push_http_response(200, r#"{"id":"sub_resume","customer":"cus_1","status":"active","current_period_end":1800000000,"cancel_at_period_end":false}"#);
    run(&s, &JobExecution::default()).unwrap();
    let stored = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_resume").unwrap();
    assert_eq!(stored["status"], "active");
    assert_eq!(stored["cancelAtPeriodEnd"], false);
}

#[test]
fn sync_binds_legacy_cedros_subject_to_verified_stripe_customer_without_changing_owner() {
    for trusted in [true, false] {
        let s = FakeSeams::new();
        s.set_secret(ids::SECRET_STRIPE_KEY, "sk_test_x");
        seed_subscription(
            &s,
            "sub_user",
            "past_due",
            "stripe",
            "2026-01-01T00:00:00Z",
            false,
        );
        let mut old = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_user").unwrap();
        old["customerRef"] = json!("cedros-user");
        s.seed(ids::MODEL_SUBSCRIPTIONS, "sub_user", old.clone());
        s.push_http_response(200, &json!({"id":"sub_user","customer":"cus_provider","status":"active","current_period_end":1800000000,"cancel_at_period_end":false,"metadata":{"user_id":"cedros-user","user_id_trusted":trusted.to_string()}}).to_string());
        let out = run(&s, &JobExecution::default()).unwrap();
        let stored = s.get_entry(ids::MODEL_SUBSCRIPTIONS, "sub_user").unwrap();
        assert_eq!(stored["customerRef"], "cedros-user");
        if trusted {
            assert_eq!(out.status, JobStatus::Succeeded);
            assert_eq!(stored["stripeCustomerId"], "cus_provider");
            assert_eq!(stored["status"], "active");
        } else {
            assert_eq!(out.status, JobStatus::Retryable);
            assert_eq!(stored, old);
        }
    }
}
