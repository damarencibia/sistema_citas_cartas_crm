import { ref, reactive } from 'vue';
import { z } from 'zod';
import { emailSchema, phoneSchema } from '@/shared/utils/validators';
import { useBookingStore } from '../stores/booking.store';
import type { CreateBookingDTO } from '../types/booking.types';

const bookingFormSchema = z.object({
  service_id: z.string().uuid(),
  employee_id: z.string().uuid(),
  date: z.string().min(1, 'Fecha requerida'),
  start_time: z.string().min(1, 'Hora requerida'),
  customer_name: z.string().min(2, 'Nombre requerido'),
  customer_email: emailSchema,
  customer_phone: phoneSchema,
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

export function useBookingForm() {
  const bookingStore = useBookingStore();

  const form = reactive<BookingFormData>({
    service_id: '',
    employee_id: '',
    date: '',
    start_time: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    notes: '',
  });

  const errors = ref<Partial<Record<keyof BookingFormData | '_general', string>>>({});
  const submitting = ref(false);

  function validate(): boolean {
    errors.value = {};
    const result = bookingFormSchema.safeParse(form);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof BookingFormData;
        errors.value[field] = issue.message;
      }
      return false;
    }
    return true;
  }

  async function submit(): Promise<boolean> {
    if (!validate()) return false;
    submitting.value = true;
    try {
      await bookingStore.createBooking({
        service_id: form.service_id,
        employee_id: form.employee_id,
        date: form.date,
        start_time: form.start_time,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone,
        notes: form.notes,
        source: 'manual',
      } as CreateBookingDTO);
      return true;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error al crear la reserva';
      errors.value._general = message;
      return false;
    } finally {
      submitting.value = false;
    }
  }

  function reset() {
    form.service_id = '';
    form.employee_id = '';
    form.date = '';
    form.start_time = '';
    form.customer_name = '';
    form.customer_email = '';
    form.customer_phone = '';
    form.notes = '';
    errors.value = {};
  }

  return { form, errors, submitting, validate, submit, reset };
}
