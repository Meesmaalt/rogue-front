# Baasi elu: insenerid, peamaja ja varustusladu

16.10.2026. Esitlus (render) + üks väike geomeetria muudatus: kopteriplatsid asuvad ladu ümber 4 m kaugemal (`logistics.json`: `padClearance` 12→16, aluse `baseHalfWidth` 9→12, `baseHalfDepth` 10→13), et suuremale lao mudelile ruumi jätta. Laoseis, tarnemahud ja kiirused ei muutunud.

## Insenerid
- Igal inseneril: kollane kiiver, oranž vest, haamer ja labidas. Meeskonnal on ühine käru (koorem nähtav ehitades/remontides).
- Ehitamisel (`mode=build`) vehkivad haamriga ja pöörduvad sihtmärgi poole, remondil (`repair`) kaevavad labidaga.
- Kui insener on 3 s jõude ja oma valmis peamaja on ≤28 m kaugusel, kõnnivad liikmed peamaja diivanitele ja istuvad. Kui tuleb töö, kõnnivad nad kõigepealt tööriistaraami juurde, võtavad haamri ja labida (2 s) ja alles siis lähevad tööle (`EngineerLounge.ts`).
- Peamaja tööriistaraam näitab haamreid/labidaid ja käru nii mitmele jõudeolevale insenerile, kui neid on (`BaseLife.ts`).

## Peamaja (`Architecture.ts`, `hqYard`)
Lounge (diivan, tugitoolid, laud, päevavari) ja inseneriala (tööriistaraam, tööpink, saepukid, plangud, telliskivid, tellingud).

## Varustusladu (`depotYard`)
Mudel on 30% suurem kui teised sõjaväehooned (`buildingScale('supply')` failis `lounge.ts`). Hall koos dokiga, rambiga, katuseakendega, katusel tehnika, antenn ja silt. Meeskonna lounge: kaks pikka diivanit teleri ees, müügiautomaat, külmik. Laadurite parklad tagaküljel (`-z`).
- Iga helikopteriplatsi kohta üks meeskond (2 töötajat + 1 laadur), maksimaalselt 4.
- Kui platsil pole kopterit (ei laadita, rampi pole avatud, poortereid pole), istuvad töötajad lounge'is ja laadur seisab parklas; muidu on nad "tööl" ja nähtavad on tegelikud laadurid.
- Kastikandjate (`groundHandler`, `onFoot`) visuaal on nüüd kastilaadur (`createForklift`): kahvlid tõusevad koormaga, rattad veerevad.

## Combat Engineer keskus
Sai sama inseneriala (tööriistaraam, tööpink, saepukid, plangud, tellingud); raami tööriistad on dünaamilised nagu peamajal.

## Käru
Käru liigub ühe meeskonnaliikme ees (lükatakse), peidetakse kui insenerid puhkavad (siis seisab käru peamaja õues).

## Piirangud
Visuaalid on protseduurilised; istumispoos ja töötajate liikumine on lihtsustatud ega ole brauseris kontrollitud. Mudelid peavad mahtuma 12 materjali piiri sisse (`MilitaryArchitecture.test.ts`).
