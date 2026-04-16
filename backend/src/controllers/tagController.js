const asyncHandler = require("../utils/asyncHandler");
const tagService = require("../services/tagService");

const listTags = asyncHandler(async (_req, res) => {
  const tags = await tagService.getAllTags();

  res.json({
    success: true,
    data: tags
  });
});

const createTag = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Tag name is required"
    });
  }

  const tag = await tagService.createTag(name);

  res.status(201).json({
    success: true,
    data: tag
  });
});

const attachTagsToDataset = asyncHandler(async (req, res) => {
  const datasetId = Number(req.params.datasetId);
  const tagNames = tagService.normalizeTagNames(req.body.tags);

  if (!Number.isInteger(datasetId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid dataset id"
    });
  }

  if (tagNames.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Tags must be a non-empty array of names"
    });
  }

  const tags = await tagService.attachTagsToDataset(datasetId, tagNames);

  res.json({
    success: true,
    data: {
      datasetId,
      tags
    }
  });
});

module.exports = {
  listTags,
  createTag,
  attachTagsToDataset
};
