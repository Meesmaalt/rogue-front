# Näidisalguse lennuvägi, loodus ja helikiht

15.10.2026. Uus põhimenüü loob `procedural-v10` kaarte. V2–v9 taastamisteed säilivad; v9 ruumipaigutust ja kõrgusprofiili ei kirjutata v10 maastikuga üle. Uue komplekti proovimiseks alusta uut lahingut valikuga „Valmis baas, lennuväli + lahingugrupp”. HQ + inseneride algus säilitab baasi ise ehitamise.

## Lennuvägi ja ulatused

Mõlemal meeskonnal on näidisalguses lennuväli, kopter ja kaks maandunud hävitajaklassi lennukit. Ühel lennukil on standardne õhukaitsekoorem, teisel mitmeotstarbeline õhk-õhk/pommikoorem. Ladu paikneb lennuvälja lähedal ning lennukid teeninduvad selle päris laovarudest. Algkomplekti varustus on selgesõnaline stardigrant; lahingus komponentide paigaldamise tasuline tee, ajalimiit ja moona/remondi piirangud jäävad alles. F3 valib lennuväe; missioon tuleb anda mängijal.

Meetrites relvad kasutavad nüüd ka platvormi piiranguid. Kopterikahur 850 m, kopteri raketid 1300 m ja ATGM 2400 m; IFV automaatkahur jääb 1800 m juurde. Hävitaja AAM on 4500 m, mitmeotstarbelise pommikoorma ulatus 900 m. Sama relvaprofiil ei tähenda kõigil platvormidel sama laskekaugust. Miinimumkaugus, luure, moon ja tegelik trajektoor kehtivad edasi.

## Loomulikum kaart

V10 lisab suurtele mäeharjadele kuni 28 erisuuruse, kõrguse ja suunaga väiksemat kõrgendikku. Need jätavad teede, baasiala, asulate ja ressursikohtade ümbruse vabaks. Kõrgusväljal on kaks täiendavat väiksema mõõduga detailikihti. Kõrgendiku pöörde sinus/kosinus arvutatakse üks kord profiili seadistamisel, mitte iga kõrgusproovi juures.

Põllu-/metsaparcelid on suurel kaardil väiksemad. Metsa piir kasutab sissepoole nihutatud ebaühtlast serva, mis jääb algsesse teede/vee järgi lõigatud krunti. Metsa tihedus on kõrgem. Näidisbaasi ja lennuraja ümbruses on metsa välistav hooldusala; võrad ei kasva lennurajale.

Puude paigutuse ülempiir on 130 000, põõsastel 9000. Suuremad ja varieeruvamad võrad tihendavad katvust; kõrgemal maastikul on rohkem okaspuid. Hekkidel on eraldi väiksem mõõtkava. Lähi- ja kaugvaade jäävad instantsitud geomeetriaks, kaugvõra on väiksema kolmnurkade arvuga. Jõudlust ei hinnata ainult puude arvust: võrrelda tuleb päris brauseri kaadriaega samas vaates.

## Heli ja muusika

Helikiht on hiljem oluliselt laiendatud: kaja, mootorid, UI-helid, raadiohääled, ambient, dünaamiline muusika ja heli-visuaalsed vihjed. Kehtiv kirjeldus, seaded ja piirangud: [AUDIO-RELEASE.md](AUDIO-RELEASE.md). Põhimõtted jäid samaks: välised helifailid puuduvad, muusika, efektid ja üldhelitugevus kasutavad eraldi siine, efektide vaigistamine ei vaigista muusikat, paus peatab ajastuse ning heli ei muuda kunagi simulatsiooni.

## Kontroll

Kontrollid hõlmavad 4/6 km kaarte, kõiki kuut piirkonda ning seemnete piire, teede ja ressursikohtade ühendusi, näidisalguse lennuvälju/lennukite koormaid ja varusid, metsa paigutuse piiri ning puhast lennuraja ala. Heli kontrollid (vt AUDIO-RELEASE.md) katavad stereosuuna, kauguse, eraldi helitugevused, häälepiiri, pausi ja uued kihid. Kõik varem lisatud lennuringi, komponentide, salvestuse ja 200 üksuse CPU kontrollid jäävad kasutusse.

Kogu testipakk läbib: 293 testi, 70 testifaili, 244,52 s. TypeScript/build ning serveri map-policy test läbivad. Helimärguannete ja madalamate hekkide lõppkontroll läbib ka eraldi 9 testiga. Päris WebGL-vaade, kuulamismulje ja brauseri FPS vajavad mängija masinal proovimist; neid ei märgita automaatkontrollidega mõõdetuks.
