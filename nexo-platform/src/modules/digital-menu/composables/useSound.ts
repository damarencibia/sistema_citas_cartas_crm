import { ref, watch } from 'vue';

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export type SoundType = 'new_order' | 'order_ready' | 'order_cancelled';

// ---------------------------------------------------------------------------
// Almacén singleton de contexto de audio (compartido entre instancias)
// ---------------------------------------------------------------------------

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Reanudar si está suspendido (requisito de autoplay de navegadores)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

// ---------------------------------------------------------------------------
// Helpers de síntesis
// ---------------------------------------------------------------------------

/**
 * Reproduce una nota simple de una frecuencia determinada.
 * @returns El oscilador (por si se quiere detener externamente).
 */
function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.3,
  startTime?: number,
): OscillatorNode {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime ?? ctx.currentTime);

  gain.gain.setValueAtTime(volume, startTime ?? ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, (startTime ?? ctx.currentTime) + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime ?? ctx.currentTime);
  osc.stop((startTime ?? ctx.currentTime) + duration);

  return osc;
}

/**
 * Reproduce una secuencia de tonos (arpegio / melodía simple).
 */
function playSequence(
  ctx: AudioContext,
  notes: Array<{ freq: number; duration: number; delay?: number; type?: OscillatorType }>,
  volume = 0.25,
) {
  let time = ctx.currentTime;
  notes.forEach((note) => {
    const start = time + (note.delay ?? 0);
    playTone(ctx, note.freq, note.duration, note.type ?? 'sine', volume, start);
    time = start + note.duration;
  });
}

// ---------------------------------------------------------------------------
// Sonidos concretos
// ---------------------------------------------------------------------------

function soundNewOrder(ctx: AudioContext) {
  playSequence(ctx, [
    { freq: 523.25, duration: 0.12 }, // C5
    { freq: 659.25, duration: 0.12 }, // E5
    { freq: 783.99, duration: 0.18 }, // G5
    { freq: 1046.5, duration: 0.3 },  // C6
  ]);
}

function soundOrderReady(ctx: AudioContext) {
  playSequence(ctx, [
    { freq: 880, duration: 0.15 }, // A5
    { delay: 0.05, freq: 1108.73, duration: 0.25 }, // C#6
  ]);
}

function soundOrderCancelled(ctx: AudioContext) {
  playSequence(ctx, [
    { freq: 783.99, duration: 0.15 }, // G5
    { freq: 659.25, duration: 0.15 }, // E5
    { freq: 523.25, duration: 0.3 },  // C5
  ]);
}

/**
 * Alerta crítica repetitiva (3 pitidos rápidos).
 */
function soundCriticalAlert(ctx: AudioContext) {
  const now = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    const t = now + i * 0.25;
    playTone(ctx, 880, 0.12, 'square', 0.2, t); // A5
  }
}

// ---------------------------------------------------------------------------
// Composable principal
// ---------------------------------------------------------------------------

const isMuted = ref<boolean>(false);

// Inicializar desde localStorage de forma segura
try {
  isMuted.value = localStorage.getItem('nexo-sound-muted') === 'true';
} catch {
  // Ignorar errores de almacenamiento
}

// Persistir silencio en localStorage
watch(isMuted, (val) => {
  try {
    if (val) {
      localStorage.setItem('nexo-sound-muted', 'true');
    } else {
      localStorage.removeItem('nexo-sound-muted');
    }
  } catch {
    // Ignorar errores de almacenamiento
  }
});

export function useSound() {
  // ---- Estado público ----

  /** Indica si el sonido está silenciado globalmente. */
  const muted = isMuted;

  // ---- Acciones ----

  /** Alterna el estado de silencio. */
  function toggleMute() {
    isMuted.value = !isMuted.value;
  }

  /**
   * Reproduce un sonido según el tipo de notificación.
   * No hace nada si el sonido está silenciado.
   */
  function playSound(type: SoundType): void {
    if (isMuted.value) return;

    try {
      const ctx = getAudioContext();

      switch (type) {
        case 'new_order':
          soundNewOrder(ctx);
          break;
        case 'order_ready':
          soundOrderReady(ctx);
          break;
        case 'order_cancelled':
          soundOrderCancelled(ctx);
          break;
      }
    } catch (err) {
      console.warn('[useSound] Error reproduciendo sonido:', err);
    }
  }

  /** Reproduce el sonido de nuevo pedido (útil para test/ preview). */
  function playNewOrderSound(): void {
    playSound('new_order');
  }

  /** Alerta crítica repetitiva para nuevos pedidos en cocina / mostrador. */
  function playCriticalAlert(): void {
    if (isMuted.value) return;

    try {
      const ctx = getAudioContext();
      soundCriticalAlert(ctx);
    } catch (err) {
      console.warn('[useSound] Error reproduciendo alerta crítica:', err);
    }
  }

  return {
    /** @deprecated Usar `muted` en su lugar (se mantiene para compatibilidad). */
    isMuted: muted,
    muted,
    toggleMute,
    playSound,
    playNewOrderSound,
    playCriticalAlert,
  };
}

