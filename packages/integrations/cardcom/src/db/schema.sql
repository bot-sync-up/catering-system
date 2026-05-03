-- CardCom integration schema (PostgreSQL)
-- Run via your migration tool of choice.

CREATE TABLE IF NOT EXISTS integration_logs (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  flow            TEXT NOT NULL,
  request         JSONB NOT NULL,
  response        JSONB,
  error_message   TEXT,
  http_status     INT,
  attempt         INT NOT NULL DEFAULT 1,
  success         BOOLEAN NOT NULL,
  duration_ms     INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS integration_logs_flow_idx     ON integration_logs (flow);
CREATE INDEX IF NOT EXISTS integration_logs_created_idx  ON integration_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS integration_logs_success_idx  ON integration_logs (success);

CREATE TABLE IF NOT EXISTS cardcom_chargebacks (
  id               BIGSERIAL PRIMARY KEY,
  transaction_id   TEXT NOT NULL,
  amount           NUMERIC(14,2) NOT NULL,
  reason           TEXT,
  status           TEXT NOT NULL CHECK (status IN ('opened','resolved')),
  received_at      TIMESTAMPTZ NOT NULL,
  resolved_at      TIMESTAMPTZ,
  raw              JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS cb_tx_idx     ON cardcom_chargebacks (transaction_id);
CREATE INDEX IF NOT EXISTS cb_status_idx ON cardcom_chargebacks (status);

CREATE TABLE IF NOT EXISTS cardcom_recurring (
  id                      BIGSERIAL PRIMARY KEY,
  recurring_id            TEXT UNIQUE NOT NULL,
  customer_external_id    TEXT NOT NULL,
  token                   TEXT NOT NULL,
  amount                  NUMERIC(14,2) NOT NULL,
  frequency               TEXT NOT NULL,
  total_charges           INT,
  start_date              DATE NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'active',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at            TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS rec_cust_idx ON cardcom_recurring (customer_external_id);
CREATE INDEX IF NOT EXISTS rec_status_idx ON cardcom_recurring (status);

CREATE TABLE IF NOT EXISTS cardcom_milestone_plans (
  id                      BIGSERIAL PRIMARY KEY,
  plan_id                 TEXT UNIQUE NOT NULL,
  customer_external_id    TEXT NOT NULL,
  total_amount            NUMERIC(14,2) NOT NULL,
  stages                  JSONB NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cardcom_split_allocations (
  id                  BIGSERIAL PRIMARY KEY,
  transaction_id      TEXT NOT NULL,
  party_external_id   TEXT NOT NULL,
  amount              NUMERIC(14,2) NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS split_tx_idx ON cardcom_split_allocations (transaction_id);
