pub mod edms_api;
pub mod dms_jwt;
pub mod webhook;
pub mod clipboard;

use async_trait::async_trait;
use std::sync::Arc;

use crate::commands::action_cmd::{ActionRequest, ActionResult};
use crate::config::schema::{EdmsProvider, EdmsProviderType, DmsConfig};
use crate::error::AppResult;

#[async_trait]
pub trait ActionProvider: Send + Sync {
    async fn submit(&self, req: &ActionRequest) -> AppResult<ActionResult>;
}

pub fn build_provider(edms_config: &EdmsProvider, dms_config: Option<&DmsConfig>) -> Arc<dyn ActionProvider> {
    match edms_config.provider_type {
        EdmsProviderType::DmsJwt => {
            let default_dms = DmsConfig {
                base_url: "https://edo-back.dcb.kg".into(),
                system_username: Some("onboardcheck_sys".into()),
                system_password: Some("secret".into()),
                template_id: None,
            };
            let cfg = dms_config.cloned().unwrap_or(default_dms);
            Arc::new(dms_jwt::DmsJwtProvider { config: cfg })
        }
        EdmsProviderType::EdmsRestApi => Arc::new(edms_api::EdmsDirectApi {
            endpoint_url: edms_config
                .endpoint_url
                .clone()
                .unwrap_or_default(),
        }),
        EdmsProviderType::WebhookProxy => Arc::new(webhook::WebhookProxy {
            webhook_url: edms_config
                .endpoint_url
                .clone()
                .unwrap_or_default(),
        }),
        EdmsProviderType::ClipboardFallback => Arc::new(clipboard::ClipboardFallback),
    }
}

pub async fn submit_with_fallback(
    provider: &dyn ActionProvider,
    fallback_to_clipboard: bool,
    req: &ActionRequest,
) -> AppResult<ActionResult> {
    match provider.submit(req).await {
        Ok(result) => Ok(result),
        Err(primary_err) if fallback_to_clipboard => {
            tracing::warn!(
                "Primary action provider failed ({}), falling back to clipboard.",
                primary_err
            );
            clipboard::ClipboardFallback.submit(req).await
        }
        Err(e) => Err(e),
    }
}
