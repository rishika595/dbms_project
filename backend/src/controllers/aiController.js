const path = require("path");
const asyncHandler = require("../utils/asyncHandler");
const datasetService = require("../services/datasetService");
const { parseCsvPreview } = require("../services/csvService");

const suggestMetadata = asyncHandler(async (req, res) => {
  const datasetId = Number(req.body.datasetId);

  if (!datasetId) {
    return res.status(400).json({ message: "datasetId is required" });
  }

  const dataset = await datasetService.getDatasetById(datasetId);
  const versionId = dataset.metadata?.versionId;
  const filePath = dataset.metadata?.filePath;

  if (!versionId || !filePath) {
    return res.status(404).json({ message: "Current dataset version file not found" });
  }

  const absolutePath = path.join(__dirname, "..", "..", filePath);
  const csvInfo = await parseCsvPreview(absolutePath);

  res.json({
    suggestedModality: "tabular",
    suggestedTaskType: "classification",
    numRows: csvInfo.rows,
    numColumns: csvInfo.columns,
    summary: "Basic dataset analysis"
  });
});

module.exports = {
  suggestMetadata
};
