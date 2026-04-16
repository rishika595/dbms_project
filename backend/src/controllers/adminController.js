const asyncHandler = require("../utils/asyncHandler");
const adminService = require("../services/adminService");

const getPendingDatasets = asyncHandler(async (req, res) => {
  const page = Number.parseInt(req.query.page, 10);
  const limit = Number.parseInt(req.query.limit, 10);

  const datasets = await adminService.getPendingDatasets({
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: Number.isInteger(limit) && limit > 0 ? limit : 10
  });

  res.json({
    success: true,
    data: datasets
  });
});

const reviewDataset = asyncHandler(async (req, res) => {
  const datasetId = req.params.datasetId;
  const { action, notes } = req.body;

  if (!Number.isInteger(Number(datasetId))) {
    return res.status(400).json({
      success: false,
      message: "Invalid dataset id"
    });
  }

  if (!["approve", "reject", "flag"].includes(action)) {
    return res.status(400).json({
      success: false,
      message: "Invalid review action"
    });
  }

  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    return res.status(400).json({
      success: false,
      message: "Review notes must be a string"
    });
  }

  const result = await adminService.reviewDataset(Number(datasetId), {
    action,
    notes
  });

  res.json(result);
});

module.exports = {
  getPendingDatasets,
  reviewDataset
};
