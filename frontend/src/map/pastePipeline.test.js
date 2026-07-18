// Integration of the Excel-paste data path (TC2.2): a pasted block becomes new
// Map Step rows and then the save_steps payload, without any Vue/network. Proves
// the parser -> row -> payload mapping the Table tab performs on paste.
import { describe, it, expect } from 'vitest'
import { parseClipboard } from './pasteParser.js'
import { blankStep, toSavePayload } from './steps.js'

const PASTE_FIELDS = ['step_id', 'step_name', 'lane_role', 'node_type', 'trigger_input', 'output_result']

describe('excel paste pipeline', () => {
  it('turns a 3x6 block into 3 payload rows with mapped columns + sequences', () => {
    const block = [
      'S1\tReceive Enquiry\tSales Executive\tStart/End\tEmail\tLead',
      'S2\tPrepare Quote\tSales Executive\tProcess/Task\tLead\tQuotation',
      'S3\tApprove Quote\tSales Manager\tDecision\tQuotation\tApproved',
    ].join('\n')

    const rows = parseClipboard(block, PASTE_FIELDS).map((values) => blankStep(values))
    const payload = toSavePayload(rows)

    expect(payload).toHaveLength(3)
    expect(payload.map((s) => s.sequence)).toEqual([1, 2, 3])
    expect(payload[0]).toMatchObject({
      step_id: 'S1',
      step_name: 'Receive Enquiry',
      lane_role: 'Sales Executive',
      node_type: 'Start/End',
      trigger_input: 'Email',
      output_result: 'Lead',
    })
    expect(payload[2].node_type).toBe('Decision')
    // untouched columns keep their blank defaults, ready for later edits
    expect(payload[1].business_rules).toBe('')
  })
})
