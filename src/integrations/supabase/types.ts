export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      conversations: {
        Row: {
          created_at: string;
          id: string;
          last_message_at: string;
          visitor_name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_message_at?: string;
          visitor_name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_message_at?: string;
          visitor_name?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          sender: string;
        };
        Insert: {
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          sender: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          sender?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      patients: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          phone: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          phone?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          phone?: string | null;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          created_at: string;
          id: string;
          patient_id: string;
          scheduled_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
          treatment: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          patient_id: string;
          scheduled_at: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          treatment: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          patient_id?: string;
          scheduled_at?: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          treatment?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          appointment_id: string | null;
          created_at: string;
          id: string;
          paid_at: string | null;
          patient_id: string | null;
          status: Database["public"]["Enums"]["payment_status"];
        };
        Insert: {
          amount: number;
          appointment_id?: string | null;
          created_at?: string;
          id?: string;
          paid_at?: string | null;
          patient_id?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
        };
        Update: {
          amount?: number;
          appointment_id?: string | null;
          created_at?: string;
          id?: string;
          paid_at?: string | null;
          patient_id?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
        };
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey";
            columns: ["appointment_id"];
            isOneToOne: false;
            referencedRelation: "appointments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          phone: string | null;
          source: string | null;
          status: Database["public"]["Enums"]["lead_status"];
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          phone?: string | null;
          source?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          phone?: string | null;
          source?: string | null;
          status?: Database["public"]["Enums"]["lead_status"];
        };
        Relationships: [];
      };
      treatments: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          duration_minutes: number | null;
          id: string;
          name: string;
          price: number | null;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number | null;
          id?: string;
          name: string;
          price?: number | null;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number | null;
          id?: string;
          name?: string;
          price?: number | null;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          created_at: string;
          id: string;
          notes: string | null;
          patient_id: string;
          status: string;
          treatment: string;
          value: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          patient_id: string;
          status?: string;
          treatment: string;
          value: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          patient_id?: string;
          status?: string;
          treatment?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      prescriptions: {
        Row: {
          created_at: string;
          id: string;
          instructions: string | null;
          issued_at: string;
          medication: string;
          patient_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          instructions?: string | null;
          issued_at?: string;
          medication: string;
          patient_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          instructions?: string | null;
          issued_at?: string;
          medication?: string;
          patient_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prescriptions_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          category: string | null;
          created_at: string;
          id: string;
          patient_id: string | null;
          title: string;
          url: string | null;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          id?: string;
          patient_id?: string | null;
          title: string;
          url?: string | null;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          id?: string;
          patient_id?: string | null;
          title?: string;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_contacts: {
        Row: {
          created_at: string;
          id: string;
          last_contact_at: string;
          last_message: string | null;
          name: string;
          phone: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_contact_at?: string;
          last_message?: string | null;
          name: string;
          phone: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_contact_at?: string;
          last_message?: string | null;
          name?: string;
          phone?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          price: number | null;
          sort_order: number;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          price?: number | null;
          sort_order?: number;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          price?: number | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      clinic_settings: {
        Row: {
          address: string | null;
          ai_secretary_enabled: boolean;
          clinic_name: string | null;
          id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          ai_secretary_enabled?: boolean;
          clinic_name?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          ai_secretary_enabled?: boolean;
          clinic_name?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      blog_posts: {
        Row: {
          category: string;
          content: string;
          cover_image_url: string | null;
          created_at: string;
          excerpt: string | null;
          id: string;
          published_at: string | null;
          slug: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          category?: string;
          content: string;
          cover_image_url?: string | null;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          published_at?: string | null;
          slug: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          content?: string;
          cover_image_url?: string | null;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          published_at?: string | null;
          slug?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      patient_anamnesis: {
        Row: {
          additional_notes: string | null;
          allergies: string | null;
          current_medications: string | null;
          has_diabetes: boolean;
          has_heart_condition: boolean;
          has_hypertension: boolean;
          is_pregnant: boolean;
          is_smoker: boolean;
          patient_id: string;
          previous_surgeries: string | null;
          systemic_conditions: string | null;
          updated_at: string;
        };
        Insert: {
          additional_notes?: string | null;
          allergies?: string | null;
          current_medications?: string | null;
          has_diabetes?: boolean;
          has_heart_condition?: boolean;
          has_hypertension?: boolean;
          is_pregnant?: boolean;
          is_smoker?: boolean;
          patient_id: string;
          previous_surgeries?: string | null;
          systemic_conditions?: string | null;
          updated_at?: string;
        };
        Update: {
          additional_notes?: string | null;
          allergies?: string | null;
          current_medications?: string | null;
          has_diabetes?: boolean;
          has_heart_condition?: boolean;
          has_hypertension?: boolean;
          is_pregnant?: boolean;
          is_smoker?: boolean;
          patient_id?: string;
          previous_surgeries?: string | null;
          systemic_conditions?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "patient_anamnesis_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: true;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      tooth_records: {
        Row: {
          condition: string;
          id: string;
          notes: string | null;
          patient_id: string;
          tooth_number: number;
          updated_at: string;
        };
        Insert: {
          condition?: string;
          id?: string;
          notes?: string | null;
          patient_id: string;
          tooth_number: number;
          updated_at?: string;
        };
        Update: {
          condition?: string;
          id?: string;
          notes?: string | null;
          patient_id?: string;
          tooth_number?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tooth_records_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      clinical_notes: {
        Row: {
          created_at: string;
          id: string;
          note: string;
          patient_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          note: string;
          patient_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          note?: string;
          patient_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clinical_notes_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "user";
      appointment_status: "agendado" | "confirmado" | "concluido" | "cancelado";
      payment_status: "pendente" | "pago" | "cancelado";
      lead_status: "novo" | "em_contato" | "convertido" | "perdido";
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
    Enums: {
      app_role: ["admin", "user"],
      appointment_status: ["agendado", "confirmado", "concluido", "cancelado"],
      payment_status: ["pendente", "pago", "cancelado"],
      lead_status: ["novo", "em_contato", "convertido", "perdido"],
    },
  },
} as const;
