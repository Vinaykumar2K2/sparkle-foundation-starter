import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAlbums() {
  return useQuery({
    queryKey: ["albums"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("albums")
        .select("id, title, event_date")
        .order("event_date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
}
