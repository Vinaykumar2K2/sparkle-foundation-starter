-- originals
CREATE POLICY "originals_read_authenticated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'family-originals');
CREATE POLICY "originals_admin_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'family-originals' AND (storage.foldername(name))[1] = 'main' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "originals_contrib_write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'family-originals' AND (storage.foldername(name))[1] = 'contrib' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "originals_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'family-originals' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "originals_contrib_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'family-originals' AND (storage.foldername(name))[1] = 'contrib' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "originals_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'family-originals' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "originals_contrib_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'family-originals' AND (storage.foldername(name))[1] = 'contrib' AND (storage.foldername(name))[2] = auth.uid()::text);

-- derivatives (thumbnails / previews)
CREATE POLICY "derivatives_read_authenticated" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'family-derivatives');
CREATE POLICY "derivatives_write_authenticated" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'family-derivatives');
CREATE POLICY "derivatives_update_authenticated" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'family-derivatives');
CREATE POLICY "derivatives_delete_admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'family-derivatives' AND public.has_role(auth.uid(), 'admin'));

-- selfies (temporary, private per user)
CREATE POLICY "selfies_own_all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'family-selfies' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'family-selfies' AND (storage.foldername(name))[1] = auth.uid()::text);