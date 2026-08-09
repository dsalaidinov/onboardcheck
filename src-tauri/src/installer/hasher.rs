//! `installer/hasher.rs`
//!
//! Computes the SHA-256 digest of a file using streaming I/O so large
//! installers don't require loading the whole file into memory.

use std::path::Path;

use sha2::{Digest, Sha256};
use tokio::fs::File;
use tokio::io::AsyncReadExt;
use tracing::{debug, info};

use crate::error::{AppError, AppResult};

const CHUNK_SIZE: usize = 64 * 1024; // 64 KB chunks

/// Verify that `file_path` matches the expected `sha256` hex string.
///
/// Returns `Ok(())` on match, `Err(AppError::Install)` on mismatch or I/O error.
pub async fn verify_sha256(file_path: &Path, expected_hex: &str) -> AppResult<()> {
    let actual_hex = compute_sha256(file_path).await?;

    if actual_hex.eq_ignore_ascii_case(expected_hex) {
        info!(
            "SHA-256 verified OK for '{}'",
            file_path.file_name().unwrap_or_default().to_string_lossy()
        );
        Ok(())
    } else {
        Err(AppError::Install(format!(
            "SHA-256 mismatch for '{}': expected '{}', got '{}'",
            file_path.display(),
            expected_hex,
            actual_hex
        )))
    }
}

/// Compute the SHA-256 hex digest of a file without loading it fully into memory.
async fn compute_sha256(file_path: &Path) -> AppResult<String> {
    debug!("Computing SHA-256 for '{}'", file_path.display());

    let mut file = File::open(file_path).await?;
    let mut hasher = Sha256::new();
    let mut buf = vec![0u8; CHUNK_SIZE];

    loop {
        let n = file.read(&mut buf).await?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }

    let digest = hasher.finalize();
    Ok(format!("{:x}", digest))
}
