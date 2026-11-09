import test from 'node:test';
import assert from 'node:assert/strict';
import {getGitHubStatus, createGitHubStatusCache} from '../src/github-status.js';

const mockFetch = async url => ({
 ok: true,
 json: async () => url.includes('/actions/runs')
  ? {workflow_runs:[{id:77,name:'CI',status:'completed',conclusion:'success',html_url:'https://github.com/example/actions/runs/77',created_at:'2026-11-10',updated_at:'2026-11-10'}]}
  : [{number:4,title:'Bridge pilot',draft:true,html_url:'https://github.com/example/pull/4',updated_at:'2026-11-10'}]
});
test('public GitHub snapshot does not imply live Agent', async()=>{
 const data=await getGitHubStatus(mockFetch);
 assert.equal(data.agentRuntimeConnected,false);
 assert.equal(data.workflowRuns[0].status,'completed');
 assert.equal(data.pullRequests[0].draft,true);
 assert.equal(data.source,'public-github-api');
});
test('GitHub status cache avoids duplicate polling', async()=>{
 let count=0;
 const status=createGitHubStatusCache(async url=>{count++;return mockFetch(url)},60_000);
 const [a,b]=await Promise.all([status(),status()]);
 assert.equal(count,2);
 assert.equal(a.observedAt,b.observedAt);
 await status();
 assert.equal(count,2);
});
test('failure to fetch initial status propagates', async()=>{
 await assert.rejects(getGitHubStatus(async()=>({ok:false})), /unavailable/);
});
