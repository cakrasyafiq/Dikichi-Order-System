INSERT INTO outlet (id, name, address)
VALUES ('OUT-01', 'Dikichi Outlet 01', 'Jl. Contoh No. 1, Malang');   -- Fictional demo address; not a production location

INSERT INTO dining_table (outlet_id, code)
SELECT 'OUT-01', 'T-' || lpad(n::text, 2, '0')
FROM generate_series(1, 20) AS n;

INSERT INTO menu_item (id, outlet_id, name, description, price, category, image_url, available) VALUES
('11111111-0000-4000-8000-000000000001', 'OUT-01', 'Crispy Chicken Ori Besar',             'Dada/paha atas goreng crispy dengan rasa original',                  10000, 'makanan', '/api/v1/menu-images/menu_1.png',  TRUE),
('11111111-0000-4000-8000-000000000002', 'OUT-01', 'Crispy Chicken Ori Kecil',             'Sayap/paha bawah goreng crispy dengan rasa original',                 9000, 'makanan', '/api/v1/menu-images/menu_2.png',  TRUE),
('11111111-0000-4000-8000-000000000003', 'OUT-01', 'Crispy Chicken Hot Besar',             'Dada/paha atas goreng crispy dengan rasa pedas',                     11000, 'makanan', '/api/v1/menu-images/menu_3.png',  TRUE),
('11111111-0000-4000-8000-000000000004', 'OUT-01', 'Crispy Chicken Hot Kecil',             'Sayap/paha bawah goreng crispy dengan rasa pedas',                   10000, 'makanan', '/api/v1/menu-images/menu_4.png',  TRUE),
('11111111-0000-4000-8000-000000000005', 'OUT-01', 'Crispy Chicken Nashville Besar',       'Dada/paha atas goreng crispy dengan bumbu pedas nashville',          15000, 'makanan', '/api/v1/menu-images/menu_5.png',  TRUE),
('11111111-0000-4000-8000-000000000006', 'OUT-01', 'Crispy Chicken Nashville Kecil',       'Sayap/paha bawah goreng crispy dengan bumbu pedas nashville',        13000, 'makanan', '/api/v1/menu-images/menu_6.png',  TRUE),
('11111111-0000-4000-8000-000000000007', 'OUT-01', 'Nasi Putih',                           'Nasi putih hangat',                                                   5000, 'makanan', '/api/v1/menu-images/menu_7.png',  TRUE),
('11111111-0000-4000-8000-000000000008', 'OUT-01', 'Udang keju',                           'Nugget udang berisi keju lumer',                                     10000, 'snack',   '/api/v1/menu-images/menu_8.png',  FALSE),
('11111111-0000-4000-8000-000000000009', 'OUT-01', 'Lumpia Udang',                         'Adonan dimsum udang digoreng dalam kulit tahu',                      10000, 'snack',   '/api/v1/menu-images/menu_9.png',  TRUE),
('11111111-0000-4000-8000-000000000010', 'OUT-01', 'French Fries',                         'Kentang goreng',                                                      9000, 'snack',   '/api/v1/menu-images/menu_10.png', TRUE),
('11111111-0000-4000-8000-000000000011', 'OUT-01', 'Choco Sundae',                         'Es krim vanila dengan topping sirup cokelat',                        11000, 'snack',   '/api/v1/menu-images/menu_11.png', TRUE),
('11111111-0000-4000-8000-000000000012', 'OUT-01', 'Oreo Sundae',                          'Es krim vanila dengan topping remahan oreo',                         11000, 'snack',   '/api/v1/menu-images/menu_12.png', TRUE),
('11111111-0000-4000-8000-000000000013', 'OUT-01', 'Strawberry Sundae',                    'Es krim vanila dengan topping sirup strawberry',                     11000, 'snack',   '/api/v1/menu-images/menu_13.png', TRUE),
('11111111-0000-4000-8000-000000000014', 'OUT-01', 'Lemon Tea',                            'Teh dengan rasa lemon',                                               6000, 'minuman', '/api/v1/menu-images/menu_14.png', TRUE),
('11111111-0000-4000-8000-000000000015', 'OUT-01', 'Milo',                                 'Minuman rasa cokelat milo',                                           8000, 'minuman', '/api/v1/menu-images/menu_15.png', TRUE),
('11111111-0000-4000-8000-000000000016', 'OUT-01', 'Orange',                               'Minuman rasa sirup jeruk',                                            7000, 'minuman', '/api/v1/menu-images/menu_16.png', TRUE),
('11111111-0000-4000-8000-000000000017', 'OUT-01', 'Tek Tarik',                            'Teh tarik dari Nestea',                                               8000, 'minuman', '/api/v1/menu-images/menu_17.png', TRUE),
('11111111-0000-4000-8000-000000000018', 'OUT-01', 'Es Teh Manis',                         'Teh manis dingin',                                                    6000, 'minuman', '/api/v1/menu-images/menu_18.png', TRUE),
('11111111-0000-4000-8000-000000000019', 'OUT-01', 'Paket Nasi Crispy Ori Besar',          '1x Crispy Chicken Ori Besar + 1x Nasi Putih',                        14000, 'paket',   '/api/v1/menu-images/menu_19.png', TRUE),
('11111111-0000-4000-8000-000000000020', 'OUT-01', 'Paket Nasi Crispy Ori Kecil',          '1x Crispy Chicken Ori Kecil + 1x Nasi Putih',                        12000, 'paket',   '/api/v1/menu-images/menu_20.png', TRUE),
('11111111-0000-4000-8000-000000000021', 'OUT-01', 'Paket Nasi Crispy Hot Besar',          '1x Crispy Chicken Hot Besar + 1x Nasi Putih',                        15000, 'paket',   '/api/v1/menu-images/menu_21.png', TRUE),
('11111111-0000-4000-8000-000000000022', 'OUT-01', 'Paket Nasi Crispy Hot Kecil',          '1x Crispy Chicken Hot Kecil + 1x Nasi Putih',                        14000, 'paket',   '/api/v1/menu-images/menu_22.png', TRUE),
('11111111-0000-4000-8000-000000000023', 'OUT-01', 'Paket Nasi Crispy Nashville Besar',    '1x Crispy Chicken Nashville Besar + 1x Nasi Putih',                  19000, 'paket',   '/api/v1/menu-images/menu_23.png', TRUE),
('11111111-0000-4000-8000-000000000024', 'OUT-01', 'Paket Nasi Crispy Nashville Kecil',    '1x Crispy Chicken Nashville Kecil + 1x Nasi Putih',                  17000, 'paket',   '/api/v1/menu-images/menu_24.png', TRUE),
('11111111-0000-4000-8000-000000000025', 'OUT-01', 'Paket Lengkap Crispy Ori Besar',       '1x Crispy Chicken Ori Besar + 1x Nasi Putih +1x Es Teh Manis',       16000, 'paket',   '/api/v1/menu-images/menu_25.png', TRUE),
('11111111-0000-4000-8000-000000000026', 'OUT-01', 'Paket Lengkap Crispy Ori Kecil',       '1x Crispy Chicken Ori Kecil + 1x Nasi Putih +1x Es Teh Manis',       14000, 'paket',   '/api/v1/menu-images/menu_26.png', TRUE),
('11111111-0000-4000-8000-000000000027', 'OUT-01', 'Paket Lengkap Crispy Hot Besar',       '1x Crispy Chicken Hot Besar + 1x Nasi Putih +1x Es Teh Manis',       17000, 'paket',   '/api/v1/menu-images/menu_27.png', TRUE),
('11111111-0000-4000-8000-000000000028', 'OUT-01', 'Paket Lengkap Crispy Hot Kecil',       '1x Crispy Chicken Hot Kecil + 1x Nasi Putih +1x Es Teh Manis',       16000, 'paket',   '/api/v1/menu-images/menu_28.png', TRUE),
('11111111-0000-4000-8000-000000000029', 'OUT-01', 'Paket Lengkap Crispy Nashville Besar', '1x Crispy Chicken Nashville Besar + 1x Nasi Putih +1x Es Teh Manis', 21000, 'paket',   '/api/v1/menu-images/menu_29.png', TRUE),
('11111111-0000-4000-8000-000000000030', 'OUT-01', 'Paket Lengkap Crispy Nashville Kecil', '1x Crispy Chicken Nashville Kecil + 1x Nasi Putih +1x Es Teh Manis', 19000, 'paket',   '/api/v1/menu-images/menu_30.png', TRUE);
