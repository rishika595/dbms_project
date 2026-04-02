const express = require("express");
const adminController = require("../controllers/adminController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/datasets/pending", authMiddleware, requireAdmin, adminController.listPendingDatasets);

module.exports = router;
