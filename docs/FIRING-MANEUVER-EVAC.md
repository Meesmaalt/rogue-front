# Laskekaugus, peatumine ja lennuväe tagasipöördumine

## Tegelik mängukäitumine

Ründekäsu ja rünnakliikumisega maaüksus kasutab jätkuvalt sihtmärgile sobiva, moonaga relva tegelikku ulatust. Tehnika laskepositsiooni otsing ei proovi enam väga lähedasi, 40% raadiusega positsioone. Jalavägi säilitab oma lähivõitluse/katte võimalused; tehnikale otsitakse kaugemaid läbitavaid ja tulejoonega kohti.

Liiga lähedale sattunud maa-tehnika taastab laskekauguse. Taandumine algab umbes 52% efektiivsest relvaulatusest ja lõpeb vähemalt 70% juures, vältides iga kaadriga edasi-tagasi vahetust. Relva miinimumkaugus ja üksuste jalajäljed seavad täiendava piiri. Torniga tehnika tagurdab aeglasemalt, hoides kere ning torni vaenlase suunas; torni tegelik sihtimine ja relva liikumiselt laskmise reegel kehtivad endiselt. Hoia-positsiooni käsk ja garnison ei lase üksusel omavoliliselt välja tagurdada. Otsene liikumiskäsk jääb liikumiskäsuks ega peatu iga kontakti peale.

Relv, mille andmed keelavad liikumiselt laskmise, nõuab lisaks kiirusele kuni 0,5 m/s ka 0,45 s stabiliseerumist pärast liikumist. IFV tankitõrjerakett ei lähe teele kohe pidurduse esimesel hetkel. Liikumiselt lubatud kahur ei saa seda keeldu. HUD-i lahinguseisund kasutab sama stabiliseerumise taimerit. Moon, laadimine, nähtavus, LOS ja suund jäävad päris laskmise eeltingimusteks.

Ründelennuk eemaldub pärast maasihtmärgile laskmist enne uut lähenemist. Raketi järel valitakse eemaldumispunkt sihtmärgist eemale; muu relva korral jätkatakse ründeläbimise suunas. Eemaldumine lõpeb punktile lähenedes või piiratud aja järel. CAP-i õhulahing ei kasuta seda maasihtmärgi ründetsüklit. See on ründeläbimise viimistlus olemasolevas õhuliikumises, mitte täielik lennudünaamika või formaatsioonide mudel.

## Lennuväe juhtimine

Õhuüksuse või lennurajatise valimisel on olemasoleva tagasipöördumiskäsu nupp nüüd **EVAC · Baasi**, lisaks klahv **E**. Nupp näitab tagasipöördumise aktiivset olekut ja pole baasis/maandumisel tarbetult saadaval. Käsu andmine tühistab kursori poolelioleva sihtimisrežiimi.

EVAC lõpetab rünnaku, patrulli, vahepunktid, ründeläbimise ning pooleli oleva pealevõtu/mahalaadimise. Juba pardal olev jalavägi säilib kopteris: EVAC ei viska sõdureid õhust välja ega telepordi neid baasi. Masin kasutab olemasolevat päris lähenemise, maandumise, parkimise ning piiratud lao moonast/kütusest/remondivarust teenindamise tsüklit. Jalaväe väljumiseks antakse pärast tagasijõudmist eraldi väljumiskäsk. Ressursside automaatsed logistikalennud ei ole lahingulennuväe valikukäsu sihtmärgid.

Automaatne kütuse tõttu tagasipöördumine arvestab nüüd ka kaugust kodubaasist, hinnangulist tagasilennu kiirust ja maandumisreservi, mitte ainult fikseeritud protsenti. Tugev komponendikahju käivitab samuti tagasipöördumise. See on konservatiivne kütusehinnang; rada, AA ohud ja alternatiivbaasi otsing kasutavad olemasolevaid süsteeme, mitte garanteeritud ohutu marsruudi planeerijat.

## Determinism ja kontroll

Kõik uued lävendid on mobility.json-is. Uued olekud asuvad olemasolevas Entity-s ja salvestuvad v20 fullEntities kaudu. Replay hash sisaldab taandumist, stabiliseerumise aega, ründest eemaldumise punkti, tegelikku liikumiskiirust ning olulisi baasi/ruleerimise olekuid. UI annab olemasoleva air-return käsu; simulatsioon muutub fikseeritud tickis. Multiplayeri kliendid peavad kasutama sama uuendatud versiooni.

Läbisid neli uut päris tickide ja käskudega kontrolli: tanki tagurdamine koos tulega, IFV lähenemine ja raketiks peatumine, pardal olevate sõduritega EVAC ning ründelennuki eemaldumine. Lisaks läbisid 13 olemasolevat lahingukontrolli, replay determinism ning kaks olemasolevat õhkutõusu/tagasipöördumise/teeninduse kontrolli. Kokku 20 eri kontrolli; TypeScript ja tootmisbuild läbisid.

Visuaalset brauseri läbimängu ega uut FPS-mõõtmist ei tehtud. Eriti vajavad mängus jälgimist suure grupi tagurdamine kitsal teel ja lennuki pöörderaadius kaardi serva lähedal. A6/B1/B2 jäävad avatuks.


## Laskepositsioonide ja relvatagasiside viimistlus — 08.10.2026

Üksus läheneb endiselt olemasoleva peatumisulatuseni, kuid väljakujunenud laskepositsioon säilib kuni valitud relva tegeliku maksimaalse ulatuseni. Väike vastase eemaldumine ei käivita uut sõitu ega katkesta iga kord paigalolekut nõudva relva stabiliseerumist. Kontakti või käsu muutumine ning ulatusest lahkumine lähtestavad selle seisundi; lähedalt taandumise ja miinimumulatuse reeglid säilivad. `combatHoldingTarget` kuulub täisoleku salvestusse ja replay-hash'i.

Laskekoha otsing kogub kord otsingu kohta sama sihtmärgi vastu tegutsevate liitlaste planeeritud kohad ning jätab nende jalajälgede ja andmepõhise vahega kattuvad kandidaadid kõrvale. Plaane ei saa pärida omaniku praeguse ruumilahtri järgi: lähenemisest hoolimata on reserveeritud koht sihtmärgi lähedal. Otsingu olemasolev 1.5 s vahemälu ja kandidaatide arvupiir säilivad. Kitsas kohas kolonni järgimine rakendub marsil, mitte aktiivse lahingupositsiooni arvelt.

`weaponFireBlocker` on päris automaatlasu ja HUD-i relvakaardi ühine kontroll: luurekontakt, tulekorraldus, häiring, taandumine, ründelennuki eemaldumine, sihtmärgi liik, garnisoni sektor/relv, läbivus, moon, miinimum-/maksimumulatus, liikumine/stabiliseerumine, laadimine, tulejoon ja sihtimine. Null tähendab, et see relv võib selle kontrolli järgi tulistada; edukas tabamus ei ole garanteeritud. Üksuse olek eristab torni pööramist, relva stabiliseerumist ja laadimise sekundeid. Garnisoni või lennu üldolek ei varja enam oma aktiivse relva tagasisidet. Vastase relvakaart ei ava tema jooksvaid sihtimisandmeid.

Kontroll: TypeScript + Vite build ja 17 lühikest kontrolli CombatPolish, CombatManeuver ning Replay failides. Kolm uut juhtumit kontrollivad peatumisulatuse hüstereesi/save-load'i, ühise stabiliseerumise/sihtimise/laadimise kontrolli seost päris raketilasuga ning rühma eraldatud laskekohti. Brauseri visuaalne tunnetus, FPS ja pikk matš on ootel; V2 ei märgita tervikuna lõpetatuks.
