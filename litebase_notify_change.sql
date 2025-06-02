CREATE OR REPLACE FUNCTION litebase_notify_change()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  operation_type TEXT;
  row_data JSONB;
BEGIN
  -- Determine operation type
  IF (TG_OP = 'INSERT') THEN
    operation_type := 'INSERT';
    row_data := to_jsonb(NEW);
  ELSIF (TG_OP = 'UPDATE') THEN
    operation_type := 'UPDATE';
    row_data := to_jsonb(NEW);
    -- Optionally, include OLD row data or differences
    -- payload := jsonb_build_object(
    --   'old_data', to_jsonb(OLD),
    --   'new_data', to_jsonb(NEW)
    -- );
  ELSIF (TG_OP = 'DELETE') THEN
    operation_type := 'DELETE';
    row_data := to_jsonb(OLD); -- For DELETE, NEW is not available
  ELSE
    RAISE WARNING '[LITEBASE_NOTIFY_CHANGE] - Other action occurred: %, at %', TG_OP, NOW();
    RETURN NULL;
  END IF;

  -- Construct the payload
  -- Arguments to the function are passed via TG_ARGV array
  -- TG_ARGV[0] would be schema_name, TG_ARGV[1] would be table_name if passed from CREATE TRIGGER
  -- However, it's more reliable to get schema and table name from TG_TABLE_SCHEMA and TG_TABLE_NAME
  payload := jsonb_build_object(
    'operation', operation_type,
    'schema_name', TG_TABLE_SCHEMA,
    'table_name', TG_TABLE_NAME,
    'data', row_data
  );

  -- Notify the channel
  PERFORM pg_notify('litebase_changes', payload::TEXT);

  RETURN NEW; -- For INSERT/UPDATE, return NEW. For DELETE, result is ignored but OLD is conventional.
END;
$$ LANGUAGE plpgsql;

-- Example of how to attach this trigger to a table:
-- CREATE TRIGGER my_table_notify_change_trigger
-- AFTER INSERT OR UPDATE OR DELETE ON my_schema.my_table
-- FOR EACH ROW EXECUTE FUNCTION litebase_notify_change();
--
-- Note: The trigger should pass schema_name and table_name as arguments if they are not
-- to be derived from TG_TABLE_SCHEMA and TG_TABLE_NAME, but using these built-in variables is preferred.
-- The current function relies on TG_TABLE_SCHEMA and TG_TABLE_NAME.
-- If specific row identifier is needed instead of full row_data for DELETEs (e.g. for large rows),
-- the function and payload can be adjusted. For example, for DELETE, one might only send primary key columns.
-- For INSERT/UPDATE, sending the full NEW row is common.
-- The `payload` variable is declared as JSONB for flexibility with JSON operations within the function,
-- but `pg_notify` expects a TEXT payload, so it's cast `payload::TEXT`.
-- The function returns NEW for INSERT/UPDATE to allow the operation to proceed.
-- For DELETE operations, the return value is ignored, but returning OLD is a common practice.
-- If the trigger is an AFTER trigger, the operation has already completed.
-- If it's a BEFORE trigger, returning NULL would cancel the operation.
-- This function is designed for AFTER triggers.
