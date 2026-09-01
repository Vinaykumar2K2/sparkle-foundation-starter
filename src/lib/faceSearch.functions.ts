import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * FACE RECOGNITION SERVICE BOUNDARY
 * ---------------------------------
 * This app deliberately does NOT ship a fake face matcher. Real matching needs a
 * face-recognition provider (AWS Rekognition collections, Azure Face, Face++,
 * or a self-hosted InsightFace/embedding service).
 *
 * To go live, set the server secrets FACE_PROVIDER and FACE_PROVIDER_API_KEY and
 * implement the two marked integration points below:
 *   1. indexPhotoFaces  — detect faces in a main-library photo, store embeddings
 *                         / external face ids in `photo_faces`.
 *   2. runSelfieSearch  — embed the selfie, query the index, write ranked
 *                         `face_search_matches` rows with an explicit similarity.
 * Until then every call reports `configured: false` so the UI can say plainly
 * that matching is not enabled instead of inventing results.
 */

function providerConfig() {
  const provider = process.env["FACE_PROVIDER"];
  const apiKey = process.env["FACE_PROVIDER_API_KEY"];
  return { provider, apiKey, configured: Boolean(provider && apiKey) };
}

export const getFaceProviderStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { provider, configured } = providerConfig();
    return { configured, provider: provider ?? null };
  });

/** Starts a selfie search. The selfie stays in the private selfie bucket and is never added to the gallery. */
export const runSelfieSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { selfiePath: string }) => {
    if (!input?.selfiePath || typeof input.selfiePath !== "string") {
      throw new Error("selfiePath is required");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { provider, configured } = providerConfig();

    const { data: search, error } = await supabase
      .from("face_searches")
      .insert({
        requester_id: userId,
        selfie_path: data.selfiePath,
        status: configured ? "processing" : "failed",
        provider: provider ?? null,
        ...(configured ? {} : { error_message: "Face matching provider is not configured yet." }),
      })
      .select("id")
      .single();
    if (error) throw error;

    if (!configured) {
      return { searchId: search.id, configured: false as const, matches: [] };
    }

    // === INTEGRATION POINT: call the face provider here ===
    // const embedding = await provider.embed(selfieBytes)
    // const hits = await provider.search(embedding, { threshold: 0.75 })
    // insert hits into face_search_matches with their real similarity scores
    // then mark the search complete.
    await supabase
      .from("face_searches")
      .update({
        status: "failed",
        error_message: `Provider "${provider}" is configured but the integration is not implemented.`,
      })
      .eq("id", search.id);

    return { searchId: search.id, configured: true as const, matches: [] };
  });

/** Queues main-library photos for background face indexing. */
export const queueFaceIndexing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { configured } = providerConfig();
    const { count } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("library", "main")
      .eq("face_index_status", "pending");

    // === INTEGRATION POINT: hand pending photos to the provider's indexer ===
    return { pending: count ?? 0, configured };
  });
