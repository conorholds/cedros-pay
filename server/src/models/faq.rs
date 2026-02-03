//! FAQ model for knowledge base entries.
//!
//! Used by the site chat AI to answer customer questions about policies, shipping, etc.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// A frequently asked question entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Faq {
    pub id: String,
    pub tenant_id: String,
    /// The question text
    pub question: String,
    /// The answer text (supports markdown)
    pub answer: String,
    /// Keywords for search optimization
    #[serde(default)]
    pub keywords: Vec<String>,
    /// Whether this FAQ is active and searchable
    #[serde(default = "default_true")]
    pub active: bool,
    /// Whether the AI chat assistant should use this FAQ
    #[serde(default = "default_true")]
    pub use_in_chat: bool,
    /// Whether to display on the public FAQ page
    #[serde(default = "default_true")]
    pub display_on_page: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

fn default_true() -> bool {
    true
}

impl Faq {
    /// Create a new FAQ entry
    pub fn new(tenant_id: String, id: String, question: String, answer: String) -> Self {
        let now = Utc::now();
        Self {
            id,
            tenant_id,
            question,
            answer,
            keywords: vec![],
            active: true,
            use_in_chat: true,
            display_on_page: true,
            created_at: now,
            updated_at: now,
        }
    }

    /// Add keywords for better search matching
    pub fn with_keywords(mut self, keywords: Vec<String>) -> Self {
        self.keywords = keywords;
        self
    }
}
