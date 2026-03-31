const asyncHandler = require("../utils/asyncHandler");
const datasetService = require("../services/datasetService");

const upsertFeedback = asyncHandler(async (req, res) => {
  const datasetId = Number(req.params.datasetId);
  const { rating, comment } = req.body;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
  }

  const result = await datasetService.upsertFeedback({
    datasetId,
    userId: req.user.id,
    rating,
    comment
  });

  res.json(result);
});

module.exports = {
  upsertFeedback
};
