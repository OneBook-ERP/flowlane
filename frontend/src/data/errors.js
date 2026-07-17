// Extract a human-readable message from a frappe-ui `call` rejection. frappeRequest
// parses `_server_messages` into `error.messages` (an array of plain strings), so
// a frappe.throw guard (blocked delete, uniqueness) lands there first. We strip any
// HTML and return the first message so it reads cleanly in a toast.

export function serverMessage(error, fallback = 'Something went wrong.') {
  const messages = error?.messages
  if (Array.isArray(messages) && messages.length) return stripHtml(messages[0])
  if (error?.message) return stripHtml(error.message)
  return fallback
}

function stripHtml(value) {
  return String(value)
    .replace(/<[^>]*>/g, '')
    .trim()
}
