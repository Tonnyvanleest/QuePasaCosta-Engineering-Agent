# QuePasaCosta Engineering Agent

Standalone engineering-agent runtime for QuePasaCosta.es.

This repository is deliberately separate from the production application repository `Tonnyvanleest/quepasacosta`. The agent may inspect and, through controlled jobs, operate on QPS, but its runtime, credentials, audit trail and release logic belong here.

## Phase 0: Railway bootstrap

The initial service intentionally does very little:

- `GET /` returns service identity and version.
- `GET /health` provides a Railway health endpoint.
- No QPS production changes are made.
- No autonomous write access is implemented yet.

## Railway

Create a Railway service from this GitHub repository. Railway should detect Node.js automatically and run `npm start`.

Recommended healthcheck path:

`/health`

Do not hard-code a port. Railway supplies `PORT` at runtime.

## Environment

Copy the names from `.env.example` into Railway Variables as capabilities are enabled. Never commit real secrets.

The OpenAI key should be dedicated to this engineering agent so usage, limits and revocation remain isolated from other projects.

## Planned capabilities

First read-only capabilities:

- `get_qps_status`
- `get_qps_recent_failures`
- `get_qps_jobs`
- `get_qps_release_status`

Later controlled write capabilities:

- `create_qps_job`
- `run_qps_job`

The agent should ultimately understand GitHub Actions, deployments, scheduled jobs, event discovery, cancellations/postponements, media processing, map data and NL/ES editorial output.

## Safety boundary

A green local process is not proof that QPS production is healthy. Release status must be based on the real downstream systems and production validation. The agent must report the first causal failure rather than merely repeating cascaded errors.
