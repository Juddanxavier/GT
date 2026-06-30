CREATE TABLE IF NOT EXISTS invitation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email varchar(255) NOT NULL,
    name varchar(255),
    role varchar(50) NOT NULL DEFAULT 'staff',
    tenant_id uuid,
    branch_id varchar(255),
    token text NOT NULL UNIQUE,
    invited_by_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    status varchar(20) NOT NULL DEFAULT 'pending',
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitation_email ON invitation(email);
CREATE INDEX IF NOT EXISTS idx_invitation_token ON invitation(token);
CREATE INDEX IF NOT EXISTS idx_invitation_status ON invitation(status);
