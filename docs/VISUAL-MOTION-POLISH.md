# Liikumise visuaalne sujuvus

Koodiülevaatus leidis puuduvad kõrguse/kaldumise interpolatsioonid, jalaväe järsu sammuanimatsiooni lüliti ning käsu järgi vibreeriva tehnika. Need on parandatud olemasolevas UnitRenderer-is.

World säilitab ticki alguses lisaks X/Z ja suundadele eelmise kõrguse ning lennu pitch/bank väärtused. MotionPresentation.sampleMotion täidab iga renderdusvaate korduskasutatava poosi: lennukid/kopterid ei näita kõrgust ja kallet enam ainult 30 Hz täisväärtustena. Optional väljad lubavad vanade v20 salvestuste lugemist; need on visuaalsed lähteväärtused, mitte uus liikumisotsus. Lennumasina baasi paigutamine lähtestab ka varasema visuaalse kõrguse ja kalde.

Jalaväe sammufaas edeneb tegeliku läbitud teekonna kiiruse järgi ning jalgade amplituud vaibub peatumisel eksponentsiaalselt. Eri sõduritel on faasinihe; mudeli algne jalapoos säilib. Kinni seisva üksuse liikumiskäsk või kõrge motionSpeed ei pane jalgu kohapeal jooksma. Koosseisu survest sõltuv kokkutõmbumine on samuti sujuvam.

Maa-tehnika väike vedrustusliikumine sõltub tegelikust liikumisest, mitte move/amove käsust. Maastikukalle vaibub kaadrisagedusest sõltumatu filtriga. Asukoht, sihtsuund ja torni suund kasutavad endiselt simulatsiooni interpolatsiooni; lisafiltrit, mis viivitaks sihtmärgile või mürsu lähtepunktile vastavat suunda, ei lisatud. Maastikukalle lähtestatakse kaamera vaatesse naasmisel, et ei kuvataks vana vedrustusasendit. Üle 24 m järsu ümberpaigutuse korral näidatakse kohe uut asukohta.

Paus ja lõppenud matš kuvavad viimast asukohta alpha=1 ning peatavad üksuse animatsiooni aja. Varem jätkas GameLoop alpha tsüklit ka siis, kui World ei teinud uut ticki; mudel võis vana ja uue koha vahel korduda. Ka mürskude renderdus kasutab sama pausi interpolatsiooni. Kaameraga saab endiselt liikuda.

Presentation-parameetrid asuvad mobility.json-is. Uus poosinäidis ei eralda iga üksuse/kaadri jaoks uut objekti; offscreen/FOW/LOD piirangud säilivad. Kinnitatud uut FPS-võitu ei ole.

## Kontroll ja piirid

Kolm lühikest renderdusloogika kontrolli: kõrguse ja kaldumise kaadritevaheline näidis koos piiriületava suunaga; blokeeritud üksuse ja järsu ümberpaigutuse animatsioon; sama vaibumine 30/120 FPS korral ning paus. Lisaks replay determinism ja TypeScripti/tootmisbuild läbisid.

Kohalik Chromium/Chrome/Firefox ei olnud saadaval. Päris renderdatud brauserivaadet ei vaadatud ega FPS-i mõõdetud. Suurte gruppide, kaardi servade ja eri LOD-ide visuaalne läbipääs jääb avatuks; dokument ei märgi A6 lõpetatuks.
