//! Test-only read instrumentation, without retaining request payloads.
use super::*;

impl FakeSeams {
    pub(super) fn read_with_metrics(
        &self,
        _access: &str,
        model: &str,
        query_json: &str,
    ) -> HostResult<String> {
        self.db_reads
            .borrow_mut()
            .entry(model.into())
            .or_default()
            .0 += 1;
        read_races::apply(self);
        let q: Value = serde_json::from_str(query_json).map_err(|_| err("bad query"))?;
        if let Some(result) = self.read_responses.borrow_mut().pop_front() {
            return result;
        }
        let rows = self.select(model, &q);
        let entries: Vec<Value> = rows
            .into_iter()
            .map(|(k, payload, updated, version)| {
                json!({
                    "entryKey": k, "payload": payload, "updatedAt": crate::time::iso8601(updated),
                    "version": version,
                })
            })
            .collect();
        let count = entries.len();
        let raw = json!({ "entries": entries }).to_string();
        let mut reads = self.db_reads.borrow_mut();
        let totals = reads.entry(model.into()).or_default();
        totals.1 += count;
        totals.2 += raw.len();
        Ok(raw)
    }
}
