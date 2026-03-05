use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::tokenization::TokenizationConfig;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Collection {
    pub id: String,
    pub tenant_id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default)]
    pub product_ids: Vec<String>,
    pub active: bool,
    /// When set, this collection acts as an asset class for tokenized assets.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tokenization_config: Option<TokenizationConfig>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
