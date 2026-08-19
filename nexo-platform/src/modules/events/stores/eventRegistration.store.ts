import { defineStore } from 'pinia';
import { eventRegistrationRepository } from '../repositories/eventRegistration.repository';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useTenantStore } from '@/shared/stores/tenant.store';
import type {
  CreateEventRegistrationDTO,
  EventRegCapacity,
  EventRegistration,
  EventRegistrationStatus,
} from '../types/event.types';

interface EventRegistrationStoreState {
  registrations: EventRegistration[];
  currentRegistration: EventRegistration | null;
  capacity: EventRegCapacity | null;
  capacityByEvent: Record<string, EventRegCapacity>;
  eventId: string | null;
  loading: boolean;
}

export const useEventRegistrationStore = defineStore('eventRegistrations', {
  state: (): EventRegistrationStoreState => ({
    registrations: [],
    currentRegistration: null,
    capacity: null,
    capacityByEvent: {},
    eventId: null,
    loading: false,
  }),

  getters: {
    confirmedRegistrations: (state) =>
      state.registrations.filter((r) => r.status === 'confirmed' || r.status === 'attended'),
    waitlistedRegistrations: (state) => state.registrations.filter((r) => r.status === 'waitlisted'),
    spotsLeft: (state): number | null =>
      state.capacity?.spots_left ?? (state.capacity?.max_participants === null ? null : 0),
  },

  actions: {
    async fetchRegistrations(eventId: string, maxParticipants: number | null) {
      this.eventId = eventId;
      this.loading = true;
      try {
        this.registrations = await eventRegistrationRepository.getByEventId(eventId);
        this.capacity = await eventRegistrationRepository.getCapacityInfo(eventId, maxParticipants);
      } finally {
        this.loading = false;
      }
    },

    async fetchCapacityByEvents(events: { id: string; max_participants: number | null }[]) {
      const ids = events.map((e) => e.id);
      const maxByEvent = new Map(events.map((e) => [e.id, e.max_participants]));
      this.capacityByEvent = await eventRegistrationRepository.getCountsByEventIds(ids, maxByEvent);
    },

    async register(dto: CreateEventRegistrationDTO, maxParticipants: number | null): Promise<EventRegistration> {
      const authStore = useAuthStore();
      const tenantStore = useTenantStore();
      const tenantId = authStore.user?.tenant_id ?? tenantStore.tenant?.id;
      if (!tenantId) throw new Error('No tenant ID available');
      const registration = await eventRegistrationRepository.create(
        dto,
        tenantId,
        maxParticipants,
        this.capacity?.total_participants ?? 0,
      );
      this.registrations.push(registration);
      if (this.eventId) {
        this.capacity = await eventRegistrationRepository.getCapacityInfo(this.eventId, maxParticipants);
      }
      return registration;
    },

    async updateStatus(id: string, status: EventRegistrationStatus): Promise<EventRegistration> {
      const updated = await eventRegistrationRepository.updateStatus(id, status);
      this.replaceRegistration(updated);
      await this.refreshCapacity();
      return updated;
    },

    async cancelRegistration(id: string): Promise<void> {
      const updated = await eventRegistrationRepository.cancel(id);
      this.replaceRegistration(updated);
      await this.refreshCapacity();
    },

    async refreshCapacity() {
      const eventId = this.eventId;
      const max = this.capacity?.max_participants ?? null;
      if (!eventId) return;
      this.capacity = await eventRegistrationRepository.getCapacityInfo(eventId, max);
    },

    replaceRegistration(updated: EventRegistration) {
      const index = this.registrations.findIndex((r) => r.id === updated.id);
      if (index !== -1) this.registrations[index] = updated;
      if (this.currentRegistration?.id === updated.id) this.currentRegistration = updated;
    },

    reset() {
      this.registrations = [];
      this.currentRegistration = null;
      this.capacity = null;
      this.capacityByEvent = {};
      this.eventId = null;
      this.loading = false;
    },
  },
});