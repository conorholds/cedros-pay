//! Admin product variations management handlers
//!
//! Provides GET/PUT endpoints for managing product variation configuration.

use std::sync::Arc;

use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};

use crate::errors::{error_response, ErrorCode};
use crate::handlers::admin::AdminState;
use crate::handlers::response::{json_error, json_ok};
use crate::middleware::TenantContext;
#[cfg(test)]
use crate::models::VariationType;
use crate::models::{ProductVariant, ProductVariationConfig, VariationValue};

/// Limits for variation configuration
const MAX_VARIATION_TYPES: usize = 5;
const MAX_VALUES_PER_TYPE: usize = 20;
const MAX_VARIANTS: usize = 100;

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetVariationsResponse {
    pub product_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variation_config: Option<ProductVariationConfig>,
    pub variants: Vec<ProductVariant>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVariationsRequest {
    pub variation_config: ProductVariationConfig,
    /// If true, generate all possible variant combinations
    #[serde(default)]
    pub generate_all: bool,
    /// Specific variants to create (for lazy generation)
    #[serde(default)]
    pub create_variants: Vec<CreateVariantRequest>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVariantRequest {
    /// References to VariationValue.id
    pub option_value_ids: Vec<String>,
    #[serde(default)]
    pub price_amount: Option<f64>,
    #[serde(default)]
    pub price_currency: Option<String>,
    #[serde(default)]
    pub inventory_quantity: Option<i32>,
    #[serde(default)]
    pub sku: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVariationsResponse {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variation_config: Option<ProductVariationConfig>,
    pub variants: Vec<ProductVariant>,
    pub variants_created: usize,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkInventoryUpdateRequest {
    /// List of variant inventory updates
    pub updates: Vec<VariantInventoryUpdate>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VariantInventoryUpdate {
    /// Variant ID to update
    pub variant_id: String,
    /// New inventory quantity (absolute value, not delta)
    pub inventory_quantity: i32,
    /// Optional inventory status override
    #[serde(default)]
    pub inventory_status: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkInventoryUpdateResponse {
    pub success: bool,
    pub message: String,
    pub updated_count: usize,
    pub variants: Vec<ProductVariant>,
}

// ============================================================================
// Handlers
// ============================================================================

/// GET /admin/products/:id/variations - Get variation config for a product
pub async fn get_variations(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(product_id): Path<String>,
) -> impl IntoResponse {
    match state
        .product_repo
        .get_product(&tenant.tenant_id, &product_id)
        .await
    {
        Ok(product) => {
            let response = GetVariationsResponse {
                product_id: product.id,
                variation_config: product.variation_config,
                variants: product.variants,
            };
            json_ok(response).into_response()
        }
        Err(_) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("Product not found".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

/// PUT /admin/products/:id/variations - Save variation config
pub async fn update_variations(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(product_id): Path<String>,
    Json(request): Json<UpdateVariationsRequest>,
) -> impl IntoResponse {
    // Validate limits
    if let Err(e) = validate_variation_config(&request.variation_config) {
        let (status, body) = error_response(ErrorCode::InvalidField, Some(e), None);
        return json_error(status, body).into_response();
    }

    // Get existing product
    let mut product = match state
        .product_repo
        .get_product(&tenant.tenant_id, &product_id)
        .await
    {
        Ok(p) => p,
        Err(_) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("Product not found".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    // Update variation config
    product.variation_config = Some(request.variation_config.clone());

    let mut variants_created = 0;

    // Generate all variants if requested
    if request.generate_all {
        let new_variants =
            generate_all_variants(&request.variation_config, &product.variants, MAX_VARIANTS);
        variants_created = new_variants.len();
        product.variants.extend(new_variants);
    }

    // Create specific variants from request
    for create_req in &request.create_variants {
        if let Some(variant) =
            create_variant_from_request(&request.variation_config, create_req, &product.variants)
        {
            product.variants.push(variant);
            variants_created += 1;
        }
    }

    // Enforce max variants limit
    if product.variants.len() > MAX_VARIANTS {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some(format!(
                "Too many variants: {} exceeds limit of {}",
                product.variants.len(),
                MAX_VARIANTS
            )),
            None,
        );
        return json_error(status, body).into_response();
    }

    // Update timestamp
    product.updated_at = Some(chrono::Utc::now());

    // Save product
    match state.product_repo.update_product(product.clone()).await {
        Ok(()) => {
            let response = UpdateVariationsResponse {
                success: true,
                message: format!(
                    "Updated variation config with {} types, {} variants",
                    request.variation_config.variation_types.len(),
                    product.variants.len()
                ),
                variation_config: product.variation_config,
                variants: product.variants,
                variants_created,
            };
            json_ok(response).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to update product variations");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to update variations".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

/// PUT /admin/products/:id/variants/inventory - Bulk update variant inventory
pub async fn bulk_update_inventory(
    State(state): State<Arc<AdminState>>,
    tenant: TenantContext,
    Path(product_id): Path<String>,
    Json(request): Json<BulkInventoryUpdateRequest>,
) -> impl IntoResponse {
    // Get existing product
    let mut product = match state
        .product_repo
        .get_product(&tenant.tenant_id, &product_id)
        .await
    {
        Ok(p) => p,
        Err(_) => {
            let (status, body) = error_response(
                ErrorCode::ResourceNotFound,
                Some("Product not found".to_string()),
                None,
            );
            return json_error(status, body).into_response();
        }
    };

    let mut updated_count = 0;

    // Apply updates to matching variants
    for update in &request.updates {
        if let Some(variant) = product
            .variants
            .iter_mut()
            .find(|v| v.id == update.variant_id)
        {
            variant.inventory_quantity = Some(update.inventory_quantity);
            if let Some(ref status) = update.inventory_status {
                variant.inventory_status = Some(status.clone());
            } else {
                // Auto-calculate status based on quantity
                variant.inventory_status = Some(if update.inventory_quantity <= 0 {
                    "out_of_stock".to_string()
                } else if update.inventory_quantity <= 5 {
                    "low".to_string()
                } else {
                    "in_stock".to_string()
                });
            }
            updated_count += 1;
        }
    }

    if updated_count == 0 {
        let (status, body) = error_response(
            ErrorCode::InvalidField,
            Some("No matching variants found to update".to_string()),
            None,
        );
        return json_error(status, body).into_response();
    }

    // Update timestamp
    product.updated_at = Some(chrono::Utc::now());

    // Save product
    match state.product_repo.update_product(product.clone()).await {
        Ok(()) => {
            let response = BulkInventoryUpdateResponse {
                success: true,
                message: format!("Updated inventory for {} variants", updated_count),
                updated_count,
                variants: product.variants,
            };
            json_ok(response).into_response()
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to update variant inventory");
            let (status, body) = error_response(
                ErrorCode::InternalError,
                Some("Failed to update variant inventory".to_string()),
                None,
            );
            json_error(status, body).into_response()
        }
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Validate variation config against limits
fn validate_variation_config(config: &ProductVariationConfig) -> Result<(), String> {
    if config.variation_types.len() > MAX_VARIATION_TYPES {
        return Err(format!(
            "Too many variation types: {} exceeds limit of {}",
            config.variation_types.len(),
            MAX_VARIATION_TYPES
        ));
    }

    for vtype in &config.variation_types {
        if vtype.values.len() > MAX_VALUES_PER_TYPE {
            return Err(format!(
                "Too many values for '{}': {} exceeds limit of {}",
                vtype.name,
                vtype.values.len(),
                MAX_VALUES_PER_TYPE
            ));
        }

        // Check for duplicate value IDs
        let mut seen_ids = std::collections::HashSet::new();
        for value in &vtype.values {
            if !seen_ids.insert(&value.id) {
                return Err(format!(
                    "Duplicate value ID '{}' in variation type '{}'",
                    value.id, vtype.name
                ));
            }
        }
    }

    // Check for duplicate type IDs
    let mut seen_type_ids = std::collections::HashSet::new();
    for vtype in &config.variation_types {
        if !seen_type_ids.insert(&vtype.id) {
            return Err(format!("Duplicate variation type ID '{}'", vtype.id));
        }
    }

    Ok(())
}

/// Generate all possible variant combinations (Cartesian product)
fn generate_all_variants(
    config: &ProductVariationConfig,
    existing_variants: &[ProductVariant],
    max_variants: usize,
) -> Vec<ProductVariant> {
    if config.variation_types.is_empty() {
        return Vec::new();
    }

    // Build index of existing variants by their option_value_ids
    let existing_combos: std::collections::HashSet<Vec<String>> = existing_variants
        .iter()
        .map(|v| {
            let mut ids = v.option_value_ids.clone();
            ids.sort();
            ids
        })
        .collect();

    // Generate Cartesian product of all value combinations
    let mut all_combos: Vec<Vec<&VariationValue>> = vec![vec![]];

    for vtype in &config.variation_types {
        let mut new_combos = Vec::new();
        for combo in &all_combos {
            for value in &vtype.values {
                let mut new_combo = combo.clone();
                new_combo.push(value);
                new_combos.push(new_combo);
            }
        }
        all_combos = new_combos;
    }

    // Create variants for combinations that don't exist yet
    let mut new_variants = Vec::new();
    for combo in all_combos {
        if new_variants.len() + existing_variants.len() >= max_variants {
            break;
        }

        let option_value_ids: Vec<String> = combo.iter().map(|v| v.id.clone()).collect();
        let mut sorted_ids = option_value_ids.clone();
        sorted_ids.sort();

        // Skip if this combo already exists
        if existing_combos.contains(&sorted_ids) {
            continue;
        }

        // Build title and options map
        let title = combo
            .iter()
            .map(|v| v.label.as_str())
            .collect::<Vec<_>>()
            .join(" / ");

        let mut options = std::collections::HashMap::new();
        for (i, vtype) in config.variation_types.iter().enumerate() {
            if let Some(value) = combo.get(i) {
                options.insert(vtype.name.clone(), value.label.clone());
            }
        }

        new_variants.push(ProductVariant {
            id: format!(
                "var_{}",
                uuid::Uuid::new_v4()
                    .to_string()
                    .split('-')
                    .next()
                    .unwrap_or("unknown")
            ),
            title,
            options,
            option_value_ids,
            price: None,
            compare_at_price: None,
            inventory_status: Some("in_stock".to_string()),
            inventory_quantity: None,
            sku: None,
            images: Vec::new(),
        });
    }

    new_variants
}

/// Create a single variant from request
fn create_variant_from_request(
    config: &ProductVariationConfig,
    request: &CreateVariantRequest,
    existing_variants: &[ProductVariant],
) -> Option<ProductVariant> {
    // Check if variant with same options already exists
    let mut sorted_ids = request.option_value_ids.clone();
    sorted_ids.sort();

    for existing in existing_variants {
        let mut existing_sorted = existing.option_value_ids.clone();
        existing_sorted.sort();
        if existing_sorted == sorted_ids {
            return None; // Already exists
        }
    }

    // Build title and options from value IDs
    let mut title_parts = Vec::new();
    let mut options = std::collections::HashMap::new();

    for vtype in &config.variation_types {
        for value in &vtype.values {
            if request.option_value_ids.contains(&value.id) {
                title_parts.push(value.label.as_str());
                options.insert(vtype.name.clone(), value.label.clone());
                break;
            }
        }
    }

    let title = title_parts.join(" / ");

    // Build price if provided
    let price = match (&request.price_amount, &request.price_currency) {
        (Some(amount), Some(_currency)) => Some(crate::models::VariantPrice {
            amount: Some(*amount),
            currency: request.price_currency.clone(),
        }),
        _ => None,
    };

    Some(ProductVariant {
        id: format!(
            "var_{}",
            uuid::Uuid::new_v4()
                .to_string()
                .split('-')
                .next()
                .unwrap_or("unknown")
        ),
        title,
        options,
        option_value_ids: request.option_value_ids.clone(),
        price,
        compare_at_price: None,
        inventory_status: Some("in_stock".to_string()),
        inventory_quantity: request.inventory_quantity,
        sku: request.sku.clone(),
        images: Vec::new(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_test_config() -> ProductVariationConfig {
        ProductVariationConfig {
            variation_types: vec![
                VariationType {
                    id: "size".to_string(),
                    name: "Size".to_string(),
                    display_order: 0,
                    values: vec![
                        VariationValue {
                            id: "s".to_string(),
                            label: "Small".to_string(),
                            parent_value_id: None,
                        },
                        VariationValue {
                            id: "m".to_string(),
                            label: "Medium".to_string(),
                            parent_value_id: None,
                        },
                    ],
                },
                VariationType {
                    id: "color".to_string(),
                    name: "Color".to_string(),
                    display_order: 1,
                    values: vec![
                        VariationValue {
                            id: "red".to_string(),
                            label: "Red".to_string(),
                            parent_value_id: None,
                        },
                        VariationValue {
                            id: "blue".to_string(),
                            label: "Blue".to_string(),
                            parent_value_id: None,
                        },
                    ],
                },
            ],
        }
    }

    #[test]
    fn test_validate_variation_config_valid() {
        let config = make_test_config();
        assert!(validate_variation_config(&config).is_ok());
    }

    #[test]
    fn test_validate_variation_config_too_many_types() {
        let config = ProductVariationConfig {
            variation_types: (0..6)
                .map(|i| VariationType {
                    id: format!("type_{}", i),
                    name: format!("Type {}", i),
                    display_order: i, // CLEAN-002: Remove unnecessary cast
                    values: vec![],
                })
                .collect(),
        };
        assert!(validate_variation_config(&config).is_err());
    }

    #[test]
    fn test_generate_all_variants_creates_cartesian_product() {
        let config = make_test_config();
        let variants = generate_all_variants(&config, &[], 100);

        // 2 sizes × 2 colors = 4 variants
        assert_eq!(variants.len(), 4);

        // Check that all combinations exist
        let titles: Vec<&str> = variants.iter().map(|v| v.title.as_str()).collect();
        assert!(titles.contains(&"Small / Red"));
        assert!(titles.contains(&"Small / Blue"));
        assert!(titles.contains(&"Medium / Red"));
        assert!(titles.contains(&"Medium / Blue"));
    }

    #[test]
    fn test_generate_all_variants_skips_existing() {
        let config = make_test_config();

        let existing = vec![ProductVariant {
            id: "existing".to_string(),
            title: "Small / Red".to_string(),
            options: std::collections::HashMap::new(),
            option_value_ids: vec!["s".to_string(), "red".to_string()],
            price: None,
            compare_at_price: None,
            inventory_status: None,
            inventory_quantity: None,
            sku: None,
            images: Vec::new(),
        }];

        let variants = generate_all_variants(&config, &existing, 100);

        // Should only create 3 new variants (skipping Small / Red)
        assert_eq!(variants.len(), 3);
    }

    #[test]
    fn test_generate_all_variants_respects_max_limit() {
        let config = make_test_config();
        let variants = generate_all_variants(&config, &[], 2);

        // Should stop at max limit
        assert_eq!(variants.len(), 2);
    }
}
