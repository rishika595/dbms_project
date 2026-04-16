const db = require("../config/db");

const normalizeTagNames = (input) => {
  if (input === undefined || input === null) {
    return [];
  }

  if (Array.isArray(input)) {
    return [...new Set(input
      .filter((value) => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean))];
  }

  if (typeof input === "string") {
    const trimmed = input.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return normalizeTagNames(parsed);
      }
    } catch (_error) {
      // Fall back to comma-separated parsing.
    }

    return normalizeTagNames(trimmed.split(","));
  }

  return [];
};

const getAllTags = async () => {
  const { rows } = await db.query(
    `
      SELECT
        id,
        name
      FROM TAG
      ORDER BY LOWER(name) ASC, id ASC
    `
  );

  return rows;
};

const createTag = async (name, client = db) => {
  const [normalizedName] = normalizeTagNames([name]);

  if (!normalizedName) {
    const error = new Error("Tag name is required");
    error.statusCode = 400;
    throw error;
  }

  const { rows } = await client.query(
    `
      INSERT INTO TAG (name)
      VALUES ($1)
      ON CONFLICT (name)
      DO UPDATE SET name = EXCLUDED.name
      RETURNING id, name
    `,
    [normalizedName]
  );

  return rows[0];
};

const ensureTagIds = async (tagNames, client = db) => {
  const normalizedNames = normalizeTagNames(tagNames);

  if (normalizedNames.length === 0) {
    return [];
  }

  const tagIds = [];

  for (const tagName of normalizedNames) {
    const tag = await createTag(tagName, client);
    tagIds.push(tag.id);
  }

  return tagIds;
};

const attachTagsToDataset = async (datasetId, tagNames, client = db) => {
  const normalizedNames = normalizeTagNames(tagNames);

  const { rowCount } = await client.query(
    "SELECT 1 FROM DATASET WHERE dataset_id = $1 LIMIT 1",
    [datasetId]
  );

  if (!rowCount) {
    const error = new Error("Dataset not found");
    error.statusCode = 404;
    throw error;
  }

  if (normalizedNames.length === 0) {
    return [];
  }

  const tagIds = await ensureTagIds(normalizedNames, client);

  for (const tagId of tagIds) {
    await client.query(
      `
        INSERT INTO DATASET_TAG (dataset_id, tag_id)
        VALUES ($1, $2)
        ON CONFLICT (dataset_id, tag_id)
        DO NOTHING
      `,
      [datasetId, tagId]
    );
  }

  return listDatasetTags(datasetId, client);
};

const listDatasetTags = async (datasetId, client = db) => {
  const { rows } = await client.query(
    `
      SELECT
        t.name
      FROM DATASET_TAG dt
      JOIN TAG t ON t.id = dt.tag_id
      WHERE dt.dataset_id = $1
      ORDER BY LOWER(t.name) ASC, t.id ASC
    `,
    [datasetId]
  );

  return rows.map((row) => row.name);
};

const addTagsToDatasets = async (datasets, client = db) => {
  if (!Array.isArray(datasets) || datasets.length === 0) {
    return datasets;
  }

  const datasetIds = datasets
    .map((dataset) => Number(dataset.id))
    .filter((datasetId) => Number.isInteger(datasetId));

  if (datasetIds.length === 0) {
    return datasets.map((dataset) => ({
      ...dataset,
      tags: []
    }));
  }

  const { rows } = await client.query(
    `
      SELECT
        dt.dataset_id,
        t.name
      FROM DATASET_TAG dt
      JOIN TAG t ON t.id = dt.tag_id
      WHERE dt.dataset_id = ANY($1::int[])
      ORDER BY LOWER(t.name) ASC, t.id ASC
    `,
    [datasetIds]
  );

  const tagsByDatasetId = new Map();

  for (const row of rows) {
    const key = Number(row.dataset_id);
    const existing = tagsByDatasetId.get(key) || [];
    existing.push(row.name);
    tagsByDatasetId.set(key, existing);
  }

  return datasets.map((dataset) => ({
    ...dataset,
    tags: tagsByDatasetId.get(Number(dataset.id)) || []
  }));
};

module.exports = {
  normalizeTagNames,
  getAllTags,
  createTag,
  attachTagsToDataset,
  listDatasetTags,
  addTagsToDatasets
};
