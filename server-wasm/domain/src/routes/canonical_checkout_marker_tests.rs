use std::cell::RefCell;

use super::*;
use crate::seams::{HostError, HostResult, HostSeams};

#[test]
fn direct_invocation_reads_only_the_marker_before_failing_closed() {
    for (route_id, method, path, body) in [
        (ROUTE_DESCRIPTOR, "GET", "/checkout/descriptor", ""),
        (ROUTE_QUOTE, "POST", "/checkout/quote", "not-json"),
    ] {
        let seams = MarkerSpy::default();
        let request = RouteRequest {
            route_id: route_id.into(),
            method: method.into(),
            path: path.into(),
            body: body.into(),
            ..Default::default()
        };
        let error = handle(&seams, &request).unwrap_err();
        assert_eq!(
            (error.status, error.code),
            (503, "guarded_write_policy_unavailable")
        );
        assert_eq!(seams.calls.borrow().as_slice(), ["marker-read"]);
    }
}

#[derive(Default)]
struct MarkerSpy {
    calls: RefCell<Vec<&'static str>>,
}

impl HostSeams for MarkerSpy {
    fn log(&self, _: &str, _: &str) {
        self.calls.borrow_mut().push("log");
    }
    fn now_unix_secs(&self) -> i64 {
        0
    }
    fn db_read(&self, _: &str, model: &str, _: &str) -> HostResult<String> {
        if model == crate::guarded_policy::CONTROL_MODEL {
            self.calls.borrow_mut().push("marker-read");
            Ok(r#"{"entries":[]}"#.into())
        } else {
            self.calls.borrow_mut().push("unexpected-db-read");
            Err(HostError::new("unexpected"))
        }
    }
    fn db_count(&self, _: &str, _: &str, _: &str) -> HostResult<String> {
        unexpected()
    }
    fn db_write(&self, _: &str, _: &str, _: &str, _: &str) -> HostResult<String> {
        unexpected()
    }
    fn db_delete(&self, _: &str, _: &str, _: &str) -> HostResult<String> {
        unexpected()
    }
    fn db_batch(&self, _: &str, _: &str) -> HostResult<String> {
        unexpected()
    }
    fn db_migrate(&self, _: &str, _: &str, _: &str) -> HostResult<String> {
        unexpected()
    }
    fn setting_get(&self, _: &str) -> HostResult<Option<String>> {
        unexpected()
    }
    fn setting_set(&self, _: &str, _: &str) -> HostResult<()> {
        unexpected()
    }
    fn settings_all(&self) -> HostResult<String> {
        unexpected()
    }
    fn secret_get(&self, _: &str) -> HostResult<Option<String>> {
        unexpected()
    }
    fn secret_set(&self, _: &str, _: &str) -> HostResult<()> {
        unexpected()
    }
    fn secret_delete(&self, _: &str) -> HostResult<bool> {
        unexpected()
    }
    fn emit_event(&self, _: &str, _: &str, _: &str) -> HostResult<()> {
        unexpected()
    }
    fn emit_record(&self, _: &str, _: &str, _: &str, _: &str) -> HostResult<()> {
        unexpected()
    }
    fn tag_assign(&self, _: &str, _: &str, _: &str, _: &str) -> HostResult<String> {
        unexpected()
    }
    fn tag_unassign(&self, _: &str, _: &str, _: &str) -> HostResult<String> {
        unexpected()
    }
    fn tag_read(&self, _: &str, _: &str) -> HostResult<String> {
        unexpected()
    }
    fn crm_submit(&self, _: &str, _: &str, _: &str, _: &str) -> HostResult<()> {
        unexpected()
    }
    fn provider_execute(&self, _: &str, _: &str, _: &str, _: &str) -> HostResult<String> {
        unexpected()
    }
    fn http_fetch(&self, _: &str) -> HostResult<String> {
        unexpected()
    }
}

fn unexpected<T>() -> HostResult<T> {
    Err(HostError::new("unexpected host call"))
}
