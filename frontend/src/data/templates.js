// Process Template data layer (client onboarding): the New Client dialog's
// module picker reads `processTemplates` to preview what each module would
// create, then calls `applyTemplates` once the client itself is saved.
// Backing API: flowlane.api.templates (get_templates / apply_templates).
// Pure preview/summary logic lives in templateSummary.js (unit-tested there,
// same split as data/clients.js vs data/clientFilter.js).

import { createResource, call } from 'frappe-ui'

export const processTemplates = createResource({
  url: 'flowlane.api.templates.get_templates',
  cache: 'flowlane-process-templates',
})

export function applyTemplates(client, modules) {
  return call('flowlane.api.templates.apply_templates', { client, modules })
}
