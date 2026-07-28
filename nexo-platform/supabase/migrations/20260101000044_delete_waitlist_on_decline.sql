-- Delete waitlist records on decline/expire instead of marking them as cancelled/expired

-- 1. Update decline_waitlist_offer to DELETE instead of UPDATE
CREATE OR REPLACE FUNCTION decline_waitlist_offer(
  p_token VARCHAR(64)
)
RETURNS TABLE (
  success BOOLEAN,
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  SELECT id INTO v_entry_id
  FROM waitlist
  WHERE offer_token = p_token
    AND status = 'notified';

  IF NOT FOUND THEN
    success := FALSE;
    error := 'Oferta no encontrada o ya procesada';
    RETURN NEXT;
    RETURN;
  END IF;

  DELETE FROM waitlist WHERE id = v_entry_id;

  success := TRUE;
  error := NULL;
  RETURN NEXT;
END;
$$;

-- 2. Update expire_waitlist_offers to DELETE instead of UPDATE
CREATE OR REPLACE FUNCTION expire_waitlist_offers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM waitlist
  WHERE status = 'notified'
    AND offer_expires_at < now();
END;
$$;
