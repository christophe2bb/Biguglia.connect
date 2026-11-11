-- Déjà appliqué dans Supabase de production (version 20261111035805).
-- Après un commentaire autorisé par RLS d'un autre utilisateur, les demandes
-- submitted/viewed deviennent replied. Les commentaires du propriétaire
-- n'entraînent pas cette transition ; une demande résolue reste résolue.
CREATE OR REPLACE FUNCTION public.mark_service_request_replied_from_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
  UPDATE public.service_requests r
     SET status='replied',updated_at=now()
   WHERE r.id=NEW.request_id AND r.resident_id<>NEW.author_id
     AND r.status IN ('submitted','viewed');
  RETURN NEW;
END;
$fn$;
REVOKE EXECUTE ON FUNCTION public.mark_service_request_replied_from_comment()
  FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS request_comments_mark_request_replied ON public.request_comments;
CREATE TRIGGER request_comments_mark_request_replied
AFTER INSERT ON public.request_comments
FOR EACH ROW EXECUTE FUNCTION public.mark_service_request_replied_from_comment();

-- Test transactionnel ROLLBACK réussi : commentaire auteur => submitted ;
-- commentaire d'un autre habitant autorisé => replied ;
-- la fonction n'est pas publiquement exécutable.
