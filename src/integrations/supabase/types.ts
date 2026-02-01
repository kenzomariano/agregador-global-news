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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      article_tags: {
        Row: {
          article_id: string | null
          created_at: string | null
          id: string
          tag: string
        }
        Insert: {
          article_id?: string | null
          created_at?: string | null
          id?: string
          tag: string
        }
        Update: {
          article_id?: string | null
          created_at?: string | null
          id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_tags_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          category: Database["public"]["Enums"]["news_category"]
          content: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_translated: boolean | null
          original_url: string
          published_at: string | null
          slug: string
          source_id: string | null
          title: string
          updated_at: string | null
          video_url: string | null
          views_count: number | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["news_category"]
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_translated?: boolean | null
          original_url: string
          published_at?: string | null
          slug: string
          source_id?: string | null
          title: string
          updated_at?: string | null
          video_url?: string | null
          views_count?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["news_category"]
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_translated?: boolean | null
          original_url?: string
          published_at?: string | null
          slug?: string
          source_id?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "news_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      news_sources: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_foreign: boolean | null
          logo_url: string | null
          name: string
          sitemap_url: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_foreign?: boolean | null
          logo_url?: string | null
          name: string
          sitemap_url?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_foreign?: boolean | null
          logo_url?: string | null
          name?: string
          sitemap_url?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          original_url: string
          price: number | null
          scraped_at: string | null
          slug: string
          source_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          original_url: string
          price?: number | null
          scraped_at?: string | null
          slug: string
          source_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          original_url?: string
          price?: number | null
          scraped_at?: string | null
          slug?: string
          source_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "news_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tmdb_cache: {
        Row: {
          backdrop_path: string | null
          created_at: string | null
          genre_ids: number[] | null
          id: string
          is_trending: boolean | null
          media_type: string
          original_title: string | null
          overview: string | null
          popularity: number | null
          poster_path: string | null
          release_date: string | null
          title: string
          tmdb_id: number
          updated_at: string | null
          vote_average: number | null
        }
        Insert: {
          backdrop_path?: string | null
          created_at?: string | null
          genre_ids?: number[] | null
          id?: string
          is_trending?: boolean | null
          media_type: string
          original_title?: string | null
          overview?: string | null
          popularity?: number | null
          poster_path?: string | null
          release_date?: string | null
          title: string
          tmdb_id: number
          updated_at?: string | null
          vote_average?: number | null
        }
        Update: {
          backdrop_path?: string | null
          created_at?: string | null
          genre_ids?: number[] | null
          id?: string
          is_trending?: boolean | null
          media_type?: string
          original_title?: string | null
          overview?: string | null
          popularity?: number | null
          poster_path?: string | null
          release_date?: string | null
          title?: string
          tmdb_id?: number
          updated_at?: string | null
          vote_average?: number | null
        }
        Relationships: []
      }
      tmdb_trailers: {
        Row: {
          created_at: string | null
          id: string
          is_official: boolean | null
          media_type: string
          tmdb_id: number
          video_key: string
          video_name: string | null
          video_site: string | null
          video_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_official?: boolean | null
          media_type: string
          tmdb_id: number
          video_key: string
          video_name?: string | null
          video_site?: string | null
          video_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_official?: boolean | null
          media_type?: string
          tmdb_id?: number
          video_key?: string
          video_name?: string | null
          video_site?: string | null
          video_type?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      generate_slug: { Args: { title: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_article_views: {
        Args: { article_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      news_category:
        | "politica"
        | "economia"
        | "tecnologia"
        | "esportes"
        | "entretenimento"
        | "saude"
        | "ciencia"
        | "mundo"
        | "brasil"
        | "cultura"
      source_type: "article" | "product"
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
      app_role: ["admin", "moderator", "user"],
      news_category: [
        "politica",
        "economia",
        "tecnologia",
        "esportes",
        "entretenimento",
        "saude",
        "ciencia",
        "mundo",
        "brasil",
        "cultura",
      ],
      source_type: ["article", "product"],
    },
  },
} as const
