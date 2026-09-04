-- Face search feature removed
DROP TABLE IF EXISTS public.face_search_matches;
DROP TABLE IF EXISTS public.face_searches;
DROP TABLE IF EXISTS public.photo_faces;
DROP POLICY IF EXISTS "selfies_own_all" ON storage.objects;

-- Guest-friendly photo metadata
ALTER TABLE public.photos ALTER COLUMN uploader_id DROP NOT NULL;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS contributor_name text;

ALTER TABLE public.upload_sessions ALTER COLUMN uploader_id DROP NOT NULL;

GRANT SELECT ON public.albums TO anon;
GRANT SELECT, INSERT ON public.photos TO anon;
GRANT SELECT, INSERT, UPDATE ON public.upload_sessions TO anon;

-- Public (link-based) read access
CREATE POLICY albums_select_public ON public.albums FOR SELECT TO anon USING (true);
CREATE POLICY photos_select_public ON public.photos FOR SELECT TO anon USING (true);

-- Guest contributions only
CREATE POLICY photos_guest_contribute ON public.photos FOR INSERT TO anon
  WITH CHECK (library = 'contribution'::photo_library AND uploader_id IS NULL
    AND contributor_name IS NOT NULL AND length(btrim(contributor_name)) BETWEEN 1 AND 60);

CREATE POLICY upload_sessions_guest_insert ON public.upload_sessions FOR INSERT TO anon
  WITH CHECK (uploader_id IS NULL AND library = 'contribution'::photo_library);
CREATE POLICY upload_sessions_guest_update ON public.upload_sessions FOR UPDATE TO anon
  USING (uploader_id IS NULL) WITH CHECK (uploader_id IS NULL);
CREATE POLICY upload_sessions_guest_select ON public.upload_sessions FOR SELECT TO anon
  USING (uploader_id IS NULL);

-- Storage: anyone with the link can read photos and derivatives
CREATE POLICY originals_read_public ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'family-originals');
CREATE POLICY derivatives_read_public ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'family-derivatives');

-- Storage: guests may only write into the contributions folder + derivatives
CREATE POLICY originals_guest_contrib_write ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'family-originals' AND (storage.foldername(name))[1] = 'contrib');
CREATE POLICY derivatives_guest_write ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'family-derivatives');