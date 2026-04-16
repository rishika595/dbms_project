const db = require("../config/db");

const getPendingDatasets = async ({ page = 1, limit = 10 } = {}) => {
  const offset = (page - 1) * limit;

  const { rows } = await db.query(
    `
      SELECT
        dataset_id AS id,
        title,
        short_description AS description,
        publication_status,
        current_avg_rating AS rating,
        current_credibility_score AS "credibilityScore"
      FROM DATASET
      WHERE publication_status IN ('pending_review', 'flagged')
      ORDER BY created_at DESC, dataset_id DESC
      LIMIT $1
      OFFSET $2
    `,
    [limit, offset]
  );

  return rows;
};

const reviewDataset = async (datasetId, { action, notes }) => {
  const statusMap = {
    approve: "published",
    reject: "rejected",
    flag: "flagged"
  };

  const messageMap = {
    approve: "Dataset approved",
    reject: "Dataset rejected",
    flag: "Dataset flagged"
  };

  const result = await db.query(
    `
      UPDATE DATASET
      SET
        publication_status = $2,
        review_notes = $3
      WHERE dataset_id = $1
    `,
    [
      datasetId,
      statusMap[action],
      action === "approve" ? null : notes || null
    ]
  );

  if (!result.rowCount) {
    const error = new Error("Dataset not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    success: true,
    message: messageMap[action]
  };
};

module.exports = {
  getPendingDatasets,
  reviewDataset
};
