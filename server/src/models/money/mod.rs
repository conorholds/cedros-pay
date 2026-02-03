use std::collections::HashMap;
use std::fmt;
use std::sync::RwLock;

use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AssetType {
    Fiat,
    Spl,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct AssetMetadata {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stripe_currency: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub solana_mint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Asset {
    pub code: String,
    pub decimals: u8,
    #[serde(rename = "type")]
    pub asset_type: AssetType,
    #[serde(default)]
    pub metadata: AssetMetadata,
}

impl Asset {
    pub fn is_stripe_currency(&self) -> bool {
        matches!(self.asset_type, AssetType::Fiat)
    }

    pub fn is_spl_token(&self) -> bool {
        matches!(self.asset_type, AssetType::Spl)
    }

    pub fn stripe_currency(&self) -> Option<&str> {
        self.metadata.stripe_currency.as_deref()
    }

    pub fn solana_mint(&self) -> Option<&str> {
        self.metadata.solana_mint.as_deref()
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RoundingMode {
    Standard,
    Ceiling,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Money {
    pub asset: Asset,
    pub atomic: i64,
}

impl Default for Money {
    fn default() -> Self {
        // Use get_asset with safe fallback to avoid panic
        let usd = get_asset("USD").unwrap_or_else(|| Asset {
            code: "USD".to_string(),
            decimals: 2,
            asset_type: AssetType::Fiat,
            metadata: AssetMetadata::default(),
        });
        Money::zero(usd)
    }
}

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum MoneyError {
    #[error("arithmetic overflow")]
    Overflow,
    #[error("asset mismatch")]
    AssetMismatch,
    #[error("division by zero")]
    DivisionByZero,
    #[error("negative amount not allowed")]
    NegativeAmount,
    #[error("invalid format")]
    InvalidFormat,
}

impl Money {
    pub fn new(asset: Asset, atomic: i64) -> Self {
        Self { asset, atomic }
    }

    pub fn zero(asset: Asset) -> Self {
        Self { asset, atomic: 0 }
    }

    /// Convert from display units to atomic (ALWAYS ceiling round)
    /// Returns None if the amount would overflow i64.
    pub fn from_major(asset: Asset, amount: f64) -> Self {
        // Validate amount is finite
        if !amount.is_finite() {
            tracing::warn!(amount = %amount, "from_major received non-finite amount, using 0");
            return Self { asset, atomic: 0 };
        }

        let multiplier = 10_i64.pow(asset.decimals as u32);
        let raw = amount * multiplier as f64;

        // Check for overflow before casting
        let atomic = if raw >= i64::MAX as f64 {
            tracing::warn!(
                amount = %amount,
                decimals = asset.decimals,
                "from_major overflow, clamping to i64::MAX"
            );
            i64::MAX
        } else if raw <= i64::MIN as f64 {
            tracing::warn!(
                amount = %amount,
                decimals = asset.decimals,
                "from_major underflow, clamping to i64::MIN"
            );
            i64::MIN
        } else {
            raw.ceil() as i64
        };

        Self { asset, atomic }
    }

    /// Convert from display units to atomic with explicit error handling.
    /// Use this when you need to handle overflow as an error.
    pub fn try_from_major(asset: Asset, amount: f64) -> Result<Self, MoneyError> {
        if !amount.is_finite() {
            return Err(MoneyError::InvalidFormat);
        }

        let multiplier = 10_i64.pow(asset.decimals as u32);
        let raw = amount * multiplier as f64;

        if raw >= i64::MAX as f64 || raw <= i64::MIN as f64 {
            return Err(MoneyError::Overflow);
        }

        Ok(Self {
            asset,
            atomic: raw.ceil() as i64,
        })
    }

    pub fn from_atomic(asset: Asset, atomic: i64) -> Self {
        Self { asset, atomic }
    }

    pub fn to_major(&self) -> f64 {
        let divisor = 10_i64.pow(self.asset.decimals as u32) as f64;
        self.atomic as f64 / divisor
    }

    pub fn to_atomic(&self) -> i64 {
        self.atomic
    }

    /// Round up to cents (2 decimal places)
    /// Uses saturating arithmetic to prevent overflow.
    pub fn round_up_to_cents(&self) -> Self {
        if self.asset.decimals <= 2 {
            return self.clone();
        }
        let factor = 10_i64.pow((self.asset.decimals - 2) as u32);
        let rounded = if self.atomic >= 0 {
            // Use saturating_add to prevent overflow when atomic is near i64::MAX
            let sum = self.atomic.saturating_add(factor - 1);
            (sum / factor).saturating_mul(factor)
        } else {
            // For negative values, saturating_mul prevents underflow
            (self.atomic / factor).saturating_mul(factor)
        };
        Self {
            asset: self.asset.clone(),
            atomic: rounded,
        }
    }

    pub fn add(&self, other: &Money) -> Result<Self, MoneyError> {
        self.ensure_same_asset(other)?;
        let sum = self
            .atomic
            .checked_add(other.atomic)
            .ok_or(MoneyError::Overflow)?;
        Ok(Self {
            asset: self.asset.clone(),
            atomic: sum,
        })
    }

    pub fn sub(&self, other: &Money) -> Result<Self, MoneyError> {
        self.ensure_same_asset(other)?;
        let diff = self
            .atomic
            .checked_sub(other.atomic)
            .ok_or(MoneyError::Overflow)?;
        Ok(Self {
            asset: self.asset.clone(),
            atomic: diff,
        })
    }

    pub fn mul(&self, quantity: i64) -> Result<Self, MoneyError> {
        self.atomic
            .checked_mul(quantity)
            .map(|atomic| Self {
                asset: self.asset.clone(),
                atomic,
            })
            .ok_or(MoneyError::Overflow)
    }

    pub fn div(&self, divisor: i64) -> Result<Self, MoneyError> {
        if divisor == 0 {
            return Err(MoneyError::DivisionByZero);
        }
        Ok(Self {
            asset: self.asset.clone(),
            atomic: self.atomic / divisor,
        })
    }

    /// Multiply by a float factor with overflow protection.
    /// Returns Err(MoneyError::Overflow) if the result would overflow i64.
    pub fn try_multiply_by_float(&self, factor: f64) -> Result<Self, MoneyError> {
        if !factor.is_finite() {
            return Err(MoneyError::InvalidFormat);
        }
        let result = self.atomic as f64 * factor;
        if result >= i64::MAX as f64 || result <= i64::MIN as f64 || !result.is_finite() {
            return Err(MoneyError::Overflow);
        }
        Ok(Self {
            asset: self.asset.clone(),
            atomic: result.round() as i64,
        })
    }

    /// Multiply by a float factor with saturating behavior on overflow.
    /// Use try_multiply_by_float() when you need to handle overflow as an error.
    pub fn multiply_by_float(&self, factor: f64) -> Self {
        if !factor.is_finite() {
            tracing::warn!(factor = %factor, "multiply_by_float received non-finite factor, returning 0");
            return Self {
                asset: self.asset.clone(),
                atomic: 0,
            };
        }
        let result = self.atomic as f64 * factor;
        let atomic = if result >= i64::MAX as f64 {
            tracing::warn!(
                atomic = self.atomic,
                factor = %factor,
                "multiply_by_float overflow, clamping to i64::MAX"
            );
            i64::MAX
        } else if result <= i64::MIN as f64 {
            tracing::warn!(
                atomic = self.atomic,
                factor = %factor,
                "multiply_by_float underflow, clamping to i64::MIN"
            );
            i64::MIN
        } else {
            result.round() as i64
        };
        Self {
            asset: self.asset.clone(),
            atomic,
        }
    }

    pub fn mul_basis_points(&self, bps: i64) -> Result<Self, MoneyError> {
        self.mul_percent(bps as f64 / 100.0)
    }

    pub fn mul_basis_points_with_rounding(
        &self,
        bps: i64,
        mode: RoundingMode,
    ) -> Result<Self, MoneyError> {
        self.mul_percent_with_rounding(bps as f64 / 100.0, mode)
    }

    pub fn mul_percent(&self, percent: f64) -> Result<Self, MoneyError> {
        self.mul_percent_with_rounding(percent, RoundingMode::Standard)
    }

    pub fn mul_percent_with_rounding(
        &self,
        percent: f64,
        mode: RoundingMode,
    ) -> Result<Self, MoneyError> {
        if !percent.is_finite() {
            return Err(MoneyError::InvalidFormat);
        }
        let factor = percent / 100.0;
        let multiplier = self.atomic as f64 * factor;
        // Check for overflow before casting
        if multiplier >= i64::MAX as f64 || multiplier <= i64::MIN as f64 || !multiplier.is_finite()
        {
            return Err(MoneyError::Overflow);
        }
        let rounded = match mode {
            RoundingMode::Standard => multiplier.round(),
            RoundingMode::Ceiling => multiplier.ceil(),
        } as i64;

        Ok(Self {
            asset: self.asset.clone(),
            atomic: rounded,
        })
    }

    /// Negate the amount. Uses saturating negation to prevent overflow on i64::MIN.
    /// BUG-002: Previously could panic/wrap on i64::MIN (-self.atomic would overflow)
    pub fn negate(&self) -> Self {
        Self {
            asset: self.asset.clone(),
            atomic: self.atomic.saturating_neg(),
        }
    }

    /// Get absolute value. Uses saturating abs to prevent overflow on i64::MIN.
    /// BUG-002b: Previously could panic/wrap on i64::MIN
    pub fn abs(&self) -> Self {
        Self {
            asset: self.asset.clone(),
            atomic: self.atomic.saturating_abs(),
        }
    }

    pub fn is_zero(&self) -> bool {
        self.atomic == 0
    }

    pub fn is_positive(&self) -> bool {
        self.atomic > 0
    }

    pub fn is_negative(&self) -> bool {
        self.atomic < 0
    }

    pub fn less_than(&self, other: &Money) -> Result<bool, MoneyError> {
        self.ensure_same_asset(other)?;
        Ok(self.atomic < other.atomic)
    }

    pub fn greater_than(&self, other: &Money) -> Result<bool, MoneyError> {
        self.ensure_same_asset(other)?;
        Ok(self.atomic > other.atomic)
    }

    pub fn equal(&self, other: &Money) -> Result<bool, MoneyError> {
        self.ensure_same_asset(other)?;
        Ok(self.atomic == other.atomic)
    }

    /// Apply a percentage discount with overflow protection.
    /// Returns Err(MoneyError::Overflow) if the result would overflow.
    pub fn try_apply_percentage_discount(
        &self,
        percent: f64,
        mode: RoundingMode,
    ) -> Result<Self, MoneyError> {
        if !percent.is_finite() {
            return Err(MoneyError::InvalidFormat);
        }
        let multiplier = 1.0 - (percent / 100.0);
        let result = self.atomic as f64 * multiplier;
        if result >= i64::MAX as f64 || result <= i64::MIN as f64 || !result.is_finite() {
            return Err(MoneyError::Overflow);
        }
        let atomic = match mode {
            RoundingMode::Standard => result.round() as i64,
            RoundingMode::Ceiling => result.ceil() as i64,
        };
        Ok(Self {
            asset: self.asset.clone(),
            atomic,
        })
    }

    /// Apply a percentage discount with saturating behavior on overflow.
    /// Use try_apply_percentage_discount() when you need to handle overflow as an error.
    pub fn apply_percentage_discount(&self, percent: f64, mode: RoundingMode) -> Self {
        if !percent.is_finite() {
            tracing::warn!(percent = %percent, "apply_percentage_discount received non-finite percent, returning 0");
            return Self {
                asset: self.asset.clone(),
                atomic: 0,
            };
        }
        let multiplier = 1.0 - (percent / 100.0);
        let result = self.atomic as f64 * multiplier;
        let atomic = if result >= i64::MAX as f64 {
            tracing::warn!(
                atomic = self.atomic,
                percent = %percent,
                "apply_percentage_discount overflow, clamping to i64::MAX"
            );
            i64::MAX
        } else if result <= i64::MIN as f64 {
            tracing::warn!(
                atomic = self.atomic,
                percent = %percent,
                "apply_percentage_discount underflow, clamping to i64::MIN"
            );
            i64::MIN
        } else {
            match mode {
                RoundingMode::Standard => result.round() as i64,
                RoundingMode::Ceiling => result.ceil() as i64,
            }
        };
        Self {
            asset: self.asset.clone(),
            atomic,
        }
    }

    pub fn apply_fixed_discount(&self, discount: &Money) -> Result<Self, MoneyError> {
        let mut res = self.sub(discount)?;
        if res.atomic < 0 {
            res.atomic = 0;
        }
        Ok(res)
    }

    pub fn sum(amounts: &[Money]) -> Result<Money, MoneyError> {
        let first = amounts
            .first()
            .ok_or(MoneyError::InvalidFormat)?
            .asset
            .clone();
        let mut total = Money::zero(first);
        for amt in amounts {
            total = total.add(amt)?;
        }
        Ok(total)
    }

    fn ensure_same_asset(&self, other: &Money) -> Result<(), MoneyError> {
        if self.asset.code != other.asset.code {
            return Err(MoneyError::AssetMismatch);
        }
        Ok(())
    }

    /// Subtract atomic units, clamping result to zero.
    /// Uses saturating subtraction to prevent underflow.
    pub fn subtract_atomic(&self, atomic: i64) -> Self {
        // Use saturating_sub to prevent underflow wrapping
        let new_atomic = self.atomic.saturating_sub(atomic);
        Self {
            asset: self.asset.clone(),
            // Clamp to zero (no negative results)
            atomic: new_atomic.max(0),
        }
    }

    // ========================================================================
    // Stripe Adapter Methods (per spec 21-stripe-client.md)
    // ========================================================================

    /// Convert Money to Stripe format: (currency, amount_cents)
    /// Returns error if not a fiat currency
    pub fn to_stripe_amount(&self) -> Result<(String, i64), MoneyError> {
        if !self.asset.is_stripe_currency() {
            return Err(MoneyError::InvalidFormat);
        }

        let currency = self
            .asset
            .stripe_currency()
            .unwrap_or(&self.asset.code.to_lowercase())
            .to_string();

        // Stripe uses cents (2 decimal places) for most currencies
        // Our atomic is already in cents for USD
        Ok((currency, self.atomic))
    }

    /// Create Money from Stripe format (currency, amount_cents)
    pub fn from_stripe_amount(currency: &str, amount: i64) -> Result<Self, MoneyError> {
        let code = currency.to_uppercase();
        let asset = get_asset(&code).ok_or(MoneyError::InvalidFormat)?;

        if !asset.is_stripe_currency() {
            return Err(MoneyError::InvalidFormat);
        }

        Ok(Self {
            asset,
            atomic: amount,
        })
    }

    /// Validate that Money is suitable for Stripe
    /// - Must be fiat currency
    /// - Amount must be >= 0
    /// - Amount must be <= $999,999.99 (99_999_999 cents)
    pub fn validate_stripe_amount(&self) -> Result<(), MoneyError> {
        if !self.asset.is_stripe_currency() {
            return Err(MoneyError::InvalidFormat);
        }

        if self.atomic < 0 {
            return Err(MoneyError::NegativeAmount);
        }

        // Max Stripe amount: $999,999.99 = 99,999,999 cents
        if self.atomic > 99_999_999 {
            return Err(MoneyError::Overflow);
        }

        Ok(())
    }

    // ========================================================================
    // SPL Token Adapter Methods (per Go server's spl_adapter.go)
    // ========================================================================

    /// Convert Money to SPL token format: (mint, lamports)
    /// Returns error if not an SPL token
    pub fn to_spl_amount(&self) -> Result<(String, u64), MoneyError> {
        if !self.asset.is_spl_token() {
            return Err(MoneyError::InvalidFormat);
        }

        let mint = self
            .asset
            .solana_mint()
            .ok_or(MoneyError::InvalidFormat)?
            .to_string();

        // SPL token amounts use u64 for lamports
        if self.atomic < 0 {
            return Err(MoneyError::NegativeAmount);
        }

        Ok((mint, self.atomic as u64))
    }

    /// Create Money from SPL token format (mint address, lamports)
    pub fn from_spl_amount(mint: &str, lamports: u64) -> Result<Self, MoneyError> {
        // Look up asset by mint address
        let asset = get_asset_by_mint(mint).ok_or(MoneyError::InvalidFormat)?;

        if !asset.is_spl_token() {
            return Err(MoneyError::InvalidFormat);
        }

        // Convert u64 lamports to i64 atomic (safe for reasonable amounts)
        let atomic = i64::try_from(lamports).map_err(|_| MoneyError::Overflow)?;

        Ok(Self { asset, atomic })
    }

    /// Validate that Money is suitable for SPL transfer
    /// - Must be SPL token
    /// - Amount must be >= 0
    /// - Must have valid mint address
    pub fn validate_spl_amount(&self) -> Result<(), MoneyError> {
        if !self.asset.is_spl_token() {
            return Err(MoneyError::InvalidFormat);
        }

        if self.atomic < 0 {
            return Err(MoneyError::NegativeAmount);
        }

        if self.asset.solana_mint().is_none() {
            return Err(MoneyError::InvalidFormat);
        }

        Ok(())
    }

    /// Get the token decimals for display formatting
    pub fn spl_decimals(&self) -> Option<u8> {
        if self.asset.is_spl_token() {
            Some(self.asset.decimals)
        } else {
            None
        }
    }
}

impl fmt::Display for Money {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} {}", self.to_major(), self.asset.code)
    }
}

static ASSET_REGISTRY: Lazy<RwLock<HashMap<String, Asset>>> = Lazy::new(|| {
    let mut map = HashMap::new();
    map.insert(
        "USD".to_string(),
        Asset {
            code: "USD".to_string(),
            decimals: 2,
            asset_type: AssetType::Fiat,
            metadata: AssetMetadata {
                stripe_currency: Some("usd".to_string()),
                solana_mint: None,
            },
        },
    );
    map.insert(
        "EUR".to_string(),
        Asset {
            code: "EUR".to_string(),
            decimals: 2,
            asset_type: AssetType::Fiat,
            metadata: AssetMetadata {
                stripe_currency: Some("eur".to_string()),
                solana_mint: None,
            },
        },
    );
    map.insert(
        "USDC".to_string(),
        Asset {
            code: "USDC".to_string(),
            decimals: 6,
            asset_type: AssetType::Spl,
            metadata: AssetMetadata {
                stripe_currency: None,
                solana_mint: Some("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v".to_string()),
            },
        },
    );
    map.insert(
        "USDT".to_string(),
        Asset {
            code: "USDT".to_string(),
            decimals: 6,
            asset_type: AssetType::Spl,
            metadata: AssetMetadata {
                stripe_currency: None,
                solana_mint: Some("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB".to_string()),
            },
        },
    );
    map.insert(
        "SOL".to_string(),
        Asset {
            code: "SOL".to_string(),
            decimals: 9,
            asset_type: AssetType::Spl,
            metadata: AssetMetadata {
                stripe_currency: None,
                solana_mint: Some("So11111111111111111111111111111111111111112".to_string()),
            },
        },
    );
    map.insert(
        "PYUSD".to_string(),
        Asset {
            code: "PYUSD".to_string(),
            decimals: 6,
            asset_type: AssetType::Spl,
            metadata: AssetMetadata {
                stripe_currency: None,
                solana_mint: Some("2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo".to_string()),
            },
        },
    );
    // BUG-008: CASH is a placeholder/test token without a mint address.
    // It can only be looked up by code, not by mint address.
    // If a real CASH token is needed, add the mint address here.
    map.insert(
        "CASH".to_string(),
        Asset {
            code: "CASH".to_string(),
            decimals: 6,
            asset_type: AssetType::Spl,
            metadata: AssetMetadata {
                stripe_currency: None,
                solana_mint: None, // Placeholder token - no real mint
            },
        },
    );
    RwLock::new(map)
});

pub fn get_asset(code: &str) -> Option<Asset> {
    let registry = match ASSET_REGISTRY.read() {
        Ok(guard) => guard,
        Err(poisoned) => {
            // A panic occurred while holding the lock - recover the data
            tracing::warn!("Asset registry lock was poisoned (previous panic), recovering data");
            poisoned.into_inner()
        }
    };
    registry.get(&code.to_uppercase()).cloned()
}

/// Get asset by code, returning Result for proper error handling.
/// Use this for user-supplied asset codes that may not exist.
pub fn try_get_asset(code: &str) -> Result<Asset, MoneyError> {
    get_asset(code).ok_or(MoneyError::InvalidFormat)
}

/// Get asset by code, panicking if not found.
/// Only use for well-known assets that are always registered (USD, USDC).
/// For user-supplied codes, use try_get_asset() instead.
pub fn must_get_asset(code: &str) -> Asset {
    get_asset(code).expect("asset not registered")
}

/// Look up an asset by its Solana mint address
pub fn get_asset_by_mint(mint: &str) -> Option<Asset> {
    let registry = match ASSET_REGISTRY.read() {
        Ok(guard) => guard,
        Err(poisoned) => {
            tracing::warn!("Asset registry lock was poisoned (previous panic), recovering data");
            poisoned.into_inner()
        }
    };
    registry
        .values()
        .find(|asset| asset.solana_mint() == Some(mint))
        .cloned()
}

pub fn register_asset(asset: Asset) -> Result<(), MoneyError> {
    let mut registry = ASSET_REGISTRY
        .write()
        .map_err(|_| MoneyError::InvalidFormat)?;
    registry.insert(asset.code.to_uppercase(), asset);
    Ok(())
}

pub fn list_assets() -> Vec<Asset> {
    let registry = match ASSET_REGISTRY.read() {
        Ok(guard) => guard,
        Err(poisoned) => {
            tracing::warn!("Asset registry lock was poisoned (previous panic), recovering data");
            poisoned.into_inner()
        }
    };
    registry.values().cloned().collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn usd_asset() -> Asset {
        get_asset("USD").expect("USD should be registered")
    }

    // BUG-002: Test that negate() doesn't overflow on i64::MIN
    #[test]
    fn test_money_negate_i64_min_no_overflow() {
        let money = Money {
            asset: usd_asset(),
            atomic: i64::MIN,
        };

        // This should NOT panic - it should saturate to i64::MAX
        let negated = money.negate();

        // i64::MIN.saturating_neg() == i64::MAX
        assert_eq!(negated.atomic, i64::MAX);
    }

    #[test]
    fn test_money_negate_normal_values() {
        let money = Money {
            asset: usd_asset(),
            atomic: 100,
        };

        let negated = money.negate();
        assert_eq!(negated.atomic, -100);

        let double_negated = negated.negate();
        assert_eq!(double_negated.atomic, 100);
    }

    // BUG-002b: Test that abs() doesn't overflow on i64::MIN
    #[test]
    fn test_money_abs_i64_min_no_overflow() {
        let money = Money {
            asset: usd_asset(),
            atomic: i64::MIN,
        };

        // This should NOT panic - it should saturate to i64::MAX
        let abs_val = money.abs();

        // i64::MIN.saturating_abs() == i64::MAX
        assert_eq!(abs_val.atomic, i64::MAX);
    }

    #[test]
    fn test_money_abs_normal_values() {
        let positive = Money {
            asset: usd_asset(),
            atomic: 100,
        };
        assert_eq!(positive.abs().atomic, 100);

        let negative = Money {
            asset: usd_asset(),
            atomic: -100,
        };
        assert_eq!(negative.abs().atomic, 100);

        let zero = Money {
            asset: usd_asset(),
            atomic: 0,
        };
        assert_eq!(zero.abs().atomic, 0);
    }
}
