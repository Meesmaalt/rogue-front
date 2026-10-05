# A5 — luurepõhine AI, reserv ja taastumine

05.10.2026. WaveAI, TacticalAI ja OperationalCommander jäävad olemasolevasse World.tick tsüklisse. Uut AI-mootorit ega üksuserosterit ei lisatud. Käesolev ZIP sisaldab ka A2–A4 muudatusi, mis eelmises ZIP-is puudusid.

## Mis tegelikult muutus

`ai/knowledge.ts` annab AI kihtidele ühise kontaktiallika. Nähtav üksus annab jooksva asukoha; kuni 25 sekundi vanune jagatud kontakt annab ainult viimati nähtud asukoha. Peidetud elava üksuse liikumine ei uuenda seda punkti. Algbaasi asukoht jääb avalikuks kaardiinfoks, kuid AI ei saa sellest peidetud HQ objektiviidet ega luba suurtükil sinna kontaktita tulistada.

WaveAI logistikarünnak, baasi- ja konvoikaitse, õhutõrjele reageerimine ning õhurünnak ei loe enam varjatud vastase elavaid koordinaate. Operatiivjuht ei kasuta enam kogu kaardi peidetud vastase tugevust või sektorihõivet otsustamiseks: objektideks on avalikud kaardisektorid, oma kohalolek ja teadaolevad kontaktid. Conquest eelistab ressursisektoreid. Nähtava baasiähvarduse korral liigub reserv kaitsesse.

Lahingugrupist hoitakse ligikaudu 28% reservis. Varustavad, taanduvad, luuravad, transporditud ja majas positsiooni hoidvad üksused ei satu tavalise rünnakukäsu alla. DoctrinePhase armee suurus loeb lahinguüksusi, mitte ressursiveokeid. Ühe luureülesande olemasolul ei muudeta iga uue luuretaimeriga veel üht tavalist rühma püsivaks luurajaks.

TacticalAI käsud kasutavad mängija move/hold/repair/enter-building/fire-mission/air-return käsuteed. Otsused on piiratud viiesekundilise intervalliga; nähtav konvoiähvardus ei nulli iga tick veoki kaitsjate marsruuti. AI mõistab madalat varustust, kõigi relvapesade moona, kütust, tervist/moraali ja kohalikku nähtavat ülekaalu. Täis lisarelva moon ei põhjusta üksnes tühja põhirelva tõttu ekslikku taandumist.

Taastumiseks valitakse olemasolev vastavate varudega ladu. Tühja lao puudumisel ei käsitleta seda varustuskohana; üksus hoiab positsiooni ja vaatab hiljem uuesti. Remont nõuab inseneri ja tegelikku remondivaru. Piisava taastumise järel vabastatakse ülesanne. Luure eelistab ettepoole jäävat kaardiobjekti või kontakti ees olevat positsiooni; kaitsev jalavägi saab valida sobiva lähedase maja. Maja valik kasutab oma hõivet ja nähtavaid vaenlasi, mitte peidetud garnisonide arvu. Tegelik sisenemiskäsk valideerib mahutavuse ja vaidlustatud hõive uuesti.

Suurtükivägi kasutab värskeid kontaktikoordinaate ja relva min/max kaugust. Õhusõiduki taastumine/AA-ohu tõttu tagasikutsumine kasutab lennubaasi RTB käsku, mitte HQ-sse sõitmist. Baasis taastub ka lennuki supply seisund, kui rajatis ja varud toimivad; õhus laadimist ei lisatud. Pardal oleva või tagasipöörduva õhusõiduki ülesannet ei kirjutata tavarünnakuga üle.

Tootmine ja õhudoktriini uuring kasutavad mängija ostu-/uurimiskäske, fraktsiooni üksuseandmeid, tootmistaset ning operatiivsust. AI hoiab tootmisostudel väikese majandusreservi. Need on esimese läbimise taktika/majanduse tasakaaluparandused; üksuste hindade ega relvade ümbertegemist oletusliku pika matši põhjal ei tehtud.

## Säilimine ja kontroll

Uus aiDecisionAt ning aiIntent kuuluvad täisoleku salvestusse ja worldHash-i. Kontaktid, operatiivplaanid ja olemasolevad WaveAI taimerid jäävad senise salvestuse osaks. AI otsuste juhuarvud on endiselt World-i seemnega RNG-st. Multiplayeris on AI jätkuvalt välja lülitatud; see etapp ei väida uut multiplayeri läbipääsu.

Neli sihitud kontrolli katavad peidetud sihtmärgi mälukoordinaadi ja reservi, transporditud üksuste välistamise/lisarelva moona/varustamisest taastumise ning save/hash, peidetud armee mõju puudumise ja nähtava baasiähvarduse, tegeliku tootmisahela ning Conquesti/HQ lõpptulemuse. Lisaks käivitati viis A4 tarne- ja lennutsükli kontrolli. Täielikku testikomplekti ega pikka AI matši ei käivitatud.

Brauseri visuaalne ülevaatus, pika Roheoru matši raskusastmed ja võidusageduse tasakaal, FPS ning kahe kliendi multiplayeri kontroll on ootel. Koodis toimiv reserveerimine ja luure ei tähenda veel, et mängu alpha läbipääs oleks kinnitatud. Järgmine etapp A6 ühendab õpetuse, save/load sobivuse ja maalahingu alpha viimistluse.
