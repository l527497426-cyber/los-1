const KEY = "fancy-flame.save.v1";

export interface LocalSave {
  version: 1;
  bestDistance: number;
  bestTotalScore: number;
  totalRuns: number;
  totalDistance: number;
  nickname?: string;
  settings: {
    sfxVolume: number;
    screenShake: boolean;
    reducedMotion: boolean;
  };
}

const DEFAULT: LocalSave = {
  version: 1,
  bestDistance: 0,
  bestTotalScore: 0,
  totalRuns: 0,
  totalDistance: 0,
  settings: {
    sfxVolume: 0.8,
    screenShake: true,
    reducedMotion: false,
  },
};

export function load(): LocalSave {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<LocalSave>;
    if (parsed.version !== 1) return { ...DEFAULT };
    return {
      ...DEFAULT,
      ...parsed,
      settings: { ...DEFAULT.settings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function save(state: LocalSave): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 隐私模式下可能失败，忽略
  }
}

export function recordRun(distanceM: number, totalScore: number, nickname?: string): LocalSave {
  const s = load();
  s.totalRuns += 1;
  s.totalDistance += distanceM;
  if (distanceM > s.bestDistance) s.bestDistance = distanceM;
  if (totalScore > s.bestTotalScore) s.bestTotalScore = totalScore;
  if (nickname && nickname.trim()) s.nickname = nickname.trim().slice(0, 16);
  save(s);
  return s;
}
