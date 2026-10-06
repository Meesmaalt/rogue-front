# UI ja jõudluse viimistlus — 06.10.2026

HUD jaguneb kolmeks nähtavalt nimetatud tööalaks: taktikaline kaart, valik ja käsud, tootmine ja ehitus. Käsud säilitavad olemasolevad sim-käsud ja CommandControlleri sihtpunkti valimise. Puuduvad oma juhitavad mobiilsed üksused: liikumis-/käitumis-/formatsioonnupud pole kasutatavad; kaamera fookus jääb valiku korral kättesaadavaks.

## Intuitiivsem juhtimine
- Kiirliikumine ja väljumine kasutavad enda ikoone, mitte sama liikumisnoolt. Tulekeeld, patrull ja formatsioonid said selged SVG-d. Jalavägi, IFV, APC, luure, varustusveok, insener, õhutõrje, radar ja juhtimishooned on paremini eristatavad.
- Tootmisfotol on klassiikooni märk. Nupud, ikoonid ja tekst on suuremad; lukustatud kaardi põhjus säilib loetavana. Värv pole ainus tähendusallikas: ikooniga kaasneb tekst ja abivihje.
- Formatsioon ja sihtmärgiprioriteet ei ole enam valikupaneeli peal hõljuv aken. Käitumiskäsud ja formatsioon näitavad simulatsiooni tegelikku ühist aktiivset olekut ning aria-pressed väärtust. Segavalikule ei näidata ekslikku ühist käsku.
- Tootmise tühistamine asub järjekorra kõrval ning hoone uuendused väljaspool vahekaarte. Varem valis tehas Maa-vahekaardi, kuid nii selle uuendamine kui tootmise tühistamine olid Ehita-vahekaardis peidus.
- Õhuoperatsioonid ja valmiva üksuse käsk jäävad eraldi kontekstirühmadeks. Valiku puudumise juhised selgitavad valimist, paremklõpsu, Shift-järjekorda ja Esc-tühistamist.

## Vähendatud töö
Minikaardi kõrgustaust ja feature-kihid joonistatakse üheks canvas'eks laadimisel. Tavaline 10 Hz uuendus kopeerib selle, mitte ei joonista kõiki teid, metsi, maju ja vett uuesti. Silla kokkuvarisemine või taastumine invalideerib tausta; kontroll kinnitab mõlemat suunda. Fog, kontaktid, tulekahjud, üksused ja kaamera on jätkuvalt dünaamilised.

Minikaart kogub aktiivsed oma HQ/lao sõlmed ühe korra sünkroonse joonistuse kohta. Varem filtreeris iga oma mobiilse üksuse varustuse kontroll kogu entities massiivi. Ühine isTacticallySupplied kontroll kasutab sama varu-, kõrguse-, lennu-, meeskonna- ja ulatuseloogikat. Sõlmevaadet ei säilitata simulatsioonis ega tickide vahel.

HUD leiab iga tootjaklassi lühima järjekorraga tootja ühe entities läbimisega. Varem filtreeriti ja sorteeriti tootjakandidaate iga üksusekaardi jaoks kahes eraldi tsüklis. Valitud valmis tootjal säilib eelistus. Üksuse tootmisvõime küsitakse ühe korra kaardi kohta; lukupõhjus ja keelatud olek kasutavad sama tulemust. Staatilised DOM-viited ja SVG-d taaskasutatakse; muutuvate ehitusnuppude päring jääb dünaamiliseks. Fookus, klaviatuur ja CommandControlleri sim-käsud säilivad.

## Kontroll ja piirid
Strict TypeScript + tootmisbuild läbisid. Kuus sihitud kontrolli läbisid: minikaardi tausta taaskasutus, silla kokkuvarisemine/taastamine, varustusvaate semantika ja kolm varasemat juhtimiskontrolli. Lõplik build tehti uuesti pärast hoone uuendusnuppude teisaldamist; täiskomplekti ei käivitatud.

Need on kooditasemel eemaldatud kordustööd, mitte mõõdetud GPU/FPS paranemise väide. Kohalik Chromium puudub; tegelikku HUD-i paigutust ja FPS-i tuleb veel brauseris hinnata. Maastiku, üksuste või võrgusimulatsiooni andmeid see viimistlus ei muuda.
