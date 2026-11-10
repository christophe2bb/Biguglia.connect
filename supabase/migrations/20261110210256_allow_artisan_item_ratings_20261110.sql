-- Applied to production on 2026-11-10 as Supabase migration 20261110210256.
-- Fix: the existing item_ratings_target_type_check omitted 'artisan' even though
-- the user-facing RatingWidget and can_rate_item('artisan', ...) used it.
-- Keep all previous target types; add artisan without altering existing ratings.
ALTER TABLE public.item_ratings
DROP CONSTRAINT item_ratings_target_type_check;
ALTER TABLE public.item_ratings
ADD CONSTRAINT item_ratings_target_type_check
CHECK (target_type = ANY (ARRAY[
 'listing','equipment','help_request','lost_found','association',
 'outing','collection_item','event','promenade','service_request','artisan'
]));

-- Verified with a temporary conversation (two participants), temporary
-- customer message, and an INSERT into item_ratings as ROLE authenticated.
-- All test data were rolled back.
