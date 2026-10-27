CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO staff_user (username, password_hash, role, outlet_id) VALUES
('master',  crypt('${seed_master_password}',  gen_salt('bf', 10)), 'MASTER',  NULL),
('cashier', crypt('${seed_cashier_password}', gen_salt('bf', 10)), 'CASHIER', 'OUT-01'),
('kitchen', crypt('${seed_kitchen_password}', gen_salt('bf', 10)), 'KITCHEN', 'OUT-01');
