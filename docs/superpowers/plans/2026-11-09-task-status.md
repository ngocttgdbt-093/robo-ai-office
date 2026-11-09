# Task Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Implement the approved status normalization contract with demonstrated RED/GREEN.
**Architecture:** Pure named export in src/task-status.mjs. Native node:test suite in tests/task-status.test.mjs.
**Tech Stack:** JavaScript ES modules, Node.js, no dependencies.
**Spec:** docs/superpowers/specs/2026-11-09-task-status-design.md

## Global Constraints
Only robo-ai-office; isolated feature branch; no main edits, merge, deploy, or external repository access.

## Review Focus
- Whitespace-only and empty strings must fail.
- Inherited object property names must fail.
- Objects and boxed strings must not be coerced.
- Mixed case and surrounding tabs/newlines must normalize.
- Unknown aliases must fail rather than default.

### Task 1: Normalize task status
Files: src/task-status.mjs; tests/task-status.test.mjs.
Interface: normalizeTaskStatus(value: unknown) -> queued | running | completed | failed; throws TypeError or RangeError.
- [x] Write literal fixtures for four canonical statuses, four formatted variants, invalid strings and non-string values.
- [x] Run node --test with only an empty exported function; expect assertion failures from missing behavior (RED).
- [x] Implement type guard, trim/lowercase, allowlist validation and return (GREEN).
- [x] Run node --test; expect zero failures. Review code and tests independently, then run final tests and git diff --check.
- [x] Document evidence and leave changes on the feature branch, without push or merge.
