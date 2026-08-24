-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Family member',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- roles
CREATE TYPE public.app_role AS ENUM ('admin', 'family');
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- new user bootstrap: profile + first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  member_count INT;
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO member_count FROM public.user_roles;
  IF member_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'family');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- albums
CREATE TABLE public.albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  cover_photo_id UUID,
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.albums TO authenticated;
GRANT ALL ON public.albums TO service_role;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "albums_select_authenticated" ON public.albums FOR SELECT TO authenticated USING (true);
CREATE POLICY "albums_admin_write" ON public.albums FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER albums_touch BEFORE UPDATE ON public.albums FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- photos
CREATE TYPE public.photo_library AS ENUM ('main', 'contribution');
CREATE TYPE public.upload_status AS ENUM ('pending', 'uploading', 'complete', 'failed');
CREATE TYPE public.face_index_status AS ENUM ('pending', 'processing', 'indexed', 'failed', 'skipped');

CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library public.photo_library NOT NULL DEFAULT 'main',
  album_id UUID REFERENCES public.albums ON DELETE SET NULL,
  uploader_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  original_path TEXT NOT NULL,
  thumbnail_path TEXT,
  preview_path TEXT,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  width INT,
  height INT,
  checksum TEXT,
  caption TEXT,
  taken_at TIMESTAMPTZ,
  upload_status public.upload_status NOT NULL DEFAULT 'pending',
  face_index_status public.face_index_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX photos_library_created_idx ON public.photos (library, created_at DESC);
CREATE INDEX photos_album_idx ON public.photos (album_id);
CREATE INDEX photos_uploader_idx ON public.photos (uploader_id);
CREATE INDEX photos_face_status_idx ON public.photos (face_index_status) WHERE library = 'main';
CREATE UNIQUE INDEX photos_original_path_idx ON public.photos (original_path);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos_select_authenticated" ON public.photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "photos_admin_all" ON public.photos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "photos_contrib_insert_own" ON public.photos FOR INSERT TO authenticated
  WITH CHECK (library = 'contribution' AND uploader_id = auth.uid());
CREATE POLICY "photos_contrib_update_own" ON public.photos FOR UPDATE TO authenticated
  USING (library = 'contribution' AND uploader_id = auth.uid())
  WITH CHECK (library = 'contribution' AND uploader_id = auth.uid());
CREATE POLICY "photos_contrib_delete_own" ON public.photos FOR DELETE TO authenticated
  USING (library = 'contribution' AND uploader_id = auth.uid());
CREATE TRIGGER photos_touch BEFORE UPDATE ON public.photos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.albums ADD CONSTRAINT albums_cover_photo_fk FOREIGN KEY (cover_photo_id) REFERENCES public.photos(id) ON DELETE SET NULL;

-- resumable upload sessions
CREATE TABLE public.upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  library public.photo_library NOT NULL DEFAULT 'main',
  album_id UUID REFERENCES public.albums ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  bytes_uploaded BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  resume_url TEXT,
  checksum TEXT,
  status public.upload_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (uploader_id, storage_path)
);
CREATE INDEX upload_sessions_uploader_idx ON public.upload_sessions (uploader_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.upload_sessions TO authenticated;
GRANT ALL ON public.upload_sessions TO service_role;
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "upload_sessions_own" ON public.upload_sessions FOR ALL TO authenticated
  USING (uploader_id = auth.uid()) WITH CHECK (uploader_id = auth.uid());
CREATE TRIGGER upload_sessions_touch BEFORE UPDATE ON public.upload_sessions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- face index
CREATE TABLE public.photo_faces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES public.photos ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'pending-provider',
  external_face_id TEXT,
  bounding_box JSONB,
  embedding JSONB,
  detection_confidence REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX photo_faces_photo_idx ON public.photo_faces (photo_id);
GRANT SELECT ON public.photo_faces TO authenticated;
GRANT ALL ON public.photo_faces TO service_role;
ALTER TABLE public.photo_faces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photo_faces_select_authenticated" ON public.photo_faces FOR SELECT TO authenticated USING (true);

-- selfie searches
CREATE TYPE public.search_status AS ENUM ('pending', 'processing', 'complete', 'failed');
CREATE TABLE public.face_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  selfie_path TEXT NOT NULL,
  status public.search_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 day')
);
CREATE INDEX face_searches_requester_idx ON public.face_searches (requester_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.face_searches TO authenticated;
GRANT ALL ON public.face_searches TO service_role;
ALTER TABLE public.face_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "face_searches_own" ON public.face_searches FOR ALL TO authenticated
  USING (requester_id = auth.uid()) WITH CHECK (requester_id = auth.uid());

CREATE TABLE public.face_search_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES public.face_searches ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES public.photos ON DELETE CASCADE,
  similarity REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (search_id, photo_id)
);
CREATE INDEX face_search_matches_search_idx ON public.face_search_matches (search_id, similarity DESC);
GRANT SELECT ON public.face_search_matches TO authenticated;
GRANT ALL ON public.face_search_matches TO service_role;
ALTER TABLE public.face_search_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "face_search_matches_own" ON public.face_search_matches FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.face_searches s WHERE s.id = search_id AND s.requester_id = auth.uid()));