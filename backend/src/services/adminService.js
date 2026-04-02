const db = require("../config/db");

const listPendingDatasets = async () => {
  const { rows } = await db.query(
    `
      SELECT
        dataset_id AS id,
        title,
        slug,
        short_description AS description,
        publication_status AS "publicationStatus",
        visibility_status AS "visibilityStatus",
        created_at AS "createdAt"
      FROM DATASET
      WHERE publication_status IN ('pending_review', 'flagged')
      ORDER BY created_at DESC, dataset_id DESC
    `
  );

  return rows;
};

module.exports = {
  listPendingDatasets
};
