use super::service_tests::{command, context, post_count, push_create, setup};
use super::*;

#[test]
fn provider_failures_are_terminal_only_with_no_session_proof() {
    let seams = setup();
    seams.push_http_response(400, r#"{"error":{"type":"invalid_request_error","code":"parameter_missing","param":"success_url"}}"#);
    seams.push_http_response(500, r#"{"error":{"type":"api_error"}}"#);
    seams.push_http_response(200, "not-json");
    let service = CheckoutService::new(&seams, context("acct_merchant_a"));
    let terminal = service
        .execute_checkout(command("terminal-key", "terminal-attempt", 1_000))
        .unwrap();
    assert!(matches!(
        terminal,
        CheckoutOutcome::Terminal { durable: true, .. }
    ));
    for (key, attempt) in [
        ("server-key", "server-attempt"),
        ("malformed-key", "malformed-attempt"),
    ] {
        let outcome = service
            .execute_checkout(command(key, attempt, 1_000))
            .unwrap();
        assert!(matches!(outcome, CheckoutOutcome::Indeterminate { .. }));
    }
}

#[test]
fn post_egress_loss_retries_same_create_after_restart_within_safe_window() {
    let seams = setup();
    push_create(&seams, "cs_lost", Some("https://checkout.stripe.com/lost"));
    seams.fail_guarded_commit_after_next_http();
    let request = command("lost-create", "attempt-lost", 1_000);
    assert!(CheckoutService::new(&seams, context("acct_merchant_a"))
        .execute_checkout(request.clone())
        .is_err());
    assert_eq!(post_count(&seams), 1);

    push_create(&seams, "cs_lost", Some("https://checkout.stripe.com/lost"));
    seams.set_now(1_000 + LEASE_SECONDS + 1);
    let recovered = CheckoutService::new(&seams, context("acct_merchant_a"))
        .execute_checkout(request)
        .unwrap();
    assert!(matches!(recovered, CheckoutOutcome::Resolved { .. }));
    assert_eq!(post_count(&seams), 2);
}

#[test]
fn unknown_create_never_posts_at_cutoff_72h_or_clock_rollback() {
    for now in [
        999,
        1_000 + PROVIDER_IDEMPOTENCY_SECONDS,
        1_000 + REPLAY_SECONDS,
    ] {
        let seams = setup();
        push_create(
            &seams,
            "cs_unknown",
            Some("https://checkout.stripe.com/unknown"),
        );
        seams.fail_guarded_commit_after_next_http();
        let request = command("unknown-create", "attempt-unknown", 1_000);
        assert!(CheckoutService::new(&seams, context("acct_merchant_a"))
            .execute_checkout(request.clone())
            .is_err());
        seams.set_now(now);
        let outcome = CheckoutService::new(&seams, context("acct_merchant_a"))
            .execute_checkout(request)
            .unwrap();
        assert!(matches!(outcome, CheckoutOutcome::Indeterminate { .. }));
        assert_eq!(post_count(&seams), 1);
    }
}

#[test]
fn unknown_create_can_retry_one_second_before_conservative_cutoff() {
    let seams = setup();
    push_create(
        &seams,
        "cs_boundary",
        Some("https://checkout.stripe.com/boundary"),
    );
    seams.fail_guarded_commit_after_next_http();
    let request = command("boundary-create", "attempt-boundary", 1_000);
    assert!(CheckoutService::new(&seams, context("acct_merchant_a"))
        .execute_checkout(request.clone())
        .is_err());
    seams.set_now(1_000 + PROVIDER_IDEMPOTENCY_SECONDS - 1);
    push_create(
        &seams,
        "cs_boundary",
        Some("https://checkout.stripe.com/boundary"),
    );
    assert!(matches!(
        CheckoutService::new(&seams, context("acct_merchant_a"))
            .execute_checkout(request)
            .unwrap(),
        CheckoutOutcome::Resolved { .. }
    ));
    assert_eq!(post_count(&seams), 2);
}
