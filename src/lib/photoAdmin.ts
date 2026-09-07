import { supabase } from "@/integrations/supabase/client";
import { DERIVATIVES_BUCKET, ORIGINALS_BUCKET } from "@/lib/storage";

export type DeletablePhoto = {
  id: string;
  original_path: string;
  thumbnail_path: string | null;
  preview_path: string | null;
};

/** Admin-only: removes the photo row and every stored file behind it. */
export async function deletePhoto(photo: DeletablePhoto) {
  const derivatives = [photo.thumbnail_path, photo.preview_path].filter(
    (p): p is string => Boolean(p),
  );
  if (derivatives.length) {
    await supabase.storage.from(DERIVATIVES_BUCKET).remove(derivatives);
  }
  await supabase.storage.from(ORIGINALS_BUCKET).remove([photo.original_path]);
  const { error } = await supabase.from("photos").delete().eq("id", photo.id);
  if (error) throw error;
}
