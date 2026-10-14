# Protseduurkaart ja muudetavad platvormid

14.10.2026. Aktiivne mängusuund ühendab Real Wari baasiehituse ja kaardivälise varustuse, Wargame’i maastiku ja luure ning trajektooripõhise lahingu. See väljalase loob muudetavate põhiklasside aluse. Kilomeetriskaalas relvakaugused ja suurem lennuruum vajavad järgmist kaardi/navigeerimise etappi.

## Kaardid

Üksik- ja mitmikmängu menüüs on ainult seemnest genereeritud lahinguväljad: järvemaa, jõeäär, linnapiirkond, mets, kõrgustik ja rannik. Server valideerib protseduurkaardi identiteedi nii ruumi loomisel kui seadete muutmisel. Roheoru ja Murdlaine vanad andmed jäävad regressioonikontrollide fixtures’iks; neid ei saa mängukaardina käivitada ega valida. Kampaania valik on menüüst eemaldatud.

Baaside ehitamine, ressursipunktid ja kaardi tagant saabuvad varustuskopterid jäävad alles. Lennuvälja juures asuv varustusladu teenindab kaubalennukit. Kogutud varud ning moon, kütus ja remondivaru säilitavad oma füüsilise logistika.

## Platvormid ja komponendid

Valitavaid põhiklasse on 15: jalavägi, insener, luurejalavägi, tank, APC, IFV, liikurõhutõrje, suurtükivägi, MLRS, lahingukopter, transpordikopter, hävitaja, fregatt, allveelaev ja dessantlaev. Vanad eraldi variantide relvaprofiilid on komponendi andmeallikad. Automaatne varustusvedu kasutab endiselt veokeid ja kaubalennukeid.

16 komponenti jaotuvad relva, kaitse ja liikuvuse pesadesse. Näiteks jalaväest saab kuulipilduja-, tankitõrje-, õhutõrje- või miinipildujarühm; hävitaja võib saada ründekoorma; tankile saab lisada HE-mürsud, reaktiivsoomuse, aktiivkaitse või võimsama jõuülekande. Valikul on hinna, aja, remondivaru ja liikuvuse/laskesageduse kompromissid.

Paigaldamiseks vali peatatud üksus ja ava valikupaneeli varustus. Vajalik on töötav ühendatud varustusladu 80 meetri kaugusel, juhtimisühendus ja energia. Lennuk peab olema maandunud; transpordi reisijad tuleb väljuda lasta. Aktiivkaitse ja reaktiivsoomus vajavad täiustatud soomuse uurimist; aktiivkaitse ka maastrateegia keskust. Katkenud teenindus peatab töö. Katkestamisel kulutatud varusid ei tagastata.

Ümberehitamine säilitab kahjustused ja olemasoleva sobiva laskemoona. Uue relvatüübi moon tuleb laost. Komponendid arvutatakse iga kord põhiplatvormist uuesti, et boonused ei kuhjuks. Aktiivkaitse nelja laengu taastäitmine kulutab laomoonavaru. Komponentide mudelilisad kasutavad üht jagatud geomeetriat/järeljoonistust üksuse kohta; muutumatu varustus ei tekita uut geomeetriat.

AI toodab põhiklasse ja varustab teeninduskohas osa jalaväest tanki- ja õhutõrjeks või tuletoetuseks. See on esimene komponentide kasutuse reegel, mitte valmis olukorrapõhine koosseisu planeerija.

## Lahingu füüsika

Uutes lahingutes mõjutab sihtimiskvaliteet otselasu hajuvust ja juhitava raketi pööramisvõimet. Füüsilist tabamust ei lükata enam teise juhusliku tabamusotsusega tagasi. Liikuva mürsu teel kontrollitakse esimest vaenlase keha. Soomuse külg tuleneb tegelikust saabumissuunast. Ballistiline gravitatsioon on 9,81 m/s². HEAT-kaitse ja piiratud aktiivkaitselaengud mõjutavad päriselt kahjustust ja rakette. Madal varustus ei vähenda enam relva füüsilist maksimumkaugust.

Relvaulatused, kaardisuurused ja lennukiirus on endiselt senise mänguskaala numbrid. Päris kauguste jaoks tuleb suurendada kaarti ja teha navigeerimise/LOS koormuseelarve; üks gravitatsioonikonstant ei tee kogu mängu realistlikuks. Järgnev v9 väljalase lisab 4–6 km kaardid, ühised relva-/liikumisprofiilid ja lennuvälja lähenemiskoridorid; vt [METRIC-BATTLE-RELEASE.md](METRIC-BATTLE-RELEASE.md). Käesoleva lõigu väike mõõtkava kirjeldab v2–v8 taastamisteed.

## Salvestus ja kontroll

Reeglistik on `2026-10-14.modular-platforms`. Alusta uut lahingut; vanad salvestused jäävad eraldi võtmete alla. Komponendid, pooleliolev paigaldus ja aktiivkaitselaengud kuuluvad salvestusse ning replay/lockstep räsi sisse.

Build ja TypeScripti kontroll läbivad. Komponentide, salvestuse, põhiklasside, füüsiliste tabamuste, gravitatsiooni, aktiivkaitse ja mudelivahemälu sihitud kontrollid läbivad. Varasema viie testitõrke parandused on kirjeldatud failis [SIMULATION-REGRESSION-FIXES.md](SIMULATION-REGRESSION-FIXES.md). Ehituse, õhkutõusu ja varustuse kontrollid arvestavad füüsilist teekonda ning uut majandust; teekonnaotsing väldib vabal sirgel A* otsingut ja arvutab pargitud takistuste piirid üks kord.

Päris brauseri visuaal ja FPS vajavad kasutaja masinal mõõtmist. F8 → salvesta jõudlusraport → pan/zoom ja lahing 60–90 s → ekspordi JSON. Varasem bulk-ImageData minikaardiparandus säilib; uut GPU/FPS tulemust ei ole mõõdetuks märgitud.
