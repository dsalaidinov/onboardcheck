// src/types/diagnostics.ts — IPC types for the Diagnostics engine (Milestone 3).

export type ProbeStatus = 'pending' | 'checking' | 'ok' | 'warning' | 'error';

export interface DiagnosticResult {
  resource_id: string;
  resource_name: string;
  status: ProbeStatus;
  /** Latency in milliseconds. null if probe did not complete. */
  latency_ms: number | null;
  message: string;
}
