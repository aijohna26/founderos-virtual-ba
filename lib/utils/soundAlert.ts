"use client";

export function playAlertChime(): void {
  if (typeof window === "undefined") return;

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();

    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    };

    // Pleasant 3-tone chime (E5 -> G#5 -> B5)
    playTone(659.25, 0, 0.3);
    playTone(830.61, 0.15, 0.35);
    playTone(987.77, 0.3, 0.5);
  } catch (e) {
    console.warn("Could not play audio chime:", e);
  }
}
