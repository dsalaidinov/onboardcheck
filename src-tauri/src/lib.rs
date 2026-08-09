//! `lib.rs` — Tauri application library root.
//!
//! Responsibilities:
//!   - Initialize tracing subscriber (structured logging to stderr).
//!   - Load AppConfig at startup and register in Tauri managed state.
//!   - Register all Tauri IPC commands.
//!   - Set up Tauri plugins.

use tauri::{Manager};
use tracing::{error, info, warn};
use tracing_subscriber::{fmt, EnvFilter};

mod error;
mod config;
mod installer;
mod diagnostics;
mod actions;
mod commands;

use commands::{
    config_cmd::load_config,
    install_cmd::install_packages,
    diag_cmd::run_diagnostics,
    action_cmd::submit_action,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize structured logging.  Level controlled via `RUST_LOG` env var,
    // defaults to `info`.
    fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .with_target(false)
        .compact()
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Eagerly load config into managed state so all commands can access it.
            let app_handle = app.handle().clone();

            tauri::async_runtime::spawn(async move {
                match commands::config_cmd::load_config(app_handle.clone()).await {
                    Ok(cfg) => {
                        if cfg.dry_run {
                            warn!("⚠️  DRY-RUN mode active — no real OS operations.");
                        }
                        info!(
                            "Config loaded: company='{}', roles={}, projects={}, packages={}",
                            cfg.company_name,
                            cfg.roles.len(),
                            cfg.projects.len(),
                            cfg.packages.len()
                        );
                        app_handle.manage(cfg);
                    }
                    Err(e) => {
                        error!("Failed to load config: {}", e);
                        // App continues — frontend will call load_config and surface the error.
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_config,
            install_packages,
            run_diagnostics,
            submit_action,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
