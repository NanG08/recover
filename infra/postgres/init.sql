CREATE TABLE IF NOT EXISTS audit_trail (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transaction_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    channel TEXT NOT NULL,
    language TEXT NOT NULL,
    intent TEXT NOT NULL,
    confidence_score DOUBLE PRECISION NOT NULL,
    razorpay_api_status TEXT NOT NULL,
    system_state TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_trail_timestamp_idx
    ON audit_trail (timestamp DESC);