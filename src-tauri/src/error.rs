/// Central error type for the OnboardCheck application.
///
/// Every module should return `Result<T, AppError>`. The `serde::Serialize`
/// impl is required so Tauri IPC can surface errors to the frontend as
/// structured JSON objects rather than opaque strings.
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Configuration error: {0}")]
    Config(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Network error: {0}")]
    Network(String),

    #[error("Install error: {0}")]
    Install(String),

    #[error("Diagnostic error: {0}")]
    Diagnostic(String),

    #[error("Action error: {0}")]
    Action(String),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

/// Serialize `AppError` so Tauri `#[command]` can return it as an IPC error.
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// Convenience alias — all fallible functions in this crate use this.
pub type AppResult<T> = Result<T, AppError>;
