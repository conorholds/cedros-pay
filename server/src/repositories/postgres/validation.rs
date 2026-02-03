//! SQL identifier validation utilities
//!
//! Per spec (23-repositories.md): Table names must be validated against SQL injection
//! using the pattern ^[a-zA-Z_][a-zA-Z0-9_]*$

use once_cell::sync::Lazy;
use regex::Regex;

/// Regex pattern for valid SQL identifiers
/// Must start with a letter or underscore, followed by letters, digits, or underscores
static SQL_IDENTIFIER_PATTERN: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[a-zA-Z_][a-zA-Z0-9_]*$").expect("valid regex pattern"));

/// Maximum allowed length for SQL identifiers (PostgreSQL limit is 63)
const MAX_IDENTIFIER_LENGTH: usize = 63;

/// Validate that a table name is safe for use in SQL queries
///
/// Returns true if the name matches the pattern ^[a-zA-Z_][a-zA-Z0-9_]*$
/// and is within the maximum allowed length.
pub fn validate_table_name(name: &str) -> bool {
    if name.is_empty() || name.len() > MAX_IDENTIFIER_LENGTH {
        return false;
    }
    SQL_IDENTIFIER_PATTERN.is_match(name)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_table_names() {
        assert!(validate_table_name("products"));
        assert!(validate_table_name("Products"));
        assert!(validate_table_name("_products"));
        assert!(validate_table_name("products_v2"));
        assert!(validate_table_name("products123"));
        assert!(validate_table_name("_"));
        assert!(validate_table_name("a"));
    }

    #[test]
    fn test_invalid_table_names() {
        assert!(!validate_table_name(""));
        assert!(!validate_table_name("123products")); // Can't start with number
        assert!(!validate_table_name("products-v2")); // Hyphen not allowed
        assert!(!validate_table_name("products.v2")); // Dot not allowed
        assert!(!validate_table_name("products; DROP TABLE users;")); // SQL injection
        assert!(!validate_table_name("products--comment")); // SQL comment
        assert!(!validate_table_name("products/**/users")); // Block comment
        assert!(!validate_table_name(" products")); // Leading space
        assert!(!validate_table_name("products ")); // Trailing space
    }

    #[test]
    fn test_max_length() {
        let long_name = "a".repeat(63);
        assert!(validate_table_name(&long_name));

        let too_long = "a".repeat(64);
        assert!(!validate_table_name(&too_long));
    }
}
