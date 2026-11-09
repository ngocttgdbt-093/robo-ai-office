# Task status normalization

Approved by the user on 2026-11-09.

Build a pure JavaScript function normalizeTaskStatus(value), using node:test without dependencies. Trim outer whitespace, lowercase, and return queued, running, completed, or failed. Reject all other strings with RangeError and non-string values with TypeError. Do not coerce objects or add status aliases.

Approaches: strict literal validation would reject common formatting differences; trim plus lowercase was selected and approved. No UI, persistence, workflow changes, merge, or deployment. Work only in robo-ai-office on feat/task-status-normalization from setup/agent-foundation.
