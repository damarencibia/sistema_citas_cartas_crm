export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          created_at: string;
          details: Json | null;
          entity_id: string | null;
          entity_type: string;
          id: string;
          ip_address: unknown;
          tenant_id: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string;
          details?: Json | null;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          ip_address?: unknown;
          tenant_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string;
          details?: Json | null;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          ip_address?: unknown;
          tenant_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      booking_approvals: {
        Row: {
          action: string;
          approved_by: string | null;
          booking_id: string;
          created_at: string;
          id: string;
          reason: string | null;
          tenant_id: string;
        };
        Insert: {
          action: string;
          approved_by?: string | null;
          booking_id: string;
          created_at?: string;
          id?: string;
          reason?: string | null;
          tenant_id: string;
        };
        Update: {
          action?: string;
          approved_by?: string | null;
          booking_id?: string;
          created_at?: string;
          id?: string;
          reason?: string | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_approvals_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_approvals_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      booking_status_log: {
        Row: {
          booking_id: string;
          changed_by: string;
          changed_by_name: string | null;
          created_at: string;
          id: string;
          new_status: string;
          old_status: string | null;
          reason: string | null;
          tenant_id: string;
        };
        Insert: {
          booking_id: string;
          changed_by: string;
          changed_by_name?: string | null;
          created_at?: string;
          id?: string;
          new_status: string;
          old_status?: string | null;
          reason?: string | null;
          tenant_id: string;
        };
        Update: {
          booking_id?: string;
          changed_by?: string;
          changed_by_name?: string | null;
          created_at?: string;
          id?: string;
          new_status?: string;
          old_status?: string | null;
          reason?: string | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_status_log_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_status_log_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      booking_windows: {
        Row: {
          created_at: string;
          employee_id: string | null;
          end_date: string;
          end_time: string;
          id: string;
          is_active: boolean;
          service_id: string | null;
          slot_interval_minutes: number;
          slot_mode: string;
          start_date: string;
          start_time: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          employee_id?: string | null;
          end_date: string;
          end_time: string;
          id?: string;
          is_active?: boolean;
          service_id?: string | null;
          slot_interval_minutes?: number;
          slot_mode?: string;
          start_date: string;
          start_time: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          employee_id?: string | null;
          end_date?: string;
          end_time?: string;
          id?: string;
          is_active?: boolean;
          service_id?: string | null;
          slot_interval_minutes?: number;
          slot_mode?: string;
          start_date?: string;
          start_time?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_windows_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_windows_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'booking_windows_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      bookings: {
        Row: {
          cancellation_reason: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          created_at: string;
          custom_duration_minutes: number | null;
          customer_email: string | null;
          customer_id: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          date: string;
          deleted_at: string | null;
          employee_id: string;
          end_time: string;
          id: string;
          late_minutes: number | null;
          no_show_at: string | null;
          notes: string | null;
          participant_count: number;
          requires_approval: boolean | null;
          resource_id: string | null;
          service_id: string;
          source: string | null;
          start_time: string;
          status: string;
          tenant_id: string;
          updated_at: string;
          whatsapp_consent: boolean;
        };
        Insert: {
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_at?: string;
          custom_duration_minutes?: number | null;
          customer_email?: string | null;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          date: string;
          deleted_at?: string | null;
          employee_id: string;
          end_time: string;
          id?: string;
          late_minutes?: number | null;
          no_show_at?: string | null;
          notes?: string | null;
          participant_count?: number;
          requires_approval?: boolean | null;
          resource_id?: string | null;
          service_id: string;
          source?: string | null;
          start_time: string;
          status?: string;
          tenant_id: string;
          updated_at?: string;
          whatsapp_consent?: boolean;
        };
        Update: {
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          created_at?: string;
          custom_duration_minutes?: number | null;
          customer_email?: string | null;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          date?: string;
          deleted_at?: string | null;
          employee_id?: string;
          end_time?: string;
          id?: string;
          late_minutes?: number | null;
          no_show_at?: string | null;
          notes?: string | null;
          participant_count?: number;
          requires_approval?: boolean | null;
          resource_id?: string | null;
          service_id?: string;
          source?: string | null;
          start_time?: string;
          status?: string;
          tenant_id?: string;
          updated_at?: string;
          whatsapp_consent?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'bookings_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_bookings_customer';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fk_bookings_resource';
            columns: ['resource_id'];
            isOneToOne: false;
            referencedRelation: 'resources';
            referencedColumns: ['id'];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          icon: string | null;
          id: string;
          is_active: boolean;
          menu_id: string | null;
          name: string;
          sort_order: number;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          menu_id?: string | null;
          name: string;
          sort_order?: number;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          menu_id?: string | null;
          name?: string;
          sort_order?: number;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_menu_id_fkey';
            columns: ['menu_id'];
            isOneToOne: false;
            referencedRelation: 'menus';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'categories_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      client_blocks: {
        Row: {
          blocked_until: string;
          created_at: string;
          customer_email: string;
          id: string;
          no_show_count: number;
          reason: string | null;
          tenant_id: string;
        };
        Insert: {
          blocked_until: string;
          created_at?: string;
          customer_email: string;
          id?: string;
          no_show_count?: number;
          reason?: string | null;
          tenant_id: string;
        };
        Update: {
          blocked_until?: string;
          created_at?: string;
          customer_email?: string;
          id?: string;
          no_show_count?: number;
          reason?: string | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'client_blocks_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      customer_notes: {
        Row: {
          author_id: string;
          content: string;
          created_at: string;
          customer_id: string;
          id: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          content: string;
          created_at?: string;
          customer_id: string;
          id?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          content?: string;
          created_at?: string;
          customer_id?: string;
          id?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'customer_notes_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customer_notes_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customer_notes_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      customer_tags: {
        Row: {
          created_at: string;
          customer_id: string;
          tag_id: string;
        };
        Insert: {
          created_at?: string;
          customer_id: string;
          tag_id: string;
        };
        Update: {
          created_at?: string;
          customer_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'customer_tags_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customer_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          },
        ];
      };
      customers: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          email: string | null;
          first_name: string;
          id: string;
          last_name: string;
          last_visit_at: string | null;
          notes: string | null;
          phone: string | null;
          supabase_user_id: string | null;
          tenant_id: string;
          total_spent: number;
          total_visits: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          first_name: string;
          id?: string;
          last_name: string;
          last_visit_at?: string | null;
          notes?: string | null;
          phone?: string | null;
          supabase_user_id?: string | null;
          tenant_id: string;
          total_spent?: number;
          total_visits?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          first_name?: string;
          id?: string;
          last_name?: string;
          last_visit_at?: string | null;
          notes?: string | null;
          phone?: string | null;
          supabase_user_id?: string | null;
          tenant_id?: string;
          total_spent?: number;
          total_visits?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'customers_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      daily_closures: {
        Row: {
          attended: number;
          closed_at: string;
          closed_by: string | null;
          date: string;
          employee_id: string;
          extras: number;
          id: string;
          no_shows: number;
          reopened_at: string | null;
          tenant_id: string;
          total_attended: number;
          total_bookings: number;
        };
        Insert: {
          attended?: number;
          closed_at?: string;
          closed_by?: string | null;
          date: string;
          employee_id: string;
          extras?: number;
          id?: string;
          no_shows?: number;
          reopened_at?: string | null;
          tenant_id: string;
          total_attended?: number;
          total_bookings?: number;
        };
        Update: {
          attended?: number;
          closed_at?: string;
          closed_by?: string | null;
          date?: string;
          employee_id?: string;
          extras?: number;
          id?: string;
          no_shows?: number;
          reopened_at?: string | null;
          tenant_id?: string;
          total_attended?: number;
          total_bookings?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'daily_closures_closed_by_fkey';
            columns: ['closed_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'daily_closures_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'daily_closures_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      daily_extras: {
        Row: {
          created_at: string;
          customer_name: string;
          date: string;
          employee_id: string;
          id: string;
          notes: string | null;
          service_id: string | null;
          tenant_id: string;
        };
        Insert: {
          created_at?: string;
          customer_name: string;
          date: string;
          employee_id: string;
          id?: string;
          notes?: string | null;
          service_id?: string | null;
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          customer_name?: string;
          date?: string;
          employee_id?: string;
          id?: string;
          notes?: string | null;
          service_id?: string | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'daily_extras_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'daily_extras_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'daily_extras_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      employee_services: {
        Row: {
          created_at: string;
          employee_id: string;
          id: string;
          service_id: string;
        };
        Insert: {
          created_at?: string;
          employee_id: string;
          id?: string;
          service_id: string;
        };
        Update: {
          created_at?: string;
          employee_id?: string;
          id?: string;
          service_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'employee_services_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employee_services_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
        ];
      };
      employees: {
        Row: {
          color: string | null;
          created_at: string;
          deleted_at: string | null;
          email: string | null;
          first_name: string;
          id: string;
          is_active: boolean;
          last_name: string;
          phone: string | null;
          tenant_id: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          first_name: string;
          id?: string;
          is_active?: boolean;
          last_name: string;
          phone?: string | null;
          tenant_id: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          first_name?: string;
          id?: string;
          is_active?: boolean;
          last_name?: string;
          phone?: string | null;
          tenant_id?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'employees_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employees_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      extra_groups: {
        Row: {
          created_at: string;
          id: string;
          is_multiple: boolean;
          max_selectable: number | null;
          name: string;
          product_id: string;
          sort_order: number | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_multiple?: boolean;
          max_selectable?: number | null;
          name: string;
          product_id: string;
          sort_order?: number | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_multiple?: boolean;
          max_selectable?: number | null;
          name?: string;
          product_id?: string;
          sort_order?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'extra_groups_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      extras: {
        Row: {
          created_at: string;
          group_id: string;
          id: string;
          is_default: boolean;
          name: string;
          price: number;
          sort_order: number | null;
        };
        Insert: {
          created_at?: string;
          group_id: string;
          id?: string;
          is_default?: boolean;
          name: string;
          price?: number;
          sort_order?: number | null;
        };
        Update: {
          created_at?: string;
          group_id?: string;
          id?: string;
          is_default?: boolean;
          name?: string;
          price?: number;
          sort_order?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'extras_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'extra_groups';
            referencedColumns: ['id'];
          },
        ];
      };
      fixed_slot_definitions: {
        Row: {
          created_at: string;
          day_of_week: number;
          employee_id: string | null;
          end_time: string;
          id: string;
          is_active: boolean;
          start_time: string;
          tenant_id: string;
        };
        Insert: {
          created_at?: string;
          day_of_week: number;
          employee_id?: string | null;
          end_time: string;
          id?: string;
          is_active?: boolean;
          start_time: string;
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          day_of_week?: number;
          employee_id?: string | null;
          end_time?: string;
          id?: string;
          is_active?: boolean;
          start_time?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fixed_slot_definitions_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fixed_slot_definitions_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      holiday_exceptions: {
        Row: {
          created_at: string;
          date: string;
          end_time: string | null;
          id: string;
          is_closed: boolean;
          reason: string | null;
          start_time: string | null;
          tenant_id: string;
        };
        Insert: {
          created_at?: string;
          date: string;
          end_time?: string | null;
          id?: string;
          is_closed?: boolean;
          reason?: string | null;
          start_time?: string | null;
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          date?: string;
          end_time?: string | null;
          id?: string;
          is_closed?: boolean;
          reason?: string | null;
          start_time?: string | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'holiday_exceptions_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      loyalty_config: {
        Row: {
          created_at: string;
          currency_unit: number;
          expiry_months: number;
          id: string;
          is_active: boolean;
          points_per_currency: number;
          points_per_visit: number;
          points_to_currency: number;
          redemption_unit: number;
          tenant_id: string;
          updated_at: string;
          welcome_points: number;
        };
        Insert: {
          created_at?: string;
          currency_unit?: number;
          expiry_months?: number;
          id?: string;
          is_active?: boolean;
          points_per_currency?: number;
          points_per_visit?: number;
          points_to_currency?: number;
          redemption_unit?: number;
          tenant_id: string;
          updated_at?: string;
          welcome_points?: number;
        };
        Update: {
          created_at?: string;
          currency_unit?: number;
          expiry_months?: number;
          id?: string;
          is_active?: boolean;
          points_per_currency?: number;
          points_per_visit?: number;
          points_to_currency?: number;
          redemption_unit?: number;
          tenant_id?: string;
          updated_at?: string;
          welcome_points?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'loyalty_config_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: true;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      loyalty_points: {
        Row: {
          created_at: string;
          customer_id: string;
          expires_at: string | null;
          id: string;
          points: number;
          reason: string;
          reference_id: string | null;
          reference_type: string | null;
          tenant_id: string;
        };
        Insert: {
          created_at?: string;
          customer_id: string;
          expires_at?: string | null;
          id?: string;
          points: number;
          reason: string;
          reference_id?: string | null;
          reference_type?: string | null;
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          customer_id?: string;
          expires_at?: string | null;
          id?: string;
          points?: number;
          reason?: string;
          reference_id?: string | null;
          reference_type?: string | null;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'loyalty_points_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'loyalty_points_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      menus: {
        Row: {
          created_at: string;
          days_of_week: number[] | null;
          deleted_at: string | null;
          description: string | null;
          end_time: string | null;
          id: string;
          is_active: boolean;
          is_default: boolean;
          name: string;
          start_time: string | null;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          days_of_week?: number[] | null;
          deleted_at?: string | null;
          description?: string | null;
          end_time?: string | null;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          name: string;
          start_time?: string | null;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          days_of_week?: number[] | null;
          deleted_at?: string | null;
          description?: string | null;
          end_time?: string | null;
          id?: string;
          is_active?: boolean;
          is_default?: boolean;
          name?: string;
          start_time?: string | null;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'menus_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          data: Json;
          id: string;
          is_read: boolean;
          read_at: string | null;
          recipient_user_id: string | null;
          tenant_id: string;
          title: string;
          type: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          data?: Json;
          id?: string;
          is_read?: boolean;
          read_at?: string | null;
          recipient_user_id?: string | null;
          tenant_id: string;
          title: string;
          type: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          data?: Json;
          id?: string;
          is_read?: boolean;
          read_at?: string | null;
          recipient_user_id?: string | null;
          tenant_id?: string;
          title?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_recipient_user_id_fkey';
            columns: ['recipient_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string;
          extras: Json | null;
          id: string;
          notes: string | null;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          subtotal: number;
          unit_price: number;
          variant_name: string | null;
        };
        Insert: {
          created_at?: string;
          extras?: Json | null;
          id?: string;
          notes?: string | null;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          subtotal: number;
          unit_price: number;
          variant_name?: string | null;
        };
        Update: {
          created_at?: string;
          extras?: Json | null;
          id?: string;
          notes?: string | null;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          subtotal?: number;
          unit_price?: number;
          variant_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_items_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          created_at: string;
          customer_email: string | null;
          customer_id: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          id: string;
          notes: string | null;
          status: string;
          table_id: string | null;
          tenant_id: string;
          total_amount: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          customer_email?: string | null;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          id?: string;
          notes?: string | null;
          status?: string;
          table_id?: string | null;
          tenant_id: string;
          total_amount: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          customer_email?: string | null;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          id?: string;
          notes?: string | null;
          status?: string;
          table_id?: string | null;
          tenant_id?: string;
          total_amount?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_orders_customer';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_table_id_fkey';
            columns: ['table_id'];
            isOneToOne: false;
            referencedRelation: 'tables';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      product_variants: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          price: number | null;
          product_id: string;
          sort_order: number | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          price?: number | null;
          product_id: string;
          sort_order?: number | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          price?: number | null;
          product_id?: string;
          sort_order?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'product_variants_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      products: {
        Row: {
          category_id: string;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          has_extras: boolean;
          has_variants: boolean;
          id: string;
          images: string[] | null;
          is_available: boolean;
          is_featured: boolean;
          name: string;
          price: number;
          sort_order: number;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          has_extras?: boolean;
          has_variants?: boolean;
          id?: string;
          images?: string[] | null;
          is_available?: boolean;
          is_featured?: boolean;
          name: string;
          price: number;
          sort_order?: number;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          has_extras?: boolean;
          has_variants?: boolean;
          id?: string;
          images?: string[] | null;
          is_available?: boolean;
          is_featured?: boolean;
          name?: string;
          price?: number;
          sort_order?: number;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'products_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      recurring_booking_instances: {
        Row: {
          booking_id: string | null;
          created_at: string;
          id: string;
          pattern_id: string;
          scheduled_date: string;
          status: string;
        };
        Insert: {
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          pattern_id: string;
          scheduled_date: string;
          status?: string;
        };
        Update: {
          booking_id?: string | null;
          created_at?: string;
          id?: string;
          pattern_id?: string;
          scheduled_date?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recurring_booking_instances_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recurring_booking_instances_pattern_id_fkey';
            columns: ['pattern_id'];
            isOneToOne: false;
            referencedRelation: 'recurring_booking_patterns';
            referencedColumns: ['id'];
          },
        ];
      };
      recurring_booking_patterns: {
        Row: {
          created_at: string;
          customer_email: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          day_of_month: number | null;
          day_of_week: number | null;
          employee_id: string;
          end_date: string;
          frequency: string;
          id: string;
          notes: string | null;
          preferred_time: string;
          service_id: string;
          start_date: string;
          status: string;
          tenant_id: string;
          total_occurrences: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          customer_email?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          day_of_month?: number | null;
          day_of_week?: number | null;
          employee_id: string;
          end_date: string;
          frequency: string;
          id?: string;
          notes?: string | null;
          preferred_time: string;
          service_id: string;
          start_date: string;
          status?: string;
          tenant_id: string;
          total_occurrences?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          customer_email?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          day_of_month?: number | null;
          day_of_week?: number | null;
          employee_id?: string;
          end_date?: string;
          frequency?: string;
          id?: string;
          notes?: string | null;
          preferred_time?: string;
          service_id?: string;
          start_date?: string;
          status?: string;
          tenant_id?: string;
          total_occurrences?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recurring_booking_patterns_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recurring_booking_patterns_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'recurring_booking_patterns_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      resources: {
        Row: {
          capacity: number;
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          tenant_id: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          capacity?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          tenant_id: string;
          type?: string;
          updated_at?: string;
        };
        Update: {
          capacity?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          tenant_id?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'resources_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      schedules: {
        Row: {
          advance_booking_days: number;
          auto_confirm: boolean;
          created_at: string;
          day_of_week: number;
          employee_id: string | null;
          end_time: string;
          id: string;
          is_active: boolean;
          min_advance_minutes: number;
          slot_interval_minutes: number;
          slot_mode: string;
          start_time: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          advance_booking_days?: number;
          auto_confirm?: boolean;
          created_at?: string;
          day_of_week: number;
          employee_id?: string | null;
          end_time: string;
          id?: string;
          is_active?: boolean;
          min_advance_minutes?: number;
          slot_interval_minutes?: number;
          slot_mode?: string;
          start_time: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          advance_booking_days?: number;
          auto_confirm?: boolean;
          created_at?: string;
          day_of_week?: number;
          employee_id?: string | null;
          end_time?: string;
          id?: string;
          is_active?: boolean;
          min_advance_minutes?: number;
          slot_interval_minutes?: number;
          slot_mode?: string;
          start_time?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'schedules_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'schedules_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      service_categories: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          icon: string | null;
          id: string;
          is_active: boolean;
          name: string;
          sort_order: number | null;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          sort_order?: number | null;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          sort_order?: number | null;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'service_categories_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      service_resources: {
        Row: {
          created_at: string;
          id: string;
          quantity: number;
          resource_id: string;
          service_id: string;
          tenant_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          quantity?: number;
          resource_id: string;
          service_id: string;
          tenant_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          quantity?: number;
          resource_id?: string;
          service_id?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'service_resources_resource_id_fkey';
            columns: ['resource_id'];
            isOneToOne: false;
            referencedRelation: 'resources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'service_resources_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'service_resources_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      services: {
        Row: {
          category_id: string | null;
          color: string | null;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          duration_minutes: number;
          employee_id: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean;
          max_participants: number | null;
          name: string;
          price: number;
          requires_approval: boolean | null;
          sort_order: number | null;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          category_id?: string | null;
          color?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          duration_minutes: number;
          employee_id?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          max_participants?: number | null;
          name: string;
          price: number;
          requires_approval?: boolean | null;
          sort_order?: number | null;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          color?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          duration_minutes?: number;
          employee_id?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          max_participants?: number | null;
          name?: string;
          price?: number;
          requires_approval?: boolean | null;
          sort_order?: number | null;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'services_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'service_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'services_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'services_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      tables: {
        Row: {
          capacity: number | null;
          created_at: string;
          deleted_at: string | null;
          id: string;
          is_active: boolean;
          location: string | null;
          number: string;
          qr_code_url: string | null;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          capacity?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean;
          location?: string | null;
          number: string;
          qr_code_url?: string | null;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          capacity?: number | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean;
          location?: string | null;
          number?: string;
          qr_code_url?: string | null;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tables_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      tags: {
        Row: {
          color: string | null;
          created_at: string;
          id: string;
          is_system: boolean;
          name: string;
          tenant_id: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          id?: string;
          is_system?: boolean;
          name: string;
          tenant_id: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          id?: string;
          is_system?: boolean;
          name?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tags_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      tenants: {
        Row: {
          address: string | null;
          config: Json | null;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          email: string;
          id: string;
          locale: string | null;
          logo_url: string | null;
          modules: Json;
          name: string;
          phone: string | null;
          plan_id: string;
          primary_color: string | null;
          secondary_color: string | null;
          slug: string;
          status: string;
          subscription_ends_at: string | null;
          timezone: string | null;
          trial_ends_at: string | null;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          config?: Json | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          email: string;
          id?: string;
          locale?: string | null;
          logo_url?: string | null;
          modules?: Json;
          name: string;
          phone?: string | null;
          plan_id?: string;
          primary_color?: string | null;
          secondary_color?: string | null;
          slug: string;
          status?: string;
          subscription_ends_at?: string | null;
          timezone?: string | null;
          trial_ends_at?: string | null;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          config?: Json | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          email?: string;
          id?: string;
          locale?: string | null;
          logo_url?: string | null;
          modules?: Json;
          name?: string;
          phone?: string | null;
          plan_id?: string;
          primary_color?: string | null;
          secondary_color?: string | null;
          slug?: string;
          status?: string;
          subscription_ends_at?: string | null;
          timezone?: string | null;
          trial_ends_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          deleted_at: string | null;
          email: string;
          first_name: string;
          id: string;
          is_active: boolean;
          last_login_at: string | null;
          last_name: string;
          phone: string | null;
          role: string;
          supabase_user_id: string;
          tenant_id: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          email: string;
          first_name: string;
          id?: string;
          is_active?: boolean;
          last_login_at?: string | null;
          last_name: string;
          phone?: string | null;
          role?: string;
          supabase_user_id: string;
          tenant_id?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          email?: string;
          first_name?: string;
          id?: string;
          is_active?: boolean;
          last_login_at?: string | null;
          last_name?: string;
          phone?: string | null;
          role?: string;
          supabase_user_id?: string;
          tenant_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'users_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      waitlist: {
        Row: {
          created_at: string;
          customer_email: string;
          customer_name: string;
          customer_phone: string | null;
          employee_id: string | null;
          entry_expires_at: string;
          id: string;
          notified_at: string | null;
          offer_expires_at: string | null;
          offer_token: string | null;
          offered_slot_date: string | null;
          offered_slot_time: string | null;
          position: number;
          preference: string;
          preferred_date: string;
          preferred_time_end: string | null;
          preferred_time_start: string | null;
          preferred_times: Json;
          service_id: string;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          customer_email: string;
          customer_name: string;
          customer_phone?: string | null;
          employee_id?: string | null;
          entry_expires_at?: string;
          id?: string;
          notified_at?: string | null;
          offer_expires_at?: string | null;
          offer_token?: string | null;
          offered_slot_date?: string | null;
          offered_slot_time?: string | null;
          position?: number;
          preference?: string;
          preferred_date: string;
          preferred_time_end?: string | null;
          preferred_time_start?: string | null;
          preferred_times?: Json;
          service_id: string;
          status?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          customer_email?: string;
          customer_name?: string;
          customer_phone?: string | null;
          employee_id?: string | null;
          entry_expires_at?: string;
          id?: string;
          notified_at?: string | null;
          offer_expires_at?: string | null;
          offer_token?: string | null;
          offered_slot_date?: string | null;
          offered_slot_time?: string | null;
          position?: number;
          preference?: string;
          preferred_date?: string;
          preferred_time_end?: string | null;
          preferred_time_start?: string | null;
          preferred_times?: Json;
          service_id?: string;
          status?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'waitlist_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'waitlist_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'waitlist_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      walkin_queue: {
        Row: {
          checked_in_at: string;
          completed_at: string | null;
          created_at: string;
          customer_name: string;
          customer_phone: string | null;
          employee_id: string | null;
          estimated_wait_minutes: number | null;
          id: string;
          position: number;
          service_id: string | null;
          started_serving_at: string | null;
          status: string;
          tenant_id: string;
        };
        Insert: {
          checked_in_at?: string;
          completed_at?: string | null;
          created_at?: string;
          customer_name: string;
          customer_phone?: string | null;
          employee_id?: string | null;
          estimated_wait_minutes?: number | null;
          id?: string;
          position?: number;
          service_id?: string | null;
          started_serving_at?: string | null;
          status?: string;
          tenant_id: string;
        };
        Update: {
          checked_in_at?: string;
          completed_at?: string | null;
          created_at?: string;
          customer_name?: string;
          customer_phone?: string | null;
          employee_id?: string | null;
          estimated_wait_minutes?: number | null;
          id?: string;
          position?: number;
          service_id?: string | null;
          started_serving_at?: string | null;
          status?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'walkin_queue_employee_id_fkey';
            columns: ['employee_id'];
            isOneToOne: false;
            referencedRelation: 'employees';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'walkin_queue_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'services';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'walkin_queue_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_waitlist_offer: {
        Args: { p_token: string };
        Returns: {
          booking_id: string;
          error: string;
        }[];
      };
      auto_start_appointments: { Args: never; Returns: undefined };
      count_recent_no_shows: {
        Args: { p_customer_email: string; p_days?: number; p_tenant_id: string };
        Returns: number;
      };
      create_notification: {
        Args: {
          p_body: string;
          p_data?: Json;
          p_recipient_user_id: string;
          p_tenant_id: string;
          p_title: string;
          p_type: string;
        };
        Returns: string;
      };
      decline_waitlist_offer: {
        Args: { p_token: string };
        Returns: {
          error: string;
          success: boolean;
        }[];
      };
      detect_no_shows: { Args: never; Returns: undefined };
      expire_waitlist_offers: { Args: never; Returns: undefined };
      generate_recurring_instances: {
        Args: { p_pattern_id: string };
        Returns: number;
      };
      get_available_slots: {
        Args: {
          p_date: string;
          p_employee_id: string;
          p_service_duration: number;
          p_service_id?: string;
          p_tenant_id: string;
        };
        Returns: {
          capacity_remaining: number;
          end_time: string;
          slot_type: string;
          start_time: string;
        }[];
      };
      get_full_slot_grid: {
        Args: {
          p_date: string;
          p_employee_id: string;
          p_service_duration: number;
          p_service_id?: string;
          p_tenant_id: string;
        };
        Returns: {
          capacity_remaining: number;
          end_time: string;
          slot_type: string;
          start_time: string;
          status: string;
          waitlist_count: number;
        }[];
      };
      get_customer_bookings_by_token: {
        Args: { p_token: string };
        Returns: {
          booking_id: string;
          cancelled_at: string | null;
          date: string;
          employee_name: string;
          end_time: string;
          service_name: string;
          start_time: string;
          status: string;
          tenant_id: string;
        }[];
      };
      get_waitlist_count: {
        Args: {
          p_date: string;
          p_employee_id: string;
          p_service_id: string;
          p_tenant_id: string;
        };
        Returns: number;
      };
      is_client_blocked: {
        Args: { p_customer_email: string; p_tenant_id: string };
        Returns: {
          blocked_until: string;
          is_blocked: boolean;
          no_show_count: number;
        }[];
      };
      promote_from_waitlist: {
        Args: {
          p_date: string;
          p_employee_id: string;
          p_service_id: string;
          p_slot_end: string;
          p_slot_start: string;
          p_tenant_id: string;
        };
        Returns: {
          customer_email: string;
          customer_name: string;
          customer_phone: string;
          id: string;
          offer_expires_at: string;
          offer_token: string;
          offered_slot_date: string;
          offered_slot_time: string;
          preference: string;
        }[];
      };
      upsert_booking_customer: {
        Args: {
          p_customer_email: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_tenant_id: string;
        };
        Returns: {
          access_token: string;
          id: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
