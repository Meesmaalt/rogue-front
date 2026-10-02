# Faas 6 – Kampaania ja missioonid

Faas 6 on implementeeritud moodulipõhiselt.

## 6.1 Missiooni JSON formaat
- `src/data/missions/*.json` sisaldab nime, briifingut, seemet, kaarti, algüksusi, eesmärke ja triggereid.
- `src/data/missions/index.ts` laadib missioonid Vite `import.meta.glob` abil.
- Kaardil on `heightmap` PNG, kõrguse skaala, baasid ja objektide nimekiri.

## 6.2 Eesmärkide süsteem
`src/sim/Mission.ts` toetab:
- `destroy`
- `defend`
- `reach`
- `survive`

Eesmärkide progress on simulatsiooni osa ja võit tekib siis, kui kõik primary-eesmärgid on täidetud. HQ hävimine jääb universaalseks kaotustingimuseks.

## 6.3 Triggerid ja briifing
Ajapõhised triggerid võivad näidata sõnumi ja tuua mängu abivägesid. Triggerid võivad sõltuda ka eesmärkide täitmisest. Missioon algab eraldi briifingu ekraanilt ning aktiivsed eesmärgid kuvatakse HUD-is.

## 6.4 Kaardid
Lisatud kolm mängitavat kaarti:
- `desert` / Liivaväli
- `mountains` / Mustad mäed
- `city` / Must linn

Kõrgusväli loetakse `public/maps/*.png` failist ja interpoleeritakse simulatsiooni `heightAt()` kaudu. Sama kõrgusväli kasutatakse renderduses ja navigatsiooni kaldearvutuses.

## 6.5 Missioonivalik ja edenemine
- Kampaania avakuval saab valida missiooni.
- Valik suunab missiooni URL-i (`?mission=...`), mis teeb otsese laadimise ja refreshimise deterministlikuks.
- Lõpetatud missioonid salvestatakse `localStorage` võtmesse `rogue-front.missions.v1`.
- Menüüs märgitakse lõpetatud operatsioonid.

## Uued failid
- `src/sim/Mission.ts`
- `src/data/missions/index.ts`
- `src/data/missions/operation-sandglass.json`
- `src/data/missions/operation-high-ground.json`
- `src/data/missions/operation-black-city.json`
- `public/maps/desert.png`
- `public/maps/mountains.png`
- `public/maps/city.png`

## Oluline arhitektuuriline otsus
`World(seed, true)` kasutab objective-driven režiimi: kampaania missioonidel ei otsusta vaenlase HQ hävitamine enam automaatselt võitu, sest võidutingimus tuleb JSON-is defineeritud eesmärkidest. Mängija HQ hävimine jääb siiski koheseks kaotuseks.
