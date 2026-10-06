# Ranniku ja kaardikoormuse viimistlus

Murdlaine layout 3 kasutab 64 ühendatud veeriba: avatud meretee, kaks madalat lahesoppi ja eraldi ligipääs mõlema sadama kõrval. Veemask, kõrgusväli, minikaart ja renderdus loevad sama geomeetriat. Laevatee x=-200 jääb kogu ranniku pikkuses vabaks; sadamahooned jäävad kuivale maale ning olemasolev lao varudest sõltuv tootmine/teenindus säilib.

Rannaküla sai ühendatud tänava, sadamad teenindusõued ja kuus garnisonitavat laohoonet. Baasi juurdepääsuteed ei lähe enam läbi peakorteri ja kasarmu. Metsavööndid paiknevad kvartalite kõrval, nende taga on põllud. Mere eraldi jagatud materjal kasutab madaliku värvivahetust ja aeglasemat pinnaliikumist; kalda maastikuatlas järgib tegelikke veepiire, mitte jõe kesktelge. Roheoru layout 13 teede/sildade ning kompaktse HUD-i ja fullscreen'i eelmised parandused on samas GitHubi muudatuses.

`MapFeatureIndex` kasutab pööratud jälje AABB-d senise diagonaalraadiusega ruudu asemel. TerrainState'i pinnasepäringud, veokite teeklass ja renderduse puude paigutamine kasutavad kohalikke kandidaate. Täpsed jäljekontrollid, objektide järjekord ja RNG kutsed säilivad. WaterNavGrid rasterdab sama AABB abil. Staatilised teed ja merepind jagavad materjale ning lähevad olemasolevatesse piirkondlikesse geomeetriapartiidesse.

Sama uue kaardigeomeetria puhul vähenes taimkatte indeksi feature–cell kirjete arv Roheorus 1301 → 746 ja Murdlaine kaardil 4566 → 992. See on indeksi suuruse võrdlus, mitte FPS mõõtmine.

Kontroll: production build (sisaldab TypeScripti kontrolli) ning viis sihitud kontrolli: pööratud/polsterdatud indeksi täpsus, ranniku sadamad/meretee/hooned/ressursid, rannikumissiooni võit, mereväe save/load ning Roheoru hoonete/teede/sildade paigutus. Brauseri visuaalne ülevaatus, GPU FPS ja pikk läbimängimine on endiselt ootel; A6 ja B1 jäävad avatuks. Ranniku uus salvestusvõti on `.coast3`, et vana kaardigeomeetriaga mängu ei laaditaks uude paigutusse.

## Kopterite liikumine ja metsa kaugvaade

Kopteri stop-käsk vähendab kiirust koos tegeliku asukoha muutumisega. Pidurdamist arvutatakse järelejäänud vahemaa ja pidurdusvõime järgi; vana 2 m surnud ala ei jäta kopterit enne sihtpunkti kinni. Saabumine ja maandumine lõpetatakse madalal kiirusel. Pöördes vähendatakse soovitud kiirust, kere kalle reageerib kiirendusele/pidurdusele. Nelja olemasoleva kopteriklassi kiirus suurenes 20%; kiirendus 4.8, pidurdus 4.2. Uusi üksuse olekuvälju ei lisandu.

Metsarühmad vahetavad 260 m kaamerakaugusel (15% hüsterees) tüved ja kolme lehepinnaga krooni ühe horisontaalse kroonipinna vastu. Kaugvaate lehekolmnurki on kolmandik, tüvede ja nende dünaamiliste varjude renderdamine kaob. Samad puupositsioonid, nähtav metsaala, varjumine ning tulekahju olek säilivad. Lähivaade kasutab varasemat mudelit. See vähendab kaugvaate geomeetria- ja alpha-test koormust; tegelikku FPS kasvu pole brauseris mõõdetud.

Kontrollid: build/typecheck, stop-käsu inerts ja sihtpunkti saabumine, EVAC koos pardal oleva jalaväega/save-load, vertikaalne õhkutõus ja baasinõue. Kolm sihitud kontrolli läbisid.
