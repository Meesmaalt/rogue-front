# Navigation

Faas 2 navigatsioon kasutab 2 m lahtritega `NavGrid`-i. 400 m kaardil on 200 × 200 lahtrit.

- Maastiku lahter on blokeeritud, kui hinnatud nõlv ületab 35°.
- Staatilised üksused (`hq`, `bunker`) märgitakse navigeerimises takistusteks koos üksuse raadiuse varuga.
- `Pathfinder` kasutab A*-i binaarhunnikuga ja 8-suunalist liikumist; diagonaal on lubatud ainult siis, kui mõlemad külgnevad lahtrid on läbitavad.
- Pärast A*-i rakendatakse nähtavusjoone põhist tee silumist.
- `FlowField` ehitab sihtpunktist ühe ühise kuluvälja, mida saab kasutada rühmaliikumiseks.
- `CommandController`i kaudu tulevad formatsiooni sihtpunktid; `move` kasutab üksusepõhist A*-i marsruuti ja `amove` jagatud flowfield'i, kuni üksus omandab ründesihtmärgi.
- Üksus jälgib edenemist. Kui ta on 0,8 s sisuliselt paigal, arvutatakse marsruut uuesti.
- Staatiliste objektide muutumisel märgitakse nav-grid määrdunuks ja ehitustakistused sünkroniseeritakse järgmise sim-ticki alguses.

Jõudlustestiga mõõdeti 200 liikuva üksuse puhul 60 ticki keskmiseks umbes 0,61 ms/tick selles Node.js jooksukeskkonnas. See on keskkonnapõhine mõõt, mitte universaalne riistvaragarantii.
