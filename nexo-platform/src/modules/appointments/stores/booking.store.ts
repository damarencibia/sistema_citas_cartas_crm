import { defineStore } from 'pinia';
import { bookingRepository } from '../repositories/booking.repository';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useTenantStore } from '@/shared/stores/tenant.store';
import type {
  Booking,
  CreateBookingDTO,
  CreateBookingResult,
  UpdateBookingDTO,
  BookingFilters,
  BookingStatus,
  ClientBlockCheck,
  WaitlistEntry,
  CreateWaitlistDTO,
  RecurringPattern,
  CreateRecurringDTO,
  RecurringInstance,
  CustomerBookingSummary,
} from '../types/booking.types';

interface BookingStoreState {
  bookings: Booking[];
  currentBooking: Booking | null;
  loading: boolean;
  filters: BookingFilters;
  waitlist: WaitlistEntry[];
  waitlistLoading: boolean;
  recurringPatterns: RecurringPattern[];
  recurringInstances: RecurringInstance[];
  recurringLoading: boolean;
}

function resolveTenantId(): string | null {
  const authStore = useAuthStore();
  if (authStore.user?.tenant_id) return authStore.user.tenant_id;
  const tenantStore = useTenantStore();
  return tenantStore.tenant?.id ?? null;
}

export const useBookingStore = defineStore('appointments/bookings', {
  state: (): BookingStoreState => ({
    bookings: [],
    currentBooking: null,
    loading: false,
    filters: {
      employee_id: null,
    },
    waitlist: [],
    waitlistLoading: false,
    recurringPatterns: [],
    recurringInstances: [],
    recurringLoading: false,
  }),

  getters: {
    todayBookings: (state) => {
      const today = new Date().toISOString().split('T')[0];
      return state.bookings.filter((b) => b.date === today);
    },
    pendingBookings: (state) =>
      state.bookings.filter((b) => b.status === 'confirmed' || b.status === 'pending_confirmation'),
    pendingConfirmationBookings: (state) =>
      state.bookings.filter((b) => b.status === 'pending_confirmation'),
    pendingApprovalBookings: (state) =>
      state.bookings.filter(
        (b) => b.status === 'pending_approval' || b.status === 'pending_confirmation',
      ),
    filteredBookings: (state) => {
      let result = state.bookings;
      if (state.filters.employee_id) {
        result = result.filter((b) => b.employee_id === state.filters.employee_id);
      }
      return result;
    },
  },

  actions: {
    async fetchBookings(filters?: BookingFilters) {
      this.loading = true;
      try {
        if (filters) this.filters = { ...this.filters, ...filters };
        this.bookings = await bookingRepository.getByFilters(this.filters);
      } finally {
        this.loading = false;
      }
    },

    async fetchBooking(id: string) {
      this.loading = true;
      try {
        this.currentBooking = await bookingRepository.getById(id);
      } finally {
        this.loading = false;
      }
    },

    async createBooking(dto: CreateBookingDTO): Promise<CreateBookingResult> {
      const tenantId = resolveTenantId();
      if (!tenantId) throw new Error('No tenant ID available');

      if (dto.customer_email) {
        const blockCheck = await bookingRepository.checkClientBlock(tenantId, dto.customer_email);
        if (blockCheck.is_blocked) {
          throw new Error(
            `Cliente bloqueado hasta el ${blockCheck.blocked_until} por ${blockCheck.no_show_count} no-show(s) reciente(s).`,
          );
        }
      }

      const result = await bookingRepository.create(dto, tenantId);
      this.bookings.push(result.booking);
      return result;
    },

    async fetchCustomerBookings(token: string): Promise<CustomerBookingSummary[]> {
      return bookingRepository.getCustomerBookingsByToken(token);
    },

    async updateBooking(id: string, dto: UpdateBookingDTO): Promise<Booking> {
      const updated = await bookingRepository.update(id, dto);
      const index = this.bookings.findIndex((b) => b.id === id);
      if (index !== -1) this.bookings[index] = updated;
      if (this.currentBooking?.id === id) this.currentBooking = updated;
      return updated;
    },

    async updateStatus(
      id: string,
      status: BookingStatus,
      reason?: string,
      cancelledBy?: 'customer' | 'employee' | 'system',
    ): Promise<Booking> {
      const tenantId = resolveTenantId();
      const authStore = useAuthStore();
      const booking = this.bookings.find((b) => b.id === id) ?? this.currentBooking;
      const oldStatus = booking?.status ?? null;

      const updated = await bookingRepository.updateStatus(id, status, reason, cancelledBy);
      const index = this.bookings.findIndex((b) => b.id === id);
      if (index !== -1) this.bookings[index] = updated;
      if (this.currentBooking?.id === id) this.currentBooking = updated;

      if (tenantId) {
        const changedBy = cancelledBy ?? 'employee';
        const userName = authStore.userName || changedBy;
        await bookingRepository.logStatusChange(
          tenantId,
          id,
          oldStatus,
          status,
          changedBy as 'customer' | 'employee' | 'system',
          userName,
          reason,
        );

        if (status === 'no_show' && booking?.customer_email) {
          await this.handleNoShowBlock(tenantId, booking.customer_email);
        }

        if (status === 'cancelled' && booking) {
          await this.promoteWaitlistForBooking(tenantId, booking);
        }
      }

      return updated;
    },

    async hardDeleteBooking(id: string): Promise<void> {
      await bookingRepository.hardDelete(id);
      this.bookings = this.bookings.filter((b) => b.id !== id);
    },

    async handleNoShowBlock(tenantId: string, customerEmail: string) {
      const config = await bookingRepository.getAppointmentConfig(tenantId);
      if (!config) return;

      const noShowCount = await bookingRepository.getNoShowCount(tenantId, customerEmail);
      if (noShowCount >= config.max_no_shows) {
        const blockedUntil = new Date();
        blockedUntil.setDate(blockedUntil.getDate() + config.block_duration_days);

        const existingBlock = await bookingRepository.checkClientBlock(tenantId, customerEmail);
        const newBlockDate = blockedUntil.toISOString().split('T')[0];
        if (existingBlock.blocked_until && existingBlock.blocked_until >= newBlockDate) {
          return;
        }

        await bookingRepository.createClientBlock(
          tenantId,
          customerEmail,
          newBlockDate,
          `${noShowCount} no-show(s) en los últimos ${config.block_duration_days} días`,
          noShowCount,
        );
      }
    },

    async promoteWaitlistForBooking(tenantId: string, booking: Booking) {
      try {
        const entry = await bookingRepository.promoteFromWaitlist(
          tenantId,
          booking.service_id,
          booking.employee_id,
          booking.date,
          booking.start_time,
          booking.end_time,
        );
        if (entry?.offer_token) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const functionsBase = `${supabaseUrl}/functions/v1`;
          const authStore = useAuthStore();
          await fetch(`${functionsBase}/send-waitlist-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authStore.session?.access_token ?? ''}`,
            },
            body: JSON.stringify({ token: entry.offer_token, tenant_id: tenantId }),
          });
        }
      } catch {
        // Waitlist promotion is best-effort
      }
    },

    async checkClientBlock(customerEmail: string): Promise<ClientBlockCheck> {
      const tenantId = resolveTenantId();
      if (!tenantId) return { is_blocked: false, blocked_until: null, no_show_count: 0 };
      return bookingRepository.checkClientBlock(tenantId, customerEmail);
    },

    async countRecentNoShows(customerEmail: string): Promise<number> {
      const tenantId = resolveTenantId();
      if (!tenantId) return 0;
      return bookingRepository.getNoShowCount(tenantId, customerEmail);
    },

    async getAvailableSlots(
      employeeId: string,
      date: string,
      serviceDuration: number,
      serviceId?: string,
    ) {
      const tenantId = resolveTenantId();
      if (!tenantId) throw new Error('No tenant ID available');
      return bookingRepository.getAvailableSlots(
        tenantId,
        employeeId,
        date,
        serviceDuration,
        serviceId,
      );
    },

    async fetchBookingsForEmployee(employeeId: string, date: string): Promise<Booking[]> {
      return bookingRepository.getByEmployeeAndDate(employeeId, date);
    },

    async reassignBooking(
      bookingId: string,
      newDate: string,
      newStartTime: string,
      serviceDuration: number,
    ): Promise<Booking> {
      const tenantId = resolveTenantId();
      const authStore = useAuthStore();
      const booking = this.bookings.find((b) => b.id === bookingId) ?? this.currentBooking;
      const oldDate = booking?.date;
      const oldTime = booking?.start_time;

      if (tenantId) {
        const slots = await bookingRepository.getAvailableSlots(
          tenantId,
          booking!.employee_id,
          newDate,
          serviceDuration,
          booking!.service_id,
        );
        const slotAvailable = slots.some((s) => s.start_time === newStartTime);
        if (!slotAvailable) {
          throw new Error('El empleado ya tiene una cita en ese horario.');
        }
      }

      const updated = await bookingRepository.reassign(
        bookingId,
        newDate,
        newStartTime,
        serviceDuration,
      );
      const index = this.bookings.findIndex((b) => b.id === bookingId);
      if (index !== -1) this.bookings[index] = updated;
      if (this.currentBooking?.id === bookingId) this.currentBooking = updated;

      if (tenantId) {
        await bookingRepository.logStatusChange(
          tenantId,
          bookingId,
          null,
          'confirmed',
          'employee',
          authStore.userName || 'employee',
          `Reasignado de ${oldDate} ${oldTime?.slice(0, 5)} a ${newDate} ${newStartTime}`,
        );
      }

      return updated;
    },

    async approveBooking(bookingId: string, reason?: string): Promise<Booking> {
      const tenantId = resolveTenantId();
      const authStore = useAuthStore();
      const booking = this.bookings.find((b) => b.id === bookingId) ?? this.currentBooking;
      const oldStatus = booking?.status ?? null;

      if (oldStatus !== 'pending_approval' && oldStatus !== 'pending_confirmation') {
        throw new Error('Solo se pueden aprobar reservas pendientes de aprobación.');
      }

      const updated = await bookingRepository.approveBooking(
        bookingId,
        authStore.user?.id ?? '',
        reason,
      );
      const index = this.bookings.findIndex((b) => b.id === bookingId);
      if (index !== -1) this.bookings[index] = updated;
      if (this.currentBooking?.id === bookingId) this.currentBooking = updated;

      if (tenantId) {
        await bookingRepository.logStatusChange(
          tenantId,
          bookingId,
          oldStatus,
          'confirmed',
          'employee',
          authStore.userName || 'employee',
          reason ?? 'Aprobado por administrador',
        );
      }

      return updated;
    },

    async rejectBooking(bookingId: string, reason?: string): Promise<Booking> {
      const tenantId = resolveTenantId();
      const authStore = useAuthStore();
      const booking = this.bookings.find((b) => b.id === bookingId) ?? this.currentBooking;
      const oldStatus = booking?.status ?? null;

      if (oldStatus !== 'pending_approval' && oldStatus !== 'pending_confirmation') {
        throw new Error('Solo se pueden rechazar reservas pendientes de aprobación.');
      }

      const updated = await bookingRepository.rejectBooking(
        bookingId,
        authStore.user?.id ?? '',
        reason,
      );
      const index = this.bookings.findIndex((b) => b.id === bookingId);
      if (index !== -1) this.bookings[index] = updated;
      if (this.currentBooking?.id === bookingId) this.currentBooking = updated;

      if (tenantId) {
        await bookingRepository.logStatusChange(
          tenantId,
          bookingId,
          oldStatus,
          'cancelled',
          'employee',
          authStore.userName || 'employee',
          reason ?? 'Rechazado por administrador',
        );
      }

      return updated;
    },

    // --- Waitlist ---

    async fetchWaitlist() {
      this.waitlistLoading = true;
      try {
        const tenantId = resolveTenantId();
        if (!tenantId) return;
        this.waitlist = await bookingRepository.getWaitlist(tenantId);
      } finally {
        this.waitlistLoading = false;
      }
    },

    async joinWaitlist(dto: CreateWaitlistDTO): Promise<WaitlistEntry> {
      const tenantId = resolveTenantId();
      if (!tenantId) throw new Error('No tenant ID available');
      const entry = await bookingRepository.joinWaitlist(tenantId, dto);
      this.waitlist.push(entry);
      return entry;
    },

    async cancelWaitlistEntry(id: string): Promise<void> {
      await bookingRepository.cancelWaitlistEntry(id);
      this.waitlist = this.waitlist.filter((w) => w.id !== id);
    },

    async removeWaitlistEntry(id: string): Promise<void> {
      await bookingRepository.removeWaitlistEntry(id);
      this.waitlist = this.waitlist.filter((w) => w.id !== id);
    },

    async getWaitlistEntryByToken(token: string) {
      return bookingRepository.getWaitlistEntryByToken(token);
    },

    async acceptWaitlistOffer(token: string) {
      return bookingRepository.acceptWaitlistOffer(token);
    },

    async declineWaitlistOffer(token: string) {
      return bookingRepository.declineWaitlistOffer(token);
    },

    // --- Recurring Bookings ---

    async fetchRecurringPatterns() {
      this.recurringLoading = true;
      try {
        const tenantId = resolveTenantId();
        if (!tenantId) return;
        this.recurringPatterns = await bookingRepository.getRecurringPatterns(tenantId);
      } finally {
        this.recurringLoading = false;
      }
    },

    async createRecurringPattern(dto: CreateRecurringDTO): Promise<RecurringPattern> {
      const tenantId = resolveTenantId();
      if (!tenantId) throw new Error('No tenant ID available');
      const pattern = await bookingRepository.createRecurringPattern(tenantId, dto);
      this.recurringPatterns.unshift(pattern);
      return pattern;
    },

    async generateInstances(patternId: string): Promise<number> {
      const count = await bookingRepository.generateRecurringInstances(patternId);
      return count;
    },

    async fetchRecurringInstances(patternId: string) {
      this.recurringInstances = await bookingRepository.getRecurringInstances(patternId);
    },

    async cancelRecurringPattern(patternId: string): Promise<void> {
      await bookingRepository.cancelRecurringPattern(patternId);
      const index = this.recurringPatterns.findIndex((p) => p.id === patternId);
      if (index !== -1) {
        this.recurringPatterns[index] = { ...this.recurringPatterns[index], status: 'cancelled' };
      }
    },

    async skipRecurringInstance(instanceId: string): Promise<void> {
      await bookingRepository.skipRecurringInstance(instanceId);
      const index = this.recurringInstances.findIndex((i) => i.id === instanceId);
      if (index !== -1) {
        this.recurringInstances[index] = { ...this.recurringInstances[index], status: 'skipped' };
      }
    },

    setFilters(filters: Partial<BookingFilters>) {
      this.filters = { ...this.filters, ...filters };
    },
  },
});
