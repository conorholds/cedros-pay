-- DB-FLOAT: Migrate coupons.discount_value from DOUBLE PRECISION to NUMERIC(18,6)
-- Prevents floating-point rounding errors in discount calculations.

ALTER TABLE coupons
    ALTER COLUMN discount_value TYPE NUMERIC(18,6)
    USING discount_value::NUMERIC(18,6);
