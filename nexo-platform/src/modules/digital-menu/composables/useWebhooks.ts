import { useNotificationStore } from '../stores/notification.store';
import { useSound } from './useSound';
import { supabase } from '@/shared/api/supabase.client';
import type { OrderStatus } from '../types/order.types';

export function useWebhooks() {
  const notificationStore = useNotificationStore();
  const { playSound, playCriticalAlert } = useSound();

  const statusMessages: Record<OrderStatus, { icon: string; title: string; message: string; type: 'success' | 'info' | 'warning'; sound?: 'new_order' | 'order_ready' | 'order_cancelled' }> = {
    pending: {
      icon: '⏳',
      title: 'Pedido Recibido',
      message: 'Tu pedido ha sido recibido y está en cola',
      type: 'info',
    },
    preparing: {
      icon: '👨‍🍳',
      title: 'Preparando tu Pedido',
      message: 'El equipo de cocina está preparando tu orden',
      type: 'info',
    },
    ready: {
      icon: '✅',
      title: 'Pedido Listo',
      message: 'Tu pedido está listo para ser entregado',
      type: 'success',
      sound: 'order_ready',
    },
    delivered: {
      icon: '🎉',
      title: 'Pedido Entregado',
      message: 'Gracias por tu compra. ¡Que disfrutes!',
      type: 'success',
    },
    cancelled: {
      icon: '❌',
      title: 'Pedido Cancelado',
      message: 'Tu pedido ha sido cancelado',
      type: 'warning',
      sound: 'order_cancelled',
    },
  };

  /**
   * Dispara un webhook cuando cambia el estado del pedido
   */
  function onOrderStatusChanged(orderId: string, newStatus: OrderStatus, customerName?: string, tableNumber?: string) {
    const config = statusMessages[newStatus];
    if (!config) return;

    const message = `${config.icon} ${config.message}${tableNumber ? ` - Mesa ${tableNumber}` : ''}`;

    notificationStore.addNotification(
      config.title,
      message,
      config.type,
      newStatus === 'ready' ? 10000 : 5000, // Mas tiempo para "Listo"
      config.sound
    );

    // Reproducir sonido si existe
    if (config.sound) {
      playSound(config.sound);
    }

    // Webhook interno para otras acciones (logging, CRM, etc)
    logWebhookEvent('order.status_changed', {
      order_id: orderId,
      status: newStatus,
      customer_name: customerName,
      table_number: tableNumber,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Dispara un webhook cuando se crea un nuevo pedido
   */
  function onOrderCreated(orderId: string, customerName: string, tableNumber?: string) {
    notificationStore.addNotification(
      '🆕 Nuevo Pedido',
      `${customerName}${tableNumber ? ` - Mesa ${tableNumber}` : ''} realizó un pedido`,
      'info',
      5000,
      'new_order'
    );

    // Alerta crítica para el dependiente
    playCriticalAlert();

    logWebhookEvent('order.created', {
      order_id: orderId,
      customer_name: customerName,
      table_number: tableNumber,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Dispara un webhook cuando se cancela un pedido
   */
  function onOrderCancelled(orderId: string, customerName?: string) {
    notificationStore.addNotification(
      '❌ Pedido Cancelado',
      `El pedido de ${customerName || 'cliente'} ha sido cancelado`,
      'warning',
      5000,
      'order_cancelled'
    );

    playSound('order_cancelled');

    logWebhookEvent('order.cancelled', {
      order_id: orderId,
      customer_name: customerName,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Registra eventos de webhook en la base de datos (para auditoría y estadísticas)
   */
  async function logWebhookEvent(eventType: string, data: Record<string, any>) {
    try {
      // Aquí podrías guardar en una tabla "webhook_logs" si lo necesitas
      console.log(`[WEBHOOK] ${eventType}:`, data);

      // Opcional: guardar en Supabase para auditoría
      // await supabase.from('webhook_logs').insert({
      //   event_type: eventType,
      //   data,
      //   created_at: new Date().toISOString(),
      // });
    } catch (error) {
      console.error('Error logging webhook:', error);
    }
  }

  return {
    statusMessages,
    onOrderStatusChanged,
    onOrderCreated,
    onOrderCancelled,
    logWebhookEvent,
  };
}
