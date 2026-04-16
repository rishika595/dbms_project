const express = require("express");
const tagController = require("../controllers/tagController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", tagController.listTags);
router.post("/", authMiddleware, tagController.createTag);

module.exports = router;
