use super::{snapshot_validation, CartCommand, CartItemInput, CartMutation};
use crate::error::{AppError, AppResult};

pub(super) const MAX_LINES: usize = 100;
pub(super) const MAX_CART_VERSION: u64 = 100_000;
pub(super) const MAX_GENERATION_EPOCH: u64 = 1_000_000;
pub(super) const MAX_UNIT_AMOUNT_CENTS: u64 = 100_000_000;
pub(super) const MAX_SUBTOTAL_CENTS: u64 = 1_000_000_000;
pub(super) const MAX_TOTAL_QUANTITY: u64 = 99_900;
const MAX_SUBJECT_BYTES: usize = 256;
const MAX_PROVIDER_BYTES: usize = 96;
const MAX_ID_BYTES: usize = 128;
const MAX_LANE_BYTES: usize = 64;
const MAX_GENERATION_BYTES: usize = 256;
const MAX_QUANTITY: u64 = 999;
const MAX_TITLE_BYTES: usize = 200;
const MAX_URL_BYTES: usize = 2_048;
const MAX_METADATA_ENTRIES: usize = 32;
const MAX_METADATA_KEY_BYTES: usize = 64;
const MAX_METADATA_VALUE_BYTES: usize = 256;

pub(super) fn subject(value: &str) -> AppResult<()> {
    bounded_text(value, MAX_SUBJECT_BYTES, "authenticated subject", false)
}

pub(super) fn provider(value: &str) -> AppResult<()> {
    identifier(value, MAX_PROVIDER_BYTES, "provider")
}

pub(super) fn command(command: &CartCommand) -> AppResult<()> {
    lane(&command.lane)?;
    operation_id(&command.operation_id)?;
    generation(&command.generation)?;
    expected_version(command.expected_version)?;
    match &command.mutation {
        CartMutation::Add { item } => item_input(item),
        CartMutation::SetItem { item } => item_input(item),
        CartMutation::Remove {
            product_id,
            variant_id,
        } => product_identity(product_id, variant_id.as_deref()),
        CartMutation::Replace { snapshot } => snapshot_validation::validate(snapshot),
        CartMutation::Clear {} => Ok(()),
    }
}

pub(super) fn lane(value: &str) -> AppResult<()> {
    identifier(value, MAX_LANE_BYTES, "lane")
}

pub(super) fn generation(value: &str) -> AppResult<()> {
    bounded_text(value, MAX_GENERATION_BYTES, "generation", true)
}

pub(super) fn operation_id(value: &str) -> AppResult<()> {
    identifier(value, MAX_ID_BYTES, "operationId")
}

pub(super) fn expected_version(value: u64) -> AppResult<()> {
    if value > MAX_CART_VERSION {
        Err(invalid("expectedVersion exceeds the supported range"))
    } else {
        Ok(())
    }
}

pub(super) fn fingerprint(value: &str) -> AppResult<()> {
    if value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        Ok(())
    } else {
        Err(AppError::internal("cart operation fingerprint is invalid"))
    }
}

pub(super) fn item_input(item: &CartItemInput) -> AppResult<()> {
    product_identity(&item.product_id, item.variant_id.as_deref())?;
    quantity_value(item.quantity)?;
    if item.unit_amount_cents == 0 || item.unit_amount_cents > MAX_UNIT_AMOUNT_CENTS {
        return Err(invalid("unitAmountCents is outside the supported range"));
    }
    if item.currency.len() != 3 || !item.currency.bytes().all(|byte| byte.is_ascii_uppercase()) {
        return Err(invalid("currency must be three uppercase ASCII letters"));
    }
    bounded_text(
        &item.title_snapshot,
        MAX_TITLE_BYTES,
        "titleSnapshot",
        false,
    )?;
    image_snapshot(item.image_snapshot.as_deref())?;
    if let Some(resource) = item.payment_resource.as_deref() {
        identifier(resource, MAX_ID_BYTES, "paymentResource")?;
    }
    optional_text(item.hold_id.as_deref(), MAX_ID_BYTES, "holdId")?;
    optional_text(
        item.hold_expires_at.as_deref(),
        MAX_ID_BYTES,
        "holdExpiresAt",
    )?;
    if item.hold_id.is_some() != item.hold_expires_at.is_some() {
        return Err(invalid(
            "holdId and holdExpiresAt must be supplied together",
        ));
    }
    if let Some(expires_at) = item.hold_expires_at.as_deref() {
        crate::time::parse_iso(expires_at)
            .ok_or_else(|| invalid("holdExpiresAt must be an ISO-8601 timestamp"))?;
    }
    metadata(&item.metadata)?;
    Ok(())
}

pub(super) fn product_identity(product_id: &str, variant_id: Option<&str>) -> AppResult<()> {
    identifier(product_id, MAX_ID_BYTES, "productId")?;
    if let Some(variant_id) = variant_id {
        identifier(variant_id, MAX_ID_BYTES, "variantId")?;
    }
    Ok(())
}

pub(super) fn quantity_value(value: u64) -> AppResult<()> {
    if value == 0 || value > MAX_QUANTITY {
        return Err(invalid("quantity is outside the supported range"));
    }
    Ok(())
}

pub(super) fn metadata(values: &std::collections::BTreeMap<String, String>) -> AppResult<()> {
    if values.len() > MAX_METADATA_ENTRIES {
        return Err(invalid("metadata has too many entries"));
    }
    for (key, value) in values {
        identifier(key, MAX_METADATA_KEY_BYTES, "metadata key")?;
        bounded_text(value, MAX_METADATA_VALUE_BYTES, "metadata value", false)?;
    }
    Ok(())
}

fn optional_text(value: Option<&str>, limit: usize, field: &str) -> AppResult<()> {
    match value {
        Some(value) => bounded_text(value, limit, field, false),
        None => Ok(()),
    }
}

fn image_snapshot(value: Option<&str>) -> AppResult<()> {
    let Some(value) = value else {
        return Ok(());
    };
    bounded_text(value, MAX_URL_BYTES, "imageSnapshot", false)?;
    if value.starts_with("https://") || value.starts_with("http://") || value.starts_with('/') {
        Ok(())
    } else {
        Err(invalid(
            "imageSnapshot must use HTTP(S) or an absolute path",
        ))
    }
}

fn identifier(value: &str, limit: usize, field: &str) -> AppResult<()> {
    bounded_text(value, limit, field, true)?;
    if !value
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':'))
    {
        return Err(invalid(format!("{field} contains unsupported characters")));
    }
    Ok(())
}

fn bounded_text(value: &str, limit: usize, field: &str, ascii: bool) -> AppResult<()> {
    if value.is_empty()
        || value.len() > limit
        || value.trim() != value
        || value.chars().any(char::is_control)
        || (ascii && !value.is_ascii())
    {
        return Err(invalid(format!("{field} is invalid or oversized")));
    }
    Ok(())
}

pub(super) fn invalid(message: impl Into<String>) -> AppError {
    AppError::unprocessable(message.into())
}
