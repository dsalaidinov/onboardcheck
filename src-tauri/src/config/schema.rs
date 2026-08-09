//! `config/schema.rs` — serde-validated configuration models.

use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct AppConfig {
    pub version: String,
    pub company_name: String,
    pub dry_run: bool,
    pub edms_provider: EdmsProvider,
    pub dms: Option<DmsConfig>,
    pub roles: Vec<Role>,
    pub projects: Vec<Project>,
    pub packages: HashMap<String, PackageDef>,
}

impl AppConfig {
    pub fn validate(&self) -> AppResult<()> {
        for role in &self.roles {
            for pkg_id in &role.packages {
                if !self.packages.contains_key(pkg_id) {
                    return Err(AppError::Config(format!(
                        "Role '{}' references unknown package '{}'",
                        role.id, pkg_id
                    )));
                }
            }
        }

        for project in &self.projects {
            if project.resources.is_empty() {
                return Err(AppError::Config(format!(
                    "Project '{}' has no resources defined",
                    project.id
                )));
            }
        }

        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DmsConfig {
    pub base_url: String,
    pub system_username: Option<String>,
    pub system_password: Option<String>,
    pub template_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct EdmsProvider {
    #[serde(rename = "type")]
    pub provider_type: EdmsProviderType,
    pub auth_type: Option<AuthType>,
    pub endpoint_url: Option<String>,
    pub fallback_to_clipboard: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EdmsProviderType {
    EdmsRestApi,
    DmsJwt,
    WebhookProxy,
    ClipboardFallback,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AuthType {
    WindowsSso,
    Jwt,
    BasicAuth,
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Role {
    pub id: String,
    pub name: String,
    pub packages: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: String,
    pub resources: Vec<Resource>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resource {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub probe_type: ProbeType,
    pub target: String,
    pub expected_codes: Option<Vec<u16>>,
    pub responsible_team: String,
    pub request_template: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ProbeType {
    HttpStatus,
    TcpPort,
    DnsResolve,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageDef {
    pub title: String,
    #[serde(rename = "type")]
    pub package_type: PackageType,
    pub source: String,
    pub silent_args: String,
    pub sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum PackageType {
    Msi,
    Exe,
    Zip,
}
