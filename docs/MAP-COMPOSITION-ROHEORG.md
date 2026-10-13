# Roheorg: kaardi kompositsiooni viimistlus

## Hetkeseis — layout16

1088 m kaardil on kaks jõeasulat, 48 garnisonitavat tsiviilhoonet, 87 ühendatud teesegmenti, viis silda ja viis tegelikku ressursirajatist. Baasid ning ressursikoordinaadid säilitavad layout14 asukohad. 42 asulamajal on varieeruvad mõõdud/kõrgused, tänava poole suunatud front ja aed; kuus talumaja on maanteega seotud kruusarajaga. Neli elamuridade vahelist tänavat täidavad varasemat tühja ruudustikku.

Mets koosneb 20 algsest alast, 20 servaharust ja neljast kaldasalust. Ellipsid on ühine sim/render alus, kuid kattuvate puuproovide miinimumvahe väldib samas kohas tüvede kuhjumist. Puud jäävad väikseks ja instantsituks, teed/majad/vesi puhastavad võrastikku. Põllud ja elamuaiad moodustavad 78 maakatteala; põllupiiridel on pehmemad nurgad.

## Pindade ühendus

Temperate-maastiku üks 2048² atlas ühendab põllu, metsa, kalda, tee, õue, kõnnitee, märgistuse ja majast tänavani viiva raja. Kõigi teeservade kiht eelneb kõigile sõidupindadele, nii et ristmik ei koosne eraldi kattuvatest kõrgusnihkega plaatidest. Teed jäävad samaks nav-/maanteekiiruse feature'iks, render loob neist pinnavärvi.

48 jõe autorsegmenti ühendatakse renderdamisel üheks samakõrguseliste footprint'ide veepinnaks. Kattuv ala trianguleeritakse üks kord; maailma-UV-d, kaldast sügavama keskosa gradient ja voolutekstuur on pidevad. Simulatsioon kasutab endiselt tegelikku vee/jõepõhja footprint'i ning päris silladeck'i.

Viis 52×10 m silda on kanaliga sobivas mõõdus; lähenemisroad tulevad deck'i otsteni. Asfalt, avatud piirded, talad ja jõepõhjale toetuvad sambad kuuluvad eemaldatavasse bridgeId gruppi, mis järgib olemasolevat hävimisloogikat. Kaks korrust on ka väiksemate 5.8 m elamute fassaadil loetavad.

## Kontroll ja piirangud

Build ning 24 sihitud geomeetria/maastiku/esituse/õpetuse kontrolli läbivad. Majad/ressursirajatised ei kattu tee ega veega, kogumispunktid on läbitavad, sildade nav/hävimine/save taastumine ja tasuline õpetuse läbipääs säilivad. Veepinna kontroll mõõdab kattuvate kanalite tegelikku ühendpindala ning kontrollib normaale ja UV-sid. See ei tõenda veel Wargame'i visuaalset taset ega GPU FPS-i; tegelik mänguvaade vajab riistvaralise WebGL-iga hindamist.

Uue paigutuse jaoks alusta uut Roheoru või õpetuse matši (layout16/training16). Vana kaardi snapshot'id jäävad oma võtmetesse. Paigutuse korduv genereerimine: `python3 scripts/maps/finish-road-network.py`. Vanemad polish/refine skriptid kirjeldavad varasemaid migratsioone.


## Referentside järgi pinna ja kaugvaate detail

Võrad on ebakorrapärase silueti, opaque leheklastritekstuuri ja küpsetatud iseenese varjutusega. Kolm kaugusastet annavad 168/64/24 kolmnurka võra kohta; kõik taimed ei kasuta lähidetaili korraga. 18 põlluserva hekiriba ja 12 hajusaluga väikesalu kasutavad sama tegelikku forest-cover'i ja madalamate taimede skaalat. Kaks lauget maastikukõrgendikku jagavad kõrgust nav/LOS/mudelitega. Kelpkatusega tsiviilmajad säilitavad mudelivahetusel silueti.

Maapinna puuvarjud küpsetatakse samadest paigutustest koos põldude/teede/õuedega ühte 2048² atlasesse. Varjud on nähtavad ka ilma reaalaja shadow-mapita. Päikese suund on nüüd määratud kõigil kvaliteetidel. Gradienttaevas ja üks fogged kaugmaastiku ring lõpetavad nähtava kaardiserva; rannikul jätkub meri. Kaugmaastik on dekoratiivne ega suurenda mänguala.

Päris atlase Canvas2D ülevaatus kontrollis varjude/pindade paigutust; 7875 taime 310 võrarühmas ei ole GPU FPS-i tõend. Referentsidega võrdne visuaalne tase vajab endiselt mänguvaate hindamist.
