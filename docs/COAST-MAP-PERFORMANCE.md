# Ranniku ja kaardikoormuse viimistlus

Murdlaine layout 3 kasutab 64 ühendatud veeriba: avatud meretee, kaks madalat lahesoppi ja eraldi ligipääs mõlema sadama kõrval. Veemask, kõrgusväli, minikaart ja renderdus loevad sama geomeetriat. Laevatee x=-200 jääb kogu ranniku pikkuses vabaks; sadamahooned jäävad kuivale maale ning olemasolev lao varudest sõltuv tootmine/teenindus säilib.

Rannaküla sai ühendatud tänava, sadamad teenindusõued ja kuus garnisonitavat laohoonet. Baasi juurdepääsuteed ei lähe enam läbi peakorteri ja kasarmu. Metsavööndid paiknevad kvartalite kõrval, nende taga on põllud. Mere eraldi jagatud materjal kasutab madaliku värvivahetust ja aeglasemat pinnaliikumist; kalda maastikuatlas järgib tegelikke veepiire, mitte jõe kesktelge. Roheoru layout 13 teede/sildade ning kompaktse HUD-i ja fullscreen'i eelmised parandused on samas GitHubi muudatuses.

`MapFeatureIndex` kasutab pööratud jälje AABB-d senise diagonaalraadiusega ruudu asemel. TerrainState'i pinnasepäringud, veokite teeklass ja renderduse puude paigutamine kasutavad kohalikke kandidaate. Täpsed jäljekontrollid, objektide järjekord ja RNG kutsed säilivad. WaterNavGrid rasterdab sama AABB abil. Staatilised teed ja merepind jagavad materjale ning lähevad olemasolevatesse piirkondlikesse geomeetriapartiidesse.

Sama uue kaardigeomeetria puhul vähenes taimkatte indeksi feature–cell kirjete arv Roheorus 1301 → 746 ja Murdlaine kaardil 4566 → 992. See on indeksi suuruse võrdlus, mitte FPS mõõtmine.

Kontroll: production build (sisaldab TypeScripti kontrolli) ning viis sihitud kontrolli: pööratud/polsterdatud indeksi täpsus, ranniku sadamad/meretee/hooned/ressursid, rannikumissiooni võit, mereväe save/load ning Roheoru hoonete/teede/sildade paigutus. Brauseri visuaalne ülevaatus, GPU FPS ja pikk läbimängimine on endiselt ootel; A6 ja B1 jäävad avatuks. Ranniku uus salvestusvõti on `.coast3`, et vana kaardigeomeetriaga mängu ei laaditaks uude paigutusse.
