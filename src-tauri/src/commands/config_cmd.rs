//! `commands/config_cmd.rs` — Tauri IPC: load and validate `config.json`.
//!
//! The file is resolved in this priority order:
//!   1. `<app_data_dir>/config.json`   (user-editable, placed by IT admins)
//!   2. `<resource_dir>/config.json`   (bundled default)

use tauri::{AppHandle, Manager};
use tracing::{info, warn};

use crate::config::AppConfig;
use crate::error::{AppError, AppResult};

/// Load, deserialize, and validate `config.json`.
///
/// Called once at app startup from the frontend.  The result is cached in
/// Tauri managed state by `lib.rs` so subsequent reads are instant.
#[tauri::command]
pub async fn load_config(app: AppHandle) -> AppResult<AppConfig> {
    let config_path = resolve_config_path(&app)?;
    info!("Loading config from: {}", config_path.display());

    let raw = tokio::fs::read_to_string(&config_path).await.map_err(|e| {
        AppError::Config(format!(
            "Cannot read config.json at '{}': {e}",
            config_path.display()
        ))
    })?;

    let config: AppConfig = serde_json::from_str(&raw)?;
    config.validate()?;

    if config.dry_run {
        warn!("⚠️  DRY-RUN mode is active — no real OS operations will be performed.");
    }

    info!(
        "Config loaded: company='{}', roles={}, projects={}, packages={}",
        config.company_name,
        config.roles.len(),
        config.projects.len(),
        config.packages.len()
    );

    Ok(config)
}

fn resolve_config_path(app: &AppHandle) -> AppResult<std::path::PathBuf> {
    // 1. Try app-data dir (editable by IT)
    if let Ok(data_dir) = app.path().app_data_dir() {
        let candidate = data_dir.join("config.json");
        if candidate.exists() {
            return Ok(candidate);
        }
    }

    // 2. Fall back to bundled resource
    let resource_dir = app.path().resource_dir().map_err(|e| {
        AppError::Config(format!("Cannot resolve resource directory: {e}"))
    })?;

    let bundled = resource_dir.join("config.json");
    if bundled.exists() {
        return Ok(bundled);
    }

    Err(AppError::Config(
        "config.json not found in app-data dir or resource dir".into(),
    ))
}
