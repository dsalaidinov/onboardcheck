//! `installer/downloader.rs`
//!
//! Streams a file from `url` to a temp path while emitting `"download-progress"`
//! Tauri events.  In `dry_run` mode the download is skipped entirely and
//! synthetic progress events are fired every 100 ms instead.

use std::path::PathBuf;
use std::time::Duration;

use reqwest::Client;
use tauri::{AppHandle, Emitter};
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use tokio::time::sleep;
use tracing::{debug, info};

use crate::error::{AppError, AppResult};

/// Payload emitted as `"download-progress"` Tauri event.
#[derive(Debug, Clone, serde::Serialize)]
pub struct DownloadProgressEvent {
    pub package_id: String,
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    /// Instantaneous speed in bytes/second.
    pub speed_bps: u64,
}

/// Download a package to a temp file path.
///
/// Returns the local path of the downloaded file.
pub async fn download_package(
    app: &AppHandle,
    package_id: &str,
    url: &str,
    dry_run: bool,
) -> AppResult<PathBuf> {
    if dry_run {
        return simulate_download(app, package_id).await;
    }

    real_download(app, package_id, url).await
}

// ── Real streaming download ───────────────────────────────────────────────────

async fn real_download(
    app: &AppHandle,
    package_id: &str,
    url: &str,
) -> AppResult<PathBuf> {
    info!("Downloading package '{}' from '{}'", package_id, url);

    let client = Client::builder()
        .timeout(Duration::from_secs(300))
        .build()
        .map_err(|e| AppError::Network(e.to_string()))?;

    let response = client.get(url).send().await.map_err(|e| {
        AppError::Network(format!("GET '{}' failed: {e}", url))
    })?;

    if !response.status().is_success() {
        return Err(AppError::Network(format!(
            "Server returned {} for '{}'",
            response.status(),
            url
        )));
    }

    let total_bytes = response.content_length().unwrap_or(0);

    // Write to a temp file under the system temp dir.
    let tmp_path = std::env::temp_dir().join(format!("onboardx_{}.tmp", package_id));
    let mut file = File::create(&tmp_path).await.map_err(|e| {
        AppError::Io(e)
    })?;

    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();
    let start = std::time::Instant::now();

    use futures::StreamExt;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AppError::Network(e.to_string()))?;
        file.write_all(&chunk).await?;
        downloaded += chunk.len() as u64;

        let elapsed_secs = start.elapsed().as_secs_f64().max(0.001);
        let speed_bps = (downloaded as f64 / elapsed_secs) as u64;

        emit_progress(app, package_id, downloaded, total_bytes, speed_bps);
    }

    file.flush().await?;
    debug!("Download complete: '{}' → '{}'", package_id, tmp_path.display());

    Ok(tmp_path)
}

// ── Dry-run mock ──────────────────────────────────────────────────────────────

async fn simulate_download(app: &AppHandle, package_id: &str) -> AppResult<PathBuf> {
    info!("[DRY-RUN] Simulating download for '{}'", package_id);

    let fake_total: u64 = 50 * 1024 * 1024; // pretend 50 MB
    let steps = 20u64;

    for i in 1..=steps {
        sleep(Duration::from_millis(100)).await;
        let downloaded = (fake_total / steps) * i;
        let speed_bps = 5 * 1024 * 1024; // constant 5 MB/s
        emit_progress(app, package_id, downloaded, fake_total, speed_bps);
    }

    // Return a fake path — the executor will handle it in dry_run mode.
    Ok(PathBuf::from(format!("/tmp/onboardx_{}.dry_run", package_id)))
}

// ── Helper ────────────────────────────────────────────────────────────────────

fn emit_progress(
    app: &AppHandle,
    package_id: &str,
    bytes_downloaded: u64,
    total_bytes: u64,
    speed_bps: u64,
) {
    let _ = app.emit(
        "download-progress",
        DownloadProgressEvent {
            package_id: package_id.to_owned(),
            bytes_downloaded,
            total_bytes,
            speed_bps,
        },
    );
}
