use sha2::{Digest, Sha256};

use super::{validation, CartWriteRequest, ClientCartItem, ClientCartMutation, ClientCartSnapshot};
use crate::error::{AppError, AppResult};

pub(super) fn canonicalize(mut request: CartWriteRequest) -> AppResult<CartWriteRequest> {
    validation::lane(&request.lane)?;
    validation::generation(&request.generation)?;
    validation::operation_id(&request.operation_id)?;
    validation::expected_version(request.expected_version)?;
    match &mut request.mutation {
        ClientCartMutation::Add { item } | ClientCartMutation::SetQuantity { item } => {
            validate_item(item)?
        }
        ClientCartMutation::Remove {
            resource,
            variant_id,
        } => validation::product_identity(resource, variant_id.as_deref())?,
        ClientCartMutation::ReplaceSnapshot { snapshot } => validate_snapshot(snapshot)?,
        ClientCartMutation::Clear {} => {}
    }
    Ok(request)
}

pub(super) fn fingerprint(request: &CartWriteRequest) -> AppResult<String> {
    let encoded = serde_json::to_vec(&serde_json::json!({
        "schemaVersion": 1,
        "request": request,
    }))
    .map_err(|error| {
        AppError::internal("cannot encode cart intent fingerprint").with_internal(error.to_string())
    })?;
    Ok(hex::encode(Sha256::digest(encoded)))
}

fn validate_snapshot(snapshot: &mut ClientCartSnapshot) -> AppResult<()> {
    if snapshot.items.len() > validation::MAX_LINES {
        return Err(validation::invalid(
            "cart snapshot exceeds supported bounds",
        ));
    }
    for item in &snapshot.items {
        validate_item(item)?;
    }
    let candidates = std::iter::once(snapshot.promo_code.as_deref())
        .chain(
            snapshot
                .promo_codes
                .iter()
                .map(|value| Some(value.as_str())),
        )
        .collect::<Vec<_>>();
    let code = crate::routes::coupons::requested_code(&candidates)?;
    if let Some(code) = &code {
        if code.len() > 64 {
            return Err(validation::invalid("promotion code is oversized"));
        }
    }
    snapshot.promo_code = code.clone();
    snapshot.promo_codes = code.into_iter().collect();
    Ok(())
}

fn validate_item(item: &ClientCartItem) -> AppResult<()> {
    validation::product_identity(&item.resource, item.variant_id.as_deref())?;
    validation::quantity_value(item.qty)?;
    validation::metadata(&item.display_metadata)
}
