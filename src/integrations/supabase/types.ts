export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      albums: {
        Row: {
          cover_photo_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_photo_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_photo_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "albums_cover_photo_fk"
            columns: ["cover_photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      face_search_matches: {
        Row: {
          created_at: string
          id: string
          photo_id: string
          search_id: string
          similarity: number
        }
        Insert: {
          created_at?: string
          id?: string
          photo_id: string
          search_id: string
          similarity?: number
        }
        Update: {
          created_at?: string
          id?: string
          photo_id?: string
          search_id?: string
          similarity?: number
        }
        Relationships: [
          {
            foreignKeyName: "face_search_matches_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "face_search_matches_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "face_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      face_searches: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          expires_at: string
          id: string
          provider: string | null
          requester_id: string
          selfie_path: string
          status: Database["public"]["Enums"]["search_status"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string
          id?: string
          provider?: string | null
          requester_id: string
          selfie_path: string
          status?: Database["public"]["Enums"]["search_status"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string
          id?: string
          provider?: string | null
          requester_id?: string
          selfie_path?: string
          status?: Database["public"]["Enums"]["search_status"]
        }
        Relationships: []
      }
      photo_faces: {
        Row: {
          bounding_box: Json | null
          created_at: string
          detection_confidence: number | null
          embedding: Json | null
          external_face_id: string | null
          id: string
          photo_id: string
          provider: string
        }
        Insert: {
          bounding_box?: Json | null
          created_at?: string
          detection_confidence?: number | null
          embedding?: Json | null
          external_face_id?: string | null
          id?: string
          photo_id: string
          provider?: string
        }
        Update: {
          bounding_box?: Json | null
          created_at?: string
          detection_confidence?: number | null
          embedding?: Json | null
          external_face_id?: string | null
          id?: string
          photo_id?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_faces_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          album_id: string | null
          caption: string | null
          checksum: string | null
          created_at: string
          face_index_status: Database["public"]["Enums"]["face_index_status"]
          file_name: string
          height: number | null
          id: string
          library: Database["public"]["Enums"]["photo_library"]
          mime_type: string
          original_path: string
          preview_path: string | null
          size_bytes: number
          taken_at: string | null
          thumbnail_path: string | null
          updated_at: string
          upload_status: Database["public"]["Enums"]["upload_status"]
          uploader_id: string
          width: number | null
        }
        Insert: {
          album_id?: string | null
          caption?: string | null
          checksum?: string | null
          created_at?: string
          face_index_status?: Database["public"]["Enums"]["face_index_status"]
          file_name: string
          height?: number | null
          id?: string
          library?: Database["public"]["Enums"]["photo_library"]
          mime_type?: string
          original_path: string
          preview_path?: string | null
          size_bytes?: number
          taken_at?: string | null
          thumbnail_path?: string | null
          updated_at?: string
          upload_status?: Database["public"]["Enums"]["upload_status"]
          uploader_id: string
          width?: number | null
        }
        Update: {
          album_id?: string | null
          caption?: string | null
          checksum?: string | null
          created_at?: string
          face_index_status?: Database["public"]["Enums"]["face_index_status"]
          file_name?: string
          height?: number | null
          id?: string
          library?: Database["public"]["Enums"]["photo_library"]
          mime_type?: string
          original_path?: string
          preview_path?: string | null
          size_bytes?: number
          taken_at?: string | null
          thumbnail_path?: string | null
          updated_at?: string
          upload_status?: Database["public"]["Enums"]["upload_status"]
          uploader_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      upload_sessions: {
        Row: {
          album_id: string | null
          bytes_uploaded: number
          checksum: string | null
          created_at: string
          error_message: string | null
          file_name: string
          id: string
          library: Database["public"]["Enums"]["photo_library"]
          mime_type: string
          resume_url: string | null
          size_bytes: number
          status: Database["public"]["Enums"]["upload_status"]
          storage_path: string
          updated_at: string
          uploader_id: string
        }
        Insert: {
          album_id?: string | null
          bytes_uploaded?: number
          checksum?: string | null
          created_at?: string
          error_message?: string | null
          file_name: string
          id?: string
          library?: Database["public"]["Enums"]["photo_library"]
          mime_type?: string
          resume_url?: string | null
          size_bytes?: number
          status?: Database["public"]["Enums"]["upload_status"]
          storage_path: string
          updated_at?: string
          uploader_id: string
        }
        Update: {
          album_id?: string | null
          bytes_uploaded?: number
          checksum?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string
          id?: string
          library?: Database["public"]["Enums"]["photo_library"]
          mime_type?: string
          resume_url?: string | null
          size_bytes?: number
          status?: Database["public"]["Enums"]["upload_status"]
          storage_path?: string
          updated_at?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_sessions_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "family"
      face_index_status:
        | "pending"
        | "processing"
        | "indexed"
        | "failed"
        | "skipped"
      photo_library: "main" | "contribution"
      search_status: "pending" | "processing" | "complete" | "failed"
      upload_status: "pending" | "uploading" | "complete" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "family"],
      face_index_status: [
        "pending",
        "processing",
        "indexed",
        "failed",
        "skipped",
      ],
      photo_library: ["main", "contribution"],
      search_status: ["pending", "processing", "complete", "failed"],
      upload_status: ["pending", "uploading", "complete", "failed"],
    },
  },
} as const
