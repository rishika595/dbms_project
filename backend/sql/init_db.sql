-- ============================================================================
-- init_db.sql
-- Full initialisation script for the ML Dataset Platform database
-- Run order: schema → seed data → credibility score system → roles
--
-- Usage (local):
--   psql -U postgres -d postgres -f init_db.sql
--
-- Usage (Supabase / remote):
--   psql "postgresql://postgres:<password>@<host>:5432/postgres" -f init_db.sql
-- ============================================================================


-- ============================================================================
-- SECTION 0: CLEAN SLATE
-- ============================================================================

DROP TABLE IF EXISTS REPORT CASCADE;
DROP TABLE IF EXISTS DOWNLOAD_LOG CASCADE;
DROP TABLE IF EXISTS FEEDBACK CASCADE;
DROP TABLE IF EXISTS DATASET_TAG CASCADE;
DROP TABLE IF EXISTS TAG CASCADE;
DROP TABLE IF EXISTS DATASET_METADATA CASCADE;
DROP TABLE IF EXISTS DATASET_FILE CASCADE;
DROP TABLE IF EXISTS DATASET_VERSION CASCADE;
DROP TABLE IF EXISTS DATASET CASCADE;
DROP TABLE IF EXISTS ORGANIZATION_MEMBER CASCADE;
DROP TABLE IF EXISTS ADMIN CASCADE;
DROP TABLE IF EXISTS REGISTERED_INDIVIDUAL CASCADE;
DROP TABLE IF EXISTS ORGANIZATION CASCADE;
DROP TABLE IF EXISTS "USER" CASCADE;


-- ============================================================================
-- SECTION 1: ACTOR ENTITIES (User Hierarchy)
-- ============================================================================

CREATE TABLE "USER" (
    user_id         SERIAL PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login      TIMESTAMP,
    account_status  VARCHAR(20)  DEFAULT 'active'
                    CHECK (account_status IN ('active','suspended','deactivated','pending'))
);

CREATE TABLE REGISTERED_INDIVIDUAL (
    user_id             INTEGER PRIMARY KEY REFERENCES "USER"(user_id) ON DELETE CASCADE,
    display_name        VARCHAR(100),
    bio                 TEXT,
    reputation_score    DECIMAL(5,2) DEFAULT 0.00 CHECK (reputation_score >= 0),
    profile_image_url   VARCHAR(500),
    verification_status VARCHAR(20) DEFAULT 'unverified'
                        CHECK (verification_status IN ('unverified','verified','expert'))
);

CREATE TABLE ADMIN (
    user_id                 INTEGER PRIMARY KEY REFERENCES "USER"(user_id) ON DELETE CASCADE,
    admin_level             INTEGER DEFAULT 1 CHECK (admin_level BETWEEN 1 AND 5),
    moderation_privileges   TEXT
);

CREATE TABLE ORGANIZATION (
    org_id              SERIAL PRIMARY KEY,
    org_name            VARCHAR(200) NOT NULL UNIQUE,
    description         TEXT,
    website             VARCHAR(500),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verification_status VARCHAR(20) DEFAULT 'unverified'
                        CHECK (verification_status IN ('unverified','verified')),
    reputation_score    DECIMAL(5,2) DEFAULT 0.00 CHECK (reputation_score >= 0),
    logo_url            VARCHAR(500)
);

CREATE TABLE ORGANIZATION_MEMBER (
    org_id          INTEGER REFERENCES ORGANIZATION(org_id) ON DELETE CASCADE,
    user_id         INTEGER REFERENCES REGISTERED_INDIVIDUAL(user_id) ON DELETE CASCADE,
    membership_role VARCHAR(50) DEFAULT 'member'
                    CHECK (membership_role IN ('owner','admin','member','contributor')),
    joined_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (org_id, user_id)
);


-- ============================================================================
-- SECTION 2: DATASET ENTITIES
-- ============================================================================

CREATE TABLE DATASET (
    dataset_id                  SERIAL PRIMARY KEY,
    title                       VARCHAR(500) NOT NULL,
    slug                        VARCHAR(255) NOT NULL UNIQUE,
    short_description           TEXT,
    owner_user_id               INTEGER REFERENCES REGISTERED_INDIVIDUAL(user_id) ON DELETE SET NULL,
    owner_org_id                INTEGER REFERENCES ORGANIZATION(org_id) ON DELETE SET NULL,
    visibility_status           VARCHAR(20) DEFAULT 'public'
                                CHECK (visibility_status IN ('public','private','restricted')),
    publication_status          VARCHAR(20) DEFAULT 'draft'
                                CHECK (publication_status IN ('draft','pending_review','approved','rejected','flagged')),
    license                     VARCHAR(100),
    task_type                   VARCHAR(50),
    modality                    VARCHAR(50),
    created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cover_image_url             VARCHAR(500),
    current_credibility_score   DECIMAL(5,2) DEFAULT 0.00,
    current_avg_rating          DECIMAL(3,2) DEFAULT 0.00,
    current_total_downloads     INTEGER DEFAULT 0,
    CONSTRAINT check_single_owner CHECK (
        (owner_user_id IS NOT NULL AND owner_org_id IS NULL) OR
        (owner_user_id IS NULL  AND owner_org_id IS NOT NULL)
    )
);

CREATE TABLE DATASET_VERSION (
    version_id      SERIAL PRIMARY KEY,
    dataset_id      INTEGER NOT NULL REFERENCES DATASET(dataset_id) ON DELETE CASCADE,
    version_number  VARCHAR(20) NOT NULL,
    changelog       TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_current      BOOLEAN DEFAULT FALSE,
    file_path       VARCHAR(1000),
    file_size       BIGINT,
    file_format     VARCHAR(50),
    UNIQUE (dataset_id, version_number)
);

CREATE TABLE DATASET_METADATA (
    metadata_id             SERIAL PRIMARY KEY,
    version_id              INTEGER NOT NULL UNIQUE REFERENCES DATASET_VERSION(version_id) ON DELETE CASCADE,
    num_rows                BIGINT,
    num_columns             INTEGER,
    encoding                VARCHAR(50) DEFAULT 'UTF-8',
    delimiter               VARCHAR(10),
    missing_values_percent  DECIMAL(5,2) CHECK (missing_values_percent BETWEEN 0 AND 100),
    column_info_json        JSONB,
    language                VARCHAR(50),
    update_frequency        VARCHAR(50),
    source_origin           VARCHAR(500)
);


-- ============================================================================
-- SECTION 3: DISCOVERY & CLASSIFICATION
-- ============================================================================

CREATE TABLE TAG (
    tag_id   SERIAL PRIMARY KEY,
    tag_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE DATASET_TAG (
    dataset_id  INTEGER REFERENCES DATASET(dataset_id) ON DELETE CASCADE,
    tag_id      INTEGER REFERENCES TAG(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (dataset_id, tag_id)
);


-- ============================================================================
-- SECTION 4: INTERACTION ENTITIES
-- ============================================================================

CREATE TABLE FEEDBACK (
    feedback_id         SERIAL PRIMARY KEY,
    dataset_id          INTEGER NOT NULL REFERENCES DATASET(dataset_id) ON DELETE CASCADE,
    user_id             INTEGER NOT NULL REFERENCES REGISTERED_INDIVIDUAL(user_id) ON DELETE CASCADE,
    rating_value        INTEGER NOT NULL CHECK (rating_value BETWEEN 1 AND 5),
    review_text         TEXT,
    helpfulness_score   INTEGER DEFAULT 0,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (dataset_id, user_id)
);

CREATE TABLE DOWNLOAD_LOG (
    download_id     SERIAL PRIMARY KEY,
    dataset_id      INTEGER NOT NULL REFERENCES DATASET(dataset_id) ON DELETE CASCADE,
    version_id      INTEGER NOT NULL REFERENCES DATASET_VERSION(version_id) ON DELETE CASCADE,
    user_id         INTEGER REFERENCES REGISTERED_INDIVIDUAL(user_id) ON DELETE SET NULL,
    downloaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_type     VARCHAR(20) DEFAULT 'download'
                    CHECK (access_type IN ('download','api_access','preview')),
    session_ref     VARCHAR(255)
);


-- ============================================================================
-- SECTION 5: GOVERNANCE & TRUST
-- ============================================================================

CREATE TABLE REPORT (
    report_id           SERIAL PRIMARY KEY,
    dataset_id          INTEGER NOT NULL REFERENCES DATASET(dataset_id) ON DELETE CASCADE,
    reported_by_user_id INTEGER NOT NULL REFERENCES REGISTERED_INDIVIDUAL(user_id) ON DELETE CASCADE,
    reason              VARCHAR(100) NOT NULL
                        CHECK (reason IN ('spam','inappropriate','copyright','low_quality','misleading','other')),
    description         TEXT,
    report_status       VARCHAR(20) DEFAULT 'pending'
                        CHECK (report_status IN ('pending','under_review','resolved','dismissed')),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at         TIMESTAMP
);


-- ============================================================================
-- SECTION 6: INDEXES
-- ============================================================================

CREATE INDEX idx_user_username            ON "USER"(username);
CREATE INDEX idx_user_email               ON "USER"(email);
CREATE INDEX idx_user_account_status      ON "USER"(account_status);
CREATE INDEX idx_dataset_slug             ON DATASET(slug);
CREATE INDEX idx_dataset_owner_user       ON DATASET(owner_user_id);
CREATE INDEX idx_dataset_owner_org        ON DATASET(owner_org_id);
CREATE INDEX idx_dataset_visibility       ON DATASET(visibility_status);
CREATE INDEX idx_dataset_publication_status ON DATASET(publication_status);
CREATE INDEX idx_dataset_created_at       ON DATASET(created_at DESC);
CREATE INDEX idx_dataset_credibility      ON DATASET(current_credibility_score DESC);
CREATE INDEX idx_version_dataset          ON DATASET_VERSION(dataset_id);
CREATE INDEX idx_version_current          ON DATASET_VERSION(is_current) WHERE is_current = TRUE;
CREATE INDEX idx_feedback_dataset         ON FEEDBACK(dataset_id);
CREATE INDEX idx_feedback_user            ON FEEDBACK(user_id);
CREATE INDEX idx_feedback_rating          ON FEEDBACK(rating_value);
CREATE INDEX idx_feedback_created         ON FEEDBACK(created_at DESC);
CREATE INDEX idx_download_dataset         ON DOWNLOAD_LOG(dataset_id);
CREATE INDEX idx_download_version         ON DOWNLOAD_LOG(version_id);
CREATE INDEX idx_download_user            ON DOWNLOAD_LOG(user_id);
CREATE INDEX idx_download_date            ON DOWNLOAD_LOG(downloaded_at DESC);
CREATE INDEX idx_dataset_tag_dataset      ON DATASET_TAG(dataset_id);
CREATE INDEX idx_dataset_tag_tag          ON DATASET_TAG(tag_id);
CREATE INDEX idx_report_dataset           ON REPORT(dataset_id);
CREATE INDEX idx_report_status            ON REPORT(report_status);


-- ============================================================================
-- SECTION 7: TRIGGERS & FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dataset_timestamp
BEFORE UPDATE ON DATASET
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_timestamp
BEFORE UPDATE ON FEEDBACK
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Average rating auto-update
CREATE OR REPLACE FUNCTION update_dataset_avg_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE DATASET
    SET current_avg_rating = (
        SELECT AVG(rating_value)::DECIMAL(3,2)
        FROM FEEDBACK WHERE dataset_id = COALESCE(NEW.dataset_id, OLD.dataset_id)
    )
    WHERE dataset_id = COALESCE(NEW.dataset_id, OLD.dataset_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_avg_rating_on_feedback
AFTER INSERT OR UPDATE OR DELETE ON FEEDBACK
FOR EACH ROW EXECUTE FUNCTION update_dataset_avg_rating();

-- Download count auto-increment
CREATE OR REPLACE FUNCTION increment_download_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE DATASET
    SET current_total_downloads = current_total_downloads + 1
    WHERE dataset_id = NEW.dataset_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_downloads_on_log
AFTER INSERT ON DOWNLOAD_LOG
FOR EACH ROW EXECUTE FUNCTION increment_download_count();

-- Single current version enforcement
CREATE OR REPLACE FUNCTION ensure_single_current_version()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current = TRUE THEN
        UPDATE DATASET_VERSION
        SET is_current = FALSE
        WHERE dataset_id = NEW.dataset_id
          AND version_id != NEW.version_id
          AND is_current = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER manage_current_version
BEFORE INSERT OR UPDATE ON DATASET_VERSION
FOR EACH ROW EXECUTE FUNCTION ensure_single_current_version();


-- ============================================================================
-- SECTION 8: VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW v_dataset_summary AS
SELECT
    d.dataset_id, d.title, d.slug, d.short_description,
    d.visibility_status, d.publication_status, d.created_at,
    d.current_credibility_score, d.current_avg_rating, d.current_total_downloads,
    CASE
        WHEN d.owner_user_id IS NOT NULL THEN u.username
        WHEN d.owner_org_id  IS NOT NULL THEN o.org_name
    END AS owner_name,
    CASE
        WHEN d.owner_user_id IS NOT NULL THEN 'user'
        WHEN d.owner_org_id  IS NOT NULL THEN 'organization'
    END AS owner_type,
    dv.version_number AS current_version,
    dm.num_rows, dm.num_columns
FROM DATASET d
LEFT JOIN REGISTERED_INDIVIDUAL ri ON d.owner_user_id = ri.user_id
LEFT JOIN "USER" u  ON ri.user_id = u.user_id
LEFT JOIN ORGANIZATION o ON d.owner_org_id = o.org_id
LEFT JOIN DATASET_VERSION dv ON d.dataset_id = dv.dataset_id AND dv.is_current = TRUE
LEFT JOIN DATASET_METADATA dm ON dv.version_id = dm.version_id;

CREATE OR REPLACE VIEW v_top_rated_datasets AS
SELECT
    d.dataset_id, d.title, d.current_avg_rating,
    COUNT(f.feedback_id) AS total_reviews,
    d.current_total_downloads
FROM DATASET d
LEFT JOIN FEEDBACK f ON d.dataset_id = f.dataset_id
WHERE d.publication_status = 'approved'
  AND d.visibility_status  = 'public'
GROUP BY d.dataset_id, d.title, d.current_avg_rating, d.current_total_downloads
HAVING COUNT(f.feedback_id) >= 5
ORDER BY d.current_avg_rating DESC, total_reviews DESC;

CREATE OR REPLACE VIEW v_user_activity AS
SELECT
    ri.user_id, u.username,
    COUNT(DISTINCT d.dataset_id)  AS datasets_uploaded,
    COUNT(DISTINCT f.feedback_id) AS reviews_written,
    COUNT(DISTINCT dl.download_id) AS datasets_downloaded,
    ri.reputation_score
FROM REGISTERED_INDIVIDUAL ri
JOIN "USER" u ON ri.user_id = u.user_id
LEFT JOIN DATASET      d  ON d.owner_user_id = ri.user_id
LEFT JOIN FEEDBACK     f  ON f.user_id       = ri.user_id
LEFT JOIN DOWNLOAD_LOG dl ON dl.user_id      = ri.user_id
GROUP BY ri.user_id, u.username, ri.reputation_score;


-- ============================================================================
-- SECTION 9: CREDIBILITY SCORE SYSTEM
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_credibility_score(p_dataset_id INTEGER)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_avg_rating             DECIMAL(3,2);
    v_rating_count           INTEGER;
    v_download_count         INTEGER;
    v_owner_reputation       DECIMAL(5,2);
    v_rating_component       DECIMAL(5,2);
    v_download_component     DECIMAL(5,2);
    v_reputation_component   DECIMAL(5,2);
    v_completeness_component DECIMAL(5,2);
    v_credibility_score      DECIMAL(5,2);
    c_rating_weight     CONSTANT DECIMAL(3,2) := 0.40;
    c_download_weight   CONSTANT DECIMAL(3,2) := 0.30;
    c_reputation_weight CONSTANT DECIMAL(3,2) := 0.20;
    c_completeness_weight CONSTANT DECIMAL(3,2) := 0.10;
BEGIN
    -- Component 1: average rating (40%)
    SELECT COALESCE(AVG(rating_value),0)::DECIMAL(3,2), COUNT(*)
    INTO v_avg_rating, v_rating_count
    FROM FEEDBACK WHERE dataset_id = p_dataset_id;

    IF v_rating_count = 0 THEN
        v_rating_component := 0;
    ELSE
        v_rating_component := ((v_avg_rating - 1) / 4.0) * 100 *
                              LEAST(v_rating_count / 20.0, 1.0);
    END IF;

    -- Component 2: download popularity (30%)
    SELECT COUNT(*) INTO v_download_count
    FROM DOWNLOAD_LOG WHERE dataset_id = p_dataset_id;

    v_download_component := (LOG(10, v_download_count + 1) / LOG(10, 1001)) * 100;

    -- Component 3: owner reputation (20%)
    SELECT COALESCE(
        (SELECT reputation_score FROM REGISTERED_INDIVIDUAL ri WHERE ri.user_id = d.owner_user_id),
        (SELECT reputation_score FROM ORGANIZATION o           WHERE o.org_id   = d.owner_org_id),
        50.0
    ) INTO v_owner_reputation
    FROM DATASET d WHERE d.dataset_id = p_dataset_id;

    v_reputation_component := v_owner_reputation;

    -- Component 4: completeness (10%)
    SELECT CASE
        WHEN dm.metadata_id IS NOT NULL THEN 100 - COALESCE(dm.missing_values_percent, 0)
        ELSE 30.0
    END INTO v_completeness_component
    FROM DATASET d
    LEFT JOIN DATASET_VERSION dv ON d.dataset_id = dv.dataset_id AND dv.is_current = TRUE
    LEFT JOIN DATASET_METADATA dm ON dv.version_id = dm.version_id
    WHERE d.dataset_id = p_dataset_id;

    v_credibility_score :=
        (v_rating_component      * c_rating_weight)     +
        (v_download_component    * c_download_weight)   +
        (v_reputation_component  * c_reputation_weight) +
        (v_completeness_component * c_completeness_weight);

    RETURN LEAST(GREATEST(ROUND(v_credibility_score, 2), 0), 100);
END;
$$ LANGUAGE plpgsql;

-- Trigger: recalculate on feedback change
CREATE OR REPLACE FUNCTION trigger_update_credibility_on_feedback()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE DATASET
    SET current_credibility_score = calculate_credibility_score(COALESCE(NEW.dataset_id, OLD.dataset_id))
    WHERE dataset_id = COALESCE(NEW.dataset_id, OLD.dataset_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_update_credibility_on_feedback ON FEEDBACK;
CREATE TRIGGER auto_update_credibility_on_feedback
AFTER INSERT OR UPDATE OR DELETE ON FEEDBACK
FOR EACH ROW EXECUTE FUNCTION trigger_update_credibility_on_feedback();

-- Trigger: recalculate on download
CREATE OR REPLACE FUNCTION trigger_update_credibility_on_download()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE DATASET
    SET current_credibility_score = calculate_credibility_score(NEW.dataset_id)
    WHERE dataset_id = NEW.dataset_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_update_credibility_on_download ON DOWNLOAD_LOG;
CREATE TRIGGER auto_update_credibility_on_download
AFTER INSERT ON DOWNLOAD_LOG
FOR EACH ROW EXECUTE FUNCTION trigger_update_credibility_on_download();

-- Batch recalculation procedure
CREATE OR REPLACE PROCEDURE recalculate_all_credibility_scores()
LANGUAGE plpgsql AS $$
DECLARE
    v_rec   RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_rec IN SELECT dataset_id FROM DATASET LOOP
        UPDATE DATASET
        SET current_credibility_score = calculate_credibility_score(v_rec.dataset_id)
        WHERE dataset_id = v_rec.dataset_id;
        v_count := v_count + 1;
    END LOOP;
    RAISE NOTICE 'Recalculated credibility scores for % datasets', v_count;
END;
$$;

-- Credibility details view
CREATE OR REPLACE VIEW v_credibility_details AS
SELECT
    d.dataset_id,
    d.title,
    d.current_credibility_score AS total_score,
    ROUND(
        (((COALESCE(AVG(f.rating_value),0) - 1) / 4.0) * 100 *
         LEAST(COUNT(f.feedback_id) / 20.0, 1.0))::NUMERIC, 2
    ) AS rating_component,
    ROUND(
        ((LOG(10, COUNT(dl.download_id) + 1) / LOG(10, 1001)) * 100)::NUMERIC, 2
    ) AS download_component,
    COALESCE(
        (SELECT reputation_score FROM REGISTERED_INDIVIDUAL ri WHERE ri.user_id = d.owner_user_id),
        (SELECT reputation_score FROM ORGANIZATION o           WHERE o.org_id   = d.owner_org_id),
        50.0
    ) AS reputation_component,
    COALESCE(100 - dm.missing_values_percent, 30.0) AS completeness_component,
    COUNT(f.feedback_id)  AS total_reviews,
    COUNT(dl.download_id) AS total_downloads
FROM DATASET d
LEFT JOIN FEEDBACK      f  ON d.dataset_id = f.dataset_id
LEFT JOIN DOWNLOAD_LOG  dl ON d.dataset_id = dl.dataset_id
LEFT JOIN DATASET_VERSION dv ON d.dataset_id = dv.dataset_id AND dv.is_current = TRUE
LEFT JOIN DATASET_METADATA dm ON dv.version_id = dm.version_id
GROUP BY d.dataset_id, d.title, d.current_credibility_score,
         d.owner_user_id, d.owner_org_id, dm.missing_values_percent
ORDER BY d.current_credibility_score DESC;


-- ============================================================================
-- SECTION 10: SEED DATA
-- ============================================================================
--python -c "import bcrypt; print(bcrypt.hashpw(b'TestPassword123!', bcrypt.gensalt(12)).decode())"
--to get the hashed password
--Password: TestPassword123!
INSERT INTO "USER" (username, email, password_hash, account_status) VALUES
    ('jane_doe',    'jane@example.com',  '$2b$12$XSEmiBsGFNoaQw0nU7256uq/8.dHeQMVikXMytEg0/I1BzCjA1zHy', 'active'),
    ('alice_smith', 'alice@example.com', '$2b$12$XSEmiBsGFNoaQw0nU7256uq/8.dHeQMVikXMytEg0/I1BzCjA1zHy', 'active'),
    ('bob_jones',   'bob@example.com',   '$2b$12$XSEmiBsGFNoaQw0nU7256uq/8.dHeQMVikXMytEg0/I1BzCjA1zHy', 'active'),
    ('carol_white', 'carol@example.com', '$2b$12$XSEmiBsGFNoaQw0nU7256uq/8.dHeQMVikXMytEg0/I1BzCjA1zHy', 'active'),
    ('david_brown', 'david@example.com', '$2b$12$XSEmiBsGFNoaQw0nU7256uq/8.dHeQMVikXMytEg0/I1BzCjA1zHy', 'active');

INSERT INTO REGISTERED_INDIVIDUAL (user_id, display_name, bio, reputation_score, verification_status) VALUES
    ((SELECT user_id FROM "USER" WHERE username = 'jane_doe'),
     'Jane Doe',    'Data scientist interested in open datasets and reproducible research.', 42.50, 'verified'),
    ((SELECT user_id FROM "USER" WHERE username = 'alice_smith'),
     'Alice Smith', 'ML researcher focused on environmental data.',                          30.00, 'verified'),
    ((SELECT user_id FROM "USER" WHERE username = 'bob_jones'),
     'Bob Jones',   'Climate scientist and open data advocate.',                             25.75, 'verified'),
    ((SELECT user_id FROM "USER" WHERE username = 'carol_white'),
     'Carol White', 'Data engineer with interest in geospatial datasets.',                  18.00, 'unverified'),
    ((SELECT user_id FROM "USER" WHERE username = 'david_brown'),
     'David Brown', 'Graduate student studying climate change impacts.',                     10.50, 'unverified');

INSERT INTO DATASET (title, slug, short_description, owner_user_id,
                     visibility_status, publication_status, license, task_type, modality)
VALUES (
    'Global Climate Indicators 2000–2023',
    'global-climate-indicators-2000-2023',
    'Monthly climate metrics across 195 countries including temperature anomalies, CO2 levels, and sea surface data.',
    (SELECT user_id FROM "USER" WHERE username = 'jane_doe'),
    'public', 'approved', 'CC BY 4.0', 'regression', 'tabular'
);

INSERT INTO DATASET_VERSION (dataset_id, version_number, changelog, is_current,
                              file_path, file_size, file_format)
VALUES (
    (SELECT dataset_id FROM DATASET WHERE slug = 'global-climate-indicators-2000-2023'),
    '1.0.0',
    'Initial release. Covers Jan 2000 – Dec 2023. Source: NOAA + World Bank.',
    TRUE,
    '/datasets/global-climate-indicators/v1.0.0/data.csv',
    20480000, 'CSV'
);

INSERT INTO DATASET_METADATA (version_id, num_rows, num_columns, encoding, delimiter,
                               missing_values_percent, column_info_json, language,
                               update_frequency, source_origin)
VALUES (
    (SELECT version_id FROM DATASET_VERSION WHERE version_number = '1.0.0'
       AND dataset_id = (SELECT dataset_id FROM DATASET
                         WHERE slug = 'global-climate-indicators-2000-2023')),
    28440, 12, 'UTF-8', ',', 1.30,
    '{
        "columns": [
            {"name": "country_code",       "type": "VARCHAR", "nullable": false},
            {"name": "year",               "type": "INTEGER", "nullable": false},
            {"name": "month",              "type": "INTEGER", "nullable": false},
            {"name": "avg_temp_c",         "type": "FLOAT",   "nullable": true},
            {"name": "temp_anomaly_c",     "type": "FLOAT",   "nullable": true},
            {"name": "co2_ppm",            "type": "FLOAT",   "nullable": true},
            {"name": "sea_surface_temp_c", "type": "FLOAT",   "nullable": true},
            {"name": "precipitation_mm",   "type": "FLOAT",   "nullable": true},
            {"name": "humidity_pct",       "type": "FLOAT",   "nullable": true},
            {"name": "wind_speed_kmh",     "type": "FLOAT",   "nullable": true},
            {"name": "region",             "type": "VARCHAR", "nullable": false},
            {"name": "data_source",        "type": "VARCHAR", "nullable": false}
        ]
    }'::JSONB,
    'English', 'annual',
    'NOAA Global Surface Temperature Dataset; World Bank Climate Portal'
);

INSERT INTO FEEDBACK (dataset_id, user_id, rating_value, review_text, helpfulness_score) VALUES
    (
        (SELECT dataset_id FROM DATASET WHERE slug = 'global-climate-indicators-2000-2023'),
        (SELECT user_id FROM "USER" WHERE username = 'jane_doe'),
        5, 'Comprehensive and well-structured dataset. Missing values are minimal and clearly documented. Highly recommended for climate trend analysis.', 3
    ),
    (
        (SELECT dataset_id FROM DATASET WHERE slug = 'global-climate-indicators-2000-2023'),
        (SELECT user_id FROM "USER" WHERE username = 'alice_smith'),
        5, 'Excellent coverage and clean structure. Used it for my regression models with great results.', 8
    ),
    (
        (SELECT dataset_id FROM DATASET WHERE slug = 'global-climate-indicators-2000-2023'),
        (SELECT user_id FROM "USER" WHERE username = 'bob_jones'),
        4, 'Very useful dataset. Would appreciate hourly granularity in future versions, but monthly data is solid.', 5
    ),
    (
        (SELECT dataset_id FROM DATASET WHERE slug = 'global-climate-indicators-2000-2023'),
        (SELECT user_id FROM "USER" WHERE username = 'carol_white'),
        4, 'Good variety of climate indicators. The CO2 and sea surface temp columns are particularly well-sourced.', 4
    ),
    (
        (SELECT dataset_id FROM DATASET WHERE slug = 'global-climate-indicators-2000-2023'),
        (SELECT user_id FROM "USER" WHERE username = 'david_brown'),
        5, 'Invaluable for my thesis research. Documentation is clear and missing values are well within acceptable range.', 6
    );


-- ============================================================================
-- SECTION 11: ROLES
-- NOTE: Role-level privileges referencing a specific database name (e.g.
--       GRANT ALL ON DATABASE ml_dataset_platform) are skipped here because
--       the target database is "postgres" on Supabase.  Grant those manually
--       if you are running on a local named database.
-- ============================================================================


DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dba_role')    THEN CREATE ROLE dba_role    LOGIN PASSWORD 'dba_pass';    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'viewer_role') THEN CREATE ROLE viewer_role LOGIN PASSWORD 'viewer_pass'; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'editor_role') THEN CREATE ROLE editor_role LOGIN PASSWORD 'editor_pass'; END IF;
END
$$;

ALTER SCHEMA public OWNER TO dba_role;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO dba_role';
    END LOOP;
END $$;

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequence_name) || ' OWNER TO dba_role';
    END LOOP;
END $$;

-- Revoke first to avoid conflicts on re-runs
REVOKE ALL PRIVILEGES ON SCHEMA public FROM dba_role, viewer_role, editor_role;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM dba_role, viewer_role, editor_role;

-- dba: full control
GRANT ALL PRIVILEGES ON SCHEMA public TO dba_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dba_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dba_role;
-- Attempt to give DBA higher privileges (may be restricted in Supabase)
ALTER ROLE dba_role CREATEROLE CREATEDB;

-- viewer: read-only
GRANT USAGE  ON SCHEMA public TO viewer_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO viewer_role;
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM viewer_role;

-- editor: read + limited write
GRANT USAGE  ON SCHEMA public TO editor_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO editor_role;
GRANT INSERT, UPDATE ON DATASET         TO editor_role;
GRANT INSERT, UPDATE ON DATASET_VERSION TO editor_role;
GRANT INSERT, UPDATE ON FEEDBACK        TO editor_role;
REVOKE DELETE ON DATASET         FROM editor_role;
REVOKE DELETE ON DATASET_VERSION FROM editor_role;
REVOKE CREATE ON SCHEMA public   FROM editor_role;

-- Ensure future tables inherit privileges

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON TABLES TO dba_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO viewer_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO editor_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT INSERT, UPDATE ON TABLES TO editor_role;

-- ============================================================================
-- SECTION 12: FINAL CREDIBILITY SYNC
-- Run after all seed data is inserted so scores reflect the seeded feedback.
-- ============================================================================

CALL recalculate_all_credibility_scores();


-- ============================================================================
-- END OF init_db.sql
-- ============================================================================
