const asyncHandler = require("../utils/asyncHandler");
const datasetService = require("../services/datasetService");

const uploadDataset = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !req.file) {
    return res.status(400).json({ message: "Title and CSV file are required" });
  }

  const result = await datasetService.createDatasetUpload({
    userId: req.user.id,
    title,
    description,
    file: req.file
  });

  res.status(201).json(result);
});

module.exports = {
  uploadDataset
};
