//! AI Tool definitions and types for chat tool calling.
//!
//! Defines tools that can be called by the AI during chat conversations.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

// ============================================================================
// Tool Definitions
// ============================================================================

/// A tool that can be called by the AI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: &'static str,
    pub description: &'static str,
    pub parameters: Value,
}

/// Product search tool - searches catalog for matching products
pub fn product_search_tool() -> ToolDefinition {
    ToolDefinition {
        name: "product_search",
        description: "Search for products matching a customer query. Use this when the customer asks about products, wants to find items, or describes what they're looking for.",
        parameters: json!({
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query describing what the customer wants to find"
                }
            },
            "required": ["query"]
        }),
    }
}

/// Fact finder tool - searches FAQs and knowledge base for answers
pub fn fact_finder_tool() -> ToolDefinition {
    ToolDefinition {
        name: "fact_finder",
        description: "Search the FAQ and knowledge base for information. Use this when the customer asks questions about policies, shipping, returns, store hours, or other factual information that isn't about specific products.",
        parameters: json!({
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query for finding relevant FAQ entries or knowledge base articles"
                }
            },
            "required": ["query"]
        }),
    }
}

/// Get all available chat tools
pub fn get_chat_tools() -> Vec<ToolDefinition> {
    vec![product_search_tool(), fact_finder_tool()]
}

// ============================================================================
// Tool Call/Result Types
// ============================================================================

/// A tool call made by the AI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    /// Unique ID for this tool call (from the API)
    pub id: String,
    /// Name of the tool to call
    pub name: String,
    /// Arguments to pass to the tool (JSON)
    pub arguments: Value,
}

/// Result from executing a tool
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    /// ID of the tool call this result is for
    pub tool_call_id: String,
    /// Result content (JSON serialized to string)
    pub content: String,
}

/// Product search tool arguments
#[derive(Debug, Clone, Deserialize)]
pub struct ProductSearchArgs {
    pub query: String,
}

/// Fact finder tool arguments
#[derive(Debug, Clone, Deserialize)]
pub struct FactFinderArgs {
    pub query: String,
}

// ============================================================================
// Message Types for Tool Calling
// ============================================================================

/// A message in a tool-calling conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "role", rename_all = "lowercase")]
pub enum ConversationMessage {
    System {
        content: String,
    },
    User {
        content: String,
    },
    Assistant {
        content: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        tool_calls: Option<Vec<ToolCall>>,
    },
    Tool {
        tool_call_id: String,
        content: String,
    },
}

impl ConversationMessage {
    pub fn system(content: impl Into<String>) -> Self {
        Self::System {
            content: content.into(),
        }
    }

    pub fn user(content: impl Into<String>) -> Self {
        Self::User {
            content: content.into(),
        }
    }

    pub fn assistant(content: impl Into<String>) -> Self {
        Self::Assistant {
            content: content.into(),
            tool_calls: None,
        }
    }

    pub fn assistant_with_tools(content: impl Into<String>, tool_calls: Vec<ToolCall>) -> Self {
        Self::Assistant {
            content: content.into(),
            tool_calls: if tool_calls.is_empty() {
                None
            } else {
                Some(tool_calls)
            },
        }
    }

    pub fn tool(tool_call_id: impl Into<String>, content: impl Into<String>) -> Self {
        Self::Tool {
            tool_call_id: tool_call_id.into(),
            content: content.into(),
        }
    }
}

// ============================================================================
// AI Response with Tools
// ============================================================================

/// Response from an AI call that may include tool calls
#[derive(Debug, Clone)]
pub struct ToolCallingResponse {
    /// Text content from the assistant (may be empty if only tool calls)
    pub content: String,
    /// Tool calls the AI wants to make (empty if no tools requested)
    pub tool_calls: Vec<ToolCall>,
    /// Whether the AI is done (no more tool calls needed)
    pub is_complete: bool,
}

impl ToolCallingResponse {
    /// Create a response with just text (no tool calls)
    pub fn text(content: impl Into<String>) -> Self {
        Self {
            content: content.into(),
            tool_calls: vec![],
            is_complete: true,
        }
    }

    /// Create a response with tool calls
    pub fn with_tools(content: impl Into<String>, tool_calls: Vec<ToolCall>) -> Self {
        let is_complete = tool_calls.is_empty();
        Self {
            content: content.into(),
            tool_calls,
            is_complete,
        }
    }
}

// ============================================================================
// OpenAI Tool Format
// ============================================================================

/// Convert tool definitions to OpenAI format
pub fn to_openai_tools(tools: &[ToolDefinition]) -> Value {
    let tool_defs: Vec<Value> = tools
        .iter()
        .map(|t| {
            json!({
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.parameters
                }
            })
        })
        .collect();
    json!(tool_defs)
}

/// Convert tool definitions to Gemini format
pub fn to_gemini_tools(tools: &[ToolDefinition]) -> Value {
    let function_declarations: Vec<Value> = tools
        .iter()
        .map(|t| {
            json!({
                "name": t.name,
                "description": t.description,
                "parameters": t.parameters
            })
        })
        .collect();
    json!([{
        "function_declarations": function_declarations
    }])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_product_search_tool_definition() {
        let tool = product_search_tool();
        assert_eq!(tool.name, "product_search");
        assert!(tool.description.contains("Search"));
    }

    #[test]
    fn test_get_chat_tools() {
        let tools = get_chat_tools();
        assert_eq!(tools.len(), 2);
        assert_eq!(tools[0].name, "product_search");
        assert_eq!(tools[1].name, "fact_finder");
    }

    #[test]
    fn test_to_openai_tools() {
        let tools = get_chat_tools();
        let openai_format = to_openai_tools(&tools);
        let arr = openai_format.as_array().unwrap();
        assert_eq!(arr.len(), 2);
        assert_eq!(arr[0]["type"], "function");
        assert_eq!(arr[0]["function"]["name"], "product_search");
        assert_eq!(arr[1]["function"]["name"], "fact_finder");
    }

    #[test]
    fn test_to_gemini_tools() {
        let tools = get_chat_tools();
        let gemini_format = to_gemini_tools(&tools);
        let arr = gemini_format.as_array().unwrap();
        assert_eq!(arr.len(), 1);
        let funcs = arr[0]["function_declarations"].as_array().unwrap();
        assert_eq!(funcs.len(), 2);
        assert_eq!(funcs[0]["name"], "product_search");
        assert_eq!(funcs[1]["name"], "fact_finder");
    }

    #[test]
    fn test_fact_finder_tool_definition() {
        let tool = fact_finder_tool();
        assert_eq!(tool.name, "fact_finder");
        assert!(tool.description.contains("FAQ"));
    }
}
