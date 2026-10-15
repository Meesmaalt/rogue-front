# Kiirem algus ja kompaktne lahing · v12

Peamenüü loob taustal päriselt kasutatava kontrollitud kaardi ja asendab ootel kaardi valmis eelvaatega. „Alusta” kasutab sama lubadust/tulemust; server tagastab kaardi geomeetria ning `PreparedMission` kannab selle navigeerimise üle. Nupuvajutusel ei küsita teist juhuseemet ega käivitata teist kaardigeneraatorit. Kui server puudub või on vanema protokolliga, toimub sama kontroll browser-workeris. Kui alustatakse enne eeltöö lõppu, tuleb üksnes poolelioleva töö valmimine ära oodata. Seemne käsitsi kordamise valik säilib. Vana fikseeritud näidiskaardi automaatne loomine mooduli importimisel eemaldati.

Kõrgusvälja koostamine kasutab vee/silla maskide ruumilist indeksit, säilitades maskide järjekorra ja arvutustulemused. Kohalikus katses kahe 2/4 km v11 kaardi kõrguspuhvri ja geomeetria ettevalmistusega: 3534 ms → 1768 ms. 1414 kontrollitud cache'i näitu jäid bititäpselt samaks; püsiv test võrdleb jõge, kallast ja sildu varasema rakenduse referentsiga. Need on selle keskkonna CPU ajad, mitte kasutaja GPU/FPS-i mõõtmine.

Uute v12 lahingute relvaulatus on üldiselt 1:5 kokku surutud; lennuki õhk-õhk ulatus kasutab eraldi 0,12 kordajat. Tanki 2400 m andmenäit tähendab 480 kaardiühiku ulatust ja kopterikahuri 850 m näit 170 ühikut. HUD, relvakaardid ja ulatusringide sildid näitavad algmeetrit; ringi kuju, tuleloa kontroll ja AI kasutavad sama tegelikku lühendatud ulatust. See on tahtlik taktikaline kujutus. Sõltumatult on lühem nähtavus, madalam lennukõrgus ja mõõdukam hävitaja kiirus. Uue kaamera FOV on 48° ja algkaugus 320. V9–v11 taastuvad senise mõõtkavaga; `compactBattle` lipp ja relvade tegelikud/kuvatavad andmed säilivad snapshot'is.

Raketi kere on 1,7× suurem ning kaugvaates kohanduva nähtavusega. Suitsujälje algmõõt on 0,48 asemel 1,0, proovide samm pisut hõredam ja eluiga 2,6 s; samu piiratud osakestepuhvreid kasutatakse edasi. Puudub väide, et laiemate osakeste pikslikulu oleks tasuta.

Metric kaubalennuk saabub kaardiväliselt pikendatud lennuraja teljelt, säilitab rajasuuna, pidurdab, ruleerib perroonile, laadib päris lasti maha ja joondub enne uut õhkutõusu. Raha/laovaru tekib ainult vastuvõetud lastist. Kolme rajasuuna test teeb kogu saabumise–parkimise–mahalaadimise–tõusu–lahkumise tsükli. USA mudel on C-17, Venemaa Il-76 ja Hiina Y-20 tüüpi originaalne protseduurmudel; suurem kere, neli reaktiivmootorit, kõrge tiib ja T-saba. Detail-/kaugmudel ehitatakse valikuliselt, ülejäänud mudelivara ei ekspordita uuesti.

V12 lisab kitsaid mäeharju sisemaa vabadesse taskutesse ning hoiab tee-, baasi- ja ressursikoridorid puhtad. Naabermetsade ühiseid krundiservi enam sissepoole ei kärbita; seega ei teki iga metsatüki ümber kunstlikku vahekäiku. Metsa piirkonnamüra lävi on kõrgem, jättes rohkem avatud maastikku.

Kontroll: 345 testi 80 failis, täiendav 18 sihitud testi pärast lõplikku käivitusvoo korrastust, kolm serveri HTTP/poliitika testi, neli väljalaskepaketi kontrolli ning TypeScript/build. Brauseri lõpppilti ja riistvaralist GPU/FPS-i pole selles keskkonnas mõõdetud. Käskude ja mõõtmise töövoog: [DEV-WORKFLOW.md](DEV-WORKFLOW.md).

Rakendamiseks tuleb uuesti ehitada nii mängu kui ka multiplayeri image: kaardi tagastamise protokoll ja serveri v12 generaator muutusid.
