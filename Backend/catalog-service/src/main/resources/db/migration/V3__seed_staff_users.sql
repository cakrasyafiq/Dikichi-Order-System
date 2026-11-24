CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO staff_user (outlet_id, password_hash) VALUES
('OUT-01', crypt('${seed_outlet_password}', gen_salt('bf', 10)));
