ALTER TABLE schedules
  ADD CONSTRAINT schedules_tenant_employee_day_unique
  UNIQUE (tenant_id, employee_id, day_of_week);
