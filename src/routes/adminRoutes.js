const express = require("express");
const adminController = require("../controllers/adminController");
const { requireAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/datasets/pending", requireAdmin, adminController.getPendingDatasets);
router.post("/datasets/:datasetId/review", requireAdmin, adminController.reviewDataset);

module.exports = router;
