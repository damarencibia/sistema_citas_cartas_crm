import { ref, computed } from 'vue';
import type { Schedule, CreateScheduleDTO } from '../types/schedule.types';

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function useScheduleGrid() {
  const schedules = ref<Schedule[]>([]);
  const selectedEmployeeId = ref<string | null>(null);

  const grid = computed(() => {
    const map: Record<number, { startTime: string; endTime: string; isActive: boolean }> = {};
    for (const s of schedules.value) {
      map[s.day_of_week] = {
        startTime: s.start_time,
        endTime: s.end_time,
        isActive: s.is_active,
      };
    }
    return map;
  });

  function isSlotActive(day: number, hour: number): boolean {
    const daySchedule = grid.value[day];
    if (!daySchedule || !daySchedule.isActive) return false;
    const startHour = parseInt(daySchedule.startTime.split(':')[0], 10);
    const endHour = parseInt(daySchedule.endTime.split(':')[0], 10);
    return hour >= startHour && hour < endHour;
  }

  function toggleDay(day: number) {
    const existing = grid.value[day];
    if (existing) {
      existing.isActive = !existing.isActive;
    } else {
      schedules.value.push({
        id: '',
        tenant_id: '',
        employee_id: selectedEmployeeId.value,
        day_of_week: day,
        start_time: '09:00',
        end_time: '18:00',
        is_active: true,
        slot_mode: 'fixed',
        slot_interval_minutes: 30,
        buffer_before_minutes: 0,
        buffer_after_minutes: 0,
        advance_booking_days: 7,
        min_advance_minutes: 60,
        created_at: '',
        updated_at: '',
      });
    }
  }

  function setDayHours(day: number, startTime: string, endTime: string) {
    const existing = schedules.value.find((s) => s.day_of_week === day);
    if (existing) {
      existing.start_time = startTime;
      existing.end_time = endTime;
      existing.is_active = true;
    }
  }

  function copyDayToAll(sourceDay: number) {
    const source = schedules.value.find((s) => s.day_of_week === sourceDay);
    if (!source) return;
    for (const day of DAYS_OF_WEEK) {
      if (day.value === sourceDay) continue;
      setDayHours(day.value, source.start_time, source.end_time);
    }
  }

  function toDTOs(): CreateScheduleDTO[] {
    return schedules.value
      .filter((s) => s.is_active)
      .map((s) => ({
        employee_id: selectedEmployeeId.value ?? undefined,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        slot_mode: s.slot_mode,
        slot_interval_minutes: s.slot_interval_minutes,
        buffer_before_minutes: s.buffer_before_minutes,
        buffer_after_minutes: s.buffer_after_minutes,
        advance_booking_days: s.advance_booking_days,
        min_advance_minutes: s.min_advance_minutes,
      }));
  }

  return {
    schedules,
    selectedEmployeeId,
    grid,
    daysOfWeek: DAYS_OF_WEEK,
    hours: HOURS,
    isSlotActive,
    toggleDay,
    setDayHours,
    copyDayToAll,
    toDTOs,
  };
}
