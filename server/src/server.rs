use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use tower_http::timeout::TimeoutLayer;

use crate::app::build_services;
use crate::config::{Config, ServerConfig};
use crate::middleware;
use crate::payment_workers::spawn_workers_internal;
use crate::router::build_router;
use crate::storage::{PostgresConfig, PostgresPool, PostgresStore};
use crate::Store;

/// Default server address fallback - known valid at compile time
pub(crate) const DEFAULT_ADDR: SocketAddr = SocketAddr::new(
    std::net::IpAddr::V4(std::net::Ipv4Addr::new(0, 0, 0, 0)),
    8080,
);

pub(crate) fn server_timeout_from_config(cfg: &ServerConfig) -> Option<Duration> {
    [cfg.read_timeout, cfg.write_timeout, cfg.idle_timeout]
        .into_iter()
        .flatten()
        .max()
}

pub(crate) fn normalize_addr(raw: &str) -> SocketAddr {
    if raw.starts_with(':') {
        let trimmed = raw.trim_start_matches(':');
        let full = format!("0.0.0.0:{trimmed}");
        return full.parse().unwrap_or_else(|e| {
            tracing::warn!(
                address = %raw,
                error = %e,
                fallback = %DEFAULT_ADDR,
                "Invalid server address, using fallback. Check SERVER_ADDRESS config."
            );
            DEFAULT_ADDR
        });
    }
    raw.parse().unwrap_or_else(|e| {
        tracing::warn!(
            address = %raw,
            error = %e,
            fallback = %DEFAULT_ADDR,
            "Invalid server address, using fallback. Check SERVER_ADDRESS config."
        );
        DEFAULT_ADDR
    })
}

/// Standalone server entry point.
///
/// Bootstraps from environment: only `POSTGRES_URL` is required.
/// Everything else is loaded from the database.
pub async fn run() -> anyhow::Result<()> {
    let postgres_url = std::env::var("POSTGRES_URL")
        .or_else(|_| std::env::var("DATABASE_URL"))
        .map_err(|_| anyhow::anyhow!("POSTGRES_URL environment variable is required"))?;

    let server_address = std::env::var("SERVER_ADDRESS")
        .or_else(|_| std::env::var("CEDROS_SERVER_ADDRESS"))
        .unwrap_or_else(|_| "0.0.0.0:8080".to_string());

    let bootstrap_cfg = Config::default();
    let pool = build_postgres_pool(&bootstrap_cfg, &postgres_url).await?;

    pool.migrate().await?;

    let config_repo = crate::config::PostgresConfigRepository::new(pool.inner().clone());
    let tenant_id = "default";
    let cfg = Config::load_from_db(&config_repo, tenant_id, &postgres_url, &server_address).await?;

    cfg.validate_config()?;

    tracing::info!(
        address = %cfg.server.address,
        "Config loaded from database"
    );

    let store = Arc::new(PostgresStore::new(
        pool.clone(),
        cfg.storage.schema_mapping.clone(),
    ));
    run_with_store(cfg, store, Some(pool.inner().clone())).await
}

pub(crate) async fn run_with_store<S: Store + 'static>(
    cfg: Config,
    store: Arc<S>,
    storage_pg_pool: Option<sqlx::PgPool>,
) -> anyhow::Result<()> {
    let built = build_services(&cfg, store.clone(), storage_pg_pool).await?;
    let health_state = built.health_state.clone();
    let notifier = built.notifier.clone();

    let base_router = build_router(built.into_router_states());

    let panic_recovery = middleware::PanicRecoveryLayer::new();
    let request_id = middleware::request_id();
    let real_ip = axum::middleware::from_fn_with_state(
        std::sync::Arc::new(cfg.clone()),
        middleware::real_ip_middleware,
    );
    let logging = axum::middleware::from_fn(middleware::structured_logging_middleware);

    let cors = if cfg.server.cors_disabled {
        tracing::info!("CORS layer disabled (embedded mode) - host app manages CORS");
        None
    } else {
        middleware::cors::validate_cors_config(
            &cfg.server.cors_allowed_origins,
            &cfg.logging.environment,
        )
        .map_err(|e| anyhow::anyhow!(e.to_string()))?;
        Some(middleware::cors::build_cors_layer_with_env(
            &cfg.server.cors_allowed_origins,
            &cfg.logging.environment,
        ))
    };
    let security_headers = middleware::security_headers();
    let api_version = axum::middleware::from_fn(middleware::api_version_middleware);

    let rate_limiter = Arc::new(middleware::RateLimiter::new(cfg.rate_limit.clone()));

    let auth_state = Arc::new(middleware::AuthState::new(
        cfg.api_key.clone(),
        cfg.admin.public_keys.clone(),
    ));

    let mut router = base_router;
    if let Some(timeout) = server_timeout_from_config(&cfg.server) {
        router = router.layer(TimeoutLayer::with_status_code(
            axum::http::StatusCode::REQUEST_TIMEOUT,
            timeout,
        ));
    }

    let mut router = router
        .layer(axum::middleware::from_fn_with_state(
            rate_limiter.clone(),
            middleware::rate_limit_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            auth_state,
            middleware::api_key_middleware,
        ))
        .layer(axum::middleware::from_fn(middleware::auth_middleware))
        .layer(api_version)
        .layer(security_headers);

    if let Some(cors) = cors {
        router = router.layer(cors);
    }

    let router = router
        .layer(logging)
        .layer(real_ip)
        .layer(request_id)
        .layer(panic_recovery);

    let addr: SocketAddr = normalize_addr(&cfg.server.address);
    let listener = tokio::net::TcpListener::bind(addr).await?;

    tracing::info!("Starting Cedros Pay Server on {}", addr);

    let background_workers = spawn_workers_internal(
        store.clone(),
        &cfg,
        health_state,
        Some(rate_limiter),
        notifier,
    )?;

    const SERVER_SHUTDOWN_TIMEOUT: Duration = Duration::from_secs(15);
    let (shutdown_started_tx, shutdown_started_rx) = tokio::sync::oneshot::channel::<()>();

    let server = axum::serve(
        listener,
        router.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(async move {
        shutdown_signal().await;
        let _ = shutdown_started_tx.send(());
    });

    let server = <_ as std::future::IntoFuture>::into_future(server);
    let mut server_task = tokio::spawn(server);
    tokio::select! {
        res = &mut server_task => {
            let res = res.map_err(|e| anyhow::anyhow!(e.to_string()))?;
            res?;
        }
        _ = shutdown_started_rx => {
            match tokio::time::timeout(SERVER_SHUTDOWN_TIMEOUT, &mut server_task).await {
                Ok(res) => {
                    let res = res.map_err(|e| anyhow::anyhow!(e.to_string()))?;
                    res?;
                }
                Err(_) => {
                    tracing::error!("Timed out waiting for HTTP server shutdown");
                    server_task.abort();
                    let _ = server_task.await;
                    return Err(anyhow::anyhow!("server shutdown timed out"));
                }
            }
        }
    }

    background_workers.shutdown().await;
    store
        .close()
        .await
        .map_err(|e| anyhow::anyhow!(e.to_string()))?;

    Ok(())
}

/// Per spec (04-graceful-shutdown.md):
/// - Handle both SIGINT (Ctrl+C) and SIGTERM
/// - 15-second shutdown timeout
/// - Log shutdown initiation
async fn shutdown_signal() {
    let ctrl_c = async {
        match tokio::signal::ctrl_c().await {
            Ok(()) => {}
            Err(e) => {
                tracing::error!(error = %e, "Failed to install Ctrl+C handler");
                std::future::pending::<()>().await;
            }
        }
    };

    #[cfg(unix)]
    let terminate = async {
        match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            Ok(mut stream) => {
                stream.recv().await;
            }
            Err(e) => {
                tracing::error!(error = %e, "Failed to install SIGTERM handler");
                std::future::pending::<()>().await;
            }
        }
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            tracing::info!("SIGINT received, initiating graceful shutdown");
        }
        _ = terminate => {
            tracing::info!("SIGTERM received, initiating graceful shutdown");
        }
    }

    tracing::info!("Graceful shutdown initiated with 15-second timeout");
}

pub(crate) async fn build_postgres_pool(cfg: &Config, url: &str) -> anyhow::Result<PostgresPool> {
    let mut pg_config =
        PostgresConfig::from_url(url).map_err(|e| anyhow::anyhow!(e.to_string()))?;
    pg_config.max_connections = cfg.storage.postgres_pool.max_open_conns;
    pg_config.min_connections = cfg.storage.postgres_pool.min_connections;
    pg_config.max_lifetime = cfg.storage.postgres_pool.conn_max_lifetime;
    Ok(PostgresPool::new(&pg_config).await?)
}
