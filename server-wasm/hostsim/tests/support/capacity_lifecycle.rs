//! Imported by capacity_contract. Stripe-shaped responses are synthetic; this
//! exercises the compiled job, durable grants and native read, not Stripe mode.
use super::*;
use cedros_pay_extension_domain::{ids, time};

#[tokio::test(flavor = "current_thread")]
async fn packaged_job_recovers_payment_then_replays_dispute_restoration_and_full_refund() {
    let sim = Sim::load(&component_path()).unwrap();
    configure(&sim);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let f: Value = serde_json::from_str(include_str!(
        "../../../../docs/contracts/capacity-v1/fixtures/portal-usage-capacity-v1.fixtures.json"
    ))
    .unwrap();
    let mut q = f["fixtures"]
        .as_array()
        .unwrap()
        .iter()
        .find(|f| f["id"] == "immutable-full-quote")
        .unwrap()["value"]["quote"]
        .clone();
    q["binding"]["payInstallationId"] = "fixture-install".into();
    q["binding"]["scope"]["organizationId"] = "org-a".into();
    q["binding"]["baseSubscriptionId"] = "base-a".into();
    q["capacityIncrease"]["meter"]["scope"]["organizationId"] = "org-a".into();
    q["createdAt"] = time::iso8601(now).into();
    q["effectiveAt"] = time::iso8601(now).into();
    q["expiresAt"] = time::iso8601(now + 300).into();
    q["paidThrough"] = time::iso8601(now + 86400 * 30).into();
    q["renewalAt"] = q["paidThrough"].clone();
    q["capacityIncrease"]["effectiveAt"] = q["effectiveAt"].clone();
    q["capacityIncrease"]["expiresAt"] = q["paidThrough"].clone();
    let snapshot = json!({"quoteDigest":digest(&q),"quote":q});
    let id = "fixture-purchase";
    let key = format!(
        "capacity:purchase:{}",
        digest(&json!(id)).trim_start_matches("sha256:")
    );
    let scope = json!({"payInstallationId":"fixture-install","environment":"test","organizationId":"org-a"});
    let purchase = json!({"capacityRecordType":"purchase","capacityScope":scope,"capacitySortKey":key,"data":{"purchaseId":id,"snapshot":snapshot,"material":{},"stripeCustomerId":"cus_org","authorizationId":"fixture-auth","originalPurchaserId":"fixture-buyer","acceptedAt":time::iso8601(now),"service":{"state":"pending","cancelEffectiveAt":null,"paidThrough":null,"freshness":{"state":"available","observedAt":time::iso8601(now),"validUntil":time::iso8601(now+60)}},"attempts":[],"grants":[],"providerSubscriptionId":"sub_fixture","reconcileAfter":time::iso8601(now),"invoiceCursor":null}});
    {
        let mut s = sim.store();
        s.seed(ids::MODEL_SUBSCRIPTIONS, &key, purchase);
        s.set_secret(ids::SECRET_STRIPE_KEY, "synthetic-test-secret");
    }
    let invoice = json!({"id":"in_fixture","customer":"cus_org","subscription":"sub_fixture","livemode":false,"currency":q["binding"]["terms"]["currency"].as_str().unwrap().to_ascii_lowercase(),"billing_reason":"subscription_create","status":"paid","paid":true,"paid_out_of_band":false,"amount_paid":q["totalDueMinor"],"amount_remaining":0,"total":q["totalDueMinor"],"amount_due":q["totalDueMinor"],"subtotal":q["subtotalMinor"],"tax":q["taxMinor"],"attempt_count":1,"charge":"ch_fixture","payment_intent":{"id":"pi_fixture","status":"succeeded"},"lines":{"has_more":false,"data":[]}});
    for (pass, (state, revision, hint)) in [
        ("paid", 1, false),
        ("paid", 1, true),
        ("open", 2, true),
        ("missing", 2, false), // Cleared flag + absent dispute details cannot restore.
        ("won", 3, true),
        ("refunded", 4, true),
        ("refunded", 4, false),
    ]
    .into_iter()
    .enumerate()
    {
        {
            let mut s = sim.store();
            let mut row = s.get(ids::MODEL_SUBSCRIPTIONS, &key).unwrap();
            row["data"]["reconcileAfter"] = time::iso8601(now).into();
            s.seed(ids::MODEL_SUBSCRIPTIONS, &key, row);
            s.push_http(200,&json!({"id":"sub_fixture","customer":"cus_org","livemode":false,"metadata":{"capacityPurchaseId":id,"capacityQuoteDigest":snapshot["quoteDigest"]},"status":"active","cancel_at":null,"cancel_at_period_end":false}).to_string());
            s.push_http(
                200,
                &json!({"data":[{"id":"in_fixture"}],"has_more":false}).to_string(),
            );
            s.push_http(200, &invoice.to_string());
            s.push_http(200,&json!({"id":"ch_fixture","customer":"cus_org","invoice":"in_fixture","livemode":false,"amount":q["totalDueMinor"],"amount_refunded":if state=="refunded"{q["totalDueMinor"].clone()}else{json!(0)},"disputed":state=="open"}).to_string());
            let disputes = if matches!(state, "open" | "won" | "refunded") {
                json!([{"id":"dp_fixture","charge":"ch_fixture","status":if state=="open"{"under_review"}else{"won"}}])
            } else {
                json!([])
            };
            s.push_http(200, &json!({"data":disputes,"has_more":false}).to_string());
            if hint {
                let event = format!(
                    "capacity:hint:{}",
                    digest(&json!([scope, revision])).trim_start_matches("sha256:")
                );
                s.service_responses
                    .push_back((202, json!({"accepted":true,"eventId":event}).to_string()));
            }
        }
        let (status, details) = sim
            .run_job(ids::JOB_SUBSCRIPTION_SYNC, "{}", 0)
            .await
            .unwrap();
        assert_eq!(
            status,
            if pass == 0 || state == "missing" {
                "retryable"
            } else {
                "succeeded"
            },
            "pass {pass}: {details}"
        );
        let body=json!({"contractVersion":"1.0.0","operationId":"capacity.grants.snapshot","delegationId":null,"requestKey":null,"command":{"organizationId":"org-a","cursor":null}}).to_string();
        let (status, body) = sim
            .handle(
                "POST",
                "/extensions/cedros-pay/capacity/v1/grants/snapshot",
                "cedros-pay:capacity-grants-snapshot-v1",
                vec![],
                vec![],
                &body,
                &context(
                    "cedros-data",
                    "cedros-pay:capacity-grants-snapshot-v1",
                    "org-a",
                ),
            )
            .await
            .unwrap();
        assert_eq!(status, 200, "{body}");
        let page: Value = serde_json::from_str(&body).unwrap();
        assert_eq!(page["sourceRevision"], revision);
        assert_eq!(page["grants"].as_array().unwrap().len(), revision as usize);
        let latest = page["grants"].as_array().unwrap().last().unwrap();
        assert_eq!(
            latest["state"],
            if matches!(state, "open" | "missing" | "refunded") {
                "revoked"
            } else {
                "active"
            }
        );
        assert_eq!(latest["snapshot"], snapshot);
    }
    let store = sim.store();
    assert_eq!(store.http_fetch_calls, 35);
    assert_eq!(
        store.get(ids::MODEL_SUBSCRIPTIONS, &key).unwrap()["data"]["providerSubscriptionId"],
        "sub_fixture"
    );
}
