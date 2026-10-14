use super::*;
use crate::fake::FakeSeams;

const CODE: &str = "cedros-program-test-code-0123456789";

fn setup(subject: &str) -> FakeSeams {
    let seams = FakeSeams::new();
    seams.set_setting("cedros_login.base_url", "https://site.example");
    crate::guarded_policy::enroll(&seams).unwrap();
    seams.seed(
        ids::MODEL_CATALOG,
        "cedros-program-ambassador",
        json!({
            "recordType":"programEntitlement",
            "stableHandle":"cedros-program-ambassador",
            "status":"active",
            "pricing":{
                "configured":true,
                "currency":"USD",
                "monthly":{"unitAmountCents":500},
                "annual":{"unitAmountCents":4800}
            },
            "activation":{"eligibilityPolicy":null}
        }),
    );
    seams.seed(
        ids::MODEL_PROGRAM_ACCESS,
        "ambassador-invite-1",
        json!({
            "recordType":"programInvite",
            "stableHandle":"ambassador-invite-1",
            "programHandle":"cedros-program-ambassador",
            "subjectId":subject,
            "activationCodeSha256":hex::encode(Sha256::digest(CODE.as_bytes())),
            "status":"active",
            "expiresAt":"2099-01-01T00:00:00Z"
        }),
    );
    seams
}

fn request(body: Value) -> RouteRequest {
    RouteRequest {
        route_id: ids::ROUTE_PROGRAM_ACTIVATE.into(),
        method: "POST".into(),
        path: "/programs/v1/activate".into(),
        headers: vec![("authorization".into(), "Bearer buyer-session".into())],
        body: body.to_string(),
        ..Default::default()
    }
}

fn authenticate(seams: &FakeSeams, subject: &str) {
    seams.push_http_response(200, &json!({"user":{"id":subject}}).to_string());
}

#[test]
fn activation_is_identity_bound_atomic_redacted_and_idempotent() {
    let seams = setup("user-1");
    authenticate(&seams, "user-1");
    let first = handle(&seams, &request(json!({"activationCode":CODE}))).unwrap();
    let first_body: Value = serde_json::from_str(&first.body).unwrap();
    assert_eq!(first_body["activated"], true);
    assert_eq!(first_body["created"], true);
    assert_eq!(first_body["programHandle"], "cedros-program-ambassador");
    assert!(!first.body.contains(CODE));
    assert!(!first.body.contains("activationCodeSha256"));

    let membership_id = membership_key("user-1");
    let membership = seams
        .get_entry(ids::MODEL_PROGRAM_ACCESS, &membership_id)
        .unwrap();
    assert_eq!(membership["status"], "active");
    assert_eq!(membership["programHandle"], "cedros-program-ambassador");
    let invite = seams
        .get_entry(ids::MODEL_PROGRAM_ACCESS, "ambassador-invite-1")
        .unwrap();
    assert_eq!(invite["status"], "redeemed");
    assert!(invite.get("redeemedBySubjectHash").is_some());

    authenticate(&seams, "user-1");
    let replay = handle(&seams, &request(json!({"activationCode":CODE}))).unwrap();
    let replay_body: Value = serde_json::from_str(&replay.body).unwrap();
    assert_eq!(replay_body["activated"], true);
    assert_eq!(replay_body["created"], false);
    assert_eq!(seams.entry_count(ids::MODEL_PROGRAM_ACCESS), 2);
}

#[test]
fn monthly_sale_policy_bounds_membership_and_sets_individual_transition() {
    let seams = setup("user-1");
    seams.seed(
        ids::MODEL_CATALOG,
        "cedros-program-ambassador",
        json!({
            "recordType":"programEntitlement",
            "stableHandle":"cedros-program-ambassador",
            "status":"active",
            "pricing":{
                "configured":true,
                "currency":"USD",
                "monthly":{"unitAmountCents":1900},
                "annual":{"unitAmountCents":18000}
            },
            "activation":{"eligibilityPolicy":{
                "kind":"monthlyQualifiedAffiliateSale",
                "minimumQualifiedSales":1,
                "period":"month",
                "fallbackPlanHandle":"cedros-individual"
            }}
        }),
    );
    authenticate(&seams, "user-1");
    let response = handle(&seams, &request(json!({"activationCode":CODE}))).unwrap();
    assert_eq!(response.status, 200);

    let membership = seams
        .get_entry(ids::MODEL_PROGRAM_ACCESS, &membership_key("user-1"))
        .unwrap();
    assert_eq!(membership["transitionPlanHandle"], "cedros-individual");
    let expiry = membership["expiresAt"]
        .as_str()
        .and_then(crate::time::parse_iso)
        .unwrap();
    assert_eq!(expiry, seams.now_unix_secs() + 30 * 24 * 60 * 60);
}

#[test]
fn invalid_transferred_and_referral_codes_fail_without_membership() {
    for (subject, body) in [
        (
            "user-1",
            json!({"activationCode":"not-a-valid-program-code"}),
        ),
        ("user-2", json!({"activationCode":CODE})),
        (
            "user-1",
            json!({"activationCode":CODE,"referralCode":"separate-purpose"}),
        ),
    ] {
        let seams = setup("user-1");
        authenticate(&seams, subject);
        let error = handle(&seams, &request(body)).unwrap_err();
        assert_eq!(error.status, 422);
        assert!(seams
            .get_entry(ids::MODEL_PROGRAM_ACCESS, &membership_key(subject))
            .is_none());
        assert_eq!(
            seams
                .get_entry(ids::MODEL_PROGRAM_ACCESS, "ambassador-invite-1")
                .unwrap()["status"],
            "active"
        );
    }
}

#[test]
fn active_membership_for_another_program_prevents_stacking() {
    let seams = setup("user-1");
    seams.seed(
        ids::MODEL_PROGRAM_ACCESS,
        &membership_key("user-1"),
        json!({
            "recordType":"programMembership",
            "subjectId":"user-1",
            "programHandle":"cedros-program-affiliate",
            "status":"active"
        }),
    );
    authenticate(&seams, "user-1");
    let error = handle(&seams, &request(json!({"activationCode":CODE}))).unwrap_err();
    assert_eq!(error.status, 409);
    assert_eq!(
        seams
            .get_entry(ids::MODEL_PROGRAM_ACCESS, "ambassador-invite-1")
            .unwrap()["status"],
        "active"
    );
}

#[test]
fn status_uses_verified_identity_and_exposes_no_subject_or_code() {
    let seams = setup("user-1");
    seams.seed(
        ids::MODEL_PROGRAM_ACCESS,
        &membership_key("user-1"),
        json!({
            "recordType":"programMembership",
            "subjectId":"user-1",
            "programHandle":"cedros-program-ambassador",
            "status":"active",
            "expiresAt":"2099-01-01T00:00:00Z"
        }),
    );
    authenticate(&seams, "user-1");
    let response = handle(
        &seams,
        &RouteRequest {
            route_id: ids::ROUTE_PROGRAM_STATUS.into(),
            method: "GET".into(),
            path: "/programs/v1/status".into(),
            headers: vec![("authorization".into(), "Bearer buyer-session".into())],
            ..Default::default()
        },
    )
    .unwrap();
    let body: Value = serde_json::from_str(&response.body).unwrap();
    assert_eq!(body["active"], true);
    assert_eq!(
        body["membership"]["programHandle"],
        "cedros-program-ambassador"
    );
    assert!(!response.body.contains("subjectId"));
    assert!(!response.body.contains("activationCode"));
}
