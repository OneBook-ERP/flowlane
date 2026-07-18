# Copyright (c) 2026, Onebook and contributors
# For license information, please see license.txt
"""Node type constants shared by every per-module catalog file.

Each per-module file defines ``STEPS: dict[str, list[Step]]`` mapping a sub
process title to its ordered steps, transcribed from
flowlane-design/PROCESS-CATALOG.md §2. A step is a
``(key, name, lane, node_type, connections)`` tuple; ``connections`` is a
list of ``(to_key, label)`` pairs (``label`` is ``None`` for an unlabeled
flow, the list is empty for a step with no outgoing edge in this sub
process). Cross-sub-process "connects to" notes in the source doc (e.g.
"Yes→(Order Booking)") aren't representable here — ``to_step_key`` must
resolve within the same sub process template — so those branches are
transcribed with no local connection, matching how the doc's own "—"
(dash, no further step) rows are handled.
"""

START = "Start/End"
TASK = "Process/Task"
DECISION = "Decision"
IO = "Input/Output"
