CREATE TABLE outlet (
    id          VARCHAR(20)  PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    address     VARCHAR(255) NOT NULL,
    is_deleted  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_outlet_id_format CHECK (id ~ '^OUT-[0-9]{2,}$')
);

CREATE TABLE dining_table (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id   VARCHAR(20)  NOT NULL REFERENCES outlet (id),
    code        VARCHAR(5)   NOT NULL,
    is_deleted  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_dining_table_code_format CHECK (code ~ '^T-[0-9]{2,3}$')
);

CREATE UNIQUE INDEX ux_dining_table_outlet_code_active
    ON dining_table (outlet_id, code)
    WHERE is_deleted = FALSE;

CREATE TABLE menu_item (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id    VARCHAR(20)   NOT NULL REFERENCES outlet (id),
    name         VARCHAR(100)  NOT NULL,
    description  VARCHAR(500),
    price        INTEGER       NOT NULL,
    category     VARCHAR(50)   NOT NULL,
    available    BOOLEAN       NOT NULL DEFAULT TRUE,
    is_deleted   BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ck_menu_item_price CHECK (price BETWEEN 1 AND 10000000),
    CONSTRAINT ck_menu_item_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE INDEX ix_menu_item_outlet ON menu_item (outlet_id);

CREATE TABLE staff_user (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    username       VARCHAR(50)   NOT NULL UNIQUE,
    password_hash  VARCHAR(100)  NOT NULL,
    role           VARCHAR(10)   NOT NULL,
    outlet_id      VARCHAR(20)   REFERENCES outlet (id),
    CONSTRAINT ck_staff_user_role CHECK (role IN ('MASTER', 'CASHIER', 'KITCHEN')),
    CONSTRAINT ck_staff_user_outlet_scope CHECK (
        (role = 'MASTER' AND outlet_id IS NULL) OR
        (role <> 'MASTER' AND outlet_id IS NOT NULL)
    )
);
