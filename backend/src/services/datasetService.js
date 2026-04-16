const path = require("path");
const db = require("../config/db");
const slugify = require("../utils/slugify");
const { parseCsvPreview } = require("./csvService");

const backendRoot = path.join(__dirname, "..", "..");
const uploadsRoot = path.join(backendRoot, "uploads");

const ensureRegisteredIndividual = async (userId, client = db) => {
  const { rowCount } = await client.query(
    "SELECT 1 FROM REGISTERED_INDIVIDUAL WHERE user_id = $1",
    [userId]
  );

  if (!rowCount) {
    const error = new Error("Only registered individuals can perform this action");
    error.statusCode = 403;
    throw error;
  }
};

const assertDatasetExists = async (datasetId, client = db) => {
  const { rowCount } = await client.query(
    "SELECT 1 FROM DATASET WHERE dataset_id = $1 LIMIT 1",
    [datasetId]
  );

  if (!rowCount) {
    const error = new Error("Dataset not found");
    error.statusCode = 404;
    throw error;
  }
};

const listDatasets = async ({ includeAll = false } = {}) => {
  const { rows } = await db.query(
    `
      SELECT
        dataset_id AS id,
        title,
        short_description AS description,
        publication_status AS "publication_status",
        current_avg_rating AS rating,
        current_credibility_score AS "credibilityScore"
      FROM DATASET
      ${includeAll ? "" : "WHERE publication_status = 'published'"}
      ORDER BY created_at DESC, dataset_id DESC
    `
  );

  return rows;
};

const getDatasetById = async (datasetId) => {
  const { rows } = await db.query(
    `
      SELECT
        d.dataset_id AS id,
        d.title,
        d.short_description AS description,
        d.current_avg_rating AS rating,
        d.current_credibility_score AS "credibilityScore",
        jsonb_build_object(
          'metadataId', dm.metadata_id,
          'versionId', dv.version_id,
          'versionNumber', dv.version_number,
          'numRows', dm.num_rows,
          'numColumns', dm.num_columns,
          'encoding', dm.encoding,
          'delimiter', dm.delimiter,
          'missingValuesPercent', dm.missing_values_percent,
          'columnInfo', dm.column_info_json,
          'language', dm.language,
          'updateFrequency', dm.update_frequency,
          'sourceOrigin', dm.source_origin,
          'filePath', dv.file_path,
          'fileSize', dv.file_size,
          'fileFormat', dv.file_format
        ) AS metadata
      FROM DATASET d
      LEFT JOIN DATASET_VERSION dv
        ON dv.dataset_id = d.dataset_id
       AND dv.is_current = TRUE
      LEFT JOIN DATASET_METADATA dm
        ON dm.version_id = dv.version_id
      WHERE d.dataset_id = $1
      LIMIT 1
    `,
    [datasetId]
  );

  const dataset = rows[0];

  if (!dataset) {
    const error = new Error("Dataset not found");
    error.statusCode = 404;
    throw error;
  }

  return dataset;
};

const listFeedbackByDatasetId = async (datasetId) => {
  await assertDatasetExists(datasetId);

  const { rows } = await db.query(
    `
      SELECT
        f.feedback_id AS id,
        f.rating_value AS rating,
        f.review_text AS comment,
        COALESCE(ri.display_name, u.username) AS author,
        f.created_at AS "createdAt"
      FROM FEEDBACK f
      JOIN "USER" u ON u.user_id = f.user_id
      LEFT JOIN REGISTERED_INDIVIDUAL ri ON ri.user_id = f.user_id
      WHERE f.dataset_id = $1
      ORDER BY f.created_at DESC, f.feedback_id DESC
    `,
    [datasetId]
  );

  return rows;
};

const upsertFeedback = async ({ datasetId, userId, rating, comment }) => {
  await assertDatasetExists(datasetId);
  await ensureRegisteredIndividual(userId);

  await db.query(
    `
      INSERT INTO FEEDBACK (dataset_id, user_id, rating_value, review_text)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (dataset_id, user_id)
      DO UPDATE
      SET
        rating_value = EXCLUDED.rating_value,
        review_text = EXCLUDED.review_text
    `,
    [datasetId, userId, rating, comment || null]
  );

  return { success: true };
};

const createUniqueSlug = async (title, client) => {
  const baseSlug = slugify(title) || "dataset";
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const { rowCount } = await client.query(
      "SELECT 1 FROM DATASET WHERE slug = $1 LIMIT 1",
      [slug]
    );

    if (!rowCount) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

const createDatasetUpload = async ({ userId, title, description, file }) => {
  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");
    await ensureRegisteredIndividual(userId, client);

    const csvInfo = await parseCsvPreview(file.path);
    const slug = await createUniqueSlug(title, client);

    const datasetResult = await client.query(
      `
        INSERT INTO DATASET (
          title,
          slug,
          short_description,
          owner_user_id,
          publication_status
        )
        VALUES ($1, $2, $3, $4, 'pending_review')
        RETURNING dataset_id
      `,
      [title, slug, description || null, userId]
    );

    const datasetId = datasetResult.rows[0].dataset_id;
    const relativeFilePath = path.relative(backendRoot, file.path).replace(/\\/g, "/");

    const versionResult = await client.query(
      `
        INSERT INTO DATASET_VERSION (
          dataset_id,
          version_number,
          is_current,
          file_path,
          file_size,
          file_format
        )
        VALUES ($1, '1.0.0', TRUE, $2, $3, $4)
        RETURNING version_id
      `,
      [datasetId, relativeFilePath, file.size, file.mimetype || "text/csv"]
    );

    const versionId = versionResult.rows[0].version_id;

    await client.query(
      `
        INSERT INTO DATASET_METADATA (
          version_id,
          num_rows,
          num_columns,
          delimiter,
          column_info_json
        )
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        versionId,
        csvInfo.rows,
        csvInfo.columns,
        csvInfo.delimiter,
        JSON.stringify({ headers: csvInfo.headers })
      ]
    );

    await client.query("COMMIT");

    console.log("Dataset upload saved", {
      datasetId,
      versionId,
      uploadPath: file.path,
      storedFilePath: relativeFilePath
    });

    return {
      success: true,
      datasetId,
      versionId
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const resolveDatasetFilePath = (storedFilePath) => {
  if (!storedFilePath) {
    return null;
  }

  if (path.isAbsolute(storedFilePath)) {
    return storedFilePath;
  }

  return path.resolve(backendRoot, storedFilePath);
};

const getVersionFileById = async (versionId) => {
  const { rows } = await db.query(
    `
      SELECT
        version_id,
        dataset_id,
        version_number,
        file_path,
        file_format
      FROM DATASET_VERSION
      WHERE version_id = $1
      LIMIT 1
    `,
    [versionId]
  );

  const version = rows[0];

  if (!version || !version.file_path) {
    const error = new Error("Version file not found");
    error.statusCode = 404;
    throw error;
  }

  return version;
};

const logDownload = async ({ datasetId, versionId, userId }) => {
  await db.query(
    `
      INSERT INTO DOWNLOAD_LOG (dataset_id, version_id, user_id)
      VALUES ($1, $2, $3)
    `,
    [datasetId, versionId, userId || null]
  );
};

const deleteDatasetById = async (datasetId) => {
  const result = await db.query(
    `
      DELETE FROM DATASET
      WHERE dataset_id = $1
    `,
    [datasetId]
  );

  if (!result.rowCount) {
    const error = new Error("Dataset not found");
    error.statusCode = 404;
    throw error;
  }
};

module.exports = {
  listDatasets,
  getDatasetById,
  listFeedbackByDatasetId,
  upsertFeedback,
  createDatasetUpload,
  deleteDatasetById,
  resolveDatasetFilePath,
  getVersionFileById,
  logDownload
};
