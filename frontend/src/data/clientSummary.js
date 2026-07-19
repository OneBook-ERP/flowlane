// Client summary dashboard data (BACKLOG 2.1) — thin resource wrapper, same
// shape as data/tree.js's loadClientTree. Backing API: flowlane.api.summary.
// get_client_summary (cheap, bounded aggregation — see that module).

import { createResource } from 'frappe-ui'

export function loadClientSummary(client) {
  return createResource({
    url: 'flowlane.api.summary.get_client_summary',
    params: { client },
    auto: true,
  })
}
