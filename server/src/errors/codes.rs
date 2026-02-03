use axum::http::StatusCode;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    InvalidPaymentProof,
    InvalidSignature,
    InvalidTransaction,
    TransactionNotFound,
    TransactionNotConfirmed,
    TransactionFailed,
    AmountBelowMinimum,
    AmountMismatch,
    InsufficientFundsSol,
    InsufficientFundsToken,
    InsufficientCredits,
    InvalidTokenMint,
    NotSplTransfer,
    MissingTokenAccount,
    InvalidTokenProgram,
    MissingMemo,
    InvalidMemo,
    PaymentAlreadyUsed,
    SignatureReused,
    QuoteExpired,
    TransactionExpired,
    InvalidRecipient,
    InvalidSender,
    UnauthorizedRefundIssuer,
    MissingField,
    InvalidField,
    InvalidAmount,
    InvalidWallet,
    InvalidResource,
    InvalidCoupon,
    InvalidCartItem,
    EmptyCart,
    CartTooLarge,
    InvalidQuantity,
    CartAlreadyPaid,
    RefundAlreadyProcessed,
    MixedTokensInCart,
    InvalidResourceType,
    NonceExpired,
    NonceAlreadyUsed,
    InvalidNoncePurpose,
    ResourceNotFound,
    CartNotFound,
    RefundNotFound,
    ProductNotFound,
    CouponNotFound,
    SessionNotFound,
    SubscriptionNotFound,
    NonceNotFound,
    CouponExpired,
    CouponUsageLimitReached,
    CouponNotApplicable,
    CouponWrongPaymentMethod,
    StripeError,
    RpcError,
    NetworkError,
    InternalError,
    DatabaseError,
    ConfigError,
    ServerInsufficientFunds,
    SendFailed,
    SendFailedAfterAccountCreation,
    VerificationFailed,
    InvalidOperation,
    Unauthorized,
    PaymentRequired,
    GaslessNotEnabled,
    NoAvailableWallet,
    InvalidPayer,
    ServiceUnavailable,
    NetworkMismatch,
    PaymentMethodDisabled,
    RateLimited,
}

impl ErrorCode {
    pub fn as_str(&self) -> &'static str {
        match self {
            ErrorCode::InvalidPaymentProof => "invalid_payment_proof",
            ErrorCode::InvalidSignature => "invalid_signature",
            ErrorCode::InvalidTransaction => "invalid_transaction",
            ErrorCode::TransactionNotFound => "transaction_not_found",
            ErrorCode::TransactionNotConfirmed => "transaction_not_confirmed",
            ErrorCode::TransactionFailed => "transaction_failed",
            ErrorCode::AmountBelowMinimum => "amount_below_minimum",
            ErrorCode::AmountMismatch => "amount_mismatch",
            ErrorCode::InsufficientFundsSol => "insufficient_funds_sol",
            ErrorCode::InsufficientFundsToken => "insufficient_funds_token",
            ErrorCode::InsufficientCredits => "insufficient_credits",
            ErrorCode::InvalidTokenMint => "invalid_token_mint",
            ErrorCode::NotSplTransfer => "not_spl_transfer",
            ErrorCode::MissingTokenAccount => "missing_token_account",
            ErrorCode::InvalidTokenProgram => "invalid_token_program",
            ErrorCode::MissingMemo => "missing_memo",
            ErrorCode::InvalidMemo => "invalid_memo",
            ErrorCode::PaymentAlreadyUsed => "payment_already_used",
            ErrorCode::SignatureReused => "signature_reused",
            ErrorCode::QuoteExpired => "quote_expired",
            ErrorCode::TransactionExpired => "transaction_expired",
            ErrorCode::InvalidRecipient => "invalid_recipient",
            ErrorCode::InvalidSender => "invalid_sender",
            ErrorCode::UnauthorizedRefundIssuer => "unauthorized_refund_issuer",
            ErrorCode::MissingField => "missing_field",
            ErrorCode::InvalidField => "invalid_field",
            ErrorCode::InvalidAmount => "invalid_amount",
            ErrorCode::InvalidWallet => "invalid_wallet",
            ErrorCode::InvalidResource => "invalid_resource",
            ErrorCode::InvalidCoupon => "invalid_coupon",
            ErrorCode::InvalidCartItem => "invalid_cart_item",
            ErrorCode::EmptyCart => "empty_cart",
            ErrorCode::CartTooLarge => "cart_too_large",
            ErrorCode::InvalidQuantity => "invalid_quantity",
            ErrorCode::CartAlreadyPaid => "cart_already_paid",
            ErrorCode::RefundAlreadyProcessed => "refund_already_processed",
            ErrorCode::MixedTokensInCart => "mixed_tokens_in_cart",
            ErrorCode::InvalidResourceType => "invalid_resource_type",
            ErrorCode::NonceExpired => "nonce_expired",
            ErrorCode::NonceAlreadyUsed => "nonce_already_used",
            ErrorCode::InvalidNoncePurpose => "invalid_nonce_purpose",
            ErrorCode::ResourceNotFound => "resource_not_found",
            ErrorCode::CartNotFound => "cart_not_found",
            ErrorCode::RefundNotFound => "refund_not_found",
            ErrorCode::ProductNotFound => "product_not_found",
            ErrorCode::CouponNotFound => "coupon_not_found",
            ErrorCode::SessionNotFound => "session_not_found",
            ErrorCode::SubscriptionNotFound => "subscription_not_found",
            ErrorCode::NonceNotFound => "nonce_not_found",
            ErrorCode::CouponExpired => "coupon_expired",
            ErrorCode::CouponUsageLimitReached => "coupon_usage_limit_reached",
            ErrorCode::CouponNotApplicable => "coupon_not_applicable",
            ErrorCode::CouponWrongPaymentMethod => "coupon_wrong_payment_method",
            ErrorCode::StripeError => "stripe_error",
            ErrorCode::RpcError => "rpc_error",
            ErrorCode::NetworkError => "network_error",
            ErrorCode::InternalError => "internal_error",
            ErrorCode::DatabaseError => "database_error",
            ErrorCode::ConfigError => "config_error",
            ErrorCode::ServerInsufficientFunds => "server_insufficient_funds",
            ErrorCode::SendFailed => "send_failed",
            ErrorCode::SendFailedAfterAccountCreation => "send_failed_after_account_creation",
            ErrorCode::VerificationFailed => "verification_failed",
            ErrorCode::InvalidOperation => "invalid_operation",
            ErrorCode::Unauthorized => "unauthorized",
            ErrorCode::PaymentRequired => "payment_required",
            ErrorCode::GaslessNotEnabled => "gasless_not_enabled",
            ErrorCode::NoAvailableWallet => "no_available_wallet",
            ErrorCode::InvalidPayer => "invalid_payer",
            ErrorCode::ServiceUnavailable => "service_unavailable",
            ErrorCode::NetworkMismatch => "network_mismatch",
            ErrorCode::PaymentMethodDisabled => "payment_method_disabled",
            ErrorCode::RateLimited => "rate_limited",
        }
    }

    pub fn http_status(&self) -> StatusCode {
        match self {
            ErrorCode::InvalidPaymentProof
            | ErrorCode::InvalidSignature
            | ErrorCode::InvalidTransaction
            | ErrorCode::TransactionNotFound
            | ErrorCode::TransactionNotConfirmed
            | ErrorCode::TransactionFailed
            | ErrorCode::AmountBelowMinimum
            | ErrorCode::AmountMismatch
            | ErrorCode::InsufficientFundsSol
            | ErrorCode::InsufficientFundsToken
            | ErrorCode::InsufficientCredits
            | ErrorCode::InvalidTokenMint
            | ErrorCode::NotSplTransfer
            | ErrorCode::MissingTokenAccount
            | ErrorCode::InvalidTokenProgram
            | ErrorCode::MissingMemo
            | ErrorCode::InvalidMemo
            | ErrorCode::PaymentAlreadyUsed
            | ErrorCode::SignatureReused
            | ErrorCode::QuoteExpired
            | ErrorCode::TransactionExpired
            | ErrorCode::SendFailed
            | ErrorCode::SendFailedAfterAccountCreation => StatusCode::PAYMENT_REQUIRED,
            ErrorCode::InvalidRecipient
            | ErrorCode::InvalidSender
            | ErrorCode::MissingField
            | ErrorCode::InvalidField
            | ErrorCode::InvalidAmount
            | ErrorCode::InvalidWallet
            | ErrorCode::InvalidResource
            | ErrorCode::InvalidCoupon
            | ErrorCode::InvalidCartItem
            | ErrorCode::EmptyCart
            | ErrorCode::CartTooLarge
            | ErrorCode::InvalidQuantity
            | ErrorCode::CartAlreadyPaid
            | ErrorCode::RefundAlreadyProcessed
            | ErrorCode::MixedTokensInCart
            | ErrorCode::InvalidResourceType
            | ErrorCode::NonceExpired
            | ErrorCode::NonceAlreadyUsed
            | ErrorCode::InvalidNoncePurpose => StatusCode::BAD_REQUEST,
            ErrorCode::UnauthorizedRefundIssuer => StatusCode::FORBIDDEN,
            ErrorCode::ResourceNotFound
            | ErrorCode::CartNotFound
            | ErrorCode::RefundNotFound
            | ErrorCode::ProductNotFound
            | ErrorCode::CouponNotFound
            | ErrorCode::SessionNotFound
            | ErrorCode::SubscriptionNotFound
            | ErrorCode::NonceNotFound => StatusCode::NOT_FOUND,
            ErrorCode::CouponExpired
            | ErrorCode::CouponUsageLimitReached
            | ErrorCode::CouponNotApplicable
            | ErrorCode::CouponWrongPaymentMethod => StatusCode::CONFLICT,
            ErrorCode::StripeError | ErrorCode::RpcError | ErrorCode::NetworkError => {
                StatusCode::BAD_GATEWAY
            }
            ErrorCode::InternalError
            | ErrorCode::DatabaseError
            | ErrorCode::ConfigError
            | ErrorCode::ServerInsufficientFunds => StatusCode::INTERNAL_SERVER_ERROR,
            ErrorCode::VerificationFailed => StatusCode::PAYMENT_REQUIRED,
            ErrorCode::InvalidOperation => StatusCode::BAD_REQUEST,
            ErrorCode::Unauthorized => StatusCode::UNAUTHORIZED,
            ErrorCode::PaymentRequired => StatusCode::PAYMENT_REQUIRED,
            ErrorCode::GaslessNotEnabled => StatusCode::SERVICE_UNAVAILABLE,
            ErrorCode::NoAvailableWallet => StatusCode::SERVICE_UNAVAILABLE,
            ErrorCode::InvalidPayer => StatusCode::FORBIDDEN,
            ErrorCode::ServiceUnavailable => StatusCode::SERVICE_UNAVAILABLE,
            ErrorCode::NetworkMismatch => StatusCode::BAD_REQUEST,
            ErrorCode::PaymentMethodDisabled => StatusCode::BAD_REQUEST,
            ErrorCode::RateLimited => StatusCode::TOO_MANY_REQUESTS,
        }
    }

    pub fn default_message(&self) -> &'static str {
        match self {
            ErrorCode::InsufficientFundsToken => {
                "Insufficient token balance. Please add more tokens to your wallet and try again."
            }
            ErrorCode::InsufficientFundsSol => {
                "Insufficient SOL for transaction fees. Please add some SOL to your wallet and try again."
            }
            ErrorCode::InsufficientCredits => {
                "Insufficient credits balance. Please add more credits to your account and try again."
            }
            ErrorCode::ServerInsufficientFunds => "Service temporarily unavailable due to insufficient server funds. Please try again later or contact support.",
            ErrorCode::AmountBelowMinimum => {
                "Payment amount is less than required. Please check the payment amount and try again."
            }
            ErrorCode::InvalidSignature => {
                "Invalid transaction signature. Please try again."
            }
            ErrorCode::InvalidMemo => {
                "Invalid payment memo. Please use the payment details provided by the quote."
            }
            ErrorCode::InvalidTokenMint => {
                "Wrong token used for payment. Please use the correct token specified in the quote."
            }
            ErrorCode::InvalidRecipient => {
                "Payment sent to wrong address. Please check the recipient address and try again."
            }
            ErrorCode::MissingTokenAccount => {
                "Token account not found. Please create a token account for this token first."
            }
            ErrorCode::SendFailed => {
                "Transaction failed to send. Please check your wallet balance and try again."
            }
            ErrorCode::SendFailedAfterAccountCreation => {
                "Transaction failed after creating token account. Please check the blockchain explorer and retry if needed."
            }
            ErrorCode::TransactionNotFound => {
                "Transaction not found on the blockchain. It may have been dropped. Please try again."
            }
            ErrorCode::TransactionExpired => {
                "Transaction timed out. Please check the blockchain explorer and try again if needed."
            }
            ErrorCode::TransactionFailed => {
                "Transaction failed on the blockchain. Check your wallet for details. You may need to adjust your transaction settings or add more SOL for fees."
            }
            ErrorCode::PaymentAlreadyUsed => {
                "This payment has already been processed. Each payment can only be used once."
            }
            ErrorCode::AmountMismatch => {
                "Payment amount does not match the required amount. Please pay the exact amount shown."
            }
            _ => "An error occurred",
        }
    }

    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            ErrorCode::RpcError
                | ErrorCode::NetworkError
                | ErrorCode::StripeError
                | ErrorCode::TransactionNotConfirmed
                | ErrorCode::ServiceUnavailable
                | ErrorCode::RateLimited
        )
    }
}

impl std::fmt::Display for ErrorCode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl From<ErrorCode> for String {
    fn from(code: ErrorCode) -> Self {
        code.as_str().to_string()
    }
}

impl ErrorCode {
    pub fn from_string(value: &str) -> Option<Self> {
        match value {
            "invalid_payment_proof" => Some(ErrorCode::InvalidPaymentProof),
            "invalid_signature" => Some(ErrorCode::InvalidSignature),
            "invalid_transaction" => Some(ErrorCode::InvalidTransaction),
            "transaction_not_found" => Some(ErrorCode::TransactionNotFound),
            "transaction_not_confirmed" => Some(ErrorCode::TransactionNotConfirmed),
            "transaction_failed" => Some(ErrorCode::TransactionFailed),
            "amount_below_minimum" => Some(ErrorCode::AmountBelowMinimum),
            "amount_mismatch" => Some(ErrorCode::AmountMismatch),
            "insufficient_funds_sol" => Some(ErrorCode::InsufficientFundsSol),
            "insufficient_funds_token" => Some(ErrorCode::InsufficientFundsToken),
            "insufficient_credits" => Some(ErrorCode::InsufficientCredits),
            "invalid_token_mint" => Some(ErrorCode::InvalidTokenMint),
            "not_spl_transfer" => Some(ErrorCode::NotSplTransfer),
            "missing_token_account" => Some(ErrorCode::MissingTokenAccount),
            "invalid_token_program" => Some(ErrorCode::InvalidTokenProgram),
            "missing_memo" => Some(ErrorCode::MissingMemo),
            "invalid_memo" => Some(ErrorCode::InvalidMemo),
            "payment_already_used" => Some(ErrorCode::PaymentAlreadyUsed),
            "signature_reused" => Some(ErrorCode::SignatureReused),
            "quote_expired" => Some(ErrorCode::QuoteExpired),
            "transaction_expired" => Some(ErrorCode::TransactionExpired),
            "invalid_recipient" => Some(ErrorCode::InvalidRecipient),
            "invalid_sender" => Some(ErrorCode::InvalidSender),
            "unauthorized_refund_issuer" => Some(ErrorCode::UnauthorizedRefundIssuer),
            "missing_field" => Some(ErrorCode::MissingField),
            "invalid_field" => Some(ErrorCode::InvalidField),
            "invalid_amount" => Some(ErrorCode::InvalidAmount),
            "invalid_wallet" => Some(ErrorCode::InvalidWallet),
            "invalid_resource" => Some(ErrorCode::InvalidResource),
            "invalid_coupon" => Some(ErrorCode::InvalidCoupon),
            "invalid_cart_item" => Some(ErrorCode::InvalidCartItem),
            "empty_cart" => Some(ErrorCode::EmptyCart),
            "cart_already_paid" => Some(ErrorCode::CartAlreadyPaid),
            "refund_already_processed" => Some(ErrorCode::RefundAlreadyProcessed),
            "mixed_tokens_in_cart" => Some(ErrorCode::MixedTokensInCart),
            "cart_too_large" => Some(ErrorCode::CartTooLarge),
            "invalid_quantity" => Some(ErrorCode::InvalidQuantity),
            "invalid_resource_type" => Some(ErrorCode::InvalidResourceType),
            "nonce_expired" => Some(ErrorCode::NonceExpired),
            "nonce_already_used" => Some(ErrorCode::NonceAlreadyUsed),
            "invalid_nonce_purpose" => Some(ErrorCode::InvalidNoncePurpose),
            "resource_not_found" => Some(ErrorCode::ResourceNotFound),
            "cart_not_found" => Some(ErrorCode::CartNotFound),
            "refund_not_found" => Some(ErrorCode::RefundNotFound),
            "product_not_found" => Some(ErrorCode::ProductNotFound),
            "coupon_not_found" => Some(ErrorCode::CouponNotFound),
            "session_not_found" => Some(ErrorCode::SessionNotFound),
            "subscription_not_found" => Some(ErrorCode::SubscriptionNotFound),
            "nonce_not_found" => Some(ErrorCode::NonceNotFound),
            "coupon_expired" => Some(ErrorCode::CouponExpired),
            "coupon_usage_limit_reached" => Some(ErrorCode::CouponUsageLimitReached),
            "coupon_not_applicable" => Some(ErrorCode::CouponNotApplicable),
            "coupon_wrong_payment_method" => Some(ErrorCode::CouponWrongPaymentMethod),
            "stripe_error" => Some(ErrorCode::StripeError),
            "rpc_error" => Some(ErrorCode::RpcError),
            "network_error" => Some(ErrorCode::NetworkError),
            "internal_error" => Some(ErrorCode::InternalError),
            "database_error" => Some(ErrorCode::DatabaseError),
            "config_error" => Some(ErrorCode::ConfigError),
            "server_insufficient_funds" => Some(ErrorCode::ServerInsufficientFunds),
            "send_failed" => Some(ErrorCode::SendFailed),
            "send_failed_after_account_creation" => Some(ErrorCode::SendFailedAfterAccountCreation),
            "verification_failed" => Some(ErrorCode::VerificationFailed),
            "invalid_operation" => Some(ErrorCode::InvalidOperation),
            "unauthorized" => Some(ErrorCode::Unauthorized),
            "payment_required" => Some(ErrorCode::PaymentRequired),
            "gasless_not_enabled" => Some(ErrorCode::GaslessNotEnabled),
            "no_available_wallet" => Some(ErrorCode::NoAvailableWallet),
            "invalid_payer" => Some(ErrorCode::InvalidPayer),
            "service_unavailable" => Some(ErrorCode::ServiceUnavailable),
            "network_mismatch" => Some(ErrorCode::NetworkMismatch),
            "payment_method_disabled" => Some(ErrorCode::PaymentMethodDisabled),
            "rate_limited" => Some(ErrorCode::RateLimited),
            _ => None,
        }
    }
}
