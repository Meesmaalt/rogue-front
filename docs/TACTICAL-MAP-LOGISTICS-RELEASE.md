# Roheoru taktika ja tarnejuhtimine — 05.10.2026

Muudatused ühendavad olemasoleva kaardi, üksused, relvad ja füüsilised veod. Need ei kuuluta kogu mängu ega pika lahingu tasakaalu lõpetatuks.

## Liikumine ja käsud

Grupi sihtkohad arvestavad üksuste suurust, liikumissuunda, takistusi ja teisi määratud sihtkohti. Hoone sisse antud käsk otsib lähedase läbitava koha. Maapealsed üksused vaatavad teekonnal ette ainult mööda vaba koridori; kohalik kokkupõrkevältimine pidurdab või otsib kõrvalruumi. Sõidukite liikumine järgib kere pööramist ning teepunkti läbimise tolerants väldib väikesest punktist möödasõidu järel tiirlemist. Takistuse juures võib liikumine kasutada korrigeerivat sammu; see pole täielik sõidukidünaamika ega suure armee liiklussimulaator.

Shift + liikumiskäsk lisab ühe korra läbitava käsujärjekorra. Tavaline uus liikumiskäsk asendab selle; rünnak, peatumine ja positsiooni hoidmine tühjendavad selle. Eraldi patrullikäsk jääb patrulliks. Tegelik liikumiskiirus mõjutab liikuva laskuri ja sihtmärgi tabamist.

## Lahingu tagasiside

Valitud maapealsete üksuste laskeulatus järgib tegelikku relvaprofiili. Kuni neljal valitud üksusel on maastikku järgiv ulatusjoon. Nähtava sihtmärgini kuvatakse tulejoon: blokeeritud LOS kasutab punast katkendjoont ja teksti. Teekond ja ootel liikumiskäsud on nähtavad; suurema suppression'i ja komponendikahjustuse kohta lisandub üksuse juurde tagasiside. Need märgid ei avalda fog of war'is peidetud vastast.

Kuul, kahur/autokahur ja rakett kasutavad eristatavat suudmeefekti ning sünteesitud WebAudio heli. Need pole salvestatud ega positsioonipõhised relvahelid. Raketi tegelik juhitav lend ja kokkupõrge pärinevad eelmisest ühendatud relvauuendusest.

## Roheoru kujundus

Kaardile lisati 16 elamut, kaks tööstusala ladude ja sillutatud õuedega, ühendavad kõrvalteed, metsaservad, madalad müürid ja lauged kõrgendikud. Kõrgendikke kasutavad sama kõrgusvälja kaudu renderdus, navigeerimine ja nägemisarvutus. Neutraalse ressursirajatise vallutus algab mõlema poole jaoks võrdsest keskpunktist.

Keskkond kasutab olemasolevaid detailsemaid protseduurseid hoonemudeleid. See on kaardi sisuline kujunduspass, mitte lõplik fotorealistlik art. Uus automaatsalvestuse võti on `.layout4`; vanad salvestused jäävad alles, kuid vana kaardigeomeetriat ei laadita vaikimisi uuele kaardile.

## Tarnejuhtimine

Vali varustusladu. Paneeli nupud võimaldavad valida oma ressursirajatise, lisada marsruudi vahepunkti, taastada otsetee, lubada automaatse allikavaliku ning peatada või jätkata uusi vedusid. Allika või vahepunkti valiku järel tee kaardil parem klõps; Esc katkestab valiku.

Käsud rakenduvad simulatsioonis. Ressursivedude veokid ja kopterid arvestavad lao valitud allikat ja peatamist. Koormaga transport lõpetab üleandmise; peatamine ei kustuta koormat ega varusid. Vahepunktid mõjutavad tegelikku marsruuti; kopter läbib vahepunktid lennukõrgusel ning kasutab tagasiteel vastupidist järjekorda. Lähetuse kütusearvestus hõlmab kopteri määratud marsruuti ja reservi.

Valitud lao juures kuvatakse marsruudid, määratud transpordi koormad ja tegelikud varud. Käsujärjekord, allikavalik, peatus ning kopteri marsruudietapp säilivad täisoleku salvestuses ja kuuluvad lockstep-hash'i. Võrgumängu mõlemad kliendid peavad kasutama sama versiooni.

## Kontrollitud ulatus

- TypeScripti kontroll ja Vite'i tootmisbuild.
- Kaks lühikest sihitud simulatsioonikontrolli: grupi läbitavad sihtkohad, hoonest möödumine ja ühekordne järjekord; lao allika-/peatamiskäsud ning salvestuse hash; füüsiline kopterikoorma laadimine/üleandmine ja juhitava raketi tabamus.
- Kere järgi pööramisel avastatud teepunkti ületamise viga parandati ja liikumiskontroll korrati.

Selle uuenduse käigus ei tehtud brauseri visuaalset läbivaatust, pikka lahingut, täielikku testikomplekti ega uut multiplayer'i läbimängu. Suure grupi ummikud, kaardi tasakaal ja mängija hinnang lahingu tunnetusele vajavad edasist tagasisidet.
