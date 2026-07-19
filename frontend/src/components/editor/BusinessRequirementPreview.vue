<script setup>
// Business Requirement PREVIEW (BACKLOG 2.5 — reserve + mock only, NOT the
// real feature). Shows the shape of the future BRD/FRD capability from the
// original PRD's Requirement doctype spec — Business Description (WHAT/WHY),
// Functional Description (HOW in ERPNext), Type, Priority, and a linked
// process step — as hardcoded sample cards. No backend call, no DocType, no
// persistence: every field below is static content.
//
// Visual treatment mirrors apps/draw's NewDiagramDialog.vue "Coming soon"
// section (dimmed cards, a small uppercase pill, cursor-not-allowed) so this
// reads as unmistakably not-live, same spirit as that app's disabled
// diagram-type options — but keeps sample text at full legibility, since the
// point of a preview is that stakeholders can actually read the sample
// content, not just see that a feature exists. Sample content is grounded in
// this app's own Quote-to-Cash demo steps (Receive Enquiry / Approve
// Discount? / Raise Sales Order), not lorem ipsum. Real implementation is a
// separate, future initiative (see BACKLOG decisions log, 2026-07-19) — do
// not build any part of it here.
import { FeatherIcon } from 'frappe-ui'
import StatusChip from '@/components/StatusChip.vue'
import { severityChip } from '@/ui/chipColors.js'

// Priority reuses the same High/Medium/Low chip vocabulary as pain-point
// severity (chipColors.js) — both are 3-level urgency scales sharing one
// color meaning. Type has no chip mapping in this app (yet), so it renders
// as plain text rather than inventing a new color for a mock.
const SAMPLES = [
  {
    title: 'Discount approval routing',
    type: 'Functional',
    priority: 'High',
    linkedStep: 'S3 · Approve Discount?',
    what: 'Sales Managers approve discounts over email today with no audit trail, so a discount decision can’t be traced back to an approver or a timestamp.',
    how: 'Add an ERPNext Workflow on the Quotation with an Approval state gated by a discount-percent condition, routed to the Sales Manager role — approvals then log on the document timeline automatically.',
  },
  {
    title: 'Quotation-to-Sales-Order continuity',
    type: 'Functional',
    priority: 'Medium',
    linkedStep: 'S6 · Raise Sales Order',
    what: 'Sales Executives re-key quotation line items into the Sales Order by hand between Send Quotation and Raise Sales Order, risking transcription errors.',
    how: 'Use ERPNext’s native “Create > Sales Order” action on a submitted Quotation so item, rate and customer data carry over without re-entry.',
  },
  {
    title: 'Enquiry response-time visibility',
    type: 'Non-Functional',
    priority: 'Low',
    linkedStep: 'S1 · Receive Enquiry',
    what: 'Leadership has no visibility into how quickly enquiries turn into quotations, though customers expect a response inside an agreed SLA.',
    how: 'Add a lead-time chart comparing Opportunity creation to Quotation submission using timestamps ERPNext already stores — no new fields needed.',
  },
]
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-start gap-2.5 rounded-lg border border-dashed border-outline-gray-2 bg-surface-gray-1 px-3.5 py-3">
      <FeatherIcon name="eye" class="mt-0.5 h-4 w-4 shrink-0 text-ink-gray-5" />
      <div class="min-w-0">
        <p class="text-sm font-medium text-ink-gray-8">Preview — Business Requirement capture isn't built yet</p>
        <p class="mt-0.5 text-xs leading-relaxed text-ink-gray-5">
          This shows the shape of the planned BRD/FRD feature: one requirement per process step, with its
          business case (WHAT/WHY) and its ERPNext design (HOW). The cards below are sample content, not
          real data — nothing here saves, loads, or is backed by a database table.
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div
        v-for="sample in SAMPLES"
        :key="sample.title"
        class="relative flex cursor-not-allowed flex-col gap-2.5 rounded-lg border border-outline-gray-2 bg-surface-white p-3.5"
        aria-disabled="true"
      >
        <span class="absolute right-2.5 top-2.5 rounded-full bg-surface-gray-3 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-ink-gray-6">
          Preview
        </span>
        <div class="pr-16">
          <p class="text-xs text-ink-gray-5">{{ sample.type }} · {{ sample.linkedStep }}</p>
          <h4 class="text-sm font-semibold text-ink-gray-9">{{ sample.title }}</h4>
        </div>
        <StatusChip class="w-fit" :label="`${sample.priority} priority`" :classes="severityChip(sample.priority).classes" />
        <div>
          <p class="text-[11px] font-medium uppercase tracking-wide text-ink-gray-4">Business Description (WHAT/WHY)</p>
          <p class="text-xs leading-relaxed text-ink-gray-7">{{ sample.what }}</p>
        </div>
        <div>
          <p class="text-[11px] font-medium uppercase tracking-wide text-ink-gray-4">Functional Description (HOW in ERPNext)</p>
          <p class="text-xs leading-relaxed text-ink-gray-7">{{ sample.how }}</p>
        </div>
      </div>
    </div>

    <button
      type="button"
      class="flex w-fit cursor-not-allowed items-center gap-1.5 rounded border border-outline-gray-2 px-2.5 py-1.5 text-xs font-medium text-ink-gray-4"
      title="Coming soon — not built yet"
      disabled
    >
      <FeatherIcon name="plus" class="h-3.5 w-3.5" />
      New Requirement
    </button>
  </div>
</template>
