# Fraktsioonide relvakoosseisud ja jalaväemudelid

2026-10-05. Arendus on ühendatud tootmise, lahingu, varustamise, valikupaneeli ja 3D Arsenaliga. See ei tähenda kogu mängu alpha-valmidust.

## Tegelik koosseis

Kolm fraktsiooni × kümme olemasolevat jalaväerolli annavad 30 koosseisuvarianti. Liinijalavägi on kaheksameheline: automaadid, kuulipilduja ja piiratud lähitankitõrje kasutavad kolme iseseisva laskemoonaga relvapesa. Luurerühm on kuue-, kuulipildujameeskond viie-, tankitõrje/eriüksus/insenerid/miinipilduja nelja-, MANPADS ja raske ATGM kolme- ning snaipripaar kahemeheline. Väikeste meeskondade HP ja kaotused vastavad nende suurusele. Insener on relvastamata remondimeeskond. Miinipilduja ja snaiper kasutavad lähikaitseks lisarelva.

| Tankitõrjemeeskond | Relv | Ulatus mängus | Läbistus | Rakette | Juhtimine |
|---|---|---:|---:|---:|---|
| USA | Javelin | 68 | 23 | 4 | Infrapuna |
| Venemaa | RPG-7V | 34 | 17 | 7 | Otsetuli |
| Hiina | PF-98 | 42 | 19 | 5 | Otsetuli |

MANPADS kasutab vastavalt Stingerit, Iglat ja QW-2: õhusihtmärgid, eraldi laskemoon ja erinev ulatus/tabavus. Raske tankitõrje kasutab TOW-2, Korneti ja HJ-8 statiivil rakette. Liinijalaväe lähitankitõrje on LAW/RPG/PF-89. Kuulipildujad, snaiprid, miinipildujad ning mitme tehnikaüksuse relvapesad on samuti fraktsioonipõhised. Need on mängu tasakaaluarvud, mitte tõendatud pärisrelvade tehnilised näitajad.

`faction-loadouts.json` ühendatakse olemasolevate üksuse- ja relvaprofiilidega `factionUnitDefinition` kaudu. World, tootmine, materjalikulu, tühistamise tagasimakse ja HUD kasutavad sama fraktsioonimääratlust. Üksuse tegelikud relvad jäävad täielikku salvestusse; varustus taastab nende piiratud padruni-/raketivarusid olemasoleva logistika kaudu. Autosalvestuse võti on layout7, täieliku salvestuse skeem jääb 19.

## Lahing ja nähtavad andmed

Valikupaneelis on relvakaardid nähtavad ilma taktikalise detailosa avamiseta: nimi, roll, laskemoon, ulatus, läbistus, baas-tabavus, laadimine ja juhtimine. Kahjustusrida näitab jalaväe, IFV, kopteri ja tanki esi/külg/tagasoomuse mõju. Arv kasutab sama läbistusfunktsiooni ja sihtmärgiklassi tegurit nagu päris mürsutabamus. See on terve meeskonna nominaalne õnnestunud tabamus võrdlusüksusele lühikese vahemaa pealt: kate, tabamisvõimalus, kaugus, moraal, veteranlus ja olukord muudavad tegelikku tulemust. See ei ole garanteeritud kahjustus ega DPS.

Relvavalik jätab välja kineetilise relva, mis konkreetsest nurgast soomust ei läbista. Meeskonnakaotused vähendavad kuulitule mahtu; raketi või mürsu lõhkepea ei muutu nõrgemaks, kuid jalaväe laadimine aeglustub. Väljalaske asukoht arvestab relva ja rühma laskurit.

Tootmisnupu parem klõps avab ostuta koosseisukaardi: hoone/taseme nõue, hind, tootmisaeg, koosseis, optika, kiirus ja relvad. Tagasi-nupp või uus valik taastab tavalise juhtimispaneeli. Jalaväerollidel on eristatavad SVG-ikoonid.

## Mängus kasutatavad mudelid

Jalavägi kasutab nüüd kujundatud kiivreid, veste, saapaid, taskuid, seljakotte ning fraktsioonikamot. Relva geomeetria vastab koosseisule: automaat/bullpup, kuulipilduja laskemoonakastiga, optikaga snaiprirelv, õlalt lastav toru, Javelini sihik, MANPADS, statiivil ATGM, miinipilduja alusplaat ja remonditööriistad. Meeste arv vastab koosseisule ning olemasolev kaotuste kuvamine säilib.

Need on täiustatud protseduurilised originaalmudelid, mitte professionaalsed fotorealistlikud ostuvarad. 30 variandil on detailne ja kaugvaate prototüüp. Ühendatud geomeetria piirab kaheksamehelise rühma detailmudeli 24 mesh'ini ning kaugmudeli 8 mesh'ini; geomeetriakontrolli suurim rühm oli 7072 kolmnurka. Kaugmudel vähendab partiisid ja jalanimatsiooni, mitte kolmnurkade arvu. Geomeetria/materjalid jagatakse prototüüpide vahel. FPS-i pole mõõdetud.

Peamenüü 3D ARSENAL sisaldab samu jalaväemudeleid ja relvaandmeid ning olemasolevat tehnikat. See võimaldab vaadata fraktsioonide varustust enne lahingut.

## Kontroll ja piirangud

Tootmisbuild ja kolm sihitud kontrolli läbisid: fraktsioonide relvavalik/piiratud laskemoon/save-load, HUD-i tankikahjustuse vastavus päris tabamusele ning tootmise/tühistamise fraktsioonihind. 30 variandi detail- ja kaugmudeli struktuuri, koosseisu ning jagatud geomeetriat kontrolliti Node'is (`checks/infantry-art.json`).

Täistestikomplekti, pikka tasakaalumängu ja multiplayer'i läbimängu ei tehtud. Uue kamo GPU-shaderit ega mudelite brauseripilti pole visuaalselt kontrollitud. Need jäävad järgmiseks pildipõhiseks viimistluseks; mudeli struktuurikontroll ei tõenda visuaalset kvaliteeti ega FPS-i.
