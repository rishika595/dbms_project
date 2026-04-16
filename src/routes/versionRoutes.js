const express = require("express");
const datasetController = require("../controllers/datasetController");
const { optionalAuthMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:versionId/download", optionalAuthMiddleware, datasetController.downloadVersion);

module.exports = router;
