-- Add foreign keys that reference customers (created in migration 00011)
ALTER TABLE bookings
  ADD CONSTRAINT fk_bookings_customer
  FOREIGN KEY (customer_id) REFERENCES customers(id);

ALTER TABLE orders
  ADD CONSTRAINT fk_orders_customer
  FOREIGN KEY (customer_id) REFERENCES customers(id);
