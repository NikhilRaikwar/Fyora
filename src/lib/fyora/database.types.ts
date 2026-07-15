export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      payments: {
        Row: {
          amount_usd: number;
          confirmed_at: string | null;
          created_at: string;
          destination_chain_id: number;
          destination_chain_slug: string;
          destination_network_type: string;
          destination_receiver_address: string;
          destination_token_address: string;
          destination_token_decimals: number;
          destination_token_symbol: string;
          error_code: string | null;
          error_message: string | null;
          id: string;
          idempotency_key: string;
          note: string | null;
          particle_transaction_id: string | null;
          profile_id: string;
          raw_result: Json | null;
          source_evidence: Json;
          status: string;
          submitted_at: string | null;
          supporter_emoji: string;
          supporter_evm_address: string;
          supporter_name: string | null;
          universalx_url: string | null;
          updated_at: string;
        };
        Insert: {
          amount_usd: number;
          confirmed_at?: string | null;
          created_at?: string;
          destination_chain_id: number;
          destination_chain_slug: string;
          destination_network_type: string;
          destination_receiver_address: string;
          destination_token_address: string;
          destination_token_decimals: number;
          destination_token_symbol: string;
          error_code?: string | null;
          error_message?: string | null;
          id?: string;
          idempotency_key: string;
          note?: string | null;
          particle_transaction_id?: string | null;
          profile_id: string;
          raw_result?: Json | null;
          source_evidence?: Json;
          status?: string;
          submitted_at?: string | null;
          supporter_emoji?: string;
          supporter_evm_address: string;
          supporter_name?: string | null;
          universalx_url?: string | null;
          updated_at?: string;
        };
        Update: {
          amount_usd?: number;
          confirmed_at?: string | null;
          created_at?: string;
          destination_chain_id?: number;
          destination_chain_slug?: string;
          destination_network_type?: string;
          destination_receiver_address?: string;
          destination_token_address?: string;
          destination_token_decimals?: number;
          destination_token_symbol?: string;
          error_code?: string | null;
          error_message?: string | null;
          id?: string;
          idempotency_key?: string;
          note?: string | null;
          particle_transaction_id?: string | null;
          profile_id?: string;
          raw_result?: Json | null;
          source_evidence?: Json;
          status?: string;
          submitted_at?: string | null;
          supporter_emoji?: string;
          supporter_evm_address?: string;
          supporter_name?: string | null;
          universalx_url?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          avatar_emoji: string;
          bio: string;
          created_at: string;
          display_name: string;
          gradient: Json;
          handle: string;
          id: string;
          owner_email: string | null;
          owner_evm_address: string;
          owner_magic_issuer: string | null;
          owner_particle_uuid: string;
          owner_solana_address: string | null;
          published: boolean;
          socials: Json;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          avatar_emoji?: string;
          bio?: string;
          created_at?: string;
          display_name: string;
          gradient?: Json;
          handle: string;
          id?: string;
          owner_email?: string | null;
          owner_evm_address: string;
          owner_magic_issuer?: string | null;
          owner_particle_uuid: string;
          owner_solana_address?: string | null;
          published?: boolean;
          socials?: Json;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          avatar_emoji?: string;
          bio?: string;
          created_at?: string;
          display_name?: string;
          gradient?: Json;
          handle?: string;
          id?: string;
          owner_email?: string | null;
          owner_evm_address?: string;
          owner_magic_issuer?: string | null;
          owner_particle_uuid?: string;
          owner_solana_address?: string | null;
          published?: boolean;
          socials?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      settlement_configs: {
        Row: {
          chain_id: number;
          chain_slug: string;
          created_at: string;
          id: string;
          network_type: string;
          profile_id: string;
          receiver_address: string;
          token_address: string;
          token_decimals: number;
          token_symbol: string;
          updated_at: string;
        };
        Insert: {
          chain_id: number;
          chain_slug: string;
          created_at?: string;
          id?: string;
          network_type: string;
          profile_id: string;
          receiver_address: string;
          token_address: string;
          token_decimals: number;
          token_symbol: string;
          updated_at?: string;
        };
        Update: {
          chain_id?: number;
          chain_slug?: string;
          created_at?: string;
          id?: string;
          network_type?: string;
          profile_id?: string;
          receiver_address?: string;
          token_address?: string;
          token_decimals?: number;
          token_symbol?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "settlement_configs_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
