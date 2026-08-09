//! `actions/dms_jwt.rs`
//!
//! Integrates directly with DosCredo Bank EDMS (ЭДО) API (`https://edo-back.dcb.kg`).
//!
//! Workflow:
//! 1. POST `/auth/login` with credentials -> receive JWT token.
//! 2. POST `/document/create/template` or `/document` with `Authorization: Bearer <token>`
//! 3. Returns document ID & web URL so user can view/track approval status in ЭДО.

use async_trait::async_trait;
use reqwest::{Client, ClientBuilder};
use serde_json::json;
use std::time::Duration;
use tracing::info;

use crate::actions::ActionProvider;
use crate::commands::action_cmd::{ActionRequest, ActionResult};
use crate::config::schema::DmsConfig;
use crate::error::{AppError, AppResult};

pub struct DmsJwtProvider {
    pub config: DmsConfig,
}

#[async_trait]
impl ActionProvider for DmsJwtProvider {
    async fn submit(&self, req: &ActionRequest) -> AppResult<ActionResult> {
        let base_url = self.config.base_url.trim_end_matches('/');

        info!(
            "Submitting EDMS JWT request for resource '{}' to '{}'",
            req.resource_id, base_url
        );

        let client: Client = ClientBuilder::new()
            .timeout(Duration::from_secs(15))
            .danger_accept_invalid_certs(true) // For internal banking SSL / DEV environments
            .build()
            .map_err(|e| AppError::Action(e.to_string()))?;

        // 1. Authenticate to get JWT token
        let username = self.config.system_username.as_deref().unwrap_or("onboardcheck_sys");
        let password = self.config.system_password.as_deref().unwrap_or("secret");

        let login_url = format!("{}/auth/login", base_url);
        let login_res = client
            .post(&login_url)
            .json(&json!({
                "username": username,
                "password": password
            }))
            .send()
            .await
            .map_err(|e| AppError::Action(format!("EDMS Auth failed: {e}")))?;

        if !login_res.status().is_success() {
            let err_text = login_res.text().await.unwrap_or_default();
            return Err(AppError::Action(format!(
                "EDMS Auth error ({}): {}",
                login_url, err_text
            )));
        }

        let login_data: serde_json::Value = login_res
            .json()
            .await
            .map_err(|e| AppError::Action(format!("Invalid EDMS Auth response JSON: {e}")))?;

        let token = login_data
            .get("token")
            .and_then(|v| v.as_str())
            .ok_or_else(|| AppError::Action("JWT token missing in EDMS Auth response".into()))?;

        // 2. Format Request Description based on Target User (Self vs Employee)
        let is_employee = req.target_user_type.as_deref() == Some("employee");
        let doc_title = if is_employee {
            format!(
                "Заявка на доступ: {} (для сотрудника: {})",
                req.resource_name,
                req.employee_full_name.as_deref().unwrap_or("Не указан")
            )
        } else {
            format!("Заявка на доступ: {} (OnboardCheck)", req.resource_name)
        };

        let target_meta = if is_employee {
            json!({
                "target_type": "employee",
                "employee_full_name": req.employee_full_name,
                "employee_tab_num": req.employee_tab_num,
                "employee_dept": req.employee_dept,
            })
        } else {
            json!({
                "target_type": "self"
            })
        };

        let full_description = format!(
            "{}\n\n--- Метаданные OnboardCheck ---\nРесурс: {}\nID: {}\nКому доступ: {}",
            req.request_template,
            req.resource_name,
            req.resource_id,
            if is_employee {
                format!(
                    "{} (Таб № {}, {})",
                    req.employee_full_name.as_deref().unwrap_or("—"),
                    req.employee_tab_num.as_deref().unwrap_or("—"),
                    req.employee_dept.as_deref().unwrap_or("—")
                )
            } else {
                "Заявитель (Для себя)".to_string()
            }
        );

        // 3. Create Document via Template Endpoint or Standard Document Endpoint
        let doc_url = if let Some(_tpl_id) = &self.config.template_id {
            format!("{}/document/create/template", base_url)
        } else {
            format!("{}/document", base_url)
        };

        let doc_payload = if let Some(tpl_id) = &self.config.template_id {
            json!({
                "templateId": tpl_id,
                "title": doc_title,
                "description": full_description,
                "meta": target_meta,
                "source": "OnboardCheck"
            })
        } else {
            json!({
                "title": doc_title,
                "description": full_description,
                "type": "ACCESS_REQUEST",
                "meta": target_meta,
                "source": "OnboardCheck"
            })
        };

        let doc_res = client
            .post(&doc_url)
            .header("Authorization", format!("Bearer {}", token))
            .json(&doc_payload)
            .send()
            .await
            .map_err(|e| AppError::Action(format!("EDMS Document creation failed: {e}")))?;

        if !doc_res.status().is_success() {
            let err_body = doc_res.text().await.unwrap_or_default();
            return Err(AppError::Action(format!(
                "EDMS document creation failed ({}): {}",
                doc_url, err_body
            )));
        }

        let doc_data: serde_json::Value = doc_res
            .json()
            .await
            .map_err(|e| AppError::Action(format!("Invalid EDMS Document response JSON: {e}")))?;

        let doc_id = doc_data
            .get("id")
            .or_else(|| doc_data.get("documentId"))
            .and_then(|v| v.as_str())
            .unwrap_or("created");

        let web_url = format!("{}/documents/{}", base_url, doc_id);

        info!("EDMS Document created successfully! ID: {}", doc_id);

        Ok(ActionResult {
            success: true,
            provider_used: "dms_jwt".into(),
            message: format!(
                "Заявка на доступ к «{}» успешно создана в ЭДО!",
                req.resource_name
            ),
            dms_document_id: Some(doc_id.to_string()),
            dms_document_url: Some(web_url),
        })
    }
}
