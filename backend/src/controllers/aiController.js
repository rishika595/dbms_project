const fs = require("fs/promises");
const path = require("path");
const asyncHandler = require("../utils/asyncHandler");
const datasetService = require("../services/datasetService");
const { readCsvAnalysis } = require("../services/csvService");
const { suggestMetadataWithAi } = require("../services/aiService");

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

  const absolutePath = datasetService.resolveDatasetFilePath(filePath);

  console.log("AI metadata requested", {
    datasetId,
    versionId,
    storedFilePath: filePath,
    resolvedFilePath: absolutePath
  });

  try {
    await fs.access(absolutePath);
  } catch (error) {
    return res.status(404).json({
      success: false,
      message: "Dataset file not found"
    });
  }

  const csvAnalysis = await readCsvAnalysis(absolutePath);
  const aiSuggestion = await suggestMetadataWithAi({
    dataset,
    csvAnalysis
  });

  res.json(aiSuggestion);
});

module.exports = {
  suggestMetadata
};
