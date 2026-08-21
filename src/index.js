import express from "express";

const app = express();
const port = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    service: "QuePasaCosta Engineering Agent",
    version: "0.1.0",
    status: "online"
  });
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "quepasacosta-engineering-agent",
    timestamp: new Date().toISOString()
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`QuePasaCosta Engineering Agent listening on port ${port}`);
});
