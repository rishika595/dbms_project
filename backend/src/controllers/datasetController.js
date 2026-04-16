const fs = require("fs/promises");
const asyncHandler = require("../utils/asyncHandler");
const datasetService = require("../services/datasetService");

const listDatasets = asyncHandler(async (req, res) => {
  const datasets = await datasetService.listDatasets({
    includeAll: req.user?.role === "admin",
    tag: req.query.tag
  });
  res.json(datasets);
});

const getDatasetById = asyncHandler(async (req, res) => {
  const datasetId = req.params.datasetId;

  if (!Number.isInteger(Number(datasetId))) {
    return res.status(400).json({
      success: false,
      message: "Invalid dataset id"
    });
  }

  const dataset = await datasetService.getDatasetById(Number(datasetId));

  if (!dataset) {
    return res.status(404).json({
      success: false,
      message: "Dataset not found"
    });
  }

  res.json(dataset);
});

const listFeedback = asyncHandler(async (req, res) => {
  const datasetId = req.params.datasetId;

  if (!Number.isInteger(Number(datasetId))) {
    return res.status(400).json({
      success: false,
      message: "Invalid dataset id"
    });
  }

  const feedback = await datasetService.listFeedbackByDatasetId(Number(datasetId));
  res.json(feedback);
});

const upsertFeedback = asyncHandler(async (req, res) => {
  const datasetId = req.params.datasetId;
  const { rating, comment } = req.body;

  if (!Number.isInteger(Number(datasetId))) {
    return res.status(400).json({
      success: false,
      message: "Invalid dataset id"
    });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: "Rating must be an integer between 1 and 5"
    });
  }

  if (comment !== undefined && comment !== null && typeof comment !== "string") {
    return res.status(400).json({
      success: false,
      message: "Comment must be a string"
    });
  }

  const result = await datasetService.upsertFeedback({
    datasetId: Number(datasetId),
    userId: req.user.id,
    rating,
    comment
  });

  res.json(result);
});

const uploadDataset = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !req.file) {
    return res.status(400).json({
      success: false,
      message: "Title and CSV file are required"
    });
  }

  if (description !== undefined && description !== null && typeof description !== "string") {
    return res.status(400).json({
      success: false,
      message: "Description must be a string"
    });
  }

  const result = await datasetService.createDatasetUpload({
    userId: req.user.id,
    title,
    description,
    file: req.file
  });

  res.status(201).json(result);
});

const deleteDataset = asyncHandler(async (req, res) => {
  const datasetId = req.params.datasetId;

  if (!Number.isInteger(Number(datasetId))) {
    return res.status(400).json({
      success: false,
      message: "Invalid dataset id"
    });
  }

  await datasetService.deleteDatasetById(Number(datasetId));

  res.json({
    success: true,
    message: "Dataset deleted"
  });
});

const downloadVersion = asyncHandler(async (req, res) => {
  const versionId = req.params.versionId;

  if (!Number.isInteger(Number(versionId))) {
    return res.status(400).json({
      success: false,
      message: "Invalid version id"
    });
  }

  const version = await datasetService.getVersionFileById(Number(versionId));
  const absolutePath = datasetService.resolveDatasetFilePath(version.file_path);

  console.log("Download requested", {
    versionId: version.version_id,
    datasetId: version.dataset_id,
    storedFilePath: version.file_path,
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

  try {
    await datasetService.logDownload({
      datasetId: version.dataset_id,
      versionId: version.version_id,
      userId: req.user?.id || null
    });
  } catch (error) {
    console.error("Download log failed", error.message);
  }

  return res.download(absolutePath);
});

module.exports = {
  listDatasets,
  getDatasetById,
  listFeedback,
  upsertFeedback,
  uploadDataset,
  deleteDataset,
  downloadVersion
};
