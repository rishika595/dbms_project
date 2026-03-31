const path = require("path");
const asyncHandler = require("../utils/asyncHandler");
const datasetService = require("../services/datasetService");

const listDatasets = asyncHandler(async (_req, res) => {
  const datasets = await datasetService.listDatasets();
  res.json(datasets);
});

const getDatasetById = asyncHandler(async (req, res) => {
  const dataset = await datasetService.getDatasetById(Number(req.params.datasetId));
  res.json(dataset);
});

const listFeedback = asyncHandler(async (req, res) => {
  const feedback = await datasetService.listFeedbackByDatasetId(Number(req.params.datasetId));
  res.json(feedback);
});

const upsertFeedback = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
  }

  const result = await datasetService.upsertFeedback({
    datasetId: Number(req.params.datasetId),
    userId: req.user.userId,
    rating,
    comment
  });

  res.json(result);
});

const uploadDataset = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !req.file) {
    return res.status(400).json({ message: "Title and CSV file are required" });
  }

  const result = await datasetService.createDatasetUpload({
    userId: req.user.userId,
    title,
    description,
    file: req.file
  });

  res.status(201).json(result);
});

const downloadVersion = asyncHandler(async (req, res) => {
  const version = await datasetService.getVersionFileById(Number(req.params.versionId));
  const absolutePath = path.join(__dirname, "..", "..", version.file_path);

  try {
    await datasetService.logDownload({
      datasetId: version.dataset_id,
      versionId: version.version_id,
      userId: req.user?.userId || null
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
  downloadVersion
};
