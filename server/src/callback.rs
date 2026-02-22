/// Callback trait for responding to payment events.
///
/// Library users can implement this trait to receive notifications when
/// payments, subscriptions, or refunds are processed. The callbacks are
/// invoked synchronously during request processing.
///
/// # Example
/// ```rust,ignore
/// struct MyCallback { /* ... */ }
///
/// #[async_trait::async_trait]
/// impl PaymentCallback for MyCallback {
///     async fn on_payment_success(&self, event: &PaymentEvent) -> Result<(), PaymentCallbackError> {
///         // Update your local database, trigger downstream events, etc.
///         Ok(())
///     }
///     // ... other methods use default implementations
/// }
/// ```
#[async_trait::async_trait]
pub trait PaymentCallback: Send + Sync {
    /// Called when a payment is successfully verified.
    async fn on_payment_success(
        &self,
        _event: &crate::PaymentEvent,
    ) -> Result<(), PaymentCallbackError> {
        Ok(())
    }

    /// Called when a new subscription is created.
    async fn on_subscription_created(
        &self,
        _subscription: &crate::Subscription,
    ) -> Result<(), PaymentCallbackError> {
        Ok(())
    }

    /// Called when a subscription is cancelled.
    async fn on_subscription_cancelled(
        &self,
        _subscription: &crate::Subscription,
    ) -> Result<(), PaymentCallbackError> {
        Ok(())
    }

    /// Called when a refund is processed.
    async fn on_refund_processed(
        &self,
        _event: &crate::RefundEvent,
    ) -> Result<(), PaymentCallbackError> {
        Ok(())
    }
}

/// Error type for payment callback failures.
#[derive(Debug, thiserror::Error)]
pub enum PaymentCallbackError {
    /// Callback failed with a specific error message.
    #[error("callback failed: {0}")]
    Failed(String),

    /// Callback failed due to an internal error.
    #[error("internal callback error: {0}")]
    Internal(#[from] anyhow::Error),
}

/// No-op implementation of PaymentCallback that does nothing.
///
/// Use this as a placeholder when no callback handling is needed.
pub struct NoopPaymentCallback;

#[async_trait::async_trait]
impl PaymentCallback for NoopPaymentCallback {
    // All methods use default no-op implementations
}
