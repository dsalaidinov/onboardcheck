//! `diagnostics/tcp.rs`
//!
//! TCP port reachability checker.  Attempts a TCP connection with a 3-second
//! timeout.  Target format: `"host:port"` (e.g. `"10.20.4.15:5432"`).

use std::time::Duration;

use tokio::net::TcpStream;
use tokio::time::timeout;
use tracing::debug;

use crate::error::{AppError, AppResult};

pub struct TcpChecker;

impl TcpChecker {
    /// Probe `host:port` for TCP reachability within 3 seconds.
    pub async fn probe(target: &str) -> AppResult<String> {
        debug!("TCP probe: {}", target);

        timeout(
            Duration::from_secs(3),
            TcpStream::connect(target),
        )
        .await
        .map_err(|_| {
            AppError::Diagnostic(format!(
                "TCP connection to '{}' timed out after 3s",
                target
            ))
        })?
        .map_err(|e| {
            AppError::Diagnostic(format!(
                "TCP connection to '{}' refused: {e}",
                target
            ))
        })?;

        debug!("TCP probe '{}' → open", target);
        Ok(format!("TCP port open: {}", target))
    }
}
