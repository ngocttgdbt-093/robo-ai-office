# Deployment and acceptance roadmap

## Stage 1 — Repository foundation
- [x] Create a private, separate repository.
- [x] Create an isolated setup branch.
- [ ] Open and review the initial pull request.
- [ ] Verify GitHub Actions run succeeds.
- [ ] Merge only after explicit approval.

## Stage 2 — Cloud coding runtime
- [ ] Select and connect a supported cloud coding agent.
- [ ] Install official obra/superpowers into that runtime, using its version-specific instructions.
- [ ] Verify skills activate in a live agent session.
- [ ] Configure least-privilege GitHub access, quotas, and secrets.
- [ ] Run a small test-driven change on an isolated test repository.

## Stage 3 — Integration
- [ ] Test on PROJECT 05/CORE with an approved, limited-scope task.
- [ ] Collect test results, preview URL and human acceptance.
- [ ] Design agent orchestration and 3D office status API.
- [ ] Enable scheduled/continuous agents only when a persistent cloud runtime is explicitly configured.

Do not treat GitHub Actions as an always-on server.
