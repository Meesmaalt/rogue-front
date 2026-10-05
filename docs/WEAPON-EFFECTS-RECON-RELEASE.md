# Relvad, mürsufüüsika, lahinguefektid ja metsluure

## Mängus ühendatud muudatused

Relvad on seotud olemasoleva tootmise, üksuse sihtmärgivaliku, liikumise, laskemoona, logistika, kaudtule, lennubaaside, fog of war'i ja HUD-iga. Uusi rosterinimesid ei lisatud.

`weapon-profiles.json` sisaldab 16 relvaprofiili: automaat, kuulipilduja, snaiper, automaatkahur, tanki AP, tankitõrje-granaadiheitja, ATGM, SAM, MANPAD, õhk-õhk rakett, juhitamatu rakett, haubits, miinipilduja, MLRS, pomm ja õhutõrjekahur. Profiil määrab lennu, juhitavuse, lõhkepea ja efekti; üksuse andmed ning relvakoosseis määravad ulatuse, läbistuse, täpsuse, laskekiiruse, laskemoonavaru ja sihtmärgid.

| Platvorm | Relvad ja kasutus |
| --- | --- |
| Tank / kergetank | AP-kahur soomusele ja kuulipilduja jalaväele |
| IFV | Automaatkahur ning kuus pikema ulatusega ATGM-i |
| Tankitõrjekopter / gunship | Piiratud ATGM-varu, automaatkahur ja juhitamatud raketid |
| Lähiõhutoetuse kopter | Automaatkahur ja piiratud raketivaru |
| AT-jalavägi / ATGM / MANPAD | Põhirelv ning lähedase jalaväe vastu automaat |
| Mitmeotstarbeline lennuk | Õhk-õhk raketid ja neli maasihtmärgi pommi |
| Ründelennuk | Maasihtmärgi raketid ja automaatkahur |

Automaatne relvavalik arvestab sihtmärki, soomust, ulatust, laskemoona ja laadimist. Põhirelv ning lisarelvad kasutavad eraldi taimerit ja varu. Lisarelv ei saa lõputult tulistada: maaväel taastab laskemoona olemasolev piiratud lao/FOB-varu, õhusõidukil varustatud lennubaas või kopteriplats. Õhusõiduki senine missioon/RTB/maandumine jääb kasutusse. Lähiõhutoetuse kopteri kiire kahuri kahjustust vähendati, et kiire laskekiirus ei kasutaks varasemat ühe raketi kahjustust.

## Lend ja tabamus

Otselask lendab fikseeritud sihiga ning arvestab sihtmärgi liikumise ennetust. Haubits, miinipilduja, MLRS ja pomm kasutavad gravitatsiooniga kaart. Juhitav rakett kiireneb ning pöörab profiili piiratud kiirusega. Command-guidance katkeb laskja hävimisel, tugeval suppression'il või kontakti/LOS-i kadumisel; radar- ja infrapunarakett säilitavad juhtimise pärast väljalasku. ECM mõjutab tabamistõenäosust olemasoleva süsteemi kaudu.

Lennusegment kontrollib maastikku, staatilisi takistusi ja hooneid. Tabamus nõuab sihtmärgi füüsilist lähedust ning tabamisrulli. Kineetiline läbistus väheneb kaugusega; tabamisel kasutatakse soomuse tegelikku esi-/külje-/taganurka. Ebapiisava läbistusega kineetiline lask võib anda rikošeti ilma HP-kahjustuseta. HE/HEAT, pritsmekahjustus, suppression, moraal, meeskonna kaotused ja komponendikahjustus kasutavad olemasolevat kahjustussüsteemi. Kõrge õhuplahvatus ei kahjusta automaatselt selle all olevaid maaväeüksusi. Kaudtule fire mission, laskesignatuur ja counter-battery jäävad olemasoleva süsteemiga ühendatuks.

## Efektid ja UI

Rakettidel on eri pikkusega kere, nina, sabastabilisaatorid ja mootorileek. Suitsujälg järgib päris interpolatsiooniga lennuteed. Automaat, snaiper, kahur ja tanki sabot kasutavad erinevaid jälgi; pommil puudub mootorileek. Suudmeleek, väljalaskesuits, tolm, sädemed, rikošett, õhuplahvatus ja raske HE-plahvatus on eristatud. Kahuri tõusunurk ja tagasilöök jõuavad üksuse mudelisse. Helid eristavad relvaprofiile sünteesitud heli abil.

Osakesed on neljas piiratud InstancedMesh-partiis: 640 suitsu, 320 tolmu, 192 kuma ja 256 sädet. Lööklaineringe on kuni 24. Mürsu mudelid jagavad geomeetriat/materjale; lasud ei loo PointLight'e. Need on koormuse piirangud, mitte mõõdetud FPS-paranemine. Vastase lasud/efektid filtreeritakse nähtavuse järgi.

Üksuse detailpaneelis näeb iga relva laskemoona, maksimaalset varu, ulatust, läbistust, täpsust, laadimist ja juhitavuse tüüpi, lisaks optikat, sensorikaugust, varjatust ja stabilisaatorit.

## Mets ja luure

Luurejalavägi, snaiper ning eriüksus kasutavad nüüd jalaväe kategooriat, meeskonnakaotusi ja jalaväe metsaliikumist. Mets on kõnnitav kate. Läbi sügava metsa nägemine on piiratud; avastamisel loevad optika, varjatus, suurus, liikumine, kate ja hiljutine tulistamine. Liikumine ja laskesignatuur hõlbustavad avastamist. Luurejalaväel ja luuremasinal on erinev sensoriulatus; radar on tugev õhukontaktide vastu, selle maapealne vaatlus on piiratud.

## Kontroll ja piirid

Kontroll: TypeScript + production build ja kolm lühikest simulatsioonikontrolli: IFV relvavalik/eraldi varu/piiratud varustus/salvestuse ning jätkamise hash; ballistiline kaar/viivitatud kahjustus/seina tabamine; tavalise jalaväe ja luure avastamisvahe/metsas liikumine. Täissalvestus ja hash sisaldavad lisarelvade ning mürskude olekut; automaatse skirmishi layout-versioon on 5. Vana täissalvestus säilitab oma üksuse definitsiooni ja kasutab vajadusel ühe relva ühilduvust.

Brauseri visuaalset ülevaatust, shaderite käitus- ega GPU/FPS-mõõtmist ja mitmikmängu läbimängu selles muudatuses ei tehtud. Efektid on protseduurilised ja heli sünteesitud; see pole Wargame'i valmis kunstivara ega lõpuni tasakaalustatud lahingusüsteem. Ulatuste ühikud on mänguskaala, mitte päris relvade meetrite simulatsioon. Faction identity tuleb olemasolevatest mudelitest ja fraktsioonibonustest; profiilid ei ole iga fraktsiooni nimelised laskemoonamudelid. Friendly fire on endiselt välja lülitatud; liikuvate üksuste otsene lennutee tabamiskontroll puudutab määratud sihtmärki, mitte iga võimalikku kõrvalist sõidukit.
