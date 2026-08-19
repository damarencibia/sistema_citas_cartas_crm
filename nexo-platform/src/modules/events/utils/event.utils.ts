export function formatDateES(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function normalizeWhatsAppDigits(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits || null;
}
