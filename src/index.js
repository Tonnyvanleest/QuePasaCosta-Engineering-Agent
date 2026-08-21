import express from "express";
import { getQpsRecentFailures, getQpsStatus } from "./github.js";

const app = express();
const port = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    service: "QuePasaCosta Engineering Agent",
    version: "0.2.0",
    status: "online",
    capabilities: ["get_qps_status", "get_qps_recent_failures"]
  });
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "quepasacosta-engineering-agent",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/qps/status", async (_req, res) => {
  try {
    res.json({ ok: true, data: await getQpsStatus() });
  } catch (error) {
    console.error("get_qps_status failed", error);
    res.status(502).json({ ok: false, capability: "get_qps_status", error: error.message });
  }
});

app.get("/api/qps/failures", async (req, res) => {
  try {
    const requested = Number.parseInt(String(req.query.limit || "10"), 10);
    const limit = Number.isFinite(requested) ? requested : 10;
    res.json({ ok: true, data: await getQpsRecentFailures(limit) });
  } catch (error) {
    console.error("get_qps_recent_failures failed", error);
    res.status(502).json({ ok: false, capability: "get_qps_recent_failures", error: error.message });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`QuePasaCosta Engineering Agent listening on port ${port}`);
});
