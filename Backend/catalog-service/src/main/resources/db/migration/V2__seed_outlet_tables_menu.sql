INSERT INTO outlet (id, name, address)
VALUES ('OUT-01', 'Dikichi Outlet 01', 'Jl. Contoh No. 1, Malang');   -- Fictional demo address; not a production location

INSERT INTO dining_table (outlet_id, code)
SELECT 'OUT-01', 'T-' || lpad(n::text, 2, '0')
FROM generate_series(1, 20) AS n;

INSERT INTO menu_item (id, outlet_id, name, description, price, category, available) VALUES
('11111111-0000-4000-8000-000000000001', 'OUT-01', 'Mie Suit',            NULL, 25000, 'Mie',     TRUE),
('11111111-0000-4000-8000-000000000002', 'OUT-01', 'Mie Suit Pedas',      NULL, 27000, 'Mie',     TRUE),
('11111111-0000-4000-8000-000000000003', 'OUT-01', 'Mie Ayam Jamur',      NULL, 23000, 'Mie',     TRUE),
('11111111-0000-4000-8000-000000000004', 'OUT-01', 'Mie Goreng Spesial',  NULL, 26000, 'Mie',     TRUE),
('11111111-0000-4000-8000-000000000005', 'OUT-01', 'Dimsum Ayam (3 pcs)', NULL, 18000, 'Dimsum',  TRUE),
('11111111-0000-4000-8000-000000000006', 'OUT-01', 'Siomay Udang (3 pcs)',NULL, 20000, 'Dimsum',  TRUE),
('11111111-0000-4000-8000-000000000007', 'OUT-01', 'Hakau (3 pcs)',       NULL, 22000, 'Dimsum',  TRUE),
('11111111-0000-4000-8000-000000000008', 'OUT-01', 'Lumpia Kulit Tahu',   NULL, 19000, 'Dimsum',  FALSE),
('11111111-0000-4000-8000-000000000009', 'OUT-01', 'Es Teh Manis',        NULL,  6000, 'Minuman', TRUE),
('11111111-0000-4000-8000-000000000010', 'OUT-01', 'Es Jeruk',            NULL,  9000, 'Minuman', TRUE),
('11111111-0000-4000-8000-000000000011', 'OUT-01', 'Lemon Tea',           NULL, 10000, 'Minuman', TRUE),
('11111111-0000-4000-8000-000000000012', 'OUT-01', 'Air Mineral',         NULL,  5000, 'Minuman', TRUE);
