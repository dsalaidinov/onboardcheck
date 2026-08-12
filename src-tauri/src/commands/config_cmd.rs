//! `commands/config_cmd.rs` — Tauri IPC: load and validate `config.json`.
//!
//! Priority resolution order:
//!   1. `<app_data_dir>/config.json` (user-editable, placed by IT admins)
//!   2. `<executable_dir>/config.json` (next to OnboardCheck.exe)
//!   3. `<resource_dir>/config.json` (bundled resource)
//!   4. `include_str!("../../config.json")` (built-in embedded fallback for 100% single-file EXE operation)

use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tracing::{info, warn};

use crate::config::AppConfig;
use crate::error::{AppError, AppResult};

const EMBEDDED_CONFIG: &str = include_str!("../../config.json");

/// Load, deserialize, and validate `config.json`.
#[tauri::command]
pub async fn load_config(app: AppHandle) -> AppResult<AppConfig> {
    let raw = match resolve_config_raw(&app).await {
        Ok(content) => content,
        Err(e) => {
            warn!("Could not read external config.json ({}), using embedded config fallback.", e);
            EMBEDDED_CONFIG.to_string()
        }
    };

    let config: AppConfig = serde_json::from_str(&raw).map_err(|e| {
        AppError::Config(format!("Failed to parse config.json: {e}"))
    })?;

    config.validate()?;

    if config.dry_run {
        warn!("⚠️ DRY-RUN mode is active — no real OS operations will be performed.");
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

async fn resolve_config_raw(app: &AppHandle) -> AppResult<String> {
    // 1. Try app-data dir (editable by IT)
    if let Ok(data_dir) = app.path().app_data_dir() {
        let candidate = data_dir.join("config.json");
        if candidate.exists() {
            if let Ok(text) = tokio::fs::read_to_string(&candidate).await {
                info!("Loaded config from app_data_dir: {}", candidate.display());
                return Ok(text);
            }
        }
    }

    // 2. Try next to executable (.exe dir)
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(exe_dir) = current_exe.parent() {
            let candidate = exe_dir.join("config.json");
            if candidate.exists() {
                if let Ok(text) = tokio::fs::read_to_string(&candidate).await {
                    info!("Loaded config from exe directory: {}", candidate.display());
                    return Ok(text);
                }
            }
        }
    }

    // 3. Try resource directory
    if let Ok(resource_dir) = app.path().resource_dir() {
        let candidate = resource_dir.join("config.json");
        if candidate.exists() {
            if let Ok(text) = tokio::fs::read_to_string(&candidate).await {
                info!("Loaded config from resource_dir: {}", candidate.display());
                return Ok(text);
            }
        }
    }

    Err(AppError::Config(
        "No external config.json found on disk".into(),
    ))
}
