const asyncHandler = require("../utils/asyncHandler");
const adminService = require("../services/adminService");

const listPendingDatasets = asyncHandler(async (_req, res) => {
  const datasets = await adminService.listPendingDatasets();
  res.json(datasets);
});

module.exports = {
  listPendingDatasets
};
