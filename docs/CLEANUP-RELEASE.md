# Failide ja väljalaske korrastus · 15.10.2026

## Tulemus

- Dokumentatsiooni 18 PNG-pilti: 12 848 154 → 8 532 688 baiti (−33,6%). WebP on kadudeta: iga pildi mõõtmed ja kõik dekodeeritud RGBA pikslid võrreldi originaaliga. Markdown-viited ja kaardiülevaate generaatori väljund uuendati. Algse pildi PNG-baite ei säilitata tööpuus; need on Giti ajaloos alles.
- Standardne `npm run build` eemaldab ainult `dist` paketist 23 kasutamata esialgset asendusmudelit ja 60 ajaloolise mittevalitava masinatüübi GLB-d: kokku 83 faili ja 8 341 688 baiti. Kõik algsed mudelifailid ja generaatorid säilivad lähtepuus. Ühtki vajalikku mudelit ei lihtsustata ega kvandita.
- Kontrollitud `dist`: 151 faili, 15 634 531 baiti (~15,6 MB). Manifest sisaldab 66 detail-/kaugmudelit kolme fraktsiooni põhiklasside ja logistika jaoks. Kõik tekstuurid, pisipildid, litsentsid ning muud public-ressursid säilivad.
- Säilivate GLB-de maht on 11 286 812 baiti; gzip-tasemega 6 mõõdetud sisu maht on 1 994 923 baiti (−82,3%). See on kohalik pakkimismõõtmine, mitte serverist mõõdetud allalaadimine ega kogu mängu ülekandemaht.
- Dockeri põhikontekstist jäävad välja ajaloolised raportid/pildid, prototüüp ja multiplayeri eraldi ehituskontekst. Multiplayeri kontekst välistab kohalikud sõltuvused, andmebaasikataloogi ja logid; kontoandmed jäävad olemasolevale volume'ile.

Mahud kasutavad kümnendsüsteemi MB-sid. Giti ajalugu ei ole ümber kirjutatud: praeguse tööpuu ja väljalaske kokkuhoidu ei saa võrdsustada kogu Git-klooni/ajaloo vähenemisega. Testid ja arendusdokumendid jäävad projekti alles.

## Teostus

`src/data/art-models.json` on mudeliliikide ühine nimekiri renderdajale, generaatorile ja väljalaske kontrollile. `scripts/release/compact.mjs` loeb põhiklassid `platforms.json`-ist ning lisab logistika. Enne puhastamist kontrollitakse kõigi säilivate detail-/kaugmudelite olemasolu; puuduv fail või manifestikirje katkestab töö. Skript keeldub `public` lähtekataloogi puhastamisest ja on juba korrastatud `dist` puhul idempotentne.

`nginx.conf` määrab GLB-de MIME-tüübiks `model/gltf-binary`, gzip-tasemeks 6 ning lisab `Vary: Accept-Encoding`. Pakkimist toetavad proksitud päringud on lubatud. Mudelite räsita URL-id nõuavad vahemälu korduvkontrolli, et järgmine redeploy ei jääks vanade mudelite taha. Nginxi direktiivide alus: [gzip mooduli ametlik dokumentatsioon](https://nginx.org/en/docs/http/ngx_http_gzip_module.html). Eelpakitud `.gz` koopiaid ei lisata Git'i ega kettapaketti; olemasolev production-Nginx pakib vastuse saatmisel.

`python3 scripts/art/compact-doc-images.py` teeb tulevased dokumentatsiooni PNG-d kadudeta WebP-ks ainult juhul, kui tulemus on väiksem ning RGBA piksli- ja mõõtmekontroll läbib. Runtime'i mudelitekstuure see skript ei töötle.

## Kontroll ja rakendamine

- `npm test`: kõik 314 testi 73 failis läbisid (380,62 s).
- `npm run test:release`: kõik neli kontrolli läbisid — säilivate ressursside baitide ja gzip-roundtrip'i vastavus, puuduvate failide/manifestikirjete tõrge enne kustutamist, algse public-kataloogi kaitse ning korduvkäivituse idempotentsus.
- `npm run build`: TypeScript ja production build läbisid; käivitub automaatselt väljalaske korrastus.
- Kõik 18 dokumentatsioonipilti võrreldi ka pärast teisendust Giti algsete PNG-dega; pikslid ja mõõtmed on identsed. Kaardiülevaate WebP ekspordirada kontrolliti eraldi.

Rakendub tavalise pull/build/redeploy käiguga. Selles keskkonnas puudub Nginx/Docker, seega tegelik HTTP `Content-Encoding: gzip` vastus tuleb pärast production-redeploy'd üle kontrollida. Arendusserveri port 5173 ei kasuta Nginxi gzip-seadistust. Brauseri mängutunnetust ega FPS-i see korrastus ei mõõda ega luba parandada.
