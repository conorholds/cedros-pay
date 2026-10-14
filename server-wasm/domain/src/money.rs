//! Money is integer minor units (cents) plus an uppercase ISO-4217 code. All
//! arithmetic saturates so hostile or corrupted inputs can never overflow.

pub const DEFAULT_CURRENCY: &str = "USD";

/// Normalizes a currency code to an uppercase 3-letter code, falling back to
/// `USD` for anything that is not a plausible code.
pub fn normalize_currency(raw: &str) -> String {
    let trimmed = raw.trim().to_uppercase();
    if trimmed.len() == 3 && trimmed.chars().all(|c| c.is_ascii_alphabetic()) {
        trimmed
    } else {
        DEFAULT_CURRENCY.to_string()
    }
}

pub fn add(a: i64, b: i64) -> i64 {
    a.saturating_add(b)
}

pub fn sub(a: i64, b: i64) -> i64 {
    a.saturating_sub(b)
}

/// Rejects non-positive amounts (grants/charges must move a positive amount).
pub fn require_positive(amount_cents: i64) -> Result<i64, &'static str> {
    if amount_cents > 0 {
        Ok(amount_cents)
    } else {
        Err("amount must be a positive number of minor units")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_currency() {
        assert_eq!(normalize_currency(" usd "), "USD");
        assert_eq!(normalize_currency("eur"), "EUR");
        assert_eq!(normalize_currency("dollars"), "USD");
        assert_eq!(normalize_currency(""), "USD");
    }

    #[test]
    fn arithmetic_saturates() {
        assert_eq!(add(i64::MAX, 10), i64::MAX);
        assert_eq!(sub(i64::MIN, 10), i64::MIN);
        assert_eq!(add(100, 50), 150);
    }

    #[test]
    fn rejects_non_positive() {
        assert!(require_positive(0).is_err());
        assert!(require_positive(-5).is_err());
        assert_eq!(require_positive(5), Ok(5));
    }
}
