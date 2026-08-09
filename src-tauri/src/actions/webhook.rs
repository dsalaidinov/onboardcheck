//! `actions/webhook.rs`
use async_trait::async_trait;
use reqwest::{Client, ClientBuilder};
use serde_json::json;
use std::time::Duration;
use tracing::info;

use crate::actions::ActionProvider;
use crate::commands::action_cmd::{ActionRequest, ActionResult};
use crate::error::{AppError, AppResult};

pub struct WebhookProxy {
    pub webhook_url: String,
}

#[async_trait]
impl ActionProvider for WebhookProxy {
    async fn submit(&self, req: &ActionRequest) -> AppResult<ActionResult> {
        info!(
            "Dispatching webhook for resource '{}' to '{}'",
            req.resource_id, self.webhook_url
        );

        let client: Client = ClientBuilder::new()
            .timeout(Duration::from_secs(10))
            .build()
            .map_err(|e| AppError::Action(e.to_string()))?;

        let payload = json!({
            "event": "access_request",
            "resource_id": req.resource_id,
            "resource_name": req.resource_name,
            "request_text": req.request_template,
            "target_user_type": req.target_user_type,
            "employee_full_name": req.employee_full_name,
            "employee_tab_num": req.employee_tab_num,
            "employee_dept": req.employee_dept,
            "source": "OnboardCheck",
            "timestamp": chrono_utc_now()
        });

        let response = client
            .post(&self.webhook_url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| AppError::Action(format!("Webhook POST failed: {e}")))?;

        if response.status().is_success() {
            Ok(ActionResult {
                success: true,
                provider_used: "webhook_proxy".into(),
                message: format!(
                    "Webhook dispatched for '{}'. Workflow triggered.",
                    req.resource_name
                ),
                dms_document_id: None,
                dms_document_url: None,
            })
        } else {
            Err(AppError::Action(format!(
                "Webhook endpoint returned {}: {}",
                response.status(),
                response.text().await.unwrap_or_default()
            )))
        }
    }
}

fn chrono_utc_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!(
        "{}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        1970 + secs / 31_557_600,
        ((secs % 31_557_600) / 2_629_800) + 1,
        ((secs % 2_629_800) / 86_400) + 1,
        (secs % 86_400) / 3_600,
        (secs % 3_600) / 60,
        secs % 60
    )
}
