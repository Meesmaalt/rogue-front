# Wargame'i taktikaline lahing ja füüsiline õhuväebaas

Arendussuund: lahingu keskmes on Wargame'i luure, positsioonid ja kombineeritud väeliigid; olemasolev Real Wari laadne baas, majandus, ressursivedu ja eraldi õhurajatised toetavad seda.

## Ühendatud mängukäitumine

Tootmisest tulev lennuk paigutatakse oma lennubaasi parkimiskohale ning kopter oma kopteriplatsile. Valmis baasi algkopter kasutab sama süsteemi. Rajatisel on tasemest sõltuv piiratud lennugrupi suurus: lennubaasil 6/8/10, kopteriplatsil 3/4/5. Lennul olev üksus säilitab oma koha ja kodurajatise; täis rajatise tootmisjärjekord peatub varusid edasi kulutamata.

Lennuk ruleerib parkimiskohalt ootealale, ootab vaba rada, joondub ja teeb hoovõtu mööda rajatise suunda. Ühe baasi lennukid kasutavad rada järjest; lõppfaasis maandumine ja rajalt lahkumine hõivavad sama raja. Kopter tõuseb esmalt vertikaalselt, enne kui alustab horisontaalset lendu. Hoonemudelil on pikem märgistatud rada ja lennukite parkimisala; kopteriplatsil on külgmised parkimismärgistused. Renderduse varasem lennukite kunstlik kõrgus- ja pitch-lisa eemaldati: kõrgus ja kalle tulevad simulatsioonist.

Kütuse, missiooniks sobiva laskemoona või tervise puudus käivitab naasmise. „Baasi” annab käsitsi naasmiskäsu. Lennuk läheneb oma rajale, maandub ja ruleerib oma parkimiskohale; kopter laskub oma platsile. Laskemoona, lisarelvade, kütuse ja HP taastamine kasutab töötava rajatise lähedal oleva lao piiratud varu. Kõik relvavarud peavad saama täiendatud enne automaatset valmisolekut. Hävinud kodurajatise puhul otsitakse sobivat vaba alternatiivi. Lennukit ei eemaldata ja asendata uuega naasmisel. Maapinnal olev lennuk ei toimi täisulatusega luuresensorina.

CAP kasutab õhusihtmärke; maatoetus, baasirünnak ja SEAD eeldavad maasihtmärgile sobivat relva. SEAD arvestab lisaks staatilisele AA-le SPAA-d ja MANPAD-i. Pommi-/raketivaru lõppemine võib käivitada RTB ka siis, kui teise ülesande relvi on veel alles. Taktikaline väetranspordikopter läbib nüüd samuti oma kopteriplatsi väljalennu/naasmise tsükli; lao ressursikogumiskopter ja strateegiline cargo jäävad olemasolevasse füüsilise ressursiveo süsteemi.

## Juhtimine

Vali lennubaas või kopteriplats. Selle paneelis on rajatise seis ja sinna kuuluvad üksused. Õhukaitse, baasirünnak, õhutõrje rünnak või maatoetus → paremklõps sihtpunktile. Käsu saavad sobiva relvakoosseisuga seotud üksused. Sama juhtimine töötab üksiku lennuki/kopteri valimisel. „Baasi” ei vaja kaardil sihtpunkti. Paneeli üksuserida valib päris üksuse, et näha relvi ja varusid. Staatus eristab ruleerimist, hoovõttu, lendu, naasmist, maandumist ja varustamist. Avatud taktikalised detailid ei sulgu iga laskemoona muutusega.

## Maaväe laskepositsioonid

Ründav maaüksus otsib sihtmärgi keskpunkti asemel sobiva ulatuse, miinimumkauguse, läbitavuse ja LOS-iga positsiooni. Jalaväel kaalutakse ka katet. Otsing proovib piiratud hulka nurki ja kaugusi, säilitab valitud positsiooni ning uuendab seda aeglasemalt või sihtmärgi olulisel liikumisel. A* valideerib kuni kolme parimat kandidaati. Üksused kasutavad pisut erinevaid lähenemisnurki, et vähendada samasse kohta kogunemist. Läbi metsa nägemise piirangu puhul proovitakse ka lähemat positsiooni. Kui tee ja tulejoonega sobivat kohta ei leita, ei saadeta üksust otse vaenlase sisse. Hold ja otsene liikumiskäsk säilitavad mängija kontrolli.

## Kontroll ja piirid

Production build ning kuus lühikest sihitud simulatsioonikontrolli läbisid: kolm varasemast relva/metsaarendusest ja kolm siinsest muudatusest (lennuki tootmine/stardijärjekord/missioon/maandumine/piiratud laadimine/salvestuse hash; kopteri vertikaalne start ja puuduv rajatis; tanki laskepositsioon ning tule avamine). Kogu testikomplekti ei käivitatud. Uue mängupildi brauseri ülevaatust, FPS-mõõtmist ega mitmikmängu läbimängu ei tehtud.

Lend ja ruleerimine on deterministlikud mängukinemaatikad, mitte täielik aerodünaamika või lennujaamaliikluse simulatsioon. Rajapikkus ja kiirused on kompaktse brauserikaardi skaalal. Baasi suurem visuaalne apron ei ole uus täpne maaväe kokkupõrkemesh; hoone navigeerimistakistus kasutab senist arhitektuuri. Efektide/art'i visuaalne kvaliteet vajab endiselt mängupildilt hinnangut. Võrguprotokolli ei muudetud; uued parkimis-, ruleerimis-, missiooni- ja laskepositsiooni väljad kuuluvad täissalvestusse ning worldHash'i. Skirmishi automaatsalvestuse layout on 6, täissalvestuse versioon jääb 19.


## Õhuülesandeala ja õhutõrjest eemaldumine — 09.10.2026

Uue õhuülesande määramine puhastab vana patrulli, prioriteedi ja tulekeelu; CAP ilma punktita ei säilita vana sihtpunkti. Automaatne sihtotsing kasutab ühist airMissionAllowsTarget kontrolli nii airDoctrine'is kui tavapärases lähisihtmärgi otsingus: CAP võitleb õhusõidukitega, strike ehitistega, SEAD õhutõrjevõimeliste maapealsete/mereüksustega ning ground maasihtidega. Määratud punktiga missiooni siht jääb mobility.json airMissionRadius sisse. Kadunud/hävitatud kontakti järel taastub missiooni ankur; mängija otsene ründekäsk seab uue ankru ja sihtmärgile sobiva CAP/ground ülesande.

Õhutõrje hinnang loeb kõigi air/all sihtidega relvade tegelikku ulatust, kaasa arvatud lisarakett, ning arvestab ainult luuratud vastaseid. Pardal ja baasis olev õhutõrjeõhusõiduk ei tekita lennul oleva hävitaja ohtu. Arvutus on konservatiivne relvavõime hinnang, mitte garantii et vaenlane avab tule.

Kopterite mõõdukas vältimismanööver kasutab olemasolevat flightAttackExit/Until olekut ning säilitab ülesande punkti ja korralduse. Relvastamata transport ei vaja õhutõrje vastu sobivat ründerelva, et eemalduda. Selle liikumisharu kasutab päris moveAirTo't enne reisijate ülesande jätkamist. Tugeva ohu korral katkeb sihtotsing kohe ja lennuk/kopter naaseb baasitsüklisse eraldi threat põhjusega. Lävendid, eemaldumismaa ja ajapiir on mobility.json-is; Entity ja vana salvestusliidese returnReason tüüp on ühine.

Kontroll: TypeScript/Vite build, git diff --check ja 15 lühikest juhtumit CombatManeuver, stockLogistics ning Replay failides. Kaks uut juhtumit katavad missiooni ala/korralduse taastumise ning SAM-lisarelva ulatusest sõltuva relvastamata kopteri eemaldumise, salvestuse ja tugeva ohu RTB. Varasemad juhtumid katavad päris väljalennu/maandumise/varudest teeninduse, EVAC-i reisijatega, ründeläbimise, peatumise ning replay. Brauseri visuaal/FPS, lävendite matšitasakaal ja täielik õhuoperatsioonide läbimäng on ootel.
