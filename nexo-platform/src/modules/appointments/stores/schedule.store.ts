import { defineStore } from 'pinia';
import { scheduleRepository } from '../repositories/schedule.repository';
import { useAuthStore } from '@/shared/stores/auth.store';
import type { Schedule, HolidayException, CreateScheduleDTO, CreateHolidayDTO, FixedSlotDefinition, CreateFixedSlotDTO } from '../types/schedule.types';

interface ScheduleStoreState {
  schedules: Schedule[];
  holidays: HolidayException[];
  fixedSlots: FixedSlotDefinition[];
  loading: boolean;
}

export const useScheduleStore = defineStore('appointments/schedules', {
  state: (): ScheduleStoreState => ({
    schedules: [],
    holidays: [],
    fixedSlots: [],
    loading: false,
  }),

  actions: {
    async fetchSchedules(employeeId: string | null = null) {
      this.loading = true;
      try {
        this.schedules = await scheduleRepository.getByEmployee(employeeId);
      } finally {
        this.loading = false;
      }
    },

    async updateSchedules(schedules: CreateScheduleDTO[], employeeId: string | null = null) {
      const authStore = useAuthStore();
      const tenantId = authStore.user?.tenant_id;
      if (!tenantId) throw new Error('No tenant ID available');
      await scheduleRepository.replaceAll(tenantId, employeeId, schedules);
    },

    async deleteSchedule(scheduleId: string) {
      await scheduleRepository.deleteSchedule(scheduleId);
      this.schedules = this.schedules.filter((s) => s.id !== scheduleId);
    },

    // --- Fixed Slot Definitions ---

    async fetchFixedSlots(employeeId: string) {
      const authStore = useAuthStore();
      const tenantId = authStore.user?.tenant_id;
      if (!tenantId) return;
      this.fixedSlots = await scheduleRepository.getFixedSlots(tenantId, employeeId);
    },

    async createFixedSlot(dto: CreateFixedSlotDTO): Promise<FixedSlotDefinition> {
      const authStore = useAuthStore();
      const tenantId = authStore.user?.tenant_id;
      if (!tenantId) throw new Error('No tenant ID available');
      const slot = await scheduleRepository.createFixedSlot(tenantId, dto);
      this.fixedSlots.push(slot);
      return slot;
    },

    async deleteFixedSlot(id: string): Promise<void> {
      await scheduleRepository.deleteFixedSlot(id);
      this.fixedSlots = this.fixedSlots.filter((s) => s.id !== id);
    },

    // --- Holidays ---

    async fetchHolidays() {
      const authStore = useAuthStore();
      const tenantId = authStore.user?.tenant_id;
      if (!tenantId) return;
      this.loading = true;
      try {
        this.holidays = await scheduleRepository.getHolidays(tenantId);
      } finally {
        this.loading = false;
      }
    },

    async createHoliday(dto: CreateHolidayDTO): Promise<HolidayException> {
      const authStore = useAuthStore();
      const tenantId = authStore.user?.tenant_id;
      if (!tenantId) throw new Error('No tenant ID available');
      const holiday = await scheduleRepository.createHoliday(tenantId, dto);
      this.holidays.push(holiday);
      return holiday;
    },

    async deleteHoliday(id: string): Promise<void> {
      await scheduleRepository.deleteHoliday(id);
      this.holidays = this.holidays.filter((h) => h.id !== id);
    },
  },
});
