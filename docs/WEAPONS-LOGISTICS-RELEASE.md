# Roheorg: relvad ja füüsilised ressursiveod

05.10.2026. Jätkab olemasolevat mängu, mitte eraldi funktsioonikihti.

Relvade laskeulatused on andmepõhiselt eristatud: liinijalavägi 26 m, APC 30 m, IFV 48 m, tank 72 m, tankitõrjekopter 100 m, ATGM-meeskond 110 m, NASAMS 140 m, suurtükivägi 190 m. Need on tihendatud mängumõõtkava väärtused, mitte päris relvade mõõdetud kaugused. HUD näitab tegelikku, uuendusi/varustust arvestavat ulatust ja minimaalkaugust. Tank ja jalavägi ei lase lennukeid; SPAA võib kasutada õhusihtmärgi vastu automaatkahurit. Kopterid eelistavad soomust ja hoiavad laskepositsiooni. Miinimumulatusega liikuv tankitõrje püüab liiga lähedasest vastasest eemalduda.

Raketid on kiirendavad, piiratud pöördekiirusega juhitavad mürsud, millel on lennuaeg. Kujutis sisaldab raketikere, nina, stabilisaatoreid, mootorileeki ja suitsujälge. Kuulidel on peen jälg, kahurimürskudel eraldi kuju. Kuul/kahur ei jälita automaatselt liikuvat sihtmärki; arvutatakse ennetus ja kontrollitakse tabamispunkti. Tabamisel kasutatakse sihtmärgi praegust soomussuunda ja laskekoha asendit. Õhutõrje jälitab tegelikku kõrgust. Vaenlase mürsku ei näidata väljaspool nähtavust.

Ressursipunktidel on tööstushooned või kütusemahutid, mis kuuluvad nii maastikurenderdusse kui navigeerimise/LOS-i takistustesse. Eraldi laadimisplats jääb vabaks. Kaardil on nähtav omanik, käivitusolek, laovaru ja rajatise tootmiskiirus. Insener hõivab/käivitab rajatise; omanikumuutus nõuab uut käivitamist. Mõlema poole kohalolek peatab tootmise. Täis rajatise laos peatub tootmine.

Valmis töötav varustusladu lähetab kopteri automaatselt. Sama lao tase 1–3 annab 1–3 kopterit ja koorma 120/175/230. Lähetusel võetakse lao tegelikust kütusest algvaru; uus lend ei saa alata piisava kütuseta. Kopter valib teise töötava oma rajatise, kui eelmine on kaotatud, seisatud või tühi. Koorma saabumine, mitte hõivamine, annab 60% ehitus-/tootmisvarustust ja 40% ammo/fuel/repair varusid. Kopter maandub lao kõrval, taastankimine tarbib lao varu. Lao hävimisel otsitakse teine ladu. Veokid kiirendavad ja pidurdavad ning kaotatud kogumispunktist naasevad koju. Kogumiskopter ei sõltu mängija helipad'i tootmisjärjekorrast; see on lao automaatne logistikasüsteem.

Lao üldine hoonetaseme uuendus ja logistika uuendus kasutavad nüüd sama võimekust. Rohkem ladusid ei tekita rohkem ressursse kui rajatiste tegelik tootmine: veokid ja kopterid võtavad samast piiratud varust. Oma töötav rafineerimishoone ressursipunkti kõrval suurendab kohalikku tootmist tasemetel 1–3 30/60/90%; mitu rafineerimishoonet ei kuhja boonust. Ka selle toodang vajab vedu.

Uued lennu- ja lähetusväljad salvestatakse ning lisati lockstep-hash'i. Võrgumängu mõlemad kliendid vajavad sama versiooni. Roheoru uus automaatsalvestusvõti on `.layout3`, et varasemad relvaprofiilid ja teistsugune takistuspaigutus ei seguneks uue mänguga; vanu salvestusi ei kustutata.

Kontrollid hoiti minimaalsed: TypeScript/Vite build ning üks kitsas simulatsioonikontroll. See kontrollis kopteri automaatset lähetust, rajatisest koorma võtmist ja lattu üleandmist, raketi 3D-lendu ja tabamust, sobimatut õhusihtmärki ning salvestuse olekuhash'i. Kontroll kestis alla sekundi simulatsiooni käitusajaga; täislahinguid, laia regressioonipakki ega brauseri läbimänge ei tehtud. Uus visuaal ja pikema mängu majandustasakaal vajavad veel mängijapoolset tagasisidet.
