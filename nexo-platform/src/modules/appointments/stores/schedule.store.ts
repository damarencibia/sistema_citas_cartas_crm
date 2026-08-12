import { defineStore } from 'pinia';
import { scheduleRepository } from '../repositories/schedule.repository';
import { useAuthStore } from '@/shared/stores/auth.store';
import type { Schedule, HolidayException, CreateScheduleDTO, CreateHolidayDTO } from '../types/schedule.types';

interface ScheduleStoreState {
  schedules: Schedule[];
  holidays: HolidayException[];
  loading: boolean;
}

export const useScheduleStore = defineStore('appointments/schedules', {
  state: (): ScheduleStoreState => ({
    schedules: [],
    holidays: [],
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
      await scheduleRepository.replaceAll(employeeId, schedules);
    },

    async deleteSchedule(scheduleId: string) {
      await scheduleRepository.deleteSchedule(scheduleId);
      this.schedules = this.schedules.filter((s) => s.id !== scheduleId);
    },

    // --- Holidays ---

    async fetchHolidays(employeeId: string | null) {
      const authStore = useAuthStore();
      const tenantId = authStore.user?.tenant_id;
      if (!tenantId) return;
      this.loading = true;
      try {
        this.holidays = await scheduleRepository.getHolidays(tenantId, employeeId);
      } finally {
        this.loading = false;
      }
    },

    async createHoliday(dto: CreateHolidayDTO, employeeId: string | null): Promise<HolidayException> {
      const authStore = useAuthStore();
      const tenantId = authStore.user?.tenant_id;
      if (!tenantId) throw new Error('No tenant ID available');
      const holiday = await scheduleRepository.createHoliday(tenantId, employeeId, dto);
      this.holidays.push(holiday);
      return holiday;
    },

    async deleteHoliday(id: string): Promise<void> {
      await scheduleRepository.deleteHoliday(id);
      this.holidays = this.holidays.filter((h) => h.id !== id);
    },
  },
});
