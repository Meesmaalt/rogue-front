# Vision / Fog of War

Faas 3 lisab simulatsioonitaseme meeskonnapõhise nähtavuse.

`Vision` kasutab 4 m ruudustikku ja hoiab iga meeskonna kohta kolme olekut:

- `0` – uurimata;
- `1` – varem uuritud, kuid hetkel nähtamatu;
- `2` – hetkel nähtav.

Nägemisraadius sõltub üksuse tüübist: HQ 42 m, punker 34 m, tank 30 m ja jalavägi 24 m. Nähtavust värskendatakse fikseeritud simulatsioonitick'i alguses.

Vaenlase üksused on mängija jaoks nähtavad ainult olekus `2`. Sama reegel mõjutab sihtmärgi valikut ja vaenlase valimist hiirega. Seega ei saa AI ega kasutajaliides kasutada udus olevat üksust sihtmärgina lihtsalt sellepärast, et üksus eksisteerib simulatsioonis.

Renderduses kasutatakse eraldi ekraanimaske: uuritud ala jääb tumendatuks ja hetkel nähtav ala avatakse pehme servaga. Minikaart kasutab simulatsiooni kolme olekut otse.
