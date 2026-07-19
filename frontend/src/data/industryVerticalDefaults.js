// Each Industry Vertical's seeded Core-module defaults (BACKLOG 1.3),
// fetched once and reused wherever New Client needs to auto-populate the
// Modules field. Backing API: flowlane.api.masters.get_industry_vertical_defaults.
import { createResource } from 'frappe-ui'

export const industryVerticalDefaults = createResource({
  url: 'flowlane.api.masters.get_industry_vertical_defaults',
  cache: 'flowlane-industry-vertical-defaults',
  auto: true,
})

// Module names for one vertical, safe before the fetch resolves (returns []).
export function defaultModulesFor(vertical) {
  return (industryVerticalDefaults.data && industryVerticalDefaults.data[vertical]) || []
}
