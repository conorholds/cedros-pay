//! Wallet-possession proof for authenticated Solana subscription collection.

use ed25519_dalek::{Signature, Verifier, VerifyingKey};

use crate::error::{AppError, AppResult};

pub(super) struct WalletBinding<'a> {
    pub(super) user_id: &'a str,
    pub(super) plan_id: &'a str,
    pub(super) interval: &'a str,
    pub(super) wallet: &'a str,
    pub(super) subscription_address: &'a str,
    pub(super) authorization_signature: &'a str,
}

pub(super) fn message(input: &WalletBinding<'_>) -> String {
    format!(
        "Cedros Pay Solana subscription wallet binding v1\nuserId={}\nplanId={}\ninterval={}\nwallet={}\nsubscriptionAddress={}\nauthorizationSignature={}",
        encode(input.user_id),
        encode(input.plan_id),
        encode(input.interval),
        encode(input.wallet),
        encode(input.subscription_address),
        encode(input.authorization_signature),
    )
}

fn encode(value: &str) -> String {
    serde_json::to_string(value).expect("serializing a string cannot fail")
}

pub(super) fn verify(
    input: &WalletBinding<'_>,
    supplied_message: &str,
    supplied_signature: &str,
) -> AppResult<()> {
    let expected = message(input);
    if supplied_message != expected {
        return Err(AppError::new(
            422,
            "invalid_wallet_binding",
            "walletBindingMessage must bind the authenticated user, plan, wallet, subscription, and authorization",
        ));
    }
    let public_key = decode_exact(
        input.wallet,
        32,
        "walletBinding wallet must be a valid Solana address",
    )?;
    let signature = decode_exact(
        supplied_signature,
        64,
        "walletBindingSignature must be a valid ed25519 signature",
    )?;
    let verifying_key =
        VerifyingKey::from_bytes(public_key.as_slice().try_into().map_err(|_| {
            AppError::unprocessable("walletBinding wallet must be a valid Solana address")
        })?)
        .map_err(|_| {
            AppError::unprocessable("walletBinding wallet must be a valid Solana address")
        })?;
    let signature = Signature::from_bytes(signature.as_slice().try_into().map_err(|_| {
        AppError::new(
            422,
            "invalid_wallet_binding",
            "walletBindingSignature must be a valid ed25519 signature",
        )
    })?);
    verifying_key
        .verify(supplied_message.as_bytes(), &signature)
        .map_err(|_| {
            AppError::new(
                422,
                "invalid_wallet_binding",
                "walletBindingSignature does not prove control of the subscriber wallet",
            )
        })
}

fn decode_exact(value: &str, len: usize, message: &'static str) -> AppResult<Vec<u8>> {
    let decoded = bs58::decode(value)
        .into_vec()
        .map_err(|_| AppError::new(422, "invalid_wallet_binding", message))?;
    if decoded.len() != len {
        return Err(AppError::new(422, "invalid_wallet_binding", message));
    }
    Ok(decoded)
}

#[cfg(test)]
mod tests {
    use ed25519_dalek::{Signer, SigningKey};

    use super::*;

    #[test]
    fn accepts_wallet_proof_and_rejects_another_user_or_authorization() {
        let signing = SigningKey::from_bytes(&[0x22; 32]);
        let wallet = bs58::encode(signing.verifying_key().to_bytes()).into_string();
        let user_binding = binding("user_1", &wallet, "authorization_1");
        let supplied_message = message(&user_binding);
        let signature =
            bs58::encode(signing.sign(supplied_message.as_bytes()).to_bytes()).into_string();

        verify(&user_binding, &supplied_message, &signature).unwrap();
        let other_user = binding("user_2", &wallet, "authorization_1");
        let error = verify(&other_user, &supplied_message, &signature).unwrap_err();
        assert_eq!(error.code, "invalid_wallet_binding");
        let other_authorization = binding("user_1", &wallet, "authorization_2");
        let error = verify(&other_authorization, &supplied_message, &signature).unwrap_err();
        assert_eq!(error.code, "invalid_wallet_binding");
    }

    #[test]
    fn canonical_message_escapes_field_boundaries() {
        let binding = binding("user_1\nplanId=other", "wallet", "authorization");
        assert!(message(&binding).contains(r#"userId="user_1\nplanId=other""#));
    }

    fn binding<'a>(
        user_id: &'a str,
        wallet: &'a str,
        authorization_signature: &'a str,
    ) -> WalletBinding<'a> {
        WalletBinding {
            user_id,
            plan_id: "pro",
            interval: "monthly",
            wallet,
            subscription_address: "subscription",
            authorization_signature,
        }
    }
}
