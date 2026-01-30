-- Add DELETE policy for admins on school_refusals
-- Why: Admins need to be able to delete refusals so students can see the apply buttons again
CREATE POLICY "Admins can delete all refusals"
    ON public.school_refusals FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'));
