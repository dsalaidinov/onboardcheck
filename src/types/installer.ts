// src/types/installer.ts — IPC types for the Package Installer engine (Milestone 2).

export type PackageStatus =
  | 'queued'
  | 'downloading'
  | 'verifying'
  | 'installing'
  | 'done'
  | 'error'
  | 'dry_run';

export interface DownloadProgress {
  package_id: string;
  bytes_downloaded: number;
  total_bytes: number;
  /** Bytes per second. */
  speed_bps: number;
}

export interface InstallResult {
  package_id: string;
  status: PackageStatus;
  message: string;
}
