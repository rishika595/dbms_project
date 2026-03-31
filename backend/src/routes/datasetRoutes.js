const express = require("express");
const datasetController = require("../controllers/datasetController");
const feedbackController = require("../controllers/feedbackController");
const uploadController = require("../controllers/uploadController");
const { authMiddleware } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.get("/", datasetController.listDatasets);
router.post("/upload", authMiddleware, upload.single("file"), uploadController.uploadDataset);
router.get("/:datasetId", datasetController.getDatasetById);
router.get("/:datasetId/feedback", datasetController.listFeedback);
router.post("/:datasetId/feedback", authMiddleware, feedbackController.upsertFeedback);

module.exports = router;
