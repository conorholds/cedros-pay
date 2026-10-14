//! Synthetic contract tests; none contact Stripe or activate catalog products.
use super::*;
fn accounting_v2(s: &FakeSeams) {
    let mut c: Value =
        serde_json::from_str(&s.setting_get(config::SETTING).unwrap().unwrap()).unwrap();
    c["organizations"]["example-org-a"]["accountingVersion"] = json!(2);
    s.setting_set(config::SETTING, &c.to_string()).unwrap();
}
fn addon(s: &FakeSeams, handle: &str, service_id: &str, meter: &str, unit: &str) -> Value {
    let mut p = seed_catalog(s);
    p["id"] = handle.into();
    p["stableHandle"] = handle.into();
    let t = &mut p["metadata"]["capacityV1"]["terms"];
    t["serviceId"] = service_id.into();
    t["meterId"] = meter.into();
    t["unit"] = unit.into();
    let occupancy = matches!(unit, "site" | "byte");
    t["resetKind"] = if occupancy {
        "occupancy"
    } else {
        "calendar_month"
    }
    .into();
    t["allowanceBasis"] = if occupancy {
        "simultaneous_occupancy"
    } else {
        "per_calendar_month"
    }
    .into();
    if unit == "credit" {
        p["metadata"]["capacityV1"]["purchasedCreditPolicy"] =
            "calendar_month_recurring_no_rollover".into();
    }
    s.seed(crate::ids::MODEL_CATALOG, handle, p.clone());
    p
}
fn offers(s: &FakeSeams) -> Value {
    let target = json!({"scope":{"organizationId":"example-org-a","siteId":null},"baseSubscriptionId":"example-base-subscription"});
    delegation(s);
    scope(s, &target);
    let out = handle(s, &request("capacity.offers", target, None, false));
    assert_eq!(out.status, 200, "{}", out.body);
    serde_json::from_str(&out.body).unwrap()
}
fn offered<'a>(out: &'a Value, id: &str) -> &'a Value {
    out["offers"]
        .as_array()
        .unwrap()
        .iter()
        .find(|o| o["offerId"] == id)
        .unwrap()
}
#[test]
fn all_upgrade_mappings_resolve_explicit_terms_and_storage_is_occupancy() {
    let s = setup();
    accounting_v2(&s);
    for (handle, service, meter, unit) in catalog::HANDLES {
        addon(&s, handle, service, meter, unit);
    }
    let out = offers(&s);
    assert_eq!(out["offers"].as_array().unwrap().len(), 4);
    for (handle, service, meter, unit) in catalog::HANDLES {
        let o = offered(&out, handle);
        assert_eq!(o["purchasable"], true, "{o}");
        assert_eq!(o["terms"]["serviceId"], service);
        assert_eq!(o["terms"]["meterId"], meter);
        assert_eq!(o["terms"]["unit"], unit);
        assert_eq!(o["terms"]["purchaseMode"], "recurring");
        assert_eq!(o["terms"]["cancellation"], "paid_through");
        assert!(crate::routes::products::is_capacity_handle(handle));
    }
    let storage = offered(&out, "cedros-addon-storage-v2");
    assert_eq!(storage["scopeKind"], "organization");
    assert_eq!(storage["terms"]["resetKind"], "occupancy");
    assert_eq!(storage["terms"]["allowanceBasis"], "simultaneous_occupancy");
    assert!(s.http_requests.borrow().is_empty());
}
#[test]
fn unavailable_or_unapproved_storage_and_credit_terms_never_sell() {
    let s = setup();
    let id = "cedros-addon-storage-v2";
    assert_eq!(offered(&offers(&s), id)["purchasable"], false);
    let mut p = addon(&s, id, "storage", "storage.occupied-bytes", "byte");
    assert_eq!(offered(&offers(&s), id)["purchasable"], false); // Explicit accounting cutover required.
    accounting_v2(&s);
    p["metadata"]["capacityV1"]["terms"]["resetKind"] = "calendar_month".into();
    p["metadata"]["capacityV1"]["terms"]["allowanceBasis"] = "per_calendar_month".into();
    s.seed(crate::ids::MODEL_CATALOG, id, p);
    assert_eq!(offered(&offers(&s), id)["purchasable"], false);
    let mut p = addon(&s, id, "storage", "storage.occupied-bytes", "byte");
    p["metadata"]["capacityV1"]["commercialApprovalId"] = Value::Null;
    s.seed(crate::ids::MODEL_CATALOG, id, p);
    assert_eq!(offered(&offers(&s), id)["reason"], "terms_unapproved");
    let id = "cedros-addon-managed-credits-v2";
    let mut p = addon(&s, id, "managed-services", "managed.credits", "credit");
    for policy in [Value::Null, json!("rollover"), json!("one_time")] {
        p["metadata"]["capacityV1"]["purchasedCreditPolicy"] = policy;
        s.seed(crate::ids::MODEL_CATALOG, id, p.clone());
        assert_eq!(offered(&offers(&s), id)["purchasable"], false);
    }
}
#[test]
fn full_refund_revokes_once_and_cannot_be_restored_by_stale_payment_or_dispute_win() {
    let s = setup();
    let id = accepted(&s);
    let paid = invoice(&s, &id, "subscription_create", "in_initial", true);
    grants::invoice(&s, &purchase::read(&s, &id).unwrap(), &paid, None, None).unwrap();
    let original = purchase::read(&s, &id).unwrap().payload["data"]["grants"][0].clone();
    s.set_now(s.now_unix_secs() + 10);
    let charge = json!({"id":"ch_full","customer":"cus_org","invoice":"in_initial","livemode":false,"amount":paid["total"],"amount_refunded":paid["total"],"disputed":false});
    for _ in 0..2 {
        grants::invoice(
            &s,
            &purchase::read(&s, &id).unwrap(),
            &paid,
            Some(&charge),
            None,
        )
        .unwrap();
    }
    let row = purchase::read(&s, &id).unwrap();
    let gs = row.payload["data"]["grants"].as_array().unwrap();
    assert_eq!(gs.len(), 2);
    assert_eq!(gs[1]["state"], "revoked");
    assert_eq!(gs[1]["financialState"], "refunded");
    assert_eq!(gs[1]["revision"], 2);
    assert_eq!(
        gs[1]["revocationEffectiveAt"],
        time::iso8601(s.now_unix_secs())
    );
    for k in [
        "allowance",
        "effectiveAt",
        "expiresAt",
        "snapshot",
        "grantId",
    ] {
        assert_eq!(gs[1][k], original[k]);
    }
    assert_eq!(row.payload["data"]["attempts"][0]["refundRevision"], 1);
    assert!(grants::invoice(&s, &row, &paid, None, None).is_err());
    let won = json!({"id":"dp_refunded","charge":"ch_full","status":"won"});
    grants::invoice(
        &s,
        &purchase::read(&s, &id).unwrap(),
        &paid,
        Some(&charge),
        Some(&won),
    )
    .unwrap();
    assert_eq!(
        purchase::read(&s, &id).unwrap().payload["data"]["grants"]
            .as_array()
            .unwrap()
            .len(),
        2
    );
    let head = store::get(
        &s,
        &store::key("scope", &row.payload["capacityScope"]).unwrap(),
    )
    .unwrap()
    .unwrap();
    assert_eq!(head.payload["sourceRevision"], 2);
    let out = handle(
        &s,
        &request(
            "capacity.grants.snapshot",
            json!({"organizationId":"example-org-a","cursor":null}),
            None,
            true,
        ),
    );
    assert_eq!(out.status, 200);
    let page: Value = serde_json::from_str(&out.body).unwrap();
    assert_eq!(page["grants"][1]["state"], "revoked");
}
#[test]
fn delayed_initial_payment_activates_only_after_confirmation_without_shifting_terms() {
    let s = setup();
    let id = accepted(&s);
    let original = purchase::read(&s, &id).unwrap().payload["data"]["snapshot"].clone();
    let mut pending = invoice(&s, &id, "subscription_create", "in_delayed", false);
    pending["payment_intent"]["status"] = "processing".into();
    grants::invoice(&s, &purchase::read(&s, &id).unwrap(), &pending, None, None).unwrap();
    let row = purchase::read(&s, &id).unwrap();
    assert_eq!(row.payload["data"]["grants"], json!([]));
    assert_eq!(
        row.payload["data"]["attempts"][0]["payment"]["state"],
        "pending"
    );
    s.set_now(s.now_unix_secs() + 3600);
    let paid = invoice(&s, &id, "subscription_create", "in_delayed", true);
    for _ in 0..2 {
        grants::invoice(&s, &purchase::read(&s, &id).unwrap(), &paid, None, None).unwrap();
    }
    let row = purchase::read(&s, &id).unwrap();
    let grants = row.payload["data"]["grants"].as_array().unwrap();
    assert_eq!(grants.len(), 1);
    assert_eq!(grants[0]["state"], "active");
    assert_eq!(grants[0]["snapshot"], original);
    assert_eq!(grants[0]["effectiveAt"], original["quote"]["effectiveAt"]);
    assert_eq!(grants[0]["expiresAt"], original["quote"]["paidThrough"]);
}

#[test]
fn paid_renewal_replays_without_refilling_or_repricing_existing_interval() {
    let s = setup();
    let id = accepted(&s);
    let initial = invoice(&s, &id, "subscription_create", "in_initial", true);
    grants::invoice(&s, &purchase::read(&s, &id).unwrap(), &initial, None, None).unwrap();
    let row = purchase::read(&s, &id).unwrap();
    let old = row.payload["data"]["grants"][0].clone();
    let boundary = wire::stamp(&old, "expiresAt").unwrap();
    s.set_now(boundary);
    let renewal = invoice(&s, &id, "subscription_cycle", "in_renewal", true);
    for _ in 0..2 {
        grants::invoice(&s, &purchase::read(&s, &id).unwrap(), &renewal, None, None).unwrap();
    }
    let row = purchase::read(&s, &id).unwrap();
    let gs = row.payload["data"]["grants"].as_array().unwrap();
    assert_eq!(gs.len(), 2);
    assert_eq!(gs[0], old);
    assert_eq!(gs[1]["effectiveAt"], old["expiresAt"]);
    assert_eq!(gs[1]["allowance"], old["allowance"]);
    assert_eq!(
        gs[1]["snapshot"]["quote"]["binding"],
        old["snapshot"]["quote"]["binding"]
    );
    s.set_now(wire::stamp(&gs[1], "expiresAt").unwrap());
    assert_eq!(
        purchase::projection(&row, s.now_unix_secs()).unwrap()["service"]["state"],
        "ended"
    );
}

#[test]
fn existing_subscription_job_recovers_paid_grants_after_data_outage_without_a_new_worker() {
    let s = setup();
    let id = accepted(&s);
    s.set_secret(crate::ids::SECRET_STRIPE_KEY, "synthetic-only");
    let row = purchase::read(&s, &id).unwrap();
    let paid = invoice(&s, &id, "subscription_create", "in_initial", true);
    let event = store::key("hint", &json!([row.payload["capacityScope"], 1])).unwrap();
    let exec = crate::reqresp::JobExecution {
        job_id: crate::ids::JOB_SUBSCRIPTION_SYNC.into(),
        ..Default::default()
    };
    for pass in 0..2 {
        s.push_http_response(200,&json!({"id":"sub_capacity","customer":"cus_org","livemode":false,"metadata":{"capacityPurchaseId":id,"capacityQuoteDigest":row.payload["data"]["snapshot"]["quoteDigest"]},"status":"active","cancel_at":null,"cancel_at_period_end":false}).to_string());
        s.push_http_response(
            200,
            &json!({"data":[{"id":"in_initial"}],"has_more":false}).to_string(),
        );
        s.push_http_response(200, &paid.to_string());
        if pass == 1 {
            service(&s, json!({"accepted":true,"eventId":event}));
        }
        let out = crate::router::run_job(&s, exec.clone());
        assert_eq!(
            out.status,
            if pass == 0 {
                crate::reqresp::JobStatus::Retryable
            } else {
                crate::reqresp::JobStatus::Succeeded
            },
            "{}",
            out.details_json
        );
        assert_eq!(
            purchase::read(&s, &id).unwrap().payload["data"]["grants"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
        s.set_now(s.now_unix_secs() + 900); // Next declared 15-minute tick, not another worker.
    }
    assert!(s
        .http_requests
        .borrow()
        .iter()
        .all(|r| r["method"] == "GET"));
}
#[test]
fn slow_provider_defers_durable_work_within_the_existing_job_budget() {
    let s = setup();
    let id = accepted(&s);
    s.set_secret(crate::ids::SECRET_STRIPE_KEY, "synthetic-only");
    let row = purchase::read(&s, &id).unwrap();
    let budget = crate::work_budget::WorkBudget::new(&s);
    s.set_now(s.now_unix_secs() + 240); // Time already consumed by base subscription work.
    s.push_http_time_advance(31);
    s.push_http_response(200,&json!({"id":"sub_capacity","customer":"cus_org","livemode":false,"metadata":{"capacityPurchaseId":id,"capacityQuoteDigest":row.payload["data"]["snapshot"]["quoteDigest"]},"status":"active","cancel_at":null,"cancel_at_period_end":false}).to_string());
    assert!(reconcile::run_with_budget(&s, &budget).is_err());
    assert_eq!(s.http_requests.borrow().len(), 1); // No second provider request after exhaustion.
    let current = purchase::read(&s, &id).unwrap();
    assert_eq!(current.payload["data"]["grants"], json!([]));
    assert_eq!(
        current.payload["data"]["snapshot"],
        row.payload["data"]["snapshot"]
    );
    assert_eq!(
        current.payload["data"]["providerSubscriptionId"],
        "sub_capacity"
    );
}
#[test]
fn declared_reconciliation_schedule_is_unique_disabled_and_not_claimed_as_installed() {
    let manifest: Value =
        serde_json::from_str(include_str!("../../../../cedros-extension.manifest.json")).unwrap();
    let schedules: Vec<_> = manifest["jobSchedules"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|s| s["jobId"] == crate::ids::JOB_SUBSCRIPTION_SYNC)
        .collect();
    assert_eq!(schedules.len(), 1);
    let schedule = schedules[0];
    assert_eq!(schedule["id"], "cedros-pay:schedule-subscription-sync");
    assert_eq!(schedule["enabled"], false);
    assert_eq!(schedule["cron"], "*/15 * * * *");
    assert_eq!(schedule["timeoutSeconds"], 300);
    assert_eq!(schedule["maxRetries"], 0);
    let jobs = crate::router::list_jobs();
    assert_eq!(
        jobs.iter()
            .filter(|j| j.job_id == crate::ids::JOB_SUBSCRIPTION_SYNC)
            .count(),
        1
    );
}

#[test]
fn pending_data_notification_is_not_starved_by_slow_provider_recovery() {
    let s = setup();
    let id = accepted(&s);
    s.set_secret(crate::ids::SECRET_STRIPE_KEY, "synthetic-only");
    let row = purchase::read(&s, &id).unwrap();
    let paid = invoice(&s, &id, "subscription_create", "in_initial", true);
    grants::invoice(&s, &row, &paid, None, None).unwrap();
    let scope = &row.payload["capacityScope"];
    let head_key = store::key("scope", scope).unwrap();
    let event = store::key("hint", &json!([scope, 1])).unwrap();
    service(&s, json!({"accepted":true,"eventId":event}));
    let budget = crate::work_budget::WorkBudget::new(&s);
    s.set_now(s.now_unix_secs() + 240);
    s.push_http_time_advance(31);
    s.push_http_response(200,&json!({"id":"sub_capacity","customer":"cus_org","livemode":false,"metadata":{"capacityPurchaseId":id,"capacityQuoteDigest":row.payload["data"]["snapshot"]["quoteDigest"]},"status":"active","cancel_at":null,"cancel_at_period_end":false}).to_string());
    assert!(reconcile::run_with_budget(&s, &budget).is_err());
    let head = store::get(&s, &head_key).unwrap().unwrap();
    assert_eq!(head.payload["hintDeliveredRevision"], 1);
    assert_eq!(head.payload["sourceRevision"], 1);
    assert_eq!(s.http_requests.borrow().len(), 1);
}

#[test]
fn dispute_restoration_requires_explicit_won_outcome_when_charge_flag_clears() {
    let s = setup();
    let id = accepted(&s);
    let paid = invoice(&s, &id, "subscription_create", "in_initial", true);
    grants::invoice(&s, &purchase::read(&s, &id).unwrap(), &paid, None, None).unwrap();
    let mut charge = json!({"id":"ch_dispute","customer":"cus_org","invoice":"in_initial","livemode":false,"amount":paid["total"],"amount_refunded":0,"disputed":true});
    let mut dispute = json!({"id":"dp_explicit","charge":"ch_dispute","status":"under_review"});
    grants::invoice(
        &s,
        &purchase::read(&s, &id).unwrap(),
        &paid,
        Some(&charge),
        Some(&dispute),
    )
    .unwrap();
    let revoked = purchase::read(&s, &id).unwrap();
    charge["disputed"] = false.into();
    assert!(grants::invoice(&s, &revoked, &paid, Some(&charge), None).is_err());
    assert_eq!(purchase::read(&s, &id).unwrap().payload, revoked.payload);
    dispute["status"] = "won".into();
    grants::invoice(&s, &revoked, &paid, Some(&charge), Some(&dispute)).unwrap();
    let restored = purchase::read(&s, &id).unwrap();
    assert_eq!(restored.payload["data"]["grants"][2]["state"], "active");
    // An incomplete read must not erase the terminal dispute observation.
    assert!(grants::invoice(&s, &restored, &paid, Some(&charge), None).is_err());
    dispute["status"] = "under_review".into();
    assert!(grants::invoice(&s, &restored, &paid, Some(&charge), Some(&dispute)).is_err());
}
