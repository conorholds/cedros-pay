//! NFT metadata endpoint for Metaplex Core assets.
//!
//! Serves JSON conforming to the Metaplex token metadata standard at
//! `GET /paywall/v1/products/{id}/nft-metadata`. Referenced by the `uri`
//! field stored on-chain when a Metaplex Core asset is created.

use std::sync::Arc;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Serialize;

use super::products::ProductsAppState;
use crate::errors::{error_response, ErrorCode};
use crate::handlers::response::json_error;
use crate::middleware::TenantContext;
use crate::repositories::ProductRepositoryError;

/// Metaplex token metadata standard JSON.
#[derive(Serialize)]
struct NftMetadataResponse {
    name: String,
    description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    image: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    external_url: Option<String>,
    attributes: Vec<NftAttribute>,
}

#[derive(Serialize)]
struct NftAttribute {
    trait_type: String,
    value: String,
}

/// GET /paywall/v1/products/{id}/nft-metadata
///
/// Returns Metaplex token metadata JSON for a product's NFT.
/// Public endpoint — no authentication required.
pub async fn get_nft_metadata(
    State(state): State<Arc<ProductsAppState>>,
    tenant: TenantContext,
    Path(id): Path<String>,
) -> impl IntoResponse {
    if let Err(e) = crate::errors::validation::validate_resource_id(&id) {
        let (status, body) = error_response(ErrorCode::InvalidResource, Some(e.message), None);
        return json_error(status, body).into_response();
    }

    let product = match state.product_repo.get_product(&tenant.tenant_id, &id).await {
        Ok(p) => p,
        Err(ProductRepositoryError::NotFound) => {
            let (status, body) = error_response(
                ErrorCode::ProductNotFound,
                Some("product not found".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
        Err(e) => {
            tracing::error!(error = %e, product_id = %id, "Failed to get product for NFT metadata");
            let (status, body) = error_response(ErrorCode::InternalError, None, None);
            return json_error(status, body).into_response();
        }
    };

    let name = product
        .title
        .clone()
        .unwrap_or_else(|| product.description.chars().take(32).collect());

    let image = product.images.first().map(|img| img.url.clone());

    let mut attributes = Vec::new();

    if let Some(ref tac) = product.tokenized_asset_config {
        if let Some(ref ac) = tac.asset_class {
            attributes.push(NftAttribute {
                trait_type: "Asset Class".to_string(),
                value: ac.clone(),
            });
        }
        if let Some(ref identifier) = tac.asset_identifier {
            attributes.push(NftAttribute {
                trait_type: "Asset Identifier".to_string(),
                value: identifier.clone(),
            });
        }
        attributes.push(NftAttribute {
            trait_type: "Backing Value".to_string(),
            value: format!(
                "{:.2} {}",
                tac.backing_value_cents as f64 / 100.0,
                tac.backing_currency.to_uppercase()
            ),
        });
    }

    let metadata = NftMetadataResponse {
        name,
        description: product.description.clone(),
        image,
        external_url: product.slug.as_ref().map(|s| format!("/products/{s}")),
        attributes,
    };

    (StatusCode::OK, Json(metadata)).into_response()
}
