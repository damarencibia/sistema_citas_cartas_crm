export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type TableDef<Row> = {
  Row: Row;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: Relationship[];
};

export type Database = {
  public: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Tables: {
      tenants: TableDef<{
        id: string;
        name: string;
        slug: string;
        email: string;
        phone: string | null;
        address: string | null;
        logo_url: string | null;
        primary_color: string;
        secondary_color: string;
        plan_id: string;
        status: string;
        modules: Json;
        trial_ends_at: string | null;
        subscription_ends_at: string | null;
        timezone: string;
        locale: string;
        config: Json;
        created_at: string;
        updated_at: string;
        deleted_at: string | null;
      }>;
      users: TableDef<{
        id: string;
        tenant_id: string | null;
        supabase_user_id: string;
        email: string;
        first_name: string;
        last_name: string;
        phone: string | null;
        avatar_url: string | null;
        role: string;
        is_active: boolean;
        last_login_at: string | null;
        created_at: string;
        updated_at: string;
        deleted_at: string | null;
      }>;
      services: TableDef<{
        id: string;
        tenant_id: string;
        name: string;
        description: string | null;
        duration_minutes: number;
        price: number;
        color: string;
        category: string | null;
        image_url: string | null;
        is_active: boolean;
        sort_order: number;
        created_at: string;
        updated_at: string;
        deleted_at: string | null;
      }>;
      employees: TableDef<{
        id: string;
        tenant_id: string;
        user_id: string | null;
        first_name: string;
        last_name: string;
        email: string | null;
        phone: string | null;
        color: string;
        is_active: boolean;
        created_at: string;
        updated_at: string;
        deleted_at: string | null;
      }>;
      bookings: TableDef<{
        id: string;
        tenant_id: string;
        customer_id: string | null;
        service_id: string;
        employee_id: string;
        date: string;
        start_time: string;
        end_time: string;
        status: string;
        cancellation_reason: string | null;
        cancelled_by: string | null;
        cancelled_at: string | null;
        customer_name: string | null;
        customer_email: string | null;
        customer_phone: string | null;
        notes: string | null;
        source: string;
        created_at: string;
        updated_at: string;
        deleted_at: string | null;
      }>;
      products: TableDef<{
        id: string;
        tenant_id: string;
        category_id: string;
        name: string;
        description: string | null;
        price: number;
        images: string[];
        is_available: boolean;
        is_featured: boolean;
        has_variants: boolean;
        has_extras: boolean;
        sort_order: number;
        created_at: string;
        updated_at: string;
        deleted_at: string | null;
      }>;
      orders: TableDef<{
        id: string;
        tenant_id: string;
        table_id: string | null;
        customer_id: string | null;
        customer_name: string | null;
        customer_email: string | null;
        customer_phone: string | null;
        status: string;
        notes: string | null;
        total_amount: number;
        created_at: string;
        updated_at: string;
      }>;
      customers: TableDef<{
        id: string;
        tenant_id: string;
        supabase_user_id: string | null;
        first_name: string;
        last_name: string;
        email: string | null;
        phone: string | null;
        notes: string | null;
        total_visits: number;
        total_spent: number;
        last_visit_at: string | null;
        created_at: string;
        updated_at: string;
        deleted_at: string | null;
      }>;
    };
  };
};
