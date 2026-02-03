//! Tool execution implementations for the chat orchestrator.
//!
//! Contains the actual logic for executing product_search and fact_finder tools.

use std::sync::Arc;

use serde_json::json;

use crate::handlers::admin_ai_assistant::{ProductMatch, ProductSearchResponse};
use crate::models::{Faq, Product};

use super::orchestrator::{FactFinderConfig, FaqMatch};
use super::tools::{FactFinderArgs, ProductSearchArgs, ToolCall};
use super::{parse_json_response, AiService, FactFinderResult};

/// Execute a tool call and return (result_string, products, faqs, action)
pub async fn execute_tool(
    ai_service: &Arc<AiService>,
    tool_call: &ToolCall,
    products: &[Product],
    faqs: &[Faq],
    fact_finder_config: Option<&FactFinderConfig>,
) -> (String, Vec<ProductMatch>, Vec<FaqMatch>, Option<String>) {
    match tool_call.name.as_str() {
        "product_search" => {
            let (result, found_products, action) = execute_product_search(tool_call, products);
            (result, found_products, vec![], Some(action))
        }
        "fact_finder" => {
            let (result, found_faqs, action) =
                execute_fact_finder(ai_service, tool_call, faqs, fact_finder_config).await;
            (result, vec![], found_faqs, Some(action))
        }
        _ => {
            tracing::warn!(tool = %tool_call.name, "Unknown tool called");
            let result = json!({
                "error": format!("Unknown tool: {}", tool_call.name)
            })
            .to_string();
            (result, vec![], vec![], None)
        }
    }
}

/// Execute product search tool - returns (result_string, found_products, action)
fn execute_product_search(
    tool_call: &ToolCall,
    products: &[Product],
) -> (String, Vec<ProductMatch>, String) {
    // Parse arguments
    let args: ProductSearchArgs = match serde_json::from_value(tool_call.arguments.clone()) {
        Ok(a) => a,
        Err(e) => {
            return (
                json!({"error": format!("Invalid arguments: {}", e)}).to_string(),
                vec![],
                "Failed to parse search query".to_string(),
            );
        }
    };

    let action = format!("Searched for: {}", args.query);

    // Simple keyword-based search
    let query_lower = args.query.to_lowercase();
    let keywords: Vec<&str> = query_lower.split_whitespace().collect();

    let mut matches: Vec<(Product, i32)> = products
        .iter()
        .filter(|p| p.active)
        .map(|p| {
            let mut score = 0i32;
            let title = p.title.as_deref().unwrap_or("").to_lowercase();
            let desc = p.description.to_lowercase();
            let tags = p.tags.join(" ").to_lowercase();

            for kw in &keywords {
                if title.contains(kw) {
                    score += 10;
                }
                if desc.contains(kw) {
                    score += 5;
                }
                if tags.contains(kw) {
                    score += 3;
                }
            }
            (p.clone(), score)
        })
        .filter(|(_, score)| *score > 0)
        .collect();

    matches.sort_by(|a, b| b.1.cmp(&a.1));

    let found_products: Vec<ProductMatch> = matches
        .into_iter()
        .take(3)
        .map(|(p, _)| product_to_match(&p))
        .collect();

    let response = ProductSearchResponse {
        products: found_products.clone(),
        reasoning: format!(
            "Found {} products matching '{}'",
            found_products.len(),
            args.query
        ),
    };

    let result = json!({
        "name": "product_search",
        "response": response
    })
    .to_string();

    (result, found_products, action)
}

/// Execute fact finder tool - returns (result_string, found_faqs, action)
async fn execute_fact_finder(
    ai_service: &Arc<AiService>,
    tool_call: &ToolCall,
    faqs: &[Faq],
    config: Option<&FactFinderConfig>,
) -> (String, Vec<FaqMatch>, String) {
    // Parse arguments
    let args: FactFinderArgs = match serde_json::from_value(tool_call.arguments.clone()) {
        Ok(a) => a,
        Err(e) => {
            return (
                json!({"error": format!("Invalid arguments: {}", e)}).to_string(),
                vec![],
                "Failed to parse FAQ query".to_string(),
            );
        }
    };

    let action = format!("Searched FAQ for: {}", args.query);

    // Try AI-powered search if config is available
    if let Some(cfg) = config {
        if let Some(found) = ai_fact_finder(ai_service, &args.query, faqs, cfg).await {
            let response = json!({
                "faqs": &found,
                "count": found.len(),
                "message": if found.is_empty() {
                    format!("No FAQ entries found for '{}'", args.query)
                } else {
                    format!("Found {} FAQ entries matching '{}'", found.len(), args.query)
                }
            });
            let result = json!({
                "name": "fact_finder",
                "response": response
            })
            .to_string();
            return (result, found, action);
        }
        tracing::warn!("AI fact finder failed, falling back to keyword search");
    }

    // Keyword-based fallback search
    let found_faqs = keyword_fact_finder(&args.query, faqs);

    let response = json!({
        "faqs": &found_faqs,
        "count": found_faqs.len(),
        "message": if found_faqs.is_empty() {
            format!("No FAQ entries found for '{}'", args.query)
        } else {
            format!("Found {} FAQ entries matching '{}'", found_faqs.len(), args.query)
        }
    });

    let result = json!({
        "name": "fact_finder",
        "response": response
    })
    .to_string();

    (result, found_faqs, action)
}

/// AI-powered fact finder search
async fn ai_fact_finder(
    ai_service: &Arc<AiService>,
    query: &str,
    faqs: &[Faq],
    config: &FactFinderConfig,
) -> Option<Vec<FaqMatch>> {
    // Build FAQ catalog for AI
    let faq_list: Vec<String> = faqs
        .iter()
        .filter(|f| f.active)
        .map(|f| {
            format!(
                "ID: {}\nQ: {}\nA: {}\nKeywords: {}",
                f.id,
                f.question,
                f.answer,
                f.keywords.join(", ")
            )
        })
        .collect();

    if faq_list.is_empty() {
        return Some(vec![]);
    }

    let user_prompt = format!(
        "Customer question: {}\n\nAvailable FAQs:\n{}",
        query,
        faq_list.join("\n\n")
    );

    let response = ai_service
        .complete_with_metrics(
            config.provider,
            config.model,
            &config.api_key,
            &config.prompt,
            &user_prompt,
            "fact_finder",
        )
        .await
        .ok()?;

    let result: FactFinderResult = parse_json_response(&response).ok()?;

    // Map AI results to FaqMatch
    let faq_map: std::collections::HashMap<&str, &Faq> =
        faqs.iter().map(|f| (f.id.as_str(), f)).collect();

    let found: Vec<FaqMatch> = result
        .matches
        .iter()
        .filter_map(|m| {
            faq_map.get(m.faq_id.as_str()).map(|f| FaqMatch {
                id: f.id.clone(),
                question: f.question.clone(),
                answer: f.answer.clone(),
            })
        })
        .take(3)
        .collect();

    Some(found)
}

/// Keyword-based fallback fact finder
fn keyword_fact_finder(query: &str, faqs: &[Faq]) -> Vec<FaqMatch> {
    let query_lower = query.to_lowercase();
    let keywords: Vec<&str> = query_lower.split_whitespace().collect();

    let mut matches: Vec<(&Faq, i32)> = faqs
        .iter()
        .filter(|f| f.active)
        .map(|f| {
            let mut score = 0i32;
            let question = f.question.to_lowercase();
            let answer = f.answer.to_lowercase();
            let faq_keywords = f.keywords.join(" ").to_lowercase();

            for kw in &keywords {
                if f.keywords.iter().any(|k| k.to_lowercase() == *kw) {
                    score += 15;
                }
                if question.contains(kw) {
                    score += 10;
                }
                if answer.contains(kw) {
                    score += 5;
                }
                if faq_keywords.contains(kw) {
                    score += 3;
                }
            }
            (f, score)
        })
        .filter(|(_, score)| *score > 0)
        .collect();

    matches.sort_by(|a, b| b.1.cmp(&a.1));

    matches
        .into_iter()
        .take(3)
        .map(|(f, _)| FaqMatch {
            id: f.id.clone(),
            question: f.question.clone(),
            answer: f.answer.clone(),
        })
        .collect()
}

/// Convert a Product to a ProductMatch
fn product_to_match(product: &Product) -> ProductMatch {
    ProductMatch {
        id: product.id.clone(),
        name: product.title.clone().unwrap_or_else(|| product.id.clone()),
        description: if product.description.is_empty() {
            None
        } else if product.description.len() > 200 {
            Some(format!("{}...", &product.description[..200]))
        } else {
            Some(product.description.clone())
        },
        image_url: product.images.first().map(|img| img.url.clone()),
        price_cents: product
            .variants
            .first()
            .and_then(|v| v.price.as_ref())
            .and_then(|p| p.amount)
            .map(|a| (a * 100.0) as i64),
        slug: product.slug.clone(),
        relevance: "Matches search query".to_string(),
    }
}
