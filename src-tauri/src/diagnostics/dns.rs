//! `diagnostics/dns.rs`
//!
//! DNS resolve checker.  Attempts to resolve `hostname` to at least one IP
//! address using the system resolver (via `hickory-resolver`).

use hickory_resolver::TokioAsyncResolver;
use tracing::debug;

use crate::error::{AppError, AppResult};

pub struct DnsChecker;

impl DnsChecker {
    /// Resolve `hostname` and return the first IP address found.
    pub async fn probe(hostname: &str) -> AppResult<String> {
        // Strip port suffix if present (e.g. "internal.bank.local:443" → "internal.bank.local")
        let host = hostname.split(':').next().unwrap_or(hostname);

        debug!("DNS probe: {}", host);

        let resolver = TokioAsyncResolver::tokio_from_system_conf().map_err(|e| {
            AppError::Diagnostic(format!("DNS resolver init failed: {e}"))
        })?;

        let lookup = resolver.lookup_ip(host).await.map_err(|e| {
            AppError::Diagnostic(format!("DNS lookup failed for '{}': {e}", host))
        })?;

        let first_ip = lookup
            .iter()
            .next()
            .ok_or_else(|| AppError::Diagnostic(format!("No DNS records found for '{}'", host)))?;

        debug!("DNS probe '{}' → {}", host, first_ip);
        Ok(format!("Resolved: {} → {}", host, first_ip))
    }
}
