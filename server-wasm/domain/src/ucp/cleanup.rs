//! Draft buyer context is ephemeral. Financial operation and settlement records
//! remain in the canonical ledger under its independent retention policy.
use crate::{
    db::{BatchOp, Db, Filter, Op, Query},
    error::AppResult,
    guarded_batch::GuardedBatchOutcome,
    seams::HostSeams,
};
pub(crate) fn expired<S: HostSeams>(seams: &S) -> AppResult<usize> {
    crate::guarded_policy::require_active(seams)?;
    let db = Db::new(seams, crate::ids::DB_ACCESS);
    let rows = db.read(
        super::SESSION_MODEL,
        &Query::new()
            .filter(Filter::new(
                "expiresAt",
                Op::Lt,
                seams.now_unix_secs().saturating_sub(24 * 60 * 60),
            ))
            .limit(100),
    )?;
    let mut count = 0;
    for row in rows {
        if matches!(
            db.guarded_batch(
                &[super::session_store::version(&row)?],
                &[BatchOp::Delete {
                    content_model_id: super::SESSION_MODEL,
                    entry_key: row.entry_key.clone()
                }]
            )?,
            GuardedBatchOutcome::Applied { .. }
        ) {
            count += 1;
        }
    }
    Ok(count)
}
