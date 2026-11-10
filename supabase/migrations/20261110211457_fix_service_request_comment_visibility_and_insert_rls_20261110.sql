-- Already applied to Supabase production on 2026-11-10 (version 20261110211457).
-- Prevent replying to private quotes as a third-party user. Allow the designated
-- artisan to read/reply (artisan_profiles.user_id, not artisan_profiles.id).
-- For public requests, comments are visible to signed-in residents.
-- Tested in ROLLBACK with anonymous, resident owner, assigned artisan,
-- unrelated resident, and rejected unauthorized INSERT.
DROP POLICY IF EXISTS request_comments_select ON public.request_comments;
CREATE POLICY request_comments_select ON public.request_comments
FOR SELECT TO public USING (
  (select auth.uid())=author_id
  OR public.is_moderator_or_admin()
  OR EXISTS (
    SELECT 1 FROM public.service_requests sr
    WHERE sr.id=request_comments.request_id
      AND (
        sr.resident_id=(select auth.uid())
        OR (sr.artisan_id IS NULL AND (select auth.uid()) IS NOT NULL)
        OR EXISTS (
          SELECT 1 FROM public.artisan_profiles ap
          WHERE ap.id=sr.artisan_id AND ap.user_id=(select auth.uid())
        )
      )
  )
);
DROP POLICY IF EXISTS request_comments_insert ON public.request_comments;
CREATE POLICY request_comments_insert ON public.request_comments
FOR INSERT TO authenticated WITH CHECK (
  author_id=(select auth.uid())
  AND (
    public.is_moderator_or_admin()
    OR EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id=request_comments.request_id
        AND (
          sr.resident_id=(select auth.uid())
          OR sr.artisan_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.artisan_profiles ap
            WHERE ap.id=sr.artisan_id AND ap.user_id=(select auth.uid())
          )
        )
    )
  )
);
