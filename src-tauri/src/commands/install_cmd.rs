//! `commands/install_cmd.rs`
//!
//! Tauri IPC: orchestrates the full install pipeline for a list of packages.
//!
//! For each package (sequentially):
//!   1. Download with progress events.
//!   2. Verify SHA-256 integrity.
//!   3. Run silent installer (or dry-run mock).
//!
//! Emits `"install-status"` events for each package state change so the
//! frontend can update the UI in real time.

use tauri::{AppHandle, Emitter, Manager};
use tracing::{error, info};

use crate::config::AppConfig;
use crate::error::{AppError, AppResult};
use crate::installer::{
    downloader::download_package,
    executor::{run_installer, InstallOutcome, InstallResult},
    hasher::verify_sha256,
};

/// Payload emitted as `"install-status"` Tauri event.
#[derive(Debug, Clone, serde::Serialize)]
pub struct InstallStatusEvent {
    pub package_id: String,
    pub status: String, // "downloading" | "verifying" | "installing" | "done" | "error"
    pub message: String,
}

/// Install a list of packages by their IDs.
///
/// Reads package definitions from Tauri managed `AppConfig`.
/// Returns a list of `InstallResult` for the frontend.
#[tauri::command]
pub async fn install_packages(
    app: AppHandle,
    package_ids: Vec<String>,
) -> AppResult<Vec<InstallResult>> {
    let config = app
        .try_state::<AppConfig>()
        .ok_or_else(|| AppError::Config("AppConfig not found in managed state".into()))?;
    let config = config.inner().clone();

    let dry_run = config.dry_run;
    let mut results: Vec<InstallResult> = Vec::with_capacity(package_ids.len());

    for pkg_id in &package_ids {
        let pkg_def = config.packages.get(pkg_id).ok_or_else(|| {
            AppError::Install(format!("Package '{}' not found in config", pkg_id))
        })?;

        // ── Step 1: Download ────────────────────────────────────────────────
        emit_status(&app, pkg_id, "downloading", &format!("Downloading {}…", pkg_def.title));
        info!("Installing package: {} ({})", pkg_id, pkg_def.title);

        let file_path = match download_package(&app, pkg_id, &pkg_def.source, dry_run).await {
            Ok(p) => p,
            Err(e) => {
                let msg = e.to_string();
                error!("Download failed for '{}': {}", pkg_id, msg);
                emit_status(&app, pkg_id, "error", &msg);
                results.push(InstallResult {
                    package_id: pkg_id.clone(),
                    outcome: InstallOutcome::Failed,
                    message: msg,
                });
                continue;
            }
        };

        // ── Step 2: Verify SHA-256 (skip in dry_run) ────────────────────────
        if !dry_run {
            emit_status(&app, pkg_id, "verifying", "Verifying file integrity…");
            if let Err(e) = verify_sha256(&file_path, &pkg_def.sha256).await {
                let msg = e.to_string();
                error!("Hash mismatch for '{}': {}", pkg_id, msg);
                emit_status(&app, pkg_id, "error", &msg);
                // Clean up bad download.
                let _ = tokio::fs::remove_file(&file_path).await;
                results.push(InstallResult {
                    package_id: pkg_id.clone(),
                    outcome: InstallOutcome::Failed,
                    message: msg,
                });
                continue;
            }
        }

        // ── Step 3: Run installer ───────────────────────────────────────────
        emit_status(
            &app,
            pkg_id,
            "installing",
            &format!("Running {} installer…", pkg_def.title),
        );

        match run_installer(pkg_id, &file_path, &pkg_def.silent_args, dry_run).await {
            Ok(result) => {
                let status = if result.outcome == InstallOutcome::DryRun {
                    "dry_run"
                } else {
                    "done"
                };
                emit_status(&app, pkg_id, status, &result.message);
                results.push(result);
            }
            Err(e) => {
                let msg = e.to_string();
                error!("Install failed for '{}': {}", pkg_id, msg);
                emit_status(&app, pkg_id, "error", &msg);
                results.push(InstallResult {
                    package_id: pkg_id.clone(),
                    outcome: InstallOutcome::Failed,
                    message: msg,
                });
            }
        }

        // Clean up temp file after install.
        if !dry_run {
            let _ = tokio::fs::remove_file(&file_path).await;
        }
    }

    Ok(results)
}

fn emit_status(app: &AppHandle, package_id: &str, status: &str, message: &str) {
    let _ = app.emit(
        "install-status",
        InstallStatusEvent {
            package_id: package_id.to_owned(),
            status: status.to_owned(),
            message: message.to_owned(),
        },
    );
}
