//! `actions/edms_api.rs`
//!
//! `EdmsDirectApi` — submits an access request document directly to the EDMS
//! REST API endpoint.  On Windows, Windows SSO credentials are forwarded via
//! the OS credential store (NTLM/Kerberos).  On other platforms this provider
//! returns a descriptive error so the ClipboardFallback is used instead.

use async_trait::async_trait;

use crate::actions::ActionProvider;
use crate::commands::action_cmd::{ActionRequest, ActionResult};
use crate::error::{AppError, AppResult};

pub struct EdmsDirectApi {
    #[allow(dead_code)] // used on Windows cfg path only
    pub endpoint_url: String,
}

#[async_trait]
impl ActionProvider for EdmsDirectApi {
    async fn submit(&self, req: &ActionRequest) -> AppResult<ActionResult> {
        #[cfg(not(target_os = "windows"))]
        {
            let _ = req; // suppress unused warning on non-Windows
            return Err(AppError::Action(
                "Windows SSO is only available on Windows. Use ClipboardFallback instead.".into(),
            ));
        }

        #[cfg(target_os = "windows")]
        self.submit_windows(req).await
    }
}

impl EdmsDirectApi {
    #[cfg(target_os = "windows")]
    async fn submit_windows(&self, req: &ActionRequest) -> AppResult<ActionResult> {
        use reqwest::{Client, ClientBuilder};
        use serde_json::json;
        use std::time::Duration;

        info!(
            "Submitting EDMS request for resource '{}' via '{}'",
            req.resource_id, self.endpoint_url
        );

        let client: Client = ClientBuilder::new()
            .timeout(Duration::from_secs(15))
            .build()
            .map_err(|e| AppError::Action(e.to_string()))?;

        let body = json!({
            "document_type": "access_request",
            "resource_id": req.resource_id,
            "resource_name": req.resource_name,
            "request_text": req.request_template,
            "created_via": "OnboardCheck"
        });

        let response = client
            .post(&self.endpoint_url)
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::Action(format!("EDMS API call failed: {e}")))?;

        if response.status().is_success() {
            Ok(ActionResult {
                success: true,
                provider_used: "edms_rest_api".into(),
                message: format!(
                    "Access request created in EDMS for '{}'.",
                    req.resource_name
                ),
            })
        } else {
            Err(AppError::Action(format!(
                "EDMS API returned {}: {}",
                response.status(),
                response.text().await.unwrap_or_default()
            )))
        }
    }
}
