CREATE SEQUENCE order_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE orders (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number   VARCHAR(20)   NOT NULL UNIQUE,
    outlet_id      VARCHAR(20)   NOT NULL,
    table_code     VARCHAR(5)    NOT NULL,
    customer_name  VARCHAR(50)   NOT NULL,
    status         VARCHAR(10)   NOT NULL,
    total_amount   BIGINT        NOT NULL,
    version        BIGINT        NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ck_orders_status CHECK (status IN
        ('PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT ck_orders_total_positive CHECK (total_amount > 0)
);

CREATE INDEX ix_orders_outlet_status ON orders (outlet_id, status);

CREATE TABLE order_item (
    id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                 UUID          NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    menu_item_id             UUID          NOT NULL,
    menu_item_name_snapshot  VARCHAR(100)  NOT NULL,
    unit_price_snapshot      INTEGER       NOT NULL,
    quantity                 INTEGER       NOT NULL,
    subtotal                 BIGINT        NOT NULL,
    CONSTRAINT ux_order_item_order_menu UNIQUE (order_id, menu_item_id),
    CONSTRAINT ck_order_item_price CHECK (unit_price_snapshot BETWEEN 1 AND 10000000),
    CONSTRAINT ck_order_item_quantity CHECK (quantity BETWEEN 1 AND 99),
    CONSTRAINT ck_order_item_subtotal CHECK (subtotal = unit_price_snapshot::BIGINT * quantity)
);

CREATE TABLE mock_payment (
    id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id         UUID          NOT NULL UNIQUE REFERENCES orders (id),
    payment_method   VARCHAR(5)    NOT NULL,
    amount_tendered  BIGINT,
    change_amount    BIGINT,
    amount_paid      BIGINT        NOT NULL,
    paid_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ck_mock_payment_method CHECK (payment_method IN ('CASH', 'QRIS', 'CARD')),
    CONSTRAINT ck_mock_payment_amount_positive CHECK (amount_paid > 0),
    CONSTRAINT ck_mock_payment_cash_fields CHECK (
        (payment_method = 'CASH'
            AND amount_tendered IS NOT NULL
            AND change_amount IS NOT NULL
            AND amount_tendered >= amount_paid
            AND change_amount = amount_tendered - amount_paid)
        OR
        (payment_method <> 'CASH'
            AND amount_tendered IS NULL
            AND change_amount IS NULL)
    )
);
