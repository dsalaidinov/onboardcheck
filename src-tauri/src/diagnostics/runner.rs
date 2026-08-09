//! `diagnostics/runner.rs`
//!
//! Fans out all diagnostic probes for a project concurrently using
//! `tokio::spawn` + `futures::future::join_all`.
//! Each probe emits a `"probe-result"` Tauri event as soon as it resolves,
//! giving the frontend a live traffic-light update experience.

use std::sync::Arc;
use std::time::Instant;

use futures::future::join_all;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::task::JoinHandle;
use tracing::{error, info};

use crate::config::schema::{ProbeType, Resource};
use crate::diagnostics::{dns::DnsChecker, http::HttpChecker, tcp::TcpChecker};
use crate::error::AppResult;

/// Result payload emitted as `"probe-result"` Tauri event.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProbeResult {
    pub resource_id: String,
    pub resource_name: String,
    pub status: ProbeStatus,
    pub latency_ms: Option<u64>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ProbeStatus {
    Ok,
    Warning,
    Error,
}

/// Run all probes for the given resources concurrently.
/// Results are emitted as `"probe-result"` events AND returned as a Vec.
pub async fn run_all_probes(
    app: &AppHandle,
    resources: &[Resource],
) -> AppResult<Vec<ProbeResult>> {
    info!("Starting {} diagnostic probes", resources.len());

    let app = Arc::new(app.clone());

    let handles: Vec<JoinHandle<ProbeResult>> = resources
        .iter()
        .map(|res| {
            let app_clone = Arc::clone(&app);
            let res_clone = res.clone();

            tokio::spawn(async move {
                let result = probe_resource(&res_clone).await;
                // Emit immediately so the UI updates as each probe completes.
                let _ = app_clone.emit("probe-result", &result);
                result
            })
        })
        .collect();

    let mut results = Vec::with_capacity(resources.len());
    for join_result in join_all(handles).await {
        match join_result {
            Ok(probe_result) => results.push(probe_result),
            Err(e) => error!("Probe task panicked: {}", e),
        }
    }

    info!("All probes complete ({} results)", results.len());
    Ok(results)
}

/// Dispatch to the correct checker based on `resource.probe_type`.
async fn probe_resource(resource: &Resource) -> ProbeResult {
    let start = Instant::now();

    let outcome: Result<String, String> = match &resource.probe_type {
        ProbeType::HttpStatus => {
            HttpChecker::probe(&resource.target, resource.expected_codes.as_deref())
                .await
                .map_err(|e| e.to_string())
        }
        ProbeType::TcpPort => {
            TcpChecker::probe(&resource.target)
                .await
                .map_err(|e| e.to_string())
        }
        ProbeType::DnsResolve => {
            DnsChecker::probe(&resource.target)
                .await
                .map_err(|e| e.to_string())
        }
    };

    let latency_ms = Some(start.elapsed().as_millis() as u64);

    match outcome {
        Ok(msg) => ProbeResult {
            resource_id: resource.id.clone(),
            resource_name: resource.name.clone(),
            status: ProbeStatus::Ok,
            latency_ms,
            message: msg,
        },
        Err(msg) => ProbeResult {
            resource_id: resource.id.clone(),
            resource_name: resource.name.clone(),
            status: ProbeStatus::Error,
            latency_ms,
            message: msg,
        },
    }
}
