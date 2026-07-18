// Compact "time ago" formatter for dense list/card content (UI-REVAMP D2 —
// "Meridian Foods · Manufacturing · Active · 3 processes · edited 2d ago").
// Pure, no Date.now() default trap: `now` is a parameter so tests don't need
// to mock the clock.
const UNITS = [
  { label: 'y', seconds: 365 * 24 * 60 * 60 },
  { label: 'mo', seconds: 30 * 24 * 60 * 60 },
  { label: 'w', seconds: 7 * 24 * 60 * 60 },
  { label: 'd', seconds: 24 * 60 * 60 },
  { label: 'h', seconds: 60 * 60 },
  { label: 'm', seconds: 60 },
]

export function relativeTime(dateInput, now = new Date()) {
  if (!dateInput) return ''
  const then = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(then.getTime())) return ''

  const diffSeconds = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000))
  if (diffSeconds < 60) return 'just now'

  const unit = UNITS.find((u) => diffSeconds >= u.seconds)
  const count = Math.floor(diffSeconds / unit.seconds)
  return `${count}${unit.label} ago`
}
