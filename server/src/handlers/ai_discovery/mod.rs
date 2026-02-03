//! AI Discovery System - First-class support for LLMs and agentic users.
//!
//! Implements the AI Discovery System specification with multiple discovery endpoints
//! in different formats for various AI consumers.
//!
//! ## For Library Consumers
//!
//! When integrating cedros-pay as a library alongside other packages, use the
//! composable content functions to build unified discovery:
//!
//! ```ignore
//! use cedros_pay::ai_discovery::{
//!     get_skills_with_base,
//!     get_ai_discovery_index,
//!     get_skill_metadata,
//!     get_llms_content,
//! };
//!
//! // Get skills with custom base path for federated setup
//! let pay_skills = get_skills_with_base("/pay");
//! let login_skills = cedros_login::ai_discovery::get_skills_with_base("/login");
//!
//! // Compose unified discovery
//! let all_skills = [pay_skills, login_skills].concat();
//! ```
//!
//! ## Endpoint Summary
//!
//! | Endpoint | Content-Type | Purpose |
//! |----------|--------------|---------|
//! | `/ai.txt` | text/plain | AI crawler permissions |
//! | `/llms.txt` | text/plain | Brief API summary |
//! | `/llms-full.txt` | text/plain | Complete documentation |
//! | `/llms-admin.txt` | text/plain | Admin operations |
//! | `/skill.md` | text/markdown | Skill index (YAML frontmatter) |
//! | `/skill.json` | application/json | Machine-readable skills |
//! | `/skills/:id.md` | text/markdown | Individual skill files |
//! | `/agent.md` | text/markdown | Integration guide |
//! | `/heartbeat.md` | text/markdown | Health status (YAML frontmatter) |
//! | `/heartbeat.json` | application/json | Health status (JSON) |
//! | `/.well-known/ai-discovery.json` | application/json | Canonical entry point |
//! | `/.well-known/ai-plugin.json` | application/json | OpenAI plugin manifest |
//! | `/.well-known/agent.json` | application/json | A2A Agent Card |
//! | `/.well-known/mcp` | application/json | MCP server discovery |
//! | `/.well-known/skills.zip` | application/zip | Downloadable skills bundle |

mod agent;
mod content;
mod heartbeat;
mod llms;
mod manifests;
mod skill_docs;
mod skills;
pub mod types;

// Re-export handlers
pub use agent::agent_md;
pub use heartbeat::{heartbeat_json, heartbeat_md};
pub use llms::{ai_txt, llms_admin_txt, llms_full_txt, llms_txt};
pub use manifests::{a2a_agent_json, ai_discovery_json, ai_plugin_json, mcp_discovery};
pub use skills::{skill_file, skill_json, skill_md, skills_zip};

// Re-export composable content functions for library consumers
pub use content::{
    get_ai_discovery_index, get_llms_content, get_llms_full_content, get_skill_metadata,
    get_skills, get_skills_with_base, SERVICE_DESCRIPTION, SERVICE_NAME, VERSION,
};
