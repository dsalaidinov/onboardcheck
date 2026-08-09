// src/types/actions.ts — IPC types for EDMS/Action engine.

export type TargetUserType = 'self' | 'employee';

export interface ActionRequest {
  resource_id: string;
  resource_name: string;
  request_template: string;
  target_user_type?: TargetUserType;
  employee_full_name?: string;
  employee_tab_num?: string;
  employee_dept?: string;
}

export interface ActionResult {
  success: boolean;
  provider_used: string;
  message: string;
  dms_document_id?: string;
  dms_document_url?: string;
}
