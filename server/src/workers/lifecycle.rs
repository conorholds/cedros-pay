//! Worker lifecycle manager for coordinated startup and shutdown
//!
//! Per spec (11-background-workers.md): Provides unified lifecycle management for all workers

use tokio::sync::watch;
use tracing::info;

/// Handle for controlling all workers
pub struct WorkerLifecycleHandle {
    shutdown_tx: watch::Sender<bool>,
    worker_count: usize,
}

impl WorkerLifecycleHandle {
    /// Signal all workers to shut down gracefully
    pub fn shutdown(&self) {
        info!(
            worker_count = self.worker_count,
            "Signaling shutdown to all workers"
        );
        let _ = self.shutdown_tx.send(true);
    }

    /// Check if shutdown has been signaled
    pub fn is_shutdown(&self) -> bool {
        *self.shutdown_tx.borrow()
    }
}

/// Worker lifecycle manager
///
/// Per spec (11-background-workers.md): Coordinates startup and shutdown of all background workers
pub struct WorkerLifecycle {
    shutdown_tx: watch::Sender<bool>,
    shutdown_rx: watch::Receiver<bool>,
    worker_count: usize,
}

impl WorkerLifecycle {
    /// Create a new worker lifecycle manager
    pub fn new() -> Self {
        let (shutdown_tx, shutdown_rx) = watch::channel(false);
        Self {
            shutdown_tx,
            shutdown_rx,
            worker_count: 0,
        }
    }

    /// Get a shutdown receiver for a worker
    pub fn get_shutdown_receiver(&mut self) -> watch::Receiver<bool> {
        self.worker_count += 1;
        self.shutdown_rx.clone()
    }

    /// Build the lifecycle handle for controlling workers
    pub fn build_handle(self) -> WorkerLifecycleHandle {
        WorkerLifecycleHandle {
            shutdown_tx: self.shutdown_tx,
            worker_count: self.worker_count,
        }
    }
}

impl Default for WorkerLifecycle {
    fn default() -> Self {
        Self::new()
    }
}

/// Trait for workers that support graceful shutdown
pub trait GracefulShutdown {
    /// Check if shutdown has been requested
    fn should_shutdown(&self) -> bool;

    /// Handle shutdown signal
    fn on_shutdown(&self);
}

/// Worker registration for lifecycle management
pub struct WorkerRegistration {
    name: String,
    shutdown_rx: watch::Receiver<bool>,
}

impl WorkerRegistration {
    pub fn new(name: impl Into<String>, shutdown_rx: watch::Receiver<bool>) -> Self {
        Self {
            name: name.into(),
            shutdown_rx,
        }
    }

    /// Check if shutdown has been signaled
    pub fn should_shutdown(&self) -> bool {
        *self.shutdown_rx.borrow()
    }

    /// Wait for shutdown signal
    pub async fn wait_for_shutdown(&mut self) {
        if !*self.shutdown_rx.borrow() {
            let _ = self.shutdown_rx.changed().await;
        }
        info!(worker = %self.name, "Received shutdown signal");
    }

    /// Get the worker name
    pub fn name(&self) -> &str {
        &self.name
    }
}

/// Builder for setting up workers with lifecycle management
pub struct WorkerLifecycleBuilder {
    lifecycle: WorkerLifecycle,
    registrations: Vec<String>,
}

impl WorkerLifecycleBuilder {
    pub fn new() -> Self {
        Self {
            lifecycle: WorkerLifecycle::new(),
            registrations: Vec::new(),
        }
    }

    /// Register a worker and get its shutdown receiver
    pub fn register(&mut self, name: impl Into<String>) -> WorkerRegistration {
        let name = name.into();
        self.registrations.push(name.clone());
        WorkerRegistration::new(name, self.lifecycle.get_shutdown_receiver())
    }

    /// Build and return the lifecycle handle
    pub fn build(self) -> WorkerLifecycleHandle {
        info!(
            workers = ?self.registrations,
            "Worker lifecycle manager initialized"
        );
        self.lifecycle.build_handle()
    }
}

impl Default for WorkerLifecycleBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_lifecycle_shutdown() {
        let mut builder = WorkerLifecycleBuilder::new();
        let reg1 = builder.register("worker1");
        let reg2 = builder.register("worker2");
        let handle = builder.build();

        assert!(!reg1.should_shutdown());
        assert!(!reg2.should_shutdown());

        handle.shutdown();

        assert!(reg1.should_shutdown());
        assert!(reg2.should_shutdown());
    }
}
