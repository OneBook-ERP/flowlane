// Column definitions for the Table tab grid. `type` drives the cell editor:
//   text    -> plain text input
//   master  -> Combobox over a data/masters key (`master`)
//   doctype -> Combobox over the live ERPNext DocType list
// PASTE_FIELDS is the positional column order used by Excel paste (the first six
// grid columns), documented so the parser and the grid agree.

export const COLUMNS = [
  { field: 'step_id', label: 'Step ID', type: 'text', width: 'w-24' },
  { field: 'step_name', label: 'Step Name', type: 'text', width: 'w-56' },
  { field: 'lane_role', label: 'Lane Role', type: 'master', master: 'lane_role', width: 'w-44' },
  { field: 'node_type', label: 'Node Type', type: 'master', master: 'node_type', width: 'w-40' },
  { field: 'trigger_input', label: 'Trigger / Input', type: 'text', width: 'w-48' },
  { field: 'output_result', label: 'Output / Result', type: 'text', width: 'w-48' },
  { field: 'erpnext_module', label: 'ERPNext Module', type: 'master', master: 'erpnext_module', width: 'w-40' },
  { field: 'erpnext_doctype', label: 'ERPNext DocType', type: 'doctype', width: 'w-48' },
  { field: 'workflow_state', label: 'Workflow State', type: 'text', width: 'w-40' },
  { field: 'key_data_fields', label: 'Key Data Fields', type: 'text', width: 'w-48' },
  { field: 'business_rules', label: 'Business Rules', type: 'text', width: 'w-56' },
  { field: 'exceptions', label: 'Exceptions', type: 'text', width: 'w-48' },
  { field: 'controls_approvals', label: 'Controls / Approvals', type: 'text', width: 'w-48' },
  { field: 'integrations', label: 'Integrations', type: 'text', width: 'w-44' },
  { field: 'kpis', label: 'KPIs', type: 'text', width: 'w-40' },
]

// Excel paste maps its columns positionally onto these fields (first six columns).
export const PASTE_FIELDS = COLUMNS.slice(0, 6).map((column) => column.field)
