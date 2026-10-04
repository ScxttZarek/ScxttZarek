let context: AudioContext | null = null;

function getContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!context) context = new AudioContextClass();
  return context;
}

export async function unlockJoinSound() {
  const audio = getContext();
  if (!audio) return;
  if (audio.state === "suspended") {
    try { await audio.resume(); } catch {}
  }
}

export async function playJoinSound() {
  const audio = getContext();
  if (!audio) return;

  if (audio.state === "suspended") {
    try { await audio.resume(); } catch {}
  }
  if (audio.state !== "running") return;

  const now = audio.currentTime;
  const master = audio.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.085, now + 0.008);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
  master.connect(audio.destination);

  const first = audio.createOscillator();
  first.type = "square";
  first.frequency.setValueAtTime(520, now);
  first.frequency.exponentialRampToValueAtTime(760, now + 0.075);
  first.connect(master);
  first.start(now);
  first.stop(now + 0.09);

  const secondGain = audio.createGain();
  secondGain.gain.setValueAtTime(0.0001, now + 0.075);
  secondGain.gain.exponentialRampToValueAtTime(0.72, now + 0.09);
  secondGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.185);
  secondGain.connect(master);

  const second = audio.createOscillator();
  second.type = "square";
  second.frequency.setValueAtTime(760, now + 0.075);
  second.frequency.exponentialRampToValueAtTime(1050, now + 0.165);
  second.connect(secondGain);
  second.start(now + 0.075);
  second.stop(now + 0.19);
}
