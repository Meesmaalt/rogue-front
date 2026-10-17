export interface GameSettings {
  shadows?:boolean;antialiasing?:boolean;ambientOcclusion?:boolean;bloom?:boolean;renderScale?:number;
  performanceOverlay?: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  quality: "low" | "medium" | "high";
  keys: { attackMove: string; hold: string; patrol: string; stop: string; pause: string };
}

const KEY = "rogue-front.settings.v1";
const DEFAULTS: GameSettings = {
  shadows:true,antialiasing:true,ambientOcclusion:false,bloom:false,renderScale:1,
  masterVolume: 0.75, musicVolume: 0.45, sfxVolume: 0.8, quality: "medium",
  keys: { attackMove: "a", hold: "h", patrol: "p", stop: "x", pause: "escape" },
};

export function loadSettings(): GameSettings {
  try {
    const parsed:unknown=JSON.parse(localStorage.getItem(KEY)??"null");
    if(!parsed||typeof parsed!=="object")return structuredClone(DEFAULTS);
    const value=parsed as Partial<GameSettings>,settings=structuredClone(DEFAULTS);
    for(const key of ["masterVolume","musicVolume","sfxVolume"] as const){
      const volume=value[key];if(typeof volume==="number"&&Number.isFinite(volume))settings[key]=Math.max(0,Math.min(1,volume));
    }
    if(value.quality==="low"||value.quality==="medium"||value.quality==="high")settings.quality=value.quality;
    for(const key of ['shadows','antialiasing','ambientOcclusion','bloom'] as const)if(typeof value[key]==='boolean')settings[key]=value[key];
    if(typeof value.renderScale==='number'&&Number.isFinite(value.renderScale))settings.renderScale=Math.max(.5,Math.min(1.5,value.renderScale));
    settings.performanceOverlay=value.performanceOverlay===true;
    const keys=value.keys;
    if(keys&&typeof keys==="object")for(const key of Object.keys(settings.keys) as Array<keyof GameSettings["keys"]>){
      const binding=keys[key];if(typeof binding==="string"&&/^(?:[a-z0-9]|escape)$/i.test(binding))settings.keys[key]=binding.toLowerCase();
    }
    return settings;
  } catch { return structuredClone(DEFAULTS); }
}

export function saveSettings(settings: GameSettings): void { localStorage.setItem(KEY, JSON.stringify(settings)); }

export class SettingsPanel {
  private readonly root: HTMLElement;
  constructor(private readonly onChange: (settings: GameSettings) => void,private readonly onClose:()=>void=()=>{}) {
    this.root = document.createElement("div");
    this.root.className = "settings-screen";
    this.root.hidden = true;
    document.body.appendChild(this.root);
  }
  get isOpen():boolean{return !this.root.hidden;}
  open(): void {
    const s = loadSettings();
    this.root.innerHTML = `<div class="settings-card"><h2>Seaded</h2>
      <label>Helitugevus <input data-k="masterVolume" type="range" min="0" max="1" step=".05" value="${s.masterVolume}"></label>
      <label>Muusika <input data-k="musicVolume" type="range" min="0" max="1" step=".05" value="${s.musicVolume}"></label>
      <label>Efektid <input data-k="sfxVolume" type="range" min="0" max="1" step=".05" value="${s.sfxVolume}"></label>
      <label>Graafika <select data-k="quality"><option value="low">Madal</option><option value="medium">Keskmine</option><option value="high">Kõrge</option></select></label>
      <h3>Graafika valikud</h3>
      ${([['shadows','Varjud'],['antialiasing','Servade silumine (FXAA)'],['ambientOcclusion','Ruumiline varjutus (SSAO)'],['bloom','Valguskuma']] as const).map(([key,label])=>`<label>${label} <input data-graphics="${key}" type="checkbox" ${s[key]?'checked':''}></label>`).join('')}
      <label>Renderduse mõõtkava <select data-resolution><option value="0.5">50%</option><option value="0.75">75%</option><option value="1">100%</option><option value="1.25">125%</option><option value="1.5">150%</option></select></label>
      <label>Jõudluse mõõdikud (F8) <input data-performance type="checkbox" ${s.performanceOverlay?"checked":""}></label>
      <p>Kaamera: nooled või ekraaniserv · Alt+Q/E pöörab · keskmine hiir + lohista pöörab/kallutab · rull suumib. Käsk: üks täht/number või Escape.</p><h3>Klahvid</h3><div class="key-grid">
        <label>Ründeliikumine <input data-key="attackMove" value="${s.keys.attackMove}"></label>
        <label>Hoia <input data-key="hold" value="${s.keys.hold}"></label>
        <label>Patrull <input data-key="patrol" value="${s.keys.patrol}"></label>
        <label>Peata <input data-key="stop" value="${s.keys.stop}"></label>
        <label>Paus <input data-key="pause" value="${s.keys.pause}"></label>
      </div><button data-action="close">Valmis</button></div>`;
    (this.root.querySelector("select") as HTMLSelectElement).value = s.quality;
    (this.root.querySelector('[data-resolution]') as HTMLSelectElement).value=String(s.renderScale??1);
    this.root.querySelectorAll('input[data-graphics],select[data-resolution]').forEach(input=>input.addEventListener('change',()=>this.apply(s)));
    this.root.querySelector('[data-action="close"]')!.addEventListener("click", () => this.close());
    this.root.querySelectorAll<HTMLInputElement>("input[data-k]").forEach((input) => input.addEventListener("input", () => this.apply(s)));
    this.root.querySelector("input[data-performance]")!.addEventListener("change", () => this.apply(s));
    this.root.querySelector("select")!.addEventListener("change", () => this.apply(s));
    this.root.querySelectorAll<HTMLInputElement>("input[data-key]").forEach((input) => input.addEventListener("change", () => this.apply(s)));
    this.root.hidden = false;
  }
  private apply(s: GameSettings): void {
    const val = (key: string) => Number((this.root.querySelector(`[data-k="${key}"]`) as HTMLInputElement)?.value ?? 0);
    s.masterVolume = val("masterVolume"); s.musicVolume = val("musicVolume"); s.sfxVolume = val("sfxVolume");
    s.quality = (this.root.querySelector("select") as HTMLSelectElement).value as GameSettings["quality"];
    this.root.querySelectorAll<HTMLInputElement>("input[data-key]").forEach((input) => { const binding=input.value.toLowerCase();if(/^(?:[a-z0-9]|escape)$/.test(binding)){input.setCustomValidity("");s.keys[input.dataset.key as keyof GameSettings["keys"]]=binding;}else{input.setCustomValidity("Kasuta ühte tähte, numbrit või Escape.");input.reportValidity();} });
    this.root.querySelectorAll<HTMLInputElement>('input[data-graphics]').forEach(input=>{s[input.dataset.graphics as 'shadows'|'antialiasing'|'ambientOcclusion'|'bloom']=input.checked;});
    s.renderScale=Number((this.root.querySelector('[data-resolution]') as HTMLSelectElement).value);
    s.performanceOverlay=(this.root.querySelector("input[data-performance]") as HTMLInputElement).checked;
    this.onChange(s);
    try{saveSettings(s);this.root.querySelector("[data-settings-warning]")?.remove();}
    catch{if(!this.root.querySelector("[data-settings-warning]")){const warning=document.createElement("p");warning.dataset.settingsWarning="";warning.textContent="Seaded rakendusid, kuid brauser ei lubanud neid järgmiseks korraks salvestada.";this.root.querySelector(".settings-card")?.appendChild(warning);}}
  }
  close(): void { this.root.hidden = true;this.onClose(); }
}
