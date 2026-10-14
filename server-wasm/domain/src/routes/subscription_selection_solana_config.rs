use serde_json::Value;

use super::support::ResolvedSolanaPlan;

pub(super) fn resolved_solana_plan(plan: &Value, interval: &str) -> Option<ResolvedSolanaPlan> {
    let config = plan
        .get("solanaSubscription")
        .filter(|value| value.is_object())?;
    if !bool_field(config, "enabled").unwrap_or(true) {
        return None;
    }
    let annual = interval == "yearly";
    if solana_interval_status(config, annual).as_deref() == Some("sunset") {
        return None;
    }
    let amount_atomic = if annual {
        int_field(config, "annualAmountAtomic")
    } else {
        int_field(config, "monthlyAmountAtomic")
    }?;
    let period_hours = if annual {
        u64_field(config, "annualPeriodHours")
    } else {
        u64_field(config, "monthlyPeriodHours")
    }?;
    let base_plan_id = u64_field(config, "planId")?;
    let plan_id = if annual {
        u64_field(config, "annualPlanId").unwrap_or(base_plan_id)
    } else {
        u64_field(config, "monthlyPlanId").unwrap_or(base_plan_id)
    };
    if amount_atomic <= 0 || period_hours == 0 || period_hours > 8_760 {
        return None;
    }
    Some(ResolvedSolanaPlan {
        plan_id,
        merchant_address: string_field(config, "merchantAddress")?,
        token_mint: string_field(config, "tokenMint")?,
        token_program_address: string_field(config, "tokenProgramAddress"),
        receiver_token_account: string_field(config, "receiverTokenAccount"),
        collector_address: string_field(config, "collectorAddress"),
        amount_atomic,
        period_hours,
        plan_address: interval_plan_address(config, annual, plan_id, base_plan_id),
        program_address: string_field(config, "programAddress"),
        expected_created_at: interval_expected_created_at(config, annual),
        expected_subscription_authority_init_id: int_field(
            config,
            "expectedSubscriptionAuthorityInitId",
        ),
    })
}

fn interval_plan_address(
    config: &Value,
    annual: bool,
    plan_id: u64,
    base_plan_id: u64,
) -> Option<String> {
    if annual {
        string_field(config, "annualPlanAddress")
            .or_else(|| shared_plan_address(config, plan_id, base_plan_id))
    } else {
        string_field(config, "monthlyPlanAddress")
            .or_else(|| shared_plan_address(config, plan_id, base_plan_id))
    }
}

fn shared_plan_address(config: &Value, plan_id: u64, base_plan_id: u64) -> Option<String> {
    (plan_id == base_plan_id)
        .then(|| string_field(config, "planAddress"))
        .flatten()
}

fn interval_expected_created_at(config: &Value, annual: bool) -> Option<i64> {
    if annual {
        int_field(config, "annualExpectedCreatedAt")
    } else {
        int_field(config, "monthlyExpectedCreatedAt")
    }
    .or_else(|| int_field(config, "expectedCreatedAt"))
}

fn solana_interval_status(config: &Value, annual: bool) -> Option<String> {
    if annual {
        string_field(config, "annualStatus")
    } else {
        string_field(config, "monthlyStatus")
    }
    .or_else(|| string_field(config, "status"))
}

fn bool_field(value: &Value, key: &str) -> Option<bool> {
    value.get(key).and_then(Value::as_bool)
}

fn int_field(value: &Value, key: &str) -> Option<i64> {
    value.get(key).and_then(Value::as_i64)
}

fn u64_field(value: &Value, key: &str) -> Option<u64> {
    value.get(key).and_then(Value::as_u64)
}

fn string_field(value: &Value, key: &str) -> Option<String> {
    value.get(key).and_then(Value::as_str).map(str::to_string)
}
