use serde_json::{json, Value};

use crate::fake::FakeSeams;
use crate::ids;

fn setup() -> FakeSeams {
    let seams = FakeSeams::new();
    crate::guarded_policy::enroll(&seams).unwrap();
    seams
}

fn product(categories: Value) -> Value {
    json!({"id":"p","title":"P","active":true,"public":true,"categories":categories})
}

#[test]
fn accepts_exact_host_shape_and_rejects_invalid_authoritative_items_before_mutation() {
    let seams = setup();
    let rich = product(json!([{
        "id":"books","slug":"books","name":"Books","parentId":"media",
        "bannerImageUrl":"/images/books.webp"
    }]));
    super::create(&seams, "rich", &rich).unwrap();
    assert_eq!(
        seams.get_entry(ids::MODEL_CATALOG, "rich").unwrap()["categories"],
        rich["categories"]
    );

    let invalid = [
        json!([1]),
        json!([{"id":"x","name":"X"}]),
        json!([{"id":"x","slug":"X space","name":"X"}]),
        json!([{"id":"x","slug":"x","name":" "}]),
        json!([{"id":"x","slug":"x","name":"X","bannerImageUrl":"//evil.test/x"}]),
        json!([{"id":"x","slug":"x","name":"X","bannerImageUrl":"/bad\\path"}]),
        json!([{"id":"x","slug":"x","name":"X","private":"secret"}]),
    ];
    for (index, categories) in invalid.into_iter().enumerate() {
        let key = format!("invalid-{index}");
        let error = super::create(&seams, &key, &product(categories)).unwrap_err();
        assert!(matches!(error.status, 400 | 409));
        assert!(seams.get_entry(ids::MODEL_CATALOG, &key).is_none());
    }
}

#[test]
fn bare_category_ids_remain_grouping_ids() {
    let seams = setup();
    super::create(
        &seams,
        "grouping",
        &product(json!(["books", "cat_apparel"])),
    )
    .unwrap();

    assert_eq!(
        seams.get_entry(ids::MODEL_CATALOG, "grouping").unwrap()["categories"],
        json!(["books", "cat_apparel"])
    );
}

#[test]
fn enforces_exact_2000_item_bound_without_partial_catalog_write() {
    let seams = setup();
    let values = (0..super::MAX_ITEMS)
        .map(|index| {
            json!({
                "id":format!("category-{index}"),
                "slug":format!("category-{index}"),
                "name":format!("Category {index}")
            })
        })
        .collect::<Vec<_>>();
    super::create(&seams, "max", &product(Value::Array(values.clone()))).unwrap();

    let mut oversized = values;
    oversized.push(json!({
        "id":"category-overflow", "slug":"category-overflow", "name":"Category overflow"
    }));
    let error = super::update(&seams, "max", &product(Value::Array(oversized))).unwrap_err();
    assert_eq!(error.status, 422);
    assert_eq!(
        seams.get_entry(ids::MODEL_CATALOG, "max").unwrap()["categories"]
            .as_array()
            .unwrap()
            .len(),
        2_000
    );
}

#[test]
fn conflicting_definitions_for_one_category_fail_closed() {
    let seams = setup();
    super::create(
        &seams,
        "one",
        &product(json!([{"id":"books","slug":"books","name":"Books"}])),
    )
    .unwrap();
    let conflict = product(json!([{"id":"books","slug":"books","name":"Different"}]));
    assert_eq!(
        super::create(&seams, "two", &conflict).unwrap_err().status,
        409
    );
    assert!(seams.get_entry(ids::MODEL_CATALOG, "two").is_none());
}

#[test]
fn duplicate_category_slugs_and_cycles_fail_closed() {
    let duplicate = BTreeMap::from([
        (
            "one".into(),
            product(json!([{"id":"one","slug":"shared","name":"One"}])),
        ),
        (
            "two".into(),
            product(json!([{"id":"two","slug":"shared","name":"Two"}])),
        ),
    ]);
    assert_eq!(super::validate_catalog(&duplicate).unwrap_err().status, 409);

    let cycle = BTreeMap::from([
        (
            "one".into(),
            product(json!([{"id":"one","slug":"one","name":"One","parentId":"two"}])),
        ),
        (
            "two".into(),
            product(json!([{"id":"two","slug":"two","name":"Two","parentId":"one"}])),
        ),
    ]);
    assert_eq!(super::validate_catalog(&cycle).unwrap_err().status, 422);
}
use std::collections::BTreeMap;
