const fs = require("fs/promises");
const path = require("path");
const asyncHandler = require("../utils/asyncHandler");
const datasetService = require("../services/datasetService");
const { parseCsvPreview } = require("../services/csvService");

const suggestMetadata = asyncHandler(async (req, res) => {
  const rawDatasetId = req.body.datasetId;

  if (rawDatasetId === undefined || rawDatasetId === null || rawDatasetId === "") {
    return res.status(400).json({
      success: false,
      message: "datasetId is required"
    });
  }

  if (!Number.isInteger(Number(rawDatasetId))) {
    return res.status(400).json({
      success: false,
      message: "Invalid dataset id"
    });
  }

  const datasetId = Number(rawDatasetId);

  const dataset = await datasetService.getDatasetById(datasetId);
  const versionId = dataset.metadata?.versionId;
  const filePath = dataset.metadata?.filePath;

  if (!versionId || !filePath) {
    return res.status(404).json({
      success: false,
      message: "Current dataset version file not found"
    });
  }

  const absolutePath = path.join(__dirname, "..", "..", filePath);

  try {
    await fs.access(absolutePath);
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: "Current dataset version file not found"
    });
  }

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
