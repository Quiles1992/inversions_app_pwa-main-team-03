import express from "express";
import { signalDetailsRouter } from "./routes/signals/details.js";
import { signalEvaluateRouter } from "./routes/signals/evaluate.js";

const app = express();
app.use(express.json());

app.use("/api/signals", signalEvaluateRouter);
app.use("/api/signals", signalDetailsRouter);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Backend escuchando en puerto ${port}`);
});
