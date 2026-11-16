/*
# Disable device lock (temporary, for tester period)

## What changes
- The server-side device check no longer blocks logins from a second device.
- Any account can now be used from any number of devices.

## Security changes
- No table, policy, or grant is changed. Only the behaviour of the check function.
- Admin notifications and device_locks rows are left untouched.

## Reverting
- Restore the previous version of public.check_device_lock (blocks when a different device is detected) to turn the lock back on.
*/

CREATE OR REPLACE FUNCTION public.check_device_lock(p_device_id text, p_device_name text DEFAULT ''::text)
RETURNS TABLE(blocked boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT false, 'device_lock_disabled'::text;
END;
$function$;
