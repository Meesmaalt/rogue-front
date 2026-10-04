# Rogue Front — To-do (Real War: Rogue States sihtmärk)

Mäng peab tunduma nagu *Real War: Rogue States*, aga sujuvam ja loetavam.
Põhisammas: **logistika + käsupuu + tänapäeva tehnika**, mitte klassikaline “kaevanda mineraale”.

## Real War põhiloop (referents)
1. Alusta **HQ + inseneridega**
2. Ehita **generaator** (energia) → **varustusladu** (logistikahelikopterid toovad varustust)
3. Ehita **Land / Air / Sea Command** → avab tootjad (kasarmu, tehas, helipad, airbase, shipyard)
4. **Strategy Center** → avab täiustatud üksused / producer upgrade
5. **Combat Engineer** → punkrid, AA, kaitse
6. Üksustel: stance (hold / defend / attack), pre-deploy order, formatsioonid
7. Võit = vaenlase HQ hävitamine; logistika ründamine on taktika

---

## Praegune prioriteet — üks brauserikaart (Roheorg)
- [x] Üksiklahingu fookuskaart: põllud, mets, küla, kolm teed; sama kõrgusväli renderduses ja nav-is
- [x] Valmis baasi / ehitusalguse valik; tegelik tootmine ja piiratud füüsiline varustus
- [x] Kompaktne ikoonidega HUD ja 63 mängumudelite pisipilti; üksuse seisundi selgitus
- [x] Jalaväe siluett ja liikumispõhine kõnnianimatsioon; tootmishoonete katuseviimistlus
- [x] Ründeliikumise A*, pööratud takistused, nurkade läbimine, veokite teekond ja LOS-positsioon
- [x] Brauseris kontrollitud käsust liikumine, vastase tulekahju ja laskemoona vähenemine; salvestamine
- [ ] Pika mängu tasakaal ja suurema armee kitsaskohtade viimistlemine mängija tagasiside järgi
- [ ] Detailsemad keskkonna- ja jalaväetekstuurid ning realistlikumad tsiviil-/baasikompleksid

## Etapp 1 — Käsupuu + ehitusloop (PRAEGU)
Eesmärk: mängija saab alati aru, *mida* saab ehitada ja *miks* midagi lukus on.

- [x] BUILDS-panel näitab ainult valitud HQ/Command haru `availableBuilds()` järgi
- [x] Lukustatud nuppudel selge põhjus (puudub generaator / command / energia / limiit)
- [x] Tree-label uueneb: „EHITUSPUU: HQ“ / „Land Command“ jne
- [x] Generaator → supply → landCommand → barracks/factory töötab usaldusväärselt (CoreLoop test + brauseri ehituskontroll)
- [x] Ehitusprogress: mudel ei muutu „roheliseks ribaks“; progress selge (tehtud)

## Etapp 2 — Majandus & logistika (RW core)
- [x] Varustusladu + automaatne supply-heli/õhusild loetav UI-s (ühendatud / katkestatud)
- [x] Energia riba + puudujäägi mõju tootmisele selgelt näha
- [x] Forward depot (edasi lükatud ladu) + kaitse vajadus (füüsiline varukonvoi, käsitsi marsruut, piiratud ammo/fuel/repair)
- [ ] Vaenlase ladude ründamine vähendab tulu (AI ka kasutab)

## Etapp 3 — Tootmine & pre-deploy
- [ ] Tootmine kaardilt (pole vaja baasi juurde kerida) — juba osaliselt
- [x] Pre-deploy order järjekorras olevatele üksustele (move/attack/patrol/hold)
- [x] Producer upgrade (Strategy Center nõue) avab täiustatud üksused
- [x] Queue cancel + 75% tagastus stabiilne

## Etapp 4 — Lahingukäsud (RW advanced orders)
- [x] Stance: Aggressive / Hold / Patrol (üksus + grupp)
- [x] „Ründa kõiki varustusladusid / generaatoreid / AA“ prioriteetkäsud
- [x] Formatsioonid (line / wedge / column) rühmale
- [x] Waypoint-rada (shift-klõps)

## Etapp 5 — Roster & rahvused
- [x] USA / Russia / China nimed
- [x] APC, IFV, MLRS, interceptor, bomber
- [x] Iga rahvuse unikaalsed bonusid (väikesed, mitte pay-to-win)
- [ ] Rohkem mere-/õhuüksusi per domain (carrier late-game jms)
- [ ] Mudelite siluettide eristamine rahvuste vahel (värv + detail)

## Etapp 6 — AI vastane (skirmish)
- [x] AI järgib sama käsupuud (gen → supply → command → army)
- [x] AI kaitseb ladusid ja generaatoreid
- [x] Raskus: easy / normal / hard käitumisprofiilid
- [x] Scout + flank + kombineeritud rünnakud (maa+õhk)

## Etapp 7 — UX / visuaal / jõudlus
- [x] LOD kastid eemaldatud
- [x] Ehituse lamedaks surumine eemaldatud
- [ ] Minimap: ladud, generaatorid, vaenlase kontaktid
- [ ] Selection tab: Land / Air / Sea filtreerimine (RW style)
- [ ] 60 FPS siht 100+ üksusega (spatial + vision throttle juba olemas)

## Etapp 8 — Kampaan / sisu
- [ ] 3+ skirmish kaarti selge logistikateega
- [ ] Õpetusmissioon: „ehita gen → supply → command → esimesed tankid“
- [x] Salvestus / laadimine stabiilne (v19 täisolek; deterministliku jätkamise test ja brauseri kontroll)

## Hiljem
- [ ] Multiplayer authoritative / lockstep (olemas skeleton)
- [ ] GLB art-pass (procedural jääb fallbackiks)

---

**Definition of done (iga märkeruut):**
- Käitumine kontrollitud mängus
- TypeScript ei murdu (kriitilised failid)
- TODO märgitakse `[x]`

## Integreerimise kontroll — 2026-10-04

Uue faasinumbri asemel parandati olemasolevat mängutsüklit. Vaata `docs/INTEGRATION-RELEASE.md` kontrollitud käitumise ja piirangute kohta.

- [x] Ilma kontota menüü → fraktsioon/deck/kaart/režiim → skirmish
- [x] Ressursipunkt → ladu → raha ja piiratud varud → tootmine → füüsiline FOB-i konvoi
- [x] Inimese üksusi ei juhi automaatselt operatiivne AI; battlegroup ei tekita tasuta üksusi
- [x] Victory-tingimused on simulatsioonis, sõltumatult renderduse sündmuste lugemisest
- [x] Üksuste baasandmed ei halvene varustuseta oleku tõttu jäädavalt
- [x] Hoonete level-up lõpetab töö, suurendab tegelikke võimeid ja lisab visuaalseid mooduleid
- [x] Õpetuse ehitamise, tarne ja esimese tanki eesmärgid kontrollivad tegelikku olekut
- [ ] Kõigi kampaaniamissioonide täielik inimese läbimäng ja tasakaalustus
- [x] Esimene 3D tehnikapass: 63 GLB-varianti / 21 rolli, fraktsioonikamo, tornid ja rootorid päris mängu renderdajas
- [ ] Järgmine visuaalne pass: jalavägi, hooned, merevägi ja täpsemad lennukivariandid
- [x] Kahe brauseri/serveri põhikontroll: start, eri fraktsioonid, käsk, reconnect ja desync-paus
- [ ] Multiplayer’i pikk lahing, tootmine/upgrade/õhuoperatsioonid päris võrgus, WAN-latentsus ja serveri taaskäivitus
- [ ] Mõõdetud 60 FPS esinduslikul GPU-l, segaarmeega ja pika lahinguga
