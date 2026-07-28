import { ref, computed } from 'vue';
import { bookingRepository } from '../repositories/booking.repository';
import type { AvailableSlot } from '../types/booking.types';

export function useAvailability() {
  const slots = ref<AvailableSlot[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const availableSlots = computed(() =>
    slots.value.filter((s) => s.status === 'available'),
  );

  const occupiedSlots = computed(() =>
    slots.value.filter((s) => s.status === 'occupied'),
  );

  const hasAnySlots = computed(() => slots.value.length > 0);

  async function fetchSlots(
    tenantId: string,
    employeeId: string,
    date: string,
    serviceDuration: number,
    serviceId?: string
  ) {
    loading.value = true;
    error.value = null;
    try {
      slots.value = await bookingRepository.getFullSlotGrid(
        tenantId, employeeId, date, serviceDuration, serviceId
      );
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Error al cargar disponibilidad';
      slots.value = [];
    } finally {
      loading.value = false;
    }
  }

  function isSlotAvailable(time: string): boolean {
    return slots.value.some((s) => s.start_time === time && s.status === 'available');
  }

  function clear() {
    slots.value = [];
    error.value = null;
  }

  return { slots, availableSlots, occupiedSlots, hasAnySlots, loading, error, fetchSlots, isSlotAvailable, clear };
}
