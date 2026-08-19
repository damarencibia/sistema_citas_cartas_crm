import { defineStore } from 'pinia';
import { eventRepository } from '../repositories/event.repository';
import { useAuthStore } from '@/shared/stores/auth.store';
import type { Event, CreateEventDTO, UpdateEventDTO } from '../types/event.types';

interface EventStoreState {
  events: Event[];
  currentEvent: Event | null;
  loading: boolean;
}

export const useEventStore = defineStore('events', {
  state: (): EventStoreState => ({
    events: [],
    currentEvent: null,
    loading: false,
  }),

  getters: {
    activeEvents: (state) => state.events.filter((e) => e.is_active),
    upcomingEvents: (state) => {
      const today = new Date().toISOString().split('T')[0];
      return state.events
        .filter((e) => e.is_active && e.event_date >= today)
        .sort((a, b) => (a.event_date < b.event_date ? -1 : 1));
    },
  },

  actions: {
    async fetchEvents() {
      const authStore = useAuthStore();
      const tenantId = authStore.user?.tenant_id;
      if (!tenantId) return;
      this.loading = true;
      try {
        this.events = await eventRepository.getAll(tenantId);
      } finally {
        this.loading = false;
      }
    },

    async fetchEvent(id: string) {
      this.loading = true;
      try {
        this.currentEvent = await eventRepository.getById(id);
      } finally {
        this.loading = false;
      }
    },

    async createEvent(dto: CreateEventDTO): Promise<Event> {
      const authStore = useAuthStore();
      const tenantId = authStore.user?.tenant_id;
      if (!tenantId) throw new Error('No tenant ID available');
      const event = await eventRepository.create(dto, tenantId);
      this.events.push(event);
      return event;
    },

    async updateEvent(id: string, dto: UpdateEventDTO): Promise<Event> {
      const updated = await eventRepository.update(id, dto);
      const index = this.events.findIndex((e) => e.id === id);
      if (index !== -1) this.events[index] = updated;
      if (this.currentEvent?.id === id) this.currentEvent = updated;
      return updated;
    },

    async deleteEvent(id: string): Promise<void> {
      await eventRepository.softDelete(id);
      this.events = this.events.filter((e) => e.id !== id);
      if (this.currentEvent?.id === id) this.currentEvent = null;
    },
  },
});