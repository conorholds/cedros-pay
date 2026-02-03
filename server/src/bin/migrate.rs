use cedros_pay::storage::{PostgresConfig, PostgresPool};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let postgres_url = std::env::var("POSTGRES_URL")
        .or_else(|_| std::env::var("DATABASE_URL"))
        .map_err(|_| anyhow::anyhow!("POSTGRES_URL (or DATABASE_URL) is required"))?;

    let cfg = PostgresConfig::from_url(&postgres_url)
        .map_err(|e| anyhow::anyhow!("Invalid Postgres URL: {}", e))?;
    let pool = PostgresPool::new(&cfg)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to connect to Postgres: {}", e))?;

    pool.migrate()
        .await
        .map_err(|e| anyhow::anyhow!("Migrations failed: {}", e))?;

    Ok(())
}
