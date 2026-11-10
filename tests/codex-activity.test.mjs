import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyCodexEvent } from '../scripts/codex-activity.mjs';

test('reports a failed test and retry without treating either as the turn outcome', () => {
  const command = (type, exit_code) => ({
    type, item: { type: 'command_execution', command: 'npm test', exit_code },
  });
  assert.deepEqual(classifyCodexEvent({type: 'turn.started'}), ['planning', 'running', 'started']);
  assert.deepEqual(classifyCodexEvent(command('item.started')), ['verification', 'running', 'test_running']);
  assert.deepEqual(classifyCodexEvent(command('item.completed', 1)), ['verification', 'running', 'test_failed']);
  assert.deepEqual(classifyCodexEvent(command('item.completed', 0)), ['verification', 'running', 'test_passed']);
  assert.deepEqual(classifyCodexEvent({type: 'turn.completed'}), [null, 'completed', 'completed']);
});

test('ignores conversation content and identifies a real edit and turn failure', () => {
  assert.equal(classifyCodexEvent({type:'item.completed',item:{type:'agent_message',text:'private text'}}), null);
  assert.deepEqual(classifyCodexEvent({type:'item.completed',item:{type:'file_change',status:'completed'}}), ['implementation', 'running', 'edited']);
  assert.deepEqual(classifyCodexEvent({type:'turn.failed'}), [null, 'failed', 'failed']);
});
