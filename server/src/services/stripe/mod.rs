//! Stripe integration module
//!
//! This module provides the StripeClient for interacting with Stripe's API,
//! handling checkout sessions, subscriptions, webhooks, and billing operations.

mod models;
mod service;
mod webhook_signature;

// Re-export public types
pub use models::{
    CartLineItem, CreateCartSessionRequest, CreateSessionRequest, CreateSubscriptionRequest,
    ProrationLine, ProrationPreview, SessionVerifyInfo, StripeSession, SubscriptionChangeResult,
    SubscriptionWebhookEvent, UpdateSubscriptionRequest, UpdateSubscriptionResult, WebhookEvent,
};

// Re-export the client and functions
pub use service::{stripe_interval_to_period, stripe_status_to_local, StripeClient};

pub(crate) use webhook_signature::verify_stripe_webhook_signature;
