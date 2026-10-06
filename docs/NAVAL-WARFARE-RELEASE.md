# Mereväe ühendatud mängutsükkel

Murdlaine on 1024 m rannikumapp: läänepoolne meri, kaks sadamat, ranniku maantee, metsad, väike asula ja kolm füüsilist ressursipunkti. Skirmishis saab valida Operatsioon Murdlaine ning alustada valmis baasist; kampaanias kasutab sama missioon olemasolevat avamisrada.

## Kasutamine

- Vali laev ja paremklõpsa veele liikumiseks või nähtavale vaenlasele ründamiseks. Maale antud laevakäsk lükatakse tagasi. Laev vajab luuret: kaugmaa relv ei paljasta ise kogu kaarti.
- Laev valib sihtmärgile sobiva relva. Relvakaardid näitavad iga kahuri ja raketisüsteemi ulatust, minimaalset laskekaugust, tabamistäpsust, penetratsiooni ning allesolevat laskemoona.
- **Sadamasse** saadab laeva lähima oma sadama veepoolsele küljele. Teenindus kasutab ühendatud varustuslao laskemoona, kütust ja remondivaru; sadam vajab energiat ja juhtimisühendust.
- Sadama Lv1 avab rakettkaatri ja dessantlaeva, Lv2 fregati, Lv3 hävitaja ja allveelaeva. Kõrgemate tasemete tootmiseks on vaja mereväe strateegiahoonet. Tootmise lõpus otsitakse vaba veekohta; ummistunud väljumine hoiab üksuse järjekorras.

## Arsenal

Hävitaja ühendab laevakahuri, laevatõrjeraketid, vertikaalselt stardivad ranniku tiibraketid ja õhutõrjeraketid. Fregatt on kahuri, laevatõrje ja õhukaitsega eskort. Rakettkaatril on neli tugevat laevatõrjeraketti ja väiksem kahur. Allveelaeval on torpeedod ja piiratud ranniku raketivaru. USA, Venemaa ja Hiina relvanimed ning mudelite värvid on eristatavad. Numbrid on mängu tasakaaluparameetrid, mitte pärisrelvade mõõtkavas spetsifikatsioonid.

Raketid on simulatsiooni objektid: stardikiirus, kiirendus, pööramine, lennukõrgus, kokkupõrge, soomus ja kahjustus. VLS tõuseb üles ning pöördub sihile; laevatõrjerakett lendab madalamal, torpeedo veepinna lähedal. Renderdus lisab eristuvad raketikered, suitsu, torpeedojälje, laevade kiiluvee ja veesambad. Laevamudelitel on vormitud kere, sild, mast, radar, raketikonteinerid ja kahur; sadamal kraana. Need on projekti enda geomeetriast mudelid.

## Arhitektuur

`World.waterNav` on tuletatud mask, mis taaskasutab deterministlikku A*. Ainult kaardile määratud vesi on läbitav; sillad ja tahked rajatised tõkestavad laevu. Silla hävimine ja salvestuse taastamine ehitavad maski uuesti. Laevade kiirendus, pidurdamine, aeglasem pööramine ja kohalike laevade ümber teeotsimine kuuluvad olemasolevasse üksustesüsteemi. Tootmine kasutab sama sadamat, tasemeid, teki piiranguid ja füüsilisi varusid nagu ülejäänud mäng.

Mereväe AI toodab kaatreid, patrullib vees, ründab nähtud laevu ja saadab kahjustatud või tühjade varudega laevad sadamasse. Maismaa AI ei kirjuta laevadele üle oma maapealseid rünnakukäske. Rannikumissiooni võit nõuab fregati, ranniku õhutõrje ja peakorteri hävitamist; oma peakorteri kaotus annab kaotuse.

## Kontrollid ja piirid

Sihitud kontrollid katavad veepiirangu, liikumise, vabad tootmiskaid, reaalse VLS-lennu/tabamuse ja laskemoonakulu, füüsilise sadamateeninduse katkemise, save/load determinismi ning missiooni eesmärkide lõpetamise. Missiooni kontroll lõpetab sihtmärgid programmiliselt; see ei ole käsitsi läbi mängitud tasakaalukontroll. TypeScript ja tootmisbuild läbivad. Brauseri visuaalne kontroll ning kogu rannikumissiooni käsitsi läbimängimine on veel vajalikud.

Allveelaev ei kasuta eraldi sukeldumis-/ASW-simulatsiooni. Õhutõrje tulistab lennukeid ja koptereid; sissetulevate rakettide CIWS-tõrjet pole. Mereväge ei nimetata seetõttu veel lõpetatud beetaks.
