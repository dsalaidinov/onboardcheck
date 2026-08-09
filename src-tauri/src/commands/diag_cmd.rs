//! `commands/diag_cmd.rs`

use tauri::{AppHandle, Manager};
use tracing::info;

use crate::config::AppConfig;
use crate::diagnostics::runner::{run_all_probes, ProbeResult};
use crate::error::{AppError, AppResult};

#[tauri::command]
pub async fn run_diagnostics(
    app: AppHandle,
    project_ids: Vec<String>,
) -> AppResult<Vec<ProbeResult>> {
    let config = app
        .try_state::<AppConfig>()
        .ok_or_else(|| AppError::Config("AppConfig not found in managed state".into()))?;
    let config = config.inner().clone();

    let mut combined_resources = Vec::new();

    for pid in &project_ids {
        if let Some(project) = config.projects.iter().find(|p| &p.id == pid) {
            combined_resources.extend(project.resources.clone());
        }
    }

    if combined_resources.is_empty() {
        return Err(AppError::Diagnostic("No valid project resources found".into()));
    }

    info!(
        "Running diagnostics for {} projects ({} combined resources)",
        project_ids.len(),
        combined_resources.len()
    );

    run_all_probes(&app, &combined_resources).await
}
