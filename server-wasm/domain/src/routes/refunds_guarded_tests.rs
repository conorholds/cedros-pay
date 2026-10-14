use serde_json::{json, Value};

use super::*;
use crate::fake::FakeSeams;

const BUYER: &str = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const PURCHASE: &str =
    "BUguQsv2ZuHus54HAFzjdJHzZBkygAjKhEeYwSG19tUfUyvvz3worsdQCdAXDNjakJHioSiyxhFiDJrm8XpSXRA";
const REFUND: &str = "refund_guarded";

fn seed(seams: &FakeSeams, status: &str, signature: Option<&str>) {
    seams.seed(ids::MODEL_LEDGER, PURCHASE, payment());
    seams.seed(ids::MODEL_LEDGER, REFUND, refund(status, signature));
}

fn payment() -> Value {
    json!({
        "reference": PURCHASE, "kind": "payment", "status": "succeeded",
        "tokenSettlement": {"amountAtomic": 15_000_000, "mint": MINT, "decimals": 6},
        "grossCents": 1500, "refundCents": 0, "currency": "USD",
        "productId": "prod", "customerProfileId": "buyer", "provider": "x402",
        "providerRef": PURCHASE, "createdAt": "2026-01-01T00:00:00Z",
        "processedAt": "2026-01-01T00:00:00Z", "payerWallet": BUYER
    })
}

fn refund(status: &str, signature: Option<&str>) -> Value {
    json!({
        "reference": REFUND, "kind": "refund", "status": status,
        "grossCents": 1500, "refundCents": 0, "currency": "USD",
        "productId": "prod", "customerProfileId": "buyer", "provider": "x402",
        "providerRef": signature, "createdAt": "2026-01-01T00:00:00Z",
        "processedAt": "2026-01-01T00:00:00Z", "originalPurchaseId": PURCHASE,
        "recipientWallet": BUYER,
        "settlement": {
            "transactionBase64": crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO,
            "recentBlockhash": "11111111111111111111111111111111",
            "network": "solana"
        }
    })
}

fn request(action: &str) -> RouteRequest {
    RouteRequest {
        route_id: if action == "deny" {
            ids::ROUTE_ADMIN_REFUNDS_DENY.into()
        } else {
            ids::ROUTE_ADMIN_REFUNDS_PROCESS.into()
        },
        method: "POST".into(),
        path: format!("/admin/refunds/{REFUND}/{action}"),
        context_json: json!({
            "authenticated": true, "systemAdmin": true, "csrfVerified": true,
            "permissionClaims": ["manage_settings"]
        })
        .to_string(),
        ..Default::default()
    }
}

#[test]
fn deny_version_race_cannot_overwrite_newer_state() {
    let seams = FakeSeams::new();
    seed(&seams, "pending", None);
    seams.queue_guarded_race(vec![(
        ids::MODEL_LEDGER,
        REFUND,
        refund("submitted", Some("winner")),
    )]);

    assert_eq!(deny(&seams, &request("deny")).unwrap_err().status, 409);
    assert_eq!(
        seams.get_entry(ids::MODEL_LEDGER, REFUND).unwrap()["status"],
        "submitted"
    );
}

#[test]
fn stale_settlement_cannot_overwrite_original_payment_race() {
    let seams = FakeSeams::new();
    use base64::Engine as _;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO)
        .unwrap();
    let signature = crate::x402::pubkey::encode_signature(
        &crate::x402::transaction::parse(&bytes).unwrap().signatures[0],
    );
    seed(&seams, "submitted", Some(&signature));
    let db = Db::new(&seams, ids::DB_ACCESS);
    let mut stored = store::read::<_, RefundRow>(&db, REFUND).unwrap().unwrap();
    let original = support::read_original(&db, PURCHASE).unwrap().unwrap();
    seams.queue_guarded_race(vec![(ids::MODEL_LEDGER, PURCHASE, payment())]);
    seams.push_http_response(
        200,
        r#"{"jsonrpc":"2.0","id":1,"result":"5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"}"#,
    );
    seams.push_http_response(200, &json!({
        "jsonrpc":"2.0","id":1,"result":{"value":[{"err":null,"confirmationStatus":"confirmed"}]}
    }).to_string());
    seams.push_http_response(
        200,
        &json!({
            "jsonrpc":"2.0","id":1,"result":crate::x402::rpc_fixtures::transaction_result(crate::x402::transaction::fixtures::TRANSFER_CHECKED_MEMO, serde_json::Value::Null, crate::x402::rpc_fixtures::MERCHANT)
        })
        .to_string(),
    );

    assert_eq!(
        state::finalize(
            &seams,
            &db,
            &mut stored,
            &original,
            &signature,
            REFUND,
            "https://rpc.example.com",
        )
        .unwrap_err()
        .status,
        409
    );
    assert!(seams.events.borrow().is_empty());
}
