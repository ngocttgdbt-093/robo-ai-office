import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEvent, normalizeGitHubWorkflow } from '../src/status.js';
import { createBridge } from '../src/server.js';
const token='integration-test-token-long-enough';
const event={project:'robo-ai-office',agent:'coding-agent',state:'running',task:'test change',source:'openmausbot'};
test('validates state and mandatory fields',()=>{
 assert.equal(normalizeEvent(event,'2026-01-01T00:00:00Z').state,'running');
 assert.throws(()=>normalizeEvent({...event,state:'succeeded'}));
 assert.throws(()=>normalizeEvent({...event,project:''}));
});
test('normalizes GitHub workflow events',()=>{
 const out=normalizeGitHubWorkflow({repository:{full_name:'org/repo'},workflow_run:{status:'completed',conclusion:'success',id:42,name:'CI'}});
 assert.equal(out.state,'completed'); assert.equal(out.runId,'42');
});
test('rejects unauthorized requests and accepts status events',async()=>{
 const server=createBridge({token}); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
  const base=`http://127.0.0.1:${server.address().port}`;
  let res=await fetch(`${base}/office`); assert.equal(res.status,200); assert.match(await res.text(),/ROBO AI OFFICE/);
  res=await fetch(`${base}/health?utm_source=chatgpt.com`); assert.equal(res.status,200);
  assert.deepEqual(await res.json(), {ok:true,service:'robo-status-bridge'});
  res=await fetch(`${base}/api/status?test=1`); assert.equal(res.status,401);
  res=await fetch(`${base}/api/events`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(event)});
  assert.equal(res.status,202);
  res=await fetch(`${base}/api/status`,{headers:{Authorization:`Bearer ${token}`}});
  assert.equal((await res.json()).agents[0].state,'running');
  res=await fetch(`${base}/api/events`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify({...event,state:'invalid'})}); assert.equal(res.status,400);
 } finally {await new Promise(resolve=>server.close(resolve));}
});
