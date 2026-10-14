//! Explicit local benchmarks: fresh Wasm instances, bounded fuel/memory, and
//! configurable synthetic read latency. These do not model PostgreSQL plans.
use cedros_pay_extension_domain::ids;
use cedros_pay_extension_hostsim::{component_path, Sim};
use serde_json::{json, Value};
use std::time::{Duration, Instant};

#[test]
#[ignore = "build the component, then run with --ignored --nocapture --test-threads=1"]
fn benchmark_catalog_page() {
    let load = Instant::now();
    let sim = Sim::load(&component_path()).expect("built component must load");
    println!(
        "PERF component_load_ms={:.3}",
        load.elapsed().as_secs_f64() * 1000.0
    );
    {
        let mut store = sim.store();
        for index in 0..1000 {
            let resource = format!("p{index:04}");
            let variants = (0..10).map(|variant| json!({"id":format!("v{variant}"), "title":"Variant", "inventoryQuantity":20})).collect::<Vec<_>>();
            store.seed(
                ids::MODEL_CATALOG,
                &resource,
                json!({
                    "active":true, "title":resource, "slug":resource, "sortOrder":index,
                    "price":{"amountCents":100,"currency":"USD"}, "variants":variants,
                    "categoryIds":[format!("category-{}", index % 10)]
                }),
            );
        }
    }
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
    let context = json!({"authenticated":true, "siteId":"perf-site", "permissionClaims":[ids::ROUTE_PRODUCT_READ]}).to_string();
    for delay_ms in [0, 2] {
        sim.store().db_read_delay_millis = delay_ms;
        let mut timings = Vec::new();
        let mut bytes = 0;
        for sample in 0..105 {
            sim.store().db_reads.borrow_mut().clear();
            let started = Instant::now();
            let (status, body) = rt
                .block_on(async {
                    tokio::time::timeout(Duration::from_secs(60), async {
                        sim.handle(
                            "GET",
                            "/products/v1/catalog",
                            ids::ROUTE_PRODUCT_READ,
                            vec![],
                            vec![],
                            "",
                            &context,
                        )
                        .await
                    })
                    .await
                })
                .expect("bounded benchmark invocation")
                .expect("catalog invocation");
            let elapsed = started.elapsed().as_secs_f64() * 1000.0;
            assert_eq!(status, 200, "{body}");
            let value: Value = serde_json::from_str(&body).unwrap();
            assert_eq!(value["products"].as_array().unwrap().len(), 50);
            assert_eq!(value["pagination"]["hasMore"], true);
            assert_eq!(value["categories"][0]["productCount"], 100);
            let store = sim.store();
            let reads = store.db_reads.borrow();
            assert_eq!(reads[ids::MODEL_CATALOG].0, 11);
            assert_eq!(reads["cedros-pay:checkout-stock"].0, 6);
            if sample >= 5 {
                timings.push(elapsed);
            }
            bytes = body.len();
        }
        timings.sort_by(f64::total_cmp);
        let store = sim.store();
        let reads = store.db_reads.borrow();
        println!("PERF catalog products=1000 variants=10 limit=50 db_delay_ms={delay_ms} samples=100 p50_ms={:.3} p95_ms={:.3} p99_ms={:.3} response_bytes={bytes} db_calls={} db_response_bytes={} fuel={}",
            timings[49], timings[94], timings[98], reads.values().map(|r| r.0).sum::<usize>(), reads.values().map(|r| r.2).sum::<usize>(), store.last_fuel_consumed);
    }
}
