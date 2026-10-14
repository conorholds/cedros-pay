use super::*;

#[test]
fn mismatched_operation_tombstone_fails_closed() {
    let seams = FakeSeams::new();
    let service = service(&seams, "buyer-a", provider_a());
    let generation = service.open_generation().unwrap();
    let command = add_command(&generation, "lane", 0, "op-split", "sku", 1, 100);
    let state = applied(service.apply(&command).unwrap());
    let keys = keys(&service, &command);
    let mut tombstone = seams
        .get_entry(TOMBSTONE_MODEL_ID, &keys.operation)
        .unwrap();
    tombstone["fingerprint"] = json!("0".repeat(64));
    seams.seed(TOMBSTONE_MODEL_ID, &keys.operation, tombstone);

    let error = service.apply(&command).unwrap_err();
    assert_eq!((error.status, error.code), (500, "internal_error"));
    assert_eq!(service.read("lane").unwrap(), state);
}
