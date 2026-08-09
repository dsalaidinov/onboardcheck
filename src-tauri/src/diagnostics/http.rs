//! `diagnostics/http.rs`
//!
//! HTTP/HTTPS status checker.  Checks that the response status code is
//! in the `expected_codes` list.  Uses a shared `reqwest::Client` with
//! a 5-second timeout and no certificate verification for internal networks.

use std::time::Duration;

use reqwest::{Client, ClientBuilder};
use tracing::debug;

use crate::error::{AppError, AppResult};

pub struct HttpChecker;

impl HttpChecker {
    /// Probe `url` and verify the HTTP status code is in `expected_codes`.
    ///
    /// If `expected_codes` is `None` or empty, any 2xx response is accepted.
    pub async fn probe(url: &str, expected_codes: Option<&[u16]>) -> AppResult<String> {
        debug!("HTTP probe: {}", url);

        let client = Self::build_client()?;

        let response = client
            .get(url)
            .send()
            .await
            .map_err(|e| AppError::Network(format!("HTTP probe failed for '{}': {e}", url)))?;

        let status_code = response.status().as_u16();
        debug!("HTTP probe '{}' → {}", url, status_code);

        let is_expected = match expected_codes {
            Some(codes) if !codes.is_empty() => codes.contains(&status_code),
            // No expected codes specified → accept any 2xx.
            _ => response.status().is_success(),
        };

        if is_expected {
            Ok(format!("HTTP {} OK", status_code))
        } else {
            Err(AppError::Diagnostic(format!(
                "HTTP {} — unexpected status code for '{}'",
                status_code, url
            )))
        }
    }

    fn build_client() -> AppResult<Client> {
        ClientBuilder::new()
            .timeout(Duration::from_secs(5))
            // Accept self-signed TLS certs common on internal corporate networks.
            .danger_accept_invalid_certs(true)
            .redirect(reqwest::redirect::Policy::limited(5))
            .build()
            .map_err(|e| AppError::Network(format!("HTTP client build error: {e}")))
    }
}
