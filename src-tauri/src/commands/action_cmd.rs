//! `commands/action_cmd.rs`

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tracing::info;

use crate::actions::{build_provider, submit_with_fallback};
use crate::config::AppConfig;
use crate::error::{AppError, AppResult};

#[derive(Debug, Serialize, Deserialize)]
pub struct ActionRequest {
    pub resource_id: String,
    pub resource_name: String,
    pub request_template: String,
    pub target_user_type: Option<String>, // "self" | "employee"
    pub employee_full_name: Option<String>,
    pub employee_tab_num: Option<String>,
    pub employee_dept: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActionResult {
    pub success: bool,
    pub provider_used: String,
    pub message: String,
    pub dms_document_id: Option<String>,
    pub dms_document_url: Option<String>,
}

#[tauri::command]
pub async fn submit_action(
    app: AppHandle,
    request: ActionRequest,
) -> AppResult<ActionResult> {
    let config = app
        .try_state::<AppConfig>()
        .ok_or_else(|| AppError::Config("AppConfig not found in managed state".into()))?;
    let config = config.inner().clone();

    info!(
        "Submitting action for resource '{}' (Target: {:?}) via provider '{:?}'",
        request.resource_id,
        request.target_user_type,
        config.edms_provider.provider_type
    );

    let provider = build_provider(&config.edms_provider, config.dms.as_ref());
    let fallback = config.edms_provider.fallback_to_clipboard;

    submit_with_fallback(provider.as_ref(), fallback, &request).await
}
