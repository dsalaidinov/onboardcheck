//! `actions/clipboard.rs`
use async_trait::async_trait;
use arboard::Clipboard;
use tracing::info;

use crate::actions::ActionProvider;
use crate::commands::action_cmd::{ActionRequest, ActionResult};
use crate::error::{AppError, AppResult};

pub struct ClipboardFallback;

#[async_trait]
impl ActionProvider for ClipboardFallback {
    async fn submit(&self, req: &ActionRequest) -> AppResult<ActionResult> {
        let text = Self::format_request(req);

        let text_clone = text.clone();
        tokio::task::spawn_blocking(move || {
            Clipboard::new()
                .map_err(|e| AppError::Action(format!("Clipboard init failed: {e}")))?
                .set_text(&text_clone)
                .map_err(|e| AppError::Action(format!("Clipboard write failed: {e}")))
        })
        .await
        .map_err(|e| AppError::Action(format!("Spawn-blocking error: {e}")))??;

        info!(
            "Copied access request for '{}' to clipboard ({} chars)",
            req.resource_name,
            text.len()
        );

        Ok(ActionResult {
            success: true,
            provider_used: "clipboard_fallback".into(),
            message: format!(
                "Request text for '{}' copied to clipboard. Paste into EDMS manually.",
                req.resource_name
            ),
            dms_document_id: None,
            dms_document_url: None,
        })
    }
}

impl ClipboardFallback {
    fn format_request(req: &ActionRequest) -> String {
        let is_employee = req.target_user_type.as_deref() == Some("employee");

        let target_info = if is_employee {
            let name = req.employee_full_name.as_deref().unwrap_or("—");
            let tab = req.employee_tab_num.as_deref().unwrap_or("—");
            let dept = req.employee_dept.as_deref().unwrap_or("—");
            format!(
                "Целевой сотрудник: {}\n\
                 Табельный номер : {}\n\
                 Отдел / Должность: {}",
                name, tab, dept
            )
        } else {
            "Заявитель: Текущий пользователь (Для себя)".to_string()
        };

        format!(
            "=== ЗАЯВКА НА ДОСТУП В ЭДО (OnboardCheck) ===\n\
             Ресурс     : {}\n\
             ID Ресурса : {}\n\
             {}\n\
             \n\
             Текст запроса:\n\
             {}\n\
             \n\
             === КОНЕЦ ЗАЯВКИ ===",
            req.resource_name, req.resource_id, target_info, req.request_template
        )
    }
}
