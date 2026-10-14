# Brauseri jõudlusraport

Pärast uue versiooni pull'i/redeploy'd laadi mänguleht uuesti ja alusta lahingut. Mõõda samal kaardil ja sama graafikakvaliteediga, millega jõnksud tekivad.

1. Vajuta **F8** (või ava Seaded → Jõudluse mõõdikud).
2. Vajuta **Uus mõõtmine**. Hoia kaamerat umbes 15 sekundit paigal.
3. Liiguta kaamerat umbes 45 sekundit üle linnade, metsade ja vee. Suurenda/vähenda ning pööra kaamerat nii nagu tavaliselt mängides.
4. Vajuta **Salvesta JSON**. Brauser laadib alla `rogue-front-performance.json` faili. Lisa see analüüsimiseks vestlusse ning kirjelda, millise liigutuse juures jõnks oli kõige tugevam.

Soovi korral tee teine samasugune mõõtmine madala graafikakvaliteediga ning nimeta failid `medium.json` ja `low.json`. Kui jõnksud esinevad eelkõige esimest korda piirkonda liikudes, mõõda esimene ja teine sama marsruudi läbimine eraldi.

Raport sisaldab kaardi ID-d/seemet/suurust, brauseri ja graafikaseadme infot, resolutsiooni, kvaliteeti, kaamera asukohta, joonistuskäske/kolmnurki, GPU ressursiloendureid ning kuni 3600 viimast kaadrit ajajärjestuses. Kogu mõõtmise 30 pikimat üle 50 ms kaadrit säilivad eraldi; brauseri toetusel lisanduvad pika JavaScripti töö kirjed. Kaadri CPU-etapid eristavad kaamerat/nähtavuse kontrolli, üksuste esitust, maastiku oleku uuendusi, efekte, 3D esitamist, udu ja HUD-i.

GPU 3D-pass mõõdetakse asünkroonsete WebGL2 timer query'dega iga kaheksanda kaadri järel, kui brauser vastavat laiendust toetab. Tulemus saabub viivitusega; JSON-is on selle vanus kaadrites. `null` tähendab mõõtmata GPU aega. CPU 3D-aeg on käsu esitamise aeg, mitte GPU töö kestus. Mõõdik ei oota GPU tulemust ega kasuta `gl.finish()`-it. F8 väljalülitamisel ei koguta kaadriraportit ega uusi GPU päringuid.

Fail salvestatakse ainult sinu brauseri kaudu; automaatset üleslaadimist ei toimu. Raport ei sisalda kontoandmeid, autentimistokenit ega mängusalvestust. Tegeliku jõnksutamise põhjuse ja FPS-i muutuse kinnitamiseks on vaja sinu seadme raportit: geomeetriatestid ei asenda GPU-ga mänguvaate mõõtmist.
