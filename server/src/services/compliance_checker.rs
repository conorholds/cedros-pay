//! Compliance checker service.
//!
//! Composes `SanctionsListService` and `CedrosLoginClient` to enforce
//! per-product compliance requirements at purchase and mint time.

use std::sync::Arc;
use std::time::Duration;

use crate::models::compliance::{ComplianceRequirements, KycStatus, UserComplianceStatus};
use crate::services::cedros_login::CedrosLoginClient;
use crate::services::sanctions_list::SanctionsListService;
use crate::ttl_cache::TtlCache;

/// User compliance cache TTL (5 minutes).
const USER_CACHE_TTL: Duration = Duration::from_secs(300);
/// Max cached user compliance entries.
const USER_CACHE_CAP: usize = 1000;

/// Result of a compliance check.
#[derive(Debug, Clone)]
pub enum ComplianceResult {
    /// All requirements met.
    Cleared,
    /// One or more requirements failed.
    Blocked { reasons: Vec<String> },
}

/// Unified compliance checker that combines sanctions, KYC, and accredited
/// investor checks into a single `check_compliance()` call.
pub struct ComplianceChecker {
    sanctions_service: Arc<SanctionsListService>,
    cedros_login: Arc<CedrosLoginClient>,
    user_cache: TtlCache<UserComplianceStatus>,
}

impl ComplianceChecker {
    pub fn new(
        sanctions_service: Arc<SanctionsListService>,
        cedros_login: Arc<CedrosLoginClient>,
    ) -> Self {
        Self {
            sanctions_service,
            cedros_login,
            user_cache: TtlCache::new(USER_CACHE_CAP),
        }
    }

    /// Merge requirements from multiple products into the strictest set.
    ///
    /// Used for cart payments containing multiple items — if *any* item
    /// requires KYC, the whole cart requires KYC.
    pub fn merge_requirements(products: &[&ComplianceRequirements]) -> ComplianceRequirements {
        let mut merged = ComplianceRequirements::default();
        for r in products {
            merged.require_sanctions_clear |= r.require_sanctions_clear;
            merged.require_kyc |= r.require_kyc;
            merged.require_accredited_investor |= r.require_accredited_investor;
        }
        merged
    }

    /// Check whether a purchase meets compliance requirements.
    ///
    /// Returns `Cleared` if all checks pass, or `Blocked { reasons }` listing
    /// each failed requirement. Caller decides how to handle (log + skip, reject, etc.).
    pub async fn check_compliance(
        &self,
        tenant_id: &str,
        wallet: &str,
        user_id: Option<&str>,
        requirements: &ComplianceRequirements,
    ) -> ComplianceResult {
        let mut reasons = Vec::new();

        // 1. Sanctions check
        if requirements.require_sanctions_clear
            && self.sanctions_service.is_sanctioned(tenant_id, wallet)
        {
            reasons.push("wallet is on sanctions list".to_string());
        }

        // 2. KYC + accredited investor checks (require user_id)
        if requirements.require_kyc || requirements.require_accredited_investor {
            match user_id {
                Some(uid) => {
                    let status = self.get_user_compliance_cached(uid).await;
                    if requirements.require_kyc {
                        match &status {
                            Some(s) if s.kyc_status == KycStatus::Verified => {}
                            Some(s) => {
                                reasons.push(format!(
                                    "KYC not verified (status: {:?})",
                                    s.kyc_status
                                ));
                            }
                            None => {
                                reasons
                                    .push("KYC status unavailable (endpoint not deployed)".into());
                            }
                        }
                    }
                    if requirements.require_accredited_investor {
                        match &status {
                            Some(s) if s.accredited_investor => {}
                            Some(_) => {
                                reasons.push("accredited investor status not verified".into());
                            }
                            None => {
                                reasons.push(
                                    "accredited investor status unavailable (endpoint not deployed)"
                                        .into(),
                                );
                            }
                        }
                    }
                }
                None => {
                    if requirements.require_kyc {
                        reasons.push("KYC required but no user_id available".into());
                    }
                    if requirements.require_accredited_investor {
                        reasons
                            .push("accredited investor required but no user_id available".into());
                    }
                }
            }
        }

        if reasons.is_empty() {
            ComplianceResult::Cleared
        } else {
            ComplianceResult::Blocked { reasons }
        }
    }

    /// Fetch user compliance from cedros-login, with 5-minute cache.
    async fn get_user_compliance_cached(&self, user_id: &str) -> Option<UserComplianceStatus> {
        // Cache hit
        if let Some(cached) = self.user_cache.get(user_id) {
            return Some(cached);
        }

        // Fetch from cedros-login
        match self.cedros_login.get_user_compliance(user_id).await {
            Ok(Some(status)) => {
                self.user_cache
                    .set(user_id.to_string(), status.clone(), USER_CACHE_TTL);
                Some(status)
            }
            Ok(None) => None,
            Err(e) => {
                tracing::warn!(
                    error = %e,
                    user_id = %user_id,
                    "Failed to fetch user compliance; treating as unavailable"
                );
                None
            }
        }
    }
}

impl std::fmt::Debug for ComplianceChecker {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ComplianceChecker")
            .field("sanctions_service", &self.sanctions_service)
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::compliance::ComplianceRequirements;

    // Basic unit test verifying ComplianceResult construction
    #[test]
    fn compliance_result_cleared() {
        let result = ComplianceResult::Cleared;
        assert!(matches!(result, ComplianceResult::Cleared));
    }

    #[test]
    fn compliance_result_blocked() {
        let result = ComplianceResult::Blocked {
            reasons: vec!["test reason".into()],
        };
        match result {
            ComplianceResult::Blocked { reasons } => {
                assert_eq!(reasons.len(), 1);
                assert_eq!(reasons[0], "test reason");
            }
            _ => panic!("expected Blocked"),
        }
    }

    #[test]
    fn default_requirements_sanctions_only() {
        let reqs = ComplianceRequirements::default();
        assert!(reqs.require_sanctions_clear);
        assert!(!reqs.require_kyc);
        assert!(!reqs.require_accredited_investor);
    }

    #[test]
    fn merge_requirements_takes_strictest() {
        let a = ComplianceRequirements {
            require_sanctions_clear: true,
            require_kyc: false,
            require_accredited_investor: false,
        };
        let b = ComplianceRequirements {
            require_sanctions_clear: false,
            require_kyc: true,
            require_accredited_investor: false,
        };
        let merged = ComplianceChecker::merge_requirements(&[&a, &b]);
        assert!(merged.require_sanctions_clear);
        assert!(merged.require_kyc);
        assert!(!merged.require_accredited_investor);
    }

    #[test]
    fn kyc_status_serde_roundtrip() {
        let status = UserComplianceStatus {
            kyc_status: KycStatus::Verified,
            accredited_investor: true,
            accredited_verified_at: None,
        };
        let json = serde_json::to_string(&status).unwrap();
        let parsed: UserComplianceStatus = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.kyc_status, KycStatus::Verified);
        assert!(parsed.accredited_investor);
    }
}
