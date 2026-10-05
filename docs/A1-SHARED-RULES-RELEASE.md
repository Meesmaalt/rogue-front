# A1 — ühised üksuseandmed ja päris uuendused

Esimese tööpaketi kood ja sihitud kontrollid on valmis. Brauseri visuaalne ülevaatus, pika matši tasakaal ja kahe kliendi multiplayeri kontroll on veel tegemata; see väljalase ei ole alpha-valmiduse kinnitus.

## Mängus kasutatav muutus

Vali töötav maastrateegia keskus ja ava „Täiustatud soomuse uuring” (220 krediiti + 220 ressurssi). See avab maasoomukite soomuspaketi; ei uuenda olemasolevat armeed tasuta. Õhuvõime avatakse jätkuvalt olemasoleva Air Command hoonega, sellele ei lisata dubleerivat uurimisnuppu.

Vali oma lahinguüksus ja ava „Üksuse uuendused”. Ostureegli sama funktsioon annab HUD-i põhjuse ja kinnitab Command'i simulatsioonis. Vajalik on vastava haru töötav strateegiakeskus, peatatud üksus ning ühendatud, mitte häiritud ladu/HQ kuni 80 m kaugusel. Õhusõiduk peab olema baasis. Soomuspakett on maasoomukitele, relva- ja tulejuhtimispakett olemasolevatele liikuvatele lahinguüksustele. Ostu ei lubata surnud, laaditud, ehitatavale või häiritud üksusele.

| Pakett | Mõju | Kulu |
|---|---|---|
| Soomus | Esi/külg/tagasoomus ×1,20; maksimumelud ×1,15 | 140 krediiti + 140 ressurssi + 30 lao remondivaru |
| Relv | Relvakahju ×1,15; AP ×1,08 | 140 + 140 + 20 remondivaru |
| Tulejuhtimine | Maksimumulatus ×1,20, miinimumkaugus ja baastäpsus säilivad | 140 + 140 + 15 remondivaru |

Uuendus on olemasoleva retrofit-käsu kohene ost eeltingimuste täitumisel; uut pikka töökojajärjekorda ei loodud. Soomustamine säilitab tervise suhtarvu, mitte ei paranda katkist tanki tasuta. Remont, HP-ribad, operatiivne tugevus, komponendi-/meeskonnakahju ja tegelik AP-tabamus kasutavad sama maksimumelude/soomuse arvestust. Relvavalik arvestab ka vastase uuendatud soomust. Kineetiline nullkahju välistab sobimatu relva, HUD-i AP-võrdlus kasutab uuendatud väärtusi. Nominaalne kahjustustabel jääb baaskoosseisu referentsiks.

AI kasutab baasiarenduse olemasolevas rütmis sama research/upgrade Command'i ning samu hindu ja eeltingimusi: konservatiivse vähemalt 1000 krediidi/ressursi reserviga, üks peatatud soomuk korraga. Uut AI-süsteemi ei tehtud; kogu operatiivse AI luureaususe viimistlus jääb A5-sse.

## Tootmine, maastik ja tulejuhtimine

`unitStats.ts` koondab efektiivse HP/soomuse, relvauuenduse, ulatuse, liikumisprofiili ja ostu eeltingimused. Mõjud ja kulud on `unit-upgrades.json`-is. Fraktsiooni lahendatud definitsioon määrab nüüd tootmise töömahu lõpuni, materjalikulu, sünniva üksuse raadiuse/andmed ja HUD-i edenemisriba. Viimane samm tarbib ainult järelejäänud tootmistöö materjali. HUD nimetab töömahtu baastootmistööks: hoonetaseme, juhtimisharu ja energia tõttu ei ole see garanteeritud reaalse aja kestus.

`mobility.json` on tee/metsa kiiruse üks allikas. Maantee: jalavägi ×1,08; roomik ×1,22; ratas ×1,28. Täistihe mets: vastavalt ×0,88 / ×0,64 / ×0,48, osaline mets kaalub tegurit tiheduse järgi. Jalaväerühma määramine hõlmab ka insenere. Tavaline liikumine ja logistiline veok kasutavad sama maastikutegurit; muud seisundi/kiirenduse tegurid võivad jätkuvalt erineda. Tee ja üldise katte päring kasutab olemasolevat piirkonnaindeksit. Teid eelistavat teekonnaotsingut ega uut kiirliikumise käsku selles paketis veel ei tehtud: need kuuluvad A2-sse.

TacticalAI/kaudtule ulatuse tarbijad kasutavad tegelikku ulatust ja miinimumkaugust. Counter-battery kasutab värske luurekontakti salvestatud koordinaati, mitte vaenlase jooksvaid koordinaate udus. Otsene attack Command vajab praegust kontakti; kontaktikaotuse järel jätkub ründeliikumine viimati nähtud asukohta ega jälita nähtamatut elavat üksust.

## Determinism ja kontroll

Uuenduse ning uuringu lipud, varud, HP ja kulud olid juba save/hash osa; uusi sim-seisundi välju ei lisatud. Efektiivsed väärtused tuletatakse lipust ja üksuse lahendatud definitsioonist. Sama RNG, 30 Hz ja käskude ahel säilivad. Varasema v19 soomuslipuga salvestuse HP-boonus säilib ning soomuse tegelik mõju lisandub selle buildi reeglitega. Eri buildidega lockstep'i ja vana buildi replay täpset tulemust ei lubata; A1 ei ole versioonidevahelise replay ühilduvuse muudatus.

Kontrolliti üheksat sihitud juhtu: kolm uut A1 testi (uuring/ost/AP-tabamus/remont/save/hash koos viie sammuga jätk; fraktsiooni tootmistöö ja piiratud materjal; tee/mets/ulatus/kadunud kontakt) ning kuus varasemat tulejuhtimise/sõidukirelva kontrolli. TypeScript ja Vite build õnnestusid. Täistestikomplekti ei käivitatud. Brauserit kohalikus käituskeskkonnas ei leitud; uue ostupaneeli pildikontroll ja mängija matš on veel ootel. FPS-i ei mõõdetud.

Järgmine arenduspakett: A2 — kiire teekäsk, aja järgi marsruut, grupi läbipääs ja APC/IFV/kopteri rühmatransport.
