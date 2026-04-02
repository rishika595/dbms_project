const fs = require("fs/promises");
const path = require("path");
const asyncHandler = require("../utils/asyncHandler");
const datasetService = require("../services/datasetService");
const { readCsvAnalysis } = require("../services/csvService");
const { suggestMetadataWithAi, buildFallbackResponse } = require("../services/aiService");

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
      aiStatus: "dataset_file_missing",
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
      aiStatus: "dataset_file_missing",
      message: "Dataset file not found"
    });
  }

  let csvAnalysis;

  try {
    csvAnalysis = await readCsvAnalysis(absolutePath);
  } catch (error) {
    console.error("CSV preview failed", {
      datasetId,
      resolvedFilePath: absolutePath,
      errorMessage: error.message
    });

    return res.json(
      buildFallbackResponse("csv_preview_failed", "Failed to read dataset preview")
    );
  }

  const aiSuggestion = await suggestMetadataWithAi({
    dataset,
    csvAnalysis
  });

  res.json(aiSuggestion);
});

module.exports = {
  suggestMetadata
};
