/*
# Wallet top-up requests with payment proof and admin approval

## 1. Summary
Sellers can now request a wallet top-up themselves by stating the amount, an optional note and
an optional photo of the transfer (for example a Revolut screenshot). Platform admins review the
pending requests, open the proof photo full screen, and approve or reject each one. Approving
credits the seller's commission wallet with a top-up entry.

## 2. New tables
- `commission_topup_requests`: one row per top-up request. Stores the user, the requested amount,
  an optional note, the storage path of the optional proof photo, the status (pending, approved,
  rejected), the wallet entry created on approval, and who decided and when.

## 3. Storage
- New private bucket `payment-proofs`. Files are stored under a folder named after the uploading user.
- Users can upload only into their own folder. Users and platform admins can read files from it.

## 4. Functions
- `admin_list_commission_topups()`: pending requests with the seller's email and name. Platform admins only.
- `admin_approve_commission_topup(request_id)`: locks the request, adds a top-up wallet entry, marks it
  approved and returns the new balance. Fails if the request was already decided.
- `admin_reject_commission_topup(request_id)`: marks a pending request as rejected. No wallet change.

## 5. Security
- RLS enabled on `commission_topup_requests`. Users can read only their own requests and insert requests
  for themselves that start as pending and cannot carry a decision or wallet link.
- Users have no update or delete access. All decisions go through the admin functions.
- Storage: uploads restricted to the user's own folder; reads restricted to the owner and platform admins.

## 6. Important notes
1. Approval is the only path that changes a wallet balance from a top-up request.
2. Amounts are limited to 1 - 100000 lei, matching the existing admin adjustment limit.
*/

CREATE TABLE IF NOT EXISTS public.commission_topup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0 AND amount <= 100000),
  note text,
  proof_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  wallet_entry_id uuid REFERENCES public.commission_wallet_entries(id) ON DELETE SET NULL,
  decided_at timestamptz,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commission_topup_requests_status_idx
  ON public.commission_topup_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS commission_topup_requests_user_idx
  ON public.commission_topup_requests (user_id);

ALTER TABLE public.commission_topup_requests ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.commission_topup_requests TO authenticated;

DROP POLICY IF EXISTS "select_own_commission_topups" ON public.commission_topup_requests;
CREATE POLICY "select_own_commission_topups"
ON public.commission_topup_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_commission_topups" ON public.commission_topup_requests;
CREATE POLICY "insert_own_commission_topups"
ON public.commission_topup_requests FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND wallet_entry_id IS NULL
  AND decided_at IS NULL
  AND decided_by IS NULL
  AND (proof_path IS NULL OR proof_path LIKE auth.uid()::text || '/%')
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "upload_own_payment_proofs" ON storage.objects;
CREATE POLICY "upload_own_payment_proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "read_payment_proofs" ON storage.objects;
CREATE POLICY "read_payment_proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_platform_admin()
  )
);

CREATE OR REPLACE FUNCTION public.admin_list_commission_topups()
RETURNS TABLE (
  t_id uuid,
  t_user_id uuid,
  t_user_email text,
  t_user_name text,
  t_amount numeric,
  t_note text,
  t_proof_path text,
  t_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  RETURN QUERY
  SELECT r.id, r.user_id, p.email, p.breeder_name, r.amount, r.note, r.proof_path, r.created_at
  FROM public.commission_topup_requests r
  LEFT JOIN public.profiles p ON p.id = r.user_id
  WHERE r.status = 'pending'
  ORDER BY r.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_approve_commission_topup(p_request_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_req public.commission_topup_requests%ROWTYPE;
  v_entry_id uuid;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  SELECT * INTO v_req
  FROM public.commission_topup_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_not_found';
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'request_already_decided';
  END IF;

  INSERT INTO public.commission_wallet_entries (user_id, kind, amount, note)
  VALUES (
    v_req.user_id,
    'top_up',
    v_req.amount,
    COALESCE(NULLIF(btrim(COALESCE(v_req.note, '')), ''), 'Alimentare prin transfer')
  )
  RETURNING id INTO v_entry_id;

  UPDATE public.commission_topup_requests
  SET status = 'approved',
      wallet_entry_id = v_entry_id,
      decided_at = now(),
      decided_by = auth.uid()
  WHERE id = p_request_id;

  RETURN public.commission_wallet_balance(v_req.user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reject_commission_topup(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  UPDATE public.commission_topup_requests
  SET status = 'rejected',
      decided_at = now(),
      decided_by = auth.uid()
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'request_already_decided';
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_list_commission_topups() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_approve_commission_topup(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_commission_topup(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_commission_topups() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_commission_topup(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_commission_topup(uuid) TO authenticated;
