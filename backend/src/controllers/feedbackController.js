const asyncHandler = require("../utils/asyncHandler");
const datasetService = require("../services/datasetService");

const upsertFeedback = asyncHandler(async (req, res) => {
  const rawDatasetId = req.params.datasetId;
  const { rating, comment } = req.body;

  if (!Number.isInteger(Number(rawDatasetId))) {
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
    datasetId: Number(rawDatasetId),
    userId: req.user.id,
    rating,
    comment
  });

  res.json(result);
});

module.exports = {
  upsertFeedback
};
