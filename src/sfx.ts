// Downloaded ambience/foley only. No music assets or music channel.
export const SFX = {
  groan: ["groan-1", "groan-2", "groan-3", "groan-4"],
  wood: ["wood-1", "wood-2"],
  metal: ["metal-1", "metal-2"],
  breach: ["break-1", "break-2"],
  hit: ["hit-1", "hit-2"],
  latch: ["latch"],
  footstep: ["step-1", "step-2"],
  drag: ["drag"],
} as const;
export type SoundSample = keyof typeof SFX;
export async function loadSfx(
  c: AudioContext,
): Promise<Map<string, AudioBuffer>> {
  const bank = new Map<string, AudioBuffer>();
  if (typeof c.decodeAudioData !== "function") return bank;
  await Promise.all(
    Object.values(SFX)
      .flat()
      .map(async (name) => {
        try {
          const response = await fetch(`/sfx/${name}.wav`);
          if (!response.ok) return;
          bank.set(name, await c.decodeAudioData(await response.arrayBuffer()));
        } catch {
          /* Synthesized fallback and captions remain usable offline. */
        }
      }),
  );
  return bank;
}
