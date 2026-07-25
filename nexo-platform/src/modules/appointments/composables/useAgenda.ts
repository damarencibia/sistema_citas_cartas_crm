import { ref, computed } from 'vue';
import { useBookingStore } from '../stores/booking.store';
import { useEmployeeStore } from '../stores/employee.store';
import type { BookingFilters } from '../types/booking.types';

export function useAgenda() {
  const bookingStore = useBookingStore();
  const employeeStore = useEmployeeStore();

  const viewMode = ref<'day' | 'week'>('day');
  const selectedDate = ref(new Date().toISOString().split('T')[0]);
  const selectedEmployeeId = ref<string | null>(null);

  const weekStart = computed(() => {
    const d = new Date(selectedDate.value);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  });

  const weekDates = computed(() => {
    const dates: string[] = [];
    const start = new Date(weekStart.value);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  });

  const dayBookings = computed(() => {
    return bookingStore.bookings.filter((b) => b.date === selectedDate.value);
  });

  const agendaBookings = computed(() => {
    if (viewMode.value === 'day') return dayBookings.value;
    return bookingStore.bookings.filter(
      (b) => b.date >= weekDates.value[0] && b.date <= weekDates.value[6],
    );
  });

  async function loadAgenda() {
    const filters: BookingFilters = {
      date: viewMode.value === 'day' ? selectedDate.value : undefined,
      date_from: viewMode.value === 'week' ? weekDates.value[0] : undefined,
      date_to: viewMode.value === 'week' ? weekDates.value[6] : undefined,
      employee_id: selectedEmployeeId.value,
    };
    await bookingStore.fetchBookings(filters);
  }

  function setView(mode: 'day' | 'week') {
    viewMode.value = mode;
  }

  function setDate(date: string) {
    selectedDate.value = date;
  }

  function setEmployee(employeeId: string | null) {
    selectedEmployeeId.value = employeeId;
  }

  function prevDay() {
    const d = new Date(selectedDate.value);
    d.setDate(d.getDate() - 1);
    selectedDate.value = d.toISOString().split('T')[0];
  }

  function nextDay() {
    const d = new Date(selectedDate.value);
    d.setDate(d.getDate() + 1);
    selectedDate.value = d.toISOString().split('T')[0];
  }

  function prevWeek() {
    const d = new Date(selectedDate.value);
    d.setDate(d.getDate() - 7);
    selectedDate.value = d.toISOString().split('T')[0];
  }

  function nextWeek() {
    const d = new Date(selectedDate.value);
    d.setDate(d.getDate() + 7);
    selectedDate.value = d.toISOString().split('T')[0];
  }

  return {
    viewMode,
    selectedDate,
    selectedEmployeeId,
    weekDates,
    agendaBookings,
    dayBookings,
    employees: computed(() => employeeStore.activeEmployees),
    loadAgenda,
    setView,
    setDate,
    setEmployee,
    prevDay,
    nextDay,
    prevWeek,
    nextWeek,
  };
}
