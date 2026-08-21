const API = "https://api.github.com";

function repoParts() {
  const full = process.env.QPS_GITHUB_REPOSITORY || "Tonnyvanleest/quepasacosta";
  const [owner, repo] = full.split("/");
  if (!owner || !repo) throw new Error("QPS_GITHUB_REPOSITORY must be owner/repo");
  return { owner, repo, full };
}

async function gh(path, { accept = "application/vnd.github+json" } = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not configured");

  const response = await fetch(`${API}${path}`, {
    headers: {
      Accept: accept,
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "quepasacosta-engineering-agent"
    },
    redirect: "follow"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub ${response.status}: ${body.slice(0, 500)}`);
  }

  const type = response.headers.get("content-type") || "";
  if (type.includes("json")) return response.json();
  return response.text();
}

function compactRun(run) {
  return {
    id: run.id,
    name: run.name,
    event: run.event,
    status: run.status,
    conclusion: run.conclusion,
    branch: run.head_branch,
    headSha: run.head_sha,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    htmlUrl: run.html_url
  };
}

function firstFailureLine(logText) {
  if (!logText) return null;
  const lines = logText.split(/\r?\n/);
  const patterns = [
    /(^|\s)(error|fatal|failed|failure|exception|enoent|eacces|unauthorized|forbidden|not found)(:|\s)/i,
    /Process completed with exit code [1-9]/i,
    /npm ERR!/i
  ];

  for (const line of lines) {
    const cleaned = line.replace(/^\d{4}-\d{2}-\d{2}T[^ ]+\s*/, "").trim();
    if (cleaned && patterns.some((p) => p.test(cleaned))) return cleaned.slice(0, 1000);
  }
  return null;
}

export async function getQpsStatus() {
  const { owner, repo, full } = repoParts();
  const [repoInfo, branch, workflows, runs] = await Promise.all([
    gh(`/repos/${owner}/${repo}`),
    gh(`/repos/${owner}/${repo}/branches/main`),
    gh(`/repos/${owner}/${repo}/actions/workflows?per_page=100`),
    gh(`/repos/${owner}/${repo}/actions/runs?per_page=10`)
  ]);

  const recentRuns = (runs.workflow_runs || []).map(compactRun);
  const failures = recentRuns.filter((run) => run.conclusion === "failure");

  return {
    repository: full,
    defaultBranch: repoInfo.default_branch,
    headSha: branch.commit?.sha || null,
    workflowCount: workflows.total_count ?? workflows.workflows?.length ?? 0,
    recentRuns,
    recentFailureCount: failures.length,
    overall: failures.length ? "DEGRADED" : "OK",
    checkedAt: new Date().toISOString()
  };
}

export async function getQpsRecentFailures(limit = 10) {
  const { owner, repo, full } = repoParts();
  const runs = await gh(`/repos/${owner}/${repo}/actions/runs?status=failure&per_page=${Math.min(Math.max(limit, 1), 20)}`);
  const failures = [];

  for (const run of runs.workflow_runs || []) {
    const jobsResponse = await gh(`/repos/${owner}/${repo}/actions/runs/${run.id}/jobs?filter=latest&per_page=100`);
    const failedJobs = (jobsResponse.jobs || []).filter((job) => job.conclusion === "failure");
    const jobs = [];

    for (const job of failedJobs) {
      const failedSteps = (job.steps || []).filter((step) => step.conclusion === "failure");
      let firstError = null;
      try {
        const logs = await gh(`/repos/${owner}/${repo}/actions/jobs/${job.id}/logs`, { accept: "text/plain" });
        firstError = firstFailureLine(logs);
      } catch (error) {
        firstError = `Log unavailable: ${error.message}`;
      }

      jobs.push({
        id: job.id,
        name: job.name,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        htmlUrl: job.html_url,
        failedSteps: failedSteps.map((step) => ({ number: step.number, name: step.name })),
        firstError
      });
    }

    failures.push({ ...compactRun(run), jobs });
  }

  return {
    repository: full,
    count: failures.length,
    failures,
    checkedAt: new Date().toISOString()
  };
}
