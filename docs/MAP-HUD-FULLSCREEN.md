# Teedevõrk, kompaktne HUD ja nähtav rannikumapp

## Roheorg layout 13

Varasemad üksteist lõikavad pärandteed, diagonaalsed külaühendused ja eraldi farmitee jupid asendati sidusa teedevõrguga. Mõlemal kaldal on oma maantee, keskel baaside ühendus ning viis sillaotstesse joondatud ületust. Küladel on läbiv tee ja kvartalitänavad. Suunamuutused on väikeste segmentidega ümardatud; laadimiskohad saavad ühenduse lähima teega. Baasi ühendus lõpeb baasi serval, mitte peakorteri mudeli all. Ressursihoonete asukoht kontrollitakse uute teede vastu.

Renderdus joonistab kõigi teede kitsamad servad enne kogu sõiduteevõrku, et ääred ei läbiks ristmikku heledate ribadena. Asfalt kasutab jagatud materjali ja maailmakoordinaatidega tekstuuri. Sildadel on teega sobiv sõidupind ning otstes toestused. Decki kõrgus, navigeerimine ja silla hävimine kasutavad jätkuvalt olemasolevat ühist geomeetriat. Kaardi autorimise skript on scripts/maps/finish-road-network.py; mäng loeb tulemuseks olevat JSON-i.

See korrastab teede ühendusi ja viimistleb olemasolevaid hooneid/kvartaleid. Uut professionaalset hoonemudelite kogu ega Wargame'i visuaalse taseme kinnitust see pakett ei lisa.

## HUD

Ülemine olekuriba on tavavaates 44 px. Tootmine avaneb ülal nupuga „Tootmine” eraldi 116 px ribas; üksuste kaardid paiknevad ühes horisontaalselt keritavas reas. Tootmis-, ehitus-, järjekorra- ja käsunupud säilitavad olemasolevad sim-käsud. All puudub täislaiuses läbipaistmatu paneel: vasakul on 146 px minikaart, paremal valitud üksuse andmed/käsud. Ilma valikuta paremat paneeli ei kuvata. Laiendatud andmed on keritavad. Kitsamal ekraanil kasutatakse eraldi mõõte.

„Täisekraan” kasutab brauseri päris Fullscreen API-t, samuti algmenüüs; teine vajutus või Esc väljub. Keeldumise korral annab mäng teate. „Kaardid” viib mängust tagasi algmenüüsse, kus saab uue lahingu seadistada. See lõpetab praeguse lahinguvaate; salvestamine käib jätkuvalt eraldi „Salvesta” nupuga.

## Murdlaine coast 2

Olemasolev 1024 m rannikumapp oli koodis juba olemas. See on nüüd algmenüüs selgelt eraldi eelvaatekaardina: „MURDLAINE · MERI”. Kaardi valik säilib kohalikult; meremissioon ei vaja skirmishis kampaania avamist. Lisatud on sadamalinnade 24 elamut, kalda ühendusteed, väikesed metsavööndid ja kuiva maa sadamaplatse. Olemasolevad mereväe tootmine, valmis algus, veenavigatsioon, arsenal ning kampaania eesmärgid jäävad mänguga ühendatuks. Vali Kaardid → Murdlaine → valmis baas + lahingugrupp, et alustada mereväega.

## Kontrollid ja salvestused

Viis sihitud kontrolli läbisid: Roheoru hoonete/teede/vee eraldatus ja ressursipunktide ligipääs, baaside navitee, silla purunemise save/load, mereväe save/load ning rannikumissiooni eesmärgid. TypeScript ja tootmisbuild läbisid.

Kontroll avastas ka salvestuse signatuuri sõltuvuse staatiliste objektide loendi järjekorrast. Uus signatuur sordib objektid deterministlikult ID järgi, jättes algse World loendi muutmata. Vana signatuur aktsepteeritakse sama geomeetria/sama järjekorra korral; muutunud geomeetria on endiselt keelatud. Roheoru ja ranniku session-salvestuse võtmed on layout13/coast2, et vana kaardi salvestus ei pakutaks uut kaarti üle kirjutama.

Uue HUD-i tegelikku ekraanipaigutust, täisekraani klõpsu ja uusi teepindu pole siin brauseris visuaalselt üle vaadatud: kohalik brauser puudus. Uut GPU/FPS tulemust pole mõõdetud. A6/B1 jäävad avatuks.
