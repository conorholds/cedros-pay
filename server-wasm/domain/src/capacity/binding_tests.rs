use super::*;
fn binding_setup() -> FakeSeams {
    let s = setup();
    configure(&s, |c| {
        c["salesEnabled"] = false.into();
        c["organizations"]["example-org-a"]["baseCustomerRefs"] =
            json!({"example-base-subscription":"approved-customer"});
        c["organizations"]["example-org-a"]["canonicalSiteIds"] = json!(["canonical-site"]);
        c["organizations"]["example-org-a"]["basePlanAllowances"] = json!({"plan-a":{"approvalId":"synthetic-test-approval","includedAllowances":[allowance("sites.count","site",null(),5),allowance("email.storage-bytes","byte",json!("canonical-site"),10)]}});
    });
    s.seed(
        crate::ids::MODEL_CATALOG,
        "plan-a",
        json!({"productType":"subscription","title":"Base plan"}),
    );
    s.seed(store::MODEL,"example-base-subscription",json!({"subscriptionId":"example-base-subscription","customerRef":"approved-customer","productId":"plan-a","status":"active","currentPeriodEnd":time::iso8601(s.now_unix_secs()+30)}));
    s
}
fn null() -> Value {
    Value::Null
}
fn allowance(meter: &str, unit: &str, site: Value, amount: u64) -> Value {
    json!({"meterId":meter,"unit":unit,"siteId":site,"included":amount,"limitState":"limited","offerIds":[]})
}
fn configure(s: &FakeSeams, f: impl FnOnce(&mut Value)) {
    let mut c: Value =
        serde_json::from_str(&s.setting_get(config::SETTING).unwrap().unwrap()).unwrap();
    f(&mut c);
    s.setting_set(config::SETTING, &c.to_string()).unwrap();
}
fn read(s: &FakeSeams) -> RouteResponse {
    handle(
        s,
        &request(
            "capacity.binding.read",
            json!({"organizationId":"example-org-a"}),
            None,
            true,
        ),
    )
}
fn output(s: &FakeSeams) -> Value {
    let out = read(s);
    assert_eq!(out.status, 200, "{}", out.body);
    serde_json::from_str(&out.body).unwrap()
}
#[test]
fn binding_is_complete_scoped_fresh_and_revision_stable_without_callbacks() {
    let s = binding_setup();
    configure(&s, |config| {
        let allowances = config["organizations"]["example-org-a"]["basePlanAllowances"]["plan-a"]
            ["includedAllowances"]
            .as_array_mut()
            .unwrap();
        allowances.push(allowance("voice.audio-seconds", "second", null(), 600));
        allowances.push(allowance("seo.requests", "request", null(), 100));
    });
    let out = output(&s);
    let base = &out["subscriptions"][0];
    assert_eq!(base["subscriptionName"], "Base plan");
    assert_eq!(base["status"], "eligible");
    assert_eq!(base["includedAllowances"].as_array().unwrap().len(), 12);
    for meter in ["voice.audio-seconds", "seo.requests"] {
        let historical = base["includedAllowances"]
            .as_array()
            .unwrap()
            .iter()
            .find(|allowance| allowance["meterId"] == meter)
            .unwrap();
        assert_eq!(historical["limitState"], "unconfigured");
        assert!(historical["included"].is_null());
        assert_eq!(historical["offerIds"], json!([]));
    }
    assert_eq!(
        out["freshness"]["validUntil"],
        time::iso8601(s.now_unix_secs() + 30)
    );
    assert!(!out.to_string().contains("approved-customer"));
    assert!(!out.to_string().contains("cus_org"));
    s.set_now(s.now_unix_secs() + 1);
    assert_eq!(output(&s)["bindingRevision"], out["bindingRevision"]);
    s.set_now(s.now_unix_secs() + 30);
    let expired = output(&s);
    assert_ne!(expired["bindingRevision"], out["bindingRevision"]);
    assert_eq!(expired["subscriptions"][0]["status"], "billing_recovery");
    assert_eq!(expired["subscriptions"][0]["includedAllowances"], json!([]));
    assert!(s.service_requests.borrow().is_empty());
    assert!(s.http_requests.borrow().is_empty());
}
#[test]
fn binding_native_authority_is_exact_and_never_delegates() {
    let s = binding_setup();
    let good = request(
        "capacity.binding.read",
        json!({"organizationId":"example-org-a"}),
        None,
        true,
    );
    for (from, to) in [
        ("cedros-data", "cedros-portal"),
        ("cedros-data", "attacker"),
        ("capacity-binding-read-v1", "capacity-purchase-read-v1"),
        ("example-org-a", "other-org"),
        ("\"authenticated\":true", "\"authenticated\":false"),
    ] {
        let mut req = good.clone();
        req.context_json = req.context_json.replace(from, to);
        assert_eq!(handle(&s, &req).status, 403, "{from} -> {to}");
    }
    for field in ["delegationId", "requestKey"] {
        let mut req = good.clone();
        let mut body: Value = serde_json::from_str(&req.body).unwrap();
        body[field] = "forbidden-value".into();
        req.body = body.to_string();
        assert!(matches!(handle(&s, &req).status, 403 | 422));
    }
    assert!(s.service_requests.borrow().is_empty());
}
#[test]
fn binding_missing_mapping_is_unconfigured_but_missing_source_is_unavailable() {
    let s = binding_setup();
    configure(&s, |c| {
        c["organizations"]["example-org-a"]["basePlanAllowances"] = json!({})
    });
    assert!(output(&s)["subscriptions"][0]["includedAllowances"]
        .as_array()
        .unwrap()
        .iter()
        .all(|a| a["limitState"] == "unconfigured" && a["included"].is_null()));
    configure(&s, |c| {
        c["organizations"]["example-org-a"]["baseCustomerRefs"] = json!({})
    });
    assert_eq!(read(&s).status, 503);
    configure(&s, |c| {
        c["organizations"]["example-org-a"]["baseSubscriptionIds"] = json!([])
    });
    assert_eq!(output(&s)["subscriptions"], json!([]));
    configure(&s, |c| c["organizations"] = json!({}));
    assert_eq!(read(&s).status, 503);
}
#[test]
fn binding_rejects_ambiguous_ownership_allowances_and_wrong_local_scope() {
    let invalid = [
        json!([
            allowance("sites.count", "site", null(), 5),
            allowance("sites.count", "site", null(), 5)
        ]),
        json!([allowance("sites.count", "request", null(), 5)]),
        json!([allowance("email.storage-bytes", "byte", null(), 5)]),
        json!([allowance(
            "email.storage-bytes",
            "byte",
            json!("foreign-site"),
            5
        )]),
        json!([allowance("sites.count", "site", json!("canonical-site"), 5)]),
    ];
    for rows in invalid {
        let s = binding_setup();
        configure(&s, |c| {
            c["organizations"]["example-org-a"]["basePlanAllowances"]["plan-a"]
                ["includedAllowances"] = rows
        });
        assert_eq!(read(&s).status, 503);
    }
    let s = binding_setup();
    configure(&s, |c| {
        c["organizations"]["example-org-a"]["baseSubscriptionIds"] =
            json!(["example-base-subscription", "example-base-subscription"])
    });
    assert_eq!(read(&s).status, 503);
    let s = binding_setup();
    configure(&s, |c| {
        c["organizations"]["example-org-a"]["baseCustomerRefs"]["example-base-subscription"] =
            "foreign-customer".into()
    });
    assert_eq!(read(&s).status, 503);
}
#[test]
fn binding_recovery_excludes_unpaid_periods_addons_and_conflicting_totals() {
    let s = binding_setup();
    let mut base = store::get(&s, "example-base-subscription")
        .unwrap()
        .unwrap()
        .payload;
    base["status"] = "past_due".into();
    s.seed(store::MODEL, "example-base-subscription", base.clone());
    assert_eq!(output(&s)["subscriptions"][0]["status"], "billing_recovery");
    assert!(output(&s)["subscriptions"][0]["includedAllowances"]
        .as_array()
        .unwrap()
        .is_empty());
    base["status"] = "active".into();
    s.seed(store::MODEL, "example-base-subscription", base.clone());
    configure(&s, |c| {
        let o = &mut c["organizations"]["example-org-a"];
        o["baseSubscriptionIds"] = json!(["example-base-subscription", "addon"]);
        o["baseCustomerRefs"]["addon"] = "approved-customer".into();
    });
    base["subscriptionId"] = "addon".into();
    base["productId"] = "addon-plan".into();
    s.seed(store::MODEL, "addon", base.clone());
    s.seed(
        crate::ids::MODEL_CATALOG,
        "addon-plan",
        json!({"productType":"capacityAddOn","title":"Additional capacity"}),
    );
    assert_eq!(output(&s)["subscriptions"].as_array().unwrap().len(), 1);
    s.seed(
        crate::ids::MODEL_CATALOG,
        "addon-plan",
        json!({"productType":"subscription","title":"Other base"}),
    );
    assert_eq!(read(&s).status, 503); // Missing second mapping conflicts with known finite units.
    configure(&s, |c| {
        let o = &mut c["organizations"]["example-org-a"];
        o["basePlanAllowances"]["addon-plan"] = o["basePlanAllowances"]["plan-a"].clone();
    });
    assert_eq!(output(&s)["subscriptions"].as_array().unwrap().len(), 2);
    configure(&s, |c| {
        c["organizations"]["example-org-a"]["basePlanAllowances"]["addon-plan"]
            ["includedAllowances"][0]["included"] = json!(9_007_199_254_740_991_u64)
    });
    assert_eq!(read(&s).status, 503);
}

#[test]
fn binding_offers_are_server_resolved_per_meter_while_sales_stay_disabled() {
    let s = binding_setup();
    seed_catalog(&s);
    let out = output(&s);
    let base = &out["subscriptions"][0];
    assert_eq!(base["offerIds"], json!(["cedros-addon-sites"]));
    for a in base["includedAllowances"].as_array().unwrap() {
        assert_eq!(
            a["offerIds"],
            if a["meterId"] == "sites.count" {
                json!(["cedros-addon-sites"])
            } else {
                json!([])
            }
        );
    }
    assert!(s.service_requests.borrow().is_empty());
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn binding_missing_paid_boundary_and_cross_organization_inventory_fail_closed() {
    let s = binding_setup();
    let mut row = store::get(&s, "example-base-subscription")
        .unwrap()
        .unwrap()
        .payload;
    row["currentPeriodEnd"] = Value::Null;
    s.seed(store::MODEL, "example-base-subscription", row);
    assert_eq!(read(&s).status, 503);
    for field in ["baseSubscriptionIds", "canonicalSiteIds"] {
        let s = binding_setup();
        configure(&s, |c| {
            let mut foreign = c["organizations"]["example-org-a"].clone();
            foreign["baseSubscriptionIds"] = json!([]);
            foreign["canonicalSiteIds"] = json!([]);
            foreign[field] = c["organizations"]["example-org-a"][field].clone();
            c["organizations"]["foreign"] = foreign;
        });
        assert_eq!(read(&s).status, 503);
    }
}

#[test]
fn binding_reads_all_bound_bases_across_host_key_pages() {
    let s = binding_setup();
    let template = store::get(&s, "example-base-subscription")
        .unwrap()
        .unwrap()
        .payload;
    let ids: Vec<_> = (0..105).map(|i| format!("base-{i:03}")).collect();
    for id in &ids {
        let mut row = template.clone();
        row["subscriptionId"] = id.clone().into();
        s.seed(store::MODEL, id, row);
    }
    configure(&s, |c| {
        let o = &mut c["organizations"]["example-org-a"];
        o["baseSubscriptionIds"] = json!(ids);
        o["baseCustomerRefs"] = json!(ids
            .iter()
            .map(|id| (id.clone(), json!("approved-customer")))
            .collect::<std::collections::BTreeMap<_, _>>());
    });
    let out = output(&s);
    assert_eq!(out["subscriptions"].as_array().unwrap().len(), 105);
    assert_eq!(out["subscriptions"][104]["subscriptionId"], "base-104");
    assert!(s.service_requests.borrow().is_empty());
}

#[test]
fn binding_rejects_a_changed_source_and_recovers_on_next_read() {
    let s = binding_setup();
    let mut row = store::get(&s, "example-base-subscription")
        .unwrap()
        .unwrap()
        .payload;
    row["status"] = "incomplete".into();
    // Guard marker, catalog, base read, then concurrent change at verification.
    s.queue_read_race(4, store::MODEL, "example-base-subscription", row);
    assert_eq!(read(&s).status, 503);
    let recovered = output(&s);
    assert_eq!(recovered["subscriptions"][0]["status"], "billing_recovery");
    assert_eq!(
        recovered["subscriptions"][0]["includedAllowances"],
        json!([])
    );
    assert!(s.service_requests.borrow().is_empty());
}

#[test]
fn accounting_v2_uses_one_approved_pool_and_never_infers_developer_packages() {
    let s = binding_setup();
    configure(&s, |c| {
        let org = &mut c["organizations"]["example-org-a"];
        org["accountingVersion"] = json!(2);
        let mut credits = allowance("managed.credits", "credit", null(), 50);
        credits["categories"] = json!(["intelligence", "search", "blockchain", "x-api"]);
        credits["purchasedCreditPolicy"] = json!("calendar_month_recurring_no_rollover");
        let mut sites = allowance("sites.count", "site", null(), 5);
        sites["categories"] = json!(["sites"]);
        org["basePlanAllowances"] =
            json!({"plan-a":{"approvalId":"synthetic-only","includedAllowances":[credits,sites]}});
    });
    let out = output(&s);
    assert_eq!(out["accountingVersion"], 2);
    let allowances = out["subscriptions"][0]["includedAllowances"]
        .as_array()
        .unwrap();
    assert_eq!(
        allowances.iter().filter(|a| a["unit"] == "credit").count(),
        1
    );
    assert_eq!(
        allowances
            .iter()
            .find(|a| a["meterId"] == "managed.credits")
            .unwrap()["included"],
        50
    );
    assert!(!allowances.iter().any(|a| matches!(
        a["meterId"].as_str(),
        Some(
            "voice.audio-seconds"
                | "seo.requests"
                | "image-generation.images"
                | "email.storage-bytes"
        )
    )));
    assert_eq!(
        allowances
            .iter()
            .find(|a| a["meterId"] == "email.recipient-acceptances")
            .unwrap()["limitState"],
        "unconfigured"
    );
    configure(&s, |c| {
        c["organizations"]["example-org-a"]["basePlanAllowances"] = json!({});
    });
    let missing = output(&s);
    assert!(missing["subscriptions"][0]["includedAllowances"]
        .as_array()
        .unwrap()
        .iter()
        .all(|a| a["limitState"] == "unconfigured"));
    for handle in [
        "cedros-addon-managed-credits-v2",
        "cedros-addon-email-recipients-v2",
    ] {
        assert!(crate::routes::products::is_capacity_handle(handle));
    }
    assert!(catalog::HANDLES.iter().all(|(_, service, meter, _)| {
        !matches!(*service, "voice" | "seo")
            && !matches!(*meter, "voice.audio-seconds" | "seo.requests")
    }));
}

#[test]
fn new_developer_allowance_does_not_overwrite_the_legacy_ten_site_contract() {
    let s = binding_setup();
    let mut legacy = store::get(&s, "example-base-subscription")
        .unwrap()
        .unwrap()
        .payload;
    legacy["priceId"] = "legacy-fixed-price".into();
    s.seed(store::MODEL, "example-base-subscription", legacy.clone());
    let mut next = legacy.clone();
    next["subscriptionId"] = "new-developer-subscription".into();
    next["productId"] = "new-developer-plan".into();
    next["priceId"] = "new-price-not-published".into();
    s.seed(store::MODEL, "new-developer-subscription", next);
    s.seed(
        crate::ids::MODEL_CATALOG,
        "new-developer-plan",
        json!({"productType":"subscription","title":"Developer proposal fixture"}),
    );
    configure(&s, |c| {
        let o = &mut c["organizations"]["example-org-a"];
        o["baseSubscriptionIds"] =
            json!(["example-base-subscription", "new-developer-subscription"]);
        o["baseCustomerRefs"]["new-developer-subscription"] = "approved-customer".into();
        o["basePlanAllowances"]["plan-a"]["includedAllowances"][0]["included"] = json!(10);
        let mut proposed = o["basePlanAllowances"]["plan-a"].clone();
        proposed["includedAllowances"][0]["included"] = json!(1);
        o["basePlanAllowances"]["new-developer-plan"] = proposed;
    });
    let out = output(&s);
    for (id, sites) in [
        ("example-base-subscription", 10),
        ("new-developer-subscription", 1),
    ] {
        let base = out["subscriptions"]
            .as_array()
            .unwrap()
            .iter()
            .find(|b| b["subscriptionId"] == id)
            .unwrap();
        assert_eq!(
            base["includedAllowances"]
                .as_array()
                .unwrap()
                .iter()
                .find(|a| a["meterId"] == "sites.count")
                .unwrap()["included"],
            sites
        );
    }
    assert_eq!(
        store::get(&s, "example-base-subscription")
            .unwrap()
            .unwrap()
            .payload,
        legacy
    );
    assert!(s.http_requests.borrow().is_empty());
}

#[test]
fn storage_binding_exposes_only_the_approved_organization_offer() {
    let s = binding_setup();
    let mut product = seed_catalog(&s);
    let handle = "cedros-addon-storage-v2";
    product["id"] = handle.into();
    product["stableHandle"] = handle.into();
    let terms = &mut product["metadata"]["capacityV1"]["terms"];
    terms["serviceId"] = "storage".into();
    terms["meterId"] = "storage.occupied-bytes".into();
    terms["unit"] = "byte".into();
    s.seed(crate::ids::MODEL_CATALOG, handle, product.clone());
    configure(&s, |c| {
        let org = &mut c["organizations"]["example-org-a"];
        org["accountingVersion"] = json!(2);
        let mut storage = allowance("storage.occupied-bytes", "byte", null(), 123);
        storage["categories"] = json!(["storage"]);
        storage["purchasedCreditPolicy"] = json!("unconfigured");
        org["basePlanAllowances"]["plan-a"]["includedAllowances"] = json!([storage]);
    });
    let out = output(&s);
    let storage = out["subscriptions"][0]["includedAllowances"]
        .as_array()
        .unwrap()
        .iter()
        .find(|a| a["meterId"] == "storage.occupied-bytes")
        .unwrap();
    assert_eq!(storage["included"], 123); // Synthetic bytes, never a commercial default.
    assert!(storage["siteId"].is_null());
    assert_eq!(storage["offerIds"], json!([handle]));
    product["metadata"]["capacityV1"]["commercialApprovalId"] = Value::Null;
    s.seed(crate::ids::MODEL_CATALOG, handle, product);
    let out = output(&s);
    let storage = out["subscriptions"][0]["includedAllowances"]
        .as_array()
        .unwrap()
        .iter()
        .find(|a| a["meterId"] == "storage.occupied-bytes")
        .unwrap();
    assert_eq!(storage["included"], 123);
    assert_eq!(storage["offerIds"], json!([]));
    assert!(s.service_requests.borrow().is_empty());
    assert!(s.http_requests.borrow().is_empty());
}
