export interface Customer {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  total_visits: number;
  total_spent: number;
  last_visit_at: string | null;
  created_at: string;
}

export type CreateCustomerDTO = Pick<
  Customer,
  'first_name' | 'last_name' | 'email' | 'phone' | 'notes'
>;

export type UpdateCustomerDTO = Partial<CreateCustomerDTO> & { notes?: string | null };

/** Etiqueta configurable del tenant (tabla `tags`) */
export interface Tag {
  id: string;
  name: string;
  color: string | null;
  is_system: boolean;
}

/** Asignación cliente↔etiqueta (tabla `customer_tags`) */
export interface CustomerTag {
  customer_id: string;
  tag_id: string;
}

export interface LoyaltyConfig {
  is_active: boolean;
  points_per_visit: number;
  points_per_currency: number;
  points_to_currency: number;
  currency_unit: number;
  redemption_unit: number;
  welcome_points: number;
  expiry_months: number;
}

export interface LoyaltyPoint {
  id: string;
  customer_id: string;
  points: number;
  reason: string;
  expires_at: string | null;
  created_at: string;
}

/** Reserva del cliente en la timeline (payload mínimo, con nombre de servicio) */
export interface CustomerBooking {
  id: string;
  date: string;
  start_time: string;
  status: string;
  service_name: string;
  created_at: string;
}

/** Entrada unificada para la timeline del cliente (estilo HubSpot): citas + puntos */
export interface TimelineEntry {
  id: string;
  type: 'booking' | 'points';
  date: string;
  title: string;
  subtitle: string;
  status?: string;
}
