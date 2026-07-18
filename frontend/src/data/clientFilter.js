// Pure client-home search filter (UI-REVAMP D2 — "header row with count +
// search/filter"). No Vue, no network: matches client_name or industry_vertical
// case-insensitively. Kept separate from HomePage.vue so the matching rule is
// unit-tested without mounting a component.
export function filterClients(clients, query) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return clients
  return clients.filter((client) => {
    const haystack = `${client.client_name || ''} ${client.industry_vertical || ''}`.toLowerCase()
    return haystack.includes(q)
  })
}
