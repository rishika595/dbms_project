const asyncHandler = require("../utils/asyncHandler");
const datasetService = require("../services/datasetService");
const tagService = require("../services/tagService");

const uploadDataset = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const tags = tagService.normalizeTagNames(req.body.tags);

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
    tags,
    file: req.file
  });

  console.log("Upload controller completed", {
    originalName: req.file.originalname,
    savedPath: req.file.path,
    datasetId: result.datasetId,
    versionId: result.versionId
  });

  res.status(201).json(result);
});

module.exports = {
  uploadDataset
};
