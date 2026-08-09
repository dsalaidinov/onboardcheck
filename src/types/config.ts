// src/types/config.ts
// Exact TypeScript mirror of Rust config/schema.rs structs.
// Keep in sync with Rust types whenever config schema changes.

export type EdmsProviderType = 'edms_rest_api' | 'webhook_proxy' | 'clipboard_fallback';
export type AuthType = 'windows_sso' | 'basic_auth' | 'none';
export type ProbeType = 'http_status' | 'tcp_port' | 'dns_resolve';
export type PackageType = 'msi' | 'exe' | 'zip';

export interface EdmsProvider {
  type: EdmsProviderType;
  auth_type: AuthType | null;
  endpoint_url: string | null;
  fallback_to_clipboard: boolean;
}

export interface Role {
  id: string;
  name: string;
  packages: string[];
}

export interface Resource {
  id: string;
  name: string;
  type: ProbeType;
  target: string;
  expected_codes: number[] | null;
  responsible_team: string;
  request_template: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  resources: Resource[];
}

export interface PackageDef {
  title: string;
  type: PackageType;
  source: string;
  silent_args: string;
  sha256: string;
}

export interface AppConfig {
  version: string;
  company_name: string;
  dry_run: boolean;
  edms_provider: EdmsProvider;
  roles: Role[];
  projects: Project[];
  packages: Record<string, PackageDef>;
}
