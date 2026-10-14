use super::*;
use p256::ecdsa::SigningKey as P256SigningKey;
use p256::pkcs8::EncodePrivateKey;
use serde_json::Value;
use std::time::Duration;
use x509_cert::{
    builder::{Builder, CertificateBuilder, Profile},
    der::asn1::GeneralizedTime,
    name::Name,
    serial_number::SerialNumber,
    spki::{EncodePublicKey, SubjectPublicKeyInfoOwned},
    time::Validity,
};

const CERT_NOT_BEFORE: u64 = 1_700_000_000;
const CERT_NOT_AFTER: u64 = CERT_NOT_BEFORE + 86_400;
const CERT_VALID_NOW: i64 = CERT_NOT_BEFORE as i64 + 60;

fn p256_key(seed: u8) -> P256SigningKey {
    P256SigningKey::from_slice(&[seed; 32]).unwrap()
}

fn spki_for(key: &P256SigningKey) -> SubjectPublicKeyInfoOwned {
    let doc = key.verifying_key().to_public_key_der().unwrap();
    SubjectPublicKeyInfoOwned::from_der(doc.as_bytes()).unwrap()
}

fn fixture_validity(not_before: u64, not_after: u64) -> Validity {
    Validity {
        not_before: GeneralizedTime::from_unix_duration(Duration::from_secs(not_before))
            .unwrap()
            .into(),
        not_after: GeneralizedTime::from_unix_duration(Duration::from_secs(not_after))
            .unwrap()
            .into(),
    }
}

fn default_validity() -> Validity {
    fixture_validity(CERT_NOT_BEFORE, CERT_NOT_AFTER)
}

fn build_root_cert(signer: &p256::ecdsa::SigningKey) -> x509_cert::Certificate {
    let subject: Name = "CN=Test Root CA".parse().unwrap();
    let builder = CertificateBuilder::new(
        Profile::Root,
        SerialNumber::from(1u32),
        default_validity(),
        subject,
        spki_for(signer),
        signer,
    )
    .unwrap();
    builder.build::<p256::ecdsa::DerSignature>().unwrap()
}

fn build_intermediate_cert(
    subject_signer: &p256::ecdsa::SigningKey,
    issuer_signer: &p256::ecdsa::SigningKey,
    issuer_cert: &x509_cert::Certificate,
) -> x509_cert::Certificate {
    build_intermediate_cert_with_validity(
        subject_signer,
        issuer_signer,
        issuer_cert,
        default_validity(),
    )
}

fn build_intermediate_cert_with_validity(
    subject_signer: &p256::ecdsa::SigningKey,
    issuer_signer: &p256::ecdsa::SigningKey,
    issuer_cert: &x509_cert::Certificate,
    validity: Validity,
) -> x509_cert::Certificate {
    let profile = Profile::SubCA {
        issuer: issuer_cert.tbs_certificate.subject.clone(),
        path_len_constraint: Some(0),
    };
    let builder = CertificateBuilder::new(
        profile,
        SerialNumber::from(2u32),
        validity,
        "CN=Test Intermediate CA".parse::<Name>().unwrap(),
        spki_for(subject_signer),
        issuer_signer,
    )
    .unwrap();
    builder.build::<p256::ecdsa::DerSignature>().unwrap()
}

fn build_leaf_cert_with_validity(
    subject_signer: &p256::ecdsa::SigningKey,
    issuer_signer: &p256::ecdsa::SigningKey,
    issuer_cert: &x509_cert::Certificate,
    validity: Validity,
) -> x509_cert::Certificate {
    let profile = Profile::Leaf {
        issuer: issuer_cert.tbs_certificate.subject.clone(),
        enable_key_agreement: false,
        enable_key_encipherment: false,
    };
    let builder = CertificateBuilder::new(
        profile,
        SerialNumber::from(3u32),
        validity,
        "CN=Test Leaf".parse::<Name>().unwrap(),
        spki_for(subject_signer),
        issuer_signer,
    )
    .unwrap();
    builder.build::<p256::ecdsa::DerSignature>().unwrap()
}

fn cert_der(cert: &x509_cert::Certificate) -> Vec<u8> {
    cert.to_der().unwrap()
}

fn make_jws(
    payload: &[u8],
    leaf_key: &P256SigningKey,
    leaf_der: &[u8],
    intermediate_der: &[u8],
    root_der: &[u8],
) -> String {
    let x5c = [leaf_der, intermediate_der, root_der]
        .iter()
        .map(|d| STANDARD.encode(d))
        .collect::<Vec<_>>();
    let header_json = serde_json::json!({
        "alg": "ES256",
        "x5c": x5c,
        "typ": "JWT"
    });
    let header_b64 = URL_SAFE_NO_PAD.encode(serde_json::to_string(&header_json).unwrap());
    let payload_b64 = URL_SAFE_NO_PAD.encode(payload);
    let signing_input = format!("{header_b64}.{payload_b64}");
    let sig: p256::ecdsa::Signature = leaf_key.sign(signing_input.as_bytes());
    let sig_b64 = URL_SAFE_NO_PAD.encode(sig.to_bytes());
    format!("{signing_input}.{sig_b64}")
}

fn make_synthetic_chain() -> (
    P256SigningKey,
    x509_cert::Certificate,
    x509_cert::Certificate,
    x509_cert::Certificate,
) {
    make_synthetic_chain_with_validity(default_validity(), default_validity())
}

fn make_synthetic_chain_with_validity(
    intermediate_validity: Validity,
    leaf_validity: Validity,
) -> (
    P256SigningKey,
    x509_cert::Certificate,
    x509_cert::Certificate,
    x509_cert::Certificate,
) {
    let root_key = p256_key(0x01);
    let intermediate_key = p256_key(0x02);
    let leaf_key = p256_key(0x03);
    let root_cert = build_root_cert(&root_key);
    let intermediate_cert = build_intermediate_cert_with_validity(
        &intermediate_key,
        &root_key,
        &root_cert,
        intermediate_validity,
    );
    let leaf_cert = build_leaf_cert_with_validity(
        &leaf_key,
        &intermediate_key,
        &intermediate_cert,
        leaf_validity,
    );
    (leaf_key, leaf_cert, intermediate_cert, root_cert)
}

#[test]
fn sign_store_jwt_produces_valid_es256_jwt() {
    let key = p256_key(0xAB);
    let pem = key.to_pkcs8_pem(Default::default()).unwrap().to_string();

    let now: i64 = 1_700_000_000;
    let jwt = sign_store_jwt(&pem, "issuer-42", "KEYID10CHR", "com.example.app", now)
        .expect("sign_store_jwt must succeed");

    let parts: Vec<&str> = jwt.split('.').collect();
    assert_eq!(parts.len(), 3, "JWT must have 3 parts");

    let vk = *key.verifying_key();
    let verified = verify_es256(&jwt, &vk).expect("signature must verify");

    let header: Value = serde_json::from_slice(&verified.header).unwrap();
    assert_eq!(header["alg"], "ES256");
    assert_eq!(header["kid"], "KEYID10CHR");
    assert_eq!(header["typ"], "JWT");

    let pl: Value = serde_json::from_slice(&verified.payload).unwrap();
    assert_eq!(pl["iss"], "issuer-42");
    assert_eq!(pl["aud"], "appstoreconnect-v1");
    assert_eq!(pl["bid"], "com.example.app");
    assert_eq!(pl["iat"], now);
    assert_eq!(pl["exp"], now + 1200);
    assert!(pl["exp"].as_i64().unwrap() > pl["iat"].as_i64().unwrap());
}

#[test]
fn sign_store_jwt_rejects_bad_key() {
    let result = sign_store_jwt("not-a-pem", "iss", "kid", "bid", 0);
    assert!(result.is_err(), "must fail on bad key");
}

#[test]
fn apple_root_ca_g3_anchor_identity() {
    use sha2::{Digest, Sha256};
    let digest = Sha256::digest(APPLE_ROOT_CA_G3);
    assert_eq!(
        hex::encode(digest),
        "63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179"
    );
    let cert = Certificate::from_der(APPLE_ROOT_CA_G3).expect("anchor parses as DER cert");
    assert_eq!(cert.tbs_certificate.issuer, cert.tbs_certificate.subject);
}

#[test]
fn verify_apple_jws_at_accepts_valid_chain() {
    let (leaf_key, leaf_cert, intermediate_cert, root_cert) = make_synthetic_chain();
    let payload = br#"{"transactionId":"tx_test","productId":"annual.pro"}"#;
    let jws = make_jws(
        payload,
        &leaf_key,
        &cert_der(&leaf_cert),
        &cert_der(&intermediate_cert),
        &cert_der(&root_cert),
    );
    let result = verify_apple_jws_at(&jws, &cert_der(&root_cert), CERT_VALID_NOW);
    assert!(result.is_ok(), "valid chain must verify: {result:?}");
    assert_eq!(result.unwrap(), payload);
}

#[test]
fn verify_apple_jws_at_rejects_expired_leaf_cert() {
    let expired = fixture_validity(CERT_NOT_BEFORE - 200, CERT_NOT_BEFORE - 100);
    let (leaf_key, leaf_cert, intermediate_cert, root_cert) =
        make_synthetic_chain_with_validity(default_validity(), expired);
    let jws = make_jws(
        b"valid payload",
        &leaf_key,
        &cert_der(&leaf_cert),
        &cert_der(&intermediate_cert),
        &cert_der(&root_cert),
    );
    let err = verify_apple_jws_at(&jws, &cert_der(&root_cert), CERT_VALID_NOW).unwrap_err();
    assert!(
        err.contains("cert[0] expired"),
        "must reject expired leaf cert: {err}"
    );
}

#[test]
fn verify_apple_jws_at_rejects_not_yet_valid_intermediate_cert() {
    let future = fixture_validity(CERT_NOT_AFTER + 100, CERT_NOT_AFTER + 200);
    let (leaf_key, leaf_cert, intermediate_cert, root_cert) =
        make_synthetic_chain_with_validity(future, default_validity());
    let jws = make_jws(
        b"valid payload",
        &leaf_key,
        &cert_der(&leaf_cert),
        &cert_der(&intermediate_cert),
        &cert_der(&root_cert),
    );
    let err = verify_apple_jws_at(&jws, &cert_der(&root_cert), CERT_VALID_NOW).unwrap_err();
    assert!(
        err.contains("cert[1] not yet valid"),
        "must reject not-yet-valid intermediate cert: {err}"
    );
}

#[test]
fn verify_apple_jws_at_rejects_wrong_trust_anchor() {
    let (leaf_key, leaf_cert, intermediate_cert, root_cert) = make_synthetic_chain();
    let other_root = build_root_cert(&p256_key(0x04));
    let jws = make_jws(
        b"legit payload",
        &leaf_key,
        &cert_der(&leaf_cert),
        &cert_der(&intermediate_cert),
        &cert_der(&root_cert),
    );
    let result = verify_apple_jws_at(&jws, &cert_der(&other_root), CERT_VALID_NOW);
    assert!(
        result.is_err(),
        "must reject JWS when trust anchor is wrong root"
    );
}

#[test]
fn verify_apple_jws_at_rejects_tampered_payload() {
    let (leaf_key, leaf_cert, intermediate_cert, root_cert) = make_synthetic_chain();
    let jws = make_jws(
        b"original payload",
        &leaf_key,
        &cert_der(&leaf_cert),
        &cert_der(&intermediate_cert),
        &cert_der(&root_cert),
    );
    let mut parts: Vec<&str> = jws.split('.').collect();
    assert_eq!(parts.len(), 3);
    let forged = URL_SAFE_NO_PAD.encode(b"HACKED payload");
    parts[1] = &forged;
    let tampered = parts.join(".");
    let result = verify_apple_jws_at(&tampered, &cert_der(&root_cert), CERT_VALID_NOW);
    assert!(result.is_err(), "must reject tampered payload");
}

#[test]
fn verify_apple_jws_at_rejects_broken_chain_link() {
    let (leaf_key, leaf_cert, _intermediate_cert, root_cert) = make_synthetic_chain();
    let alien_root_key = p256_key(0x05);
    let alien_intermediate_key = p256_key(0x06);
    let alien_root = build_root_cert(&alien_root_key);
    let alien_intermediate =
        build_intermediate_cert(&alien_intermediate_key, &alien_root_key, &alien_root);
    let jws = make_jws(
        b"valid payload",
        &leaf_key,
        &cert_der(&leaf_cert),
        &cert_der(&alien_intermediate),
        &cert_der(&root_cert),
    );
    let result = verify_apple_jws_at(&jws, &cert_der(&root_cert), CERT_VALID_NOW);
    assert!(
        result.is_err(),
        "must reject JWS with broken intermediate link"
    );
}
