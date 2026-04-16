const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const datasetRoutes = require("./routes/datasetRoutes");
const versionRoutes = require("./routes/versionRoutes");
const aiRoutes = require("./routes/aiRoutes");
const adminRoutes = require("./routes/adminRoutes");
const tagRoutes = require("./routes/tagRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRoutes);
app.use("/datasets", datasetRoutes);
app.use("/versions", versionRoutes);
app.use("/ai", aiRoutes);
app.use("/admin", adminRoutes);
app.use("/tags", tagRoutes);

app.use(errorMiddleware);

module.exports = app;
