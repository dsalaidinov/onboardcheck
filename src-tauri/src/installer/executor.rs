//! `installer/executor.rs`
//!
//! Runs the installer binary silently using `tokio::process::Command`.
//! In `dry_run` mode it sleeps for 500 ms and returns `InstallResult::DryRun`
//! without touching the OS.

use std::path::Path;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tokio::process::Command;
use tokio::time::sleep;
use tracing::{info, warn};

use crate::error::{AppError, AppResult};

/// Result of a single package installation attempt.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallResult {
    pub package_id: String,
    pub outcome: InstallOutcome,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum InstallOutcome {
    /// Installation completed successfully.
    Success,
    /// Dry-run mode — no real install was performed.
    DryRun,
    /// Installer returned a non-zero exit code.
    Failed,
}

/// Execute an installer silently.
///
/// `file_path`   — path to the downloaded installer binary.
/// `silent_args` — space-separated args (e.g. `/quiet /norestart`).
/// `dry_run`     — if true, skip the real command and return `DryRun`.
pub async fn run_installer(
    package_id: &str,
    file_path: &Path,
    silent_args: &str,
    dry_run: bool,
) -> AppResult<InstallResult> {
    if dry_run {
        return simulate_install(package_id).await;
    }

    real_install(package_id, file_path, silent_args).await
}

// ── Real installer execution ──────────────────────────────────────────────────

async fn real_install(
    package_id: &str,
    file_path: &Path,
    silent_args: &str,
) -> AppResult<InstallResult> {
    let args: Vec<&str> = silent_args.split_whitespace().collect();

    info!(
        "Running installer '{}' with args: {:?}",
        file_path.display(),
        args
    );

    let output = Command::new(file_path)
        .args(&args)
        // Suppress stdout/stderr to avoid console windows on Windows.
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::piped())
        .output()
        .await
        .map_err(|e| AppError::Install(format!("Failed to spawn installer: {e}")))?;

    if output.status.success() {
        Ok(InstallResult {
            package_id: package_id.to_owned(),
            outcome: InstallOutcome::Success,
            message: "Installation completed successfully.".into(),
        })
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let code = output.status.code().unwrap_or(-1);
        warn!(
            "Installer '{}' exited with code {}: {}",
            package_id, code, stderr
        );
        Err(AppError::Install(format!(
            "Installer '{}' exited with code {}: {}",
            package_id, code, stderr
        )))
    }
}

// ── Dry-run mock ──────────────────────────────────────────────────────────────

async fn simulate_install(package_id: &str) -> AppResult<InstallResult> {
    info!("[DRY-RUN] Simulating install for '{}'", package_id);
    sleep(Duration::from_millis(500)).await;

    Ok(InstallResult {
        package_id: package_id.to_owned(),
        outcome: InstallOutcome::DryRun,
        message: "[DRY-RUN] Install simulated — no changes were made to the OS.".into(),
    })
}
