export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  quality: "low" | "medium" | "high";
  keys: { attackMove: string; hold: string; patrol: string; stop: string; pause: string };
}

const KEY = "rogue-front.settings.v1";
const DEFAULTS: GameSettings = {
  masterVolume: 0.75, musicVolume: 0.45, sfxVolume: 0.8, quality: "high",
  keys: { attackMove: "a", hold: "h", patrol: "p", stop: "x", pause: "escape" },
};

export function loadSettings(): GameSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<GameSettings> | null;
    if (!parsed) return structuredClone(DEFAULTS);
    return {
      ...DEFAULTS, ...parsed, keys: { ...DEFAULTS.keys, ...(parsed.keys ?? {}) },
    };
  } catch { return structuredClone(DEFAULTS); }
}

export function saveSettings(settings: GameSettings): void { localStorage.setItem(KEY, JSON.stringify(settings)); }

export class SettingsPanel {
  private readonly root: HTMLElement;
  constructor(private readonly onChange: (settings: GameSettings) => void) {
    this.root = document.createElement("div");
    this.root.className = "settings-screen";
    this.root.hidden = true;
    document.body.appendChild(this.root);
  }
  open(): void {
    const s = loadSettings();
    this.root.innerHTML = `<div class="settings-card"><h2>Seaded</h2>
      <label>Helitugevus <input data-k="masterVolume" type="range" min="0" max="1" step=".05" value="${s.masterVolume}"></label>
      <label>Muusika <input data-k="musicVolume" type="range" min="0" max="1" step=".05" value="${s.musicVolume}"></label>
      <label>Efektid <input data-k="sfxVolume" type="range" min="0" max="1" step=".05" value="${s.sfxVolume}"></label>
      <label>Graafika <select data-k="quality"><option value="low">Madal</option><option value="medium">Keskmine</option><option value="high">Kõrge</option></select></label>
      <h3>Klahvid</h3><div class="key-grid">
        <label>Ründeliikumine <input data-key="attackMove" value="${s.keys.attackMove}"></label>
        <label>Hoia <input data-key="hold" value="${s.keys.hold}"></label>
        <label>Patrull <input data-key="patrol" value="${s.keys.patrol}"></label>
        <label>Peata <input data-key="stop" value="${s.keys.stop}"></label>
        <label>Paus <input data-key="pause" value="${s.keys.pause}"></label>
      </div><button data-action="close">Valmis</button></div>`;
    (this.root.querySelector("select") as HTMLSelectElement).value = s.quality;
    this.root.querySelector('[data-action="close"]')!.addEventListener("click", () => this.close());
    this.root.querySelectorAll<HTMLInputElement>("input[data-k]").forEach((input) => input.addEventListener("input", () => this.apply(s)));
    this.root.querySelector("select")!.addEventListener("change", () => this.apply(s));
    this.root.querySelectorAll<HTMLInputElement>("input[data-key]").forEach((input) => input.addEventListener("change", () => this.apply(s)));
    this.root.hidden = false;
  }
  private apply(s: GameSettings): void {
    const val = (key: string) => Number((this.root.querySelector(`[data-k="${key}"]`) as HTMLInputElement)?.value ?? 0);
    s.masterVolume = val("masterVolume"); s.musicVolume = val("musicVolume"); s.sfxVolume = val("sfxVolume");
    s.quality = (this.root.querySelector("select") as HTMLSelectElement).value as GameSettings["quality"];
    this.root.querySelectorAll<HTMLInputElement>("input[data-key]").forEach((input) => { s.keys[input.dataset.key as keyof GameSettings["keys"]] = input.value.toLowerCase(); });
    saveSettings(s); this.onChange(s);
  }
  close(): void { this.root.hidden = true; }
}
