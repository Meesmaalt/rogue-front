# Liikumise ja lahingujärgse taastumise viimistlus

## Mängus muutunud käitumine

Navigeerimine kasutab üksuse tegeliku ringikujulise jalajälje kaugust blokeeritud 2 m ruutudest. Varasem raadiuse täisruutudeks ümardamine võttis kitsastelt läbipääsudelt tarbetult ruumi. Sama kontroll töötab A* otsingus ja üksuse tegelikus liikumises; kaardi serv ei ole enam ruudustiku äärmisse lahtrisse klammerdatud vaba sihtkoht.

Maaüksused valivad möödumiseks vaikimisi oma liikumissuuna parema külje ja hoiavad valitud külge kolm sekundit. Vastassuunalised üksused ei vali enam ID paarsuse tõttu sama maailmakülge. Logistikaveokid ja insenerid kasutavad sama vältimist. Kinni jäänud üksus proovib teed kohalike peatunud sõidukite ümbert; ebaõnnestunud ümbersõit ei kustuta senist üldist marsruuti. Korduskatseid piirab andmepõhine viivitus ning takistusi otsitakse ruumiindeksi kaudu 36 m lähedusest. HUD-i üksuseseisund näitab läbipääsu ootamist.

AI arvestab taandumisel lisaks elupunktidele mootori, roomikute ja relvade komponendikahju. Taastumisel eelistab ta tegelikult vajaliku moonaga, kütusega või remondivaruga teeninduspunkti ning proovib läbitavat parkimiskohta. Sobimatu või kättesaamatu lähim ladu ei sunni üksust sinna järjest sama võimatut käsku saama. Teeninduspunktide otsing on piiratud kolme kandidaadiga.

Inseneri remonditöö reserveeritakse: sama AI-uuendus ei anna ühele insenerile mitu haavatut ega katkesta käimasolevat tööd järgmise haavatu tõttu. Taastunud üksuse juurest vabastatakse remondimees. Kui sihtmärgi parandas juba teine insener, lõpeb ka üleliigne remondikäsk.

AI lao valik ja inseneri remondiloogika kasutavad sama füüsilise remondivaru reeglit. Ka ühendusest ära lõigatud lao olemasolevat varu saab ära kasutada; ühenduse puudumine ei anna uut tasuta varu. Nullvaruga remont peatub. Lennukite ja laevade teenindus parandab ka täis elupunktidega üksuse komponendikahju ning tarbib selleks olemasolevat remondivaru. Mereväe AI arvestab tagasipöördumisel komponendikahju.

## Arhitektuur ja piirid

Liikumine ja remont toimuvad olemasolevas fikseeritud simulatsioonitickis. AI annab olemasolevaid käske. Parameetrid asuvad mobility.json, logistics.json ja ai-tactics.json failides. Möödumiskülg, selle kehtivusaeg ja ootamine säilivad v20 täielikus üksuseseisundis; replay hash sisaldab ka neid ning kinnijäämise loendureid. Uue käsu korral lähtestatakse vana vältimisolek. Simulatsioon ei lisa brauserikella ega uut juhuslikkusallikat.

See ei lahenda automaatselt iga suure kolonni ummikut. Peatunud üksused ei saa veel üldist liikluskorraldaja käsku teed loovutada. Päris Roheoru sildade, suurte gruppide ja pikkade matšide visuaalne kontroll on endiselt vajalik. Jõudluse muudatused piiravad otsingu ulatust ja sagedust; uut FPS-võitu ei ole mõõdetud.

## Piiratud kontrollid

Üheksa kontrolli kolmes failis läbisid: neli uut liikumise/taastumise kontrolli, neli olemasolevat AI-kontrolli ja replay determinismi kontroll. Uus liikumiskontroll annab päris move-käsud kahele vastassuunalisele tankile 12 m koridoris ning kontrollib liikumist, läbitavust ja JSON save/load hash'i. Remondikontroll kasutab päris ticke, piiratud isoleeritud lao varu ning hõivatud inseneri. Lisaks läbis TypeScripti kontroll ja tootmisbuild.

Käsitsi brauseris läbimängitud matši või renderduse/FPS mõõtmist see pakett ei sisalda. A6 ja B1 lõpetamise tingimused jäävad avatuks.
