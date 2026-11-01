/* Il dottore delle piante: cause e rimedi in italiano.
   SINTOMI = cosa vede lei; ogni sintomo ha delle cause, e alcune guardano l'ultima annaffiatura
   (r = giorni passati / giorni tra un'acqua e l'altra: sotto 0,5 = annaffiata da poco, sopra 1,3 = è rimasta senz'acqua a lungo).
   PROBLEMI = i problemi con il loro rimedio; FOTO = come leggere i risultati di Pl@ntNet (malattie e parassiti). */
window.PROBLEMI = {
  troppaAcqua: { t: "Troppa acqua", r: ["Non annaffiare finché i primi 3–4 cm di terra non sono asciutti.", "Svuota sempre il sottovaso dopo 15 minuti.", "Se la terra puzza o le radici sono marroni e molli: togli la pianta dal vaso, taglia le radici marce e rinvasa con terra nuova e asciutta."] },
  poca: { t: "Ha avuto sete", r: ["Annaffia bene finché l'acqua esce dai fori, poi svuota il sottovaso.", "Se la terra è secchissima e l'acqua scivola via, immergi il vaso in un secchio d'acqua per 20 minuti.", "Le foglie secche non tornano verdi: puoi tagliarle."] },
  vecchie: { t: "Foglie vecchie che finiscono", r: ["Se ingiallisce solo qualche foglia bassa e il resto è verde, è normale: la pianta lascia andare le foglie più vecchie.", "Toglila quando è del tutto gialla."] },
  luce: { t: "Poca luce", r: ["Avvicinala a una finestra luminosa, ma senza sole diretto forte nelle ore calde.", "Girala di un quarto ogni settimana, così cresce dritta.", "In inverno le serve ancora più luce: anche una lampada per piante va bene."] },
  sole: { t: "Bruciature del sole", r: ["Spostala dove la luce è forte ma il sole non batte diretto sulle foglie (o metti una tenda leggera).", "Le macchie bruciate restano: tagliale se ti danno fastidio, la pianta fa foglie nuove sane."] },
  ariaSecca: { t: "Aria troppo secca", r: ["Tienila lontana da termosifoni e condizionatori.", "Mettila su un piattino con argilla espansa e un dito d'acqua (il vaso non deve toccare l'acqua).", "Puoi tagliare le punte secche con forbici pulite, seguendo la forma della foglia."] },
  calcare: { t: "Acqua troppo dura o troppo concime", r: ["Usa acqua lasciata riposare una notte, o acqua piovana/filtrata.", "Ogni tanto lava la terra: fai scorrere tanta acqua nel vaso e lascia scolare bene.", "Concima solo da aprile a settembre, a metà della dose scritta."] },
  concime: { t: "Le manca nutrimento", r: ["Da aprile a settembre dai un concime liquido per piante verdi ogni 2–4 settimane.", "Se è nello stesso vaso da più di 2 anni, rinvasala in primavera in un vaso un po' più grande."] },
  freddo: { t: "Freddo o colpo d'aria", r: ["Tienila lontana da finestre aperte d'inverno, porte e spifferi.", "Non lasciarla attaccata al vetro freddo di notte.", "Non spostarla di continuo: dopo uno spostamento è normale che perda qualche foglia, poi si riprende."] },
  marciume: { t: "Marciume delle radici o del fusto", r: ["Togli la pianta dal vaso e guarda le radici: quelle sane sono chiare e sode, quelle marce scure e molli.", "Taglia tutto il marcio con forbici pulite e rinvasa in terra nuova e asciutta, in un vaso con i fori.", "Annaffia poco per qualche settimana. Se il fusto è marcio alla base, salva una talea sana e falla radicare in acqua."] },
  oidio: { t: "Oidio (mal bianco)", r: ["Taglia le foglie più coperte di polvere bianca e buttale.", "Spruzza sulle foglie (sopra e sotto) un cucchiaino di bicarbonato in un litro d'acqua con una goccia di sapone, una volta a settimana per 3 settimane.", "Non bagnare le foglie quando annaffi e lascia girare l'aria intorno alla pianta."] },
  cocciniglia: { t: "Cocciniglia", r: ["Isola la pianta dalle altre.", "Togli i batuffoli o gli scudetti con un cotton fioc imbevuto di alcol, anche sotto le foglie e all'attaccatura.", "Poi spruzza olio di neem o sapone molle potassico (si trovano al vivaio), ogni 7 giorni per 3–4 volte."] },
  ragnetto: { t: "Ragnetto rosso", r: ["Fai una doccia tiepida alla pianta, bagnando bene il sotto delle foglie.", "Il ragnetto odia l'umidità: nebulizza spesso e tienila lontana dal termosifone.", "Se torna, spruzza sapone molle potassico o olio di neem ogni 5–7 giorni per 3 volte."] },
  afidi: { t: "Afidi (pidocchi delle piante)", r: ["Lavali via con un getto d'acqua o con un panno umido.", "Spruzza acqua e sapone molle potassico (1 cucchiaio per litro) ogni 4–5 giorni finché spariscono."] },
  tripidi: { t: "Tripidi", r: ["Isola la pianta e falle una doccia, soprattutto sotto le foglie.", "Appendi vicino una trappola adesiva azzurra o gialla.", "Spruzza olio di neem ogni 5–7 giorni per 3–4 volte."] },
  moscaBianca: { t: "Mosca bianca", r: ["Appendi vicino una trappola adesiva gialla.", "Spruzza sapone molle potassico sotto le foglie ogni 5 giorni per 3 volte.", "Isola la pianta finché non sono sparite."] },
  moscerini: { t: "Moscerini del terriccio", r: ["Lascia asciugare bene la terra tra un'annaffiatura e l'altra: le larve vivono nella terra bagnata.", "Metti una trappola adesiva gialla sul vaso per prendere gli adulti.", "Puoi coprire la terra con 1 cm di sabbia o ghiaino. Non fanno male alle persone."] },
  muffa: { t: "Muffa grigia", r: ["Togli subito le parti con la muffa grigia e buttale fuori casa.", "Non bagnare foglie e fiori, e fai girare l'aria nella stanza.", "Annaffia un po' meno e solo la terra."] },
  macchieFungo: { t: "Macchie di un fungo", r: ["Taglia le foglie macchiate con forbici pulite e buttale.", "Non bagnare le foglie: annaffia solo la terra, e al mattino.", "Se le macchie continuano ad allargarsi, chiedi al vivaio un fungicida al rame per piante da appartamento."] },
  ruggine: { t: "Ruggine", r: ["Togli le foglie con i puntini arancioni o marroni e buttale.", "Non bagnare le foglie e tieni la pianta in un posto ventilato.", "Se si allarga, al vivaio c'è un fungicida apposta."] },
  batteri: { t: "Macchie dei batteri", r: ["Taglia subito le foglie con macchie molli o bagnate, pulendo le forbici con alcol tra un taglio e l'altro.", "Non nebulizzare e non bagnare le foglie per qualche settimana.", "Tienila lontana dalle altre piante."] },
  virus: { t: "Un virus", r: ["I virus non si curano: se la pianta è molto rovinata, è meglio buttarla per non contagiare le altre.", "Lava le forbici con alcol dopo averle usate su questa pianta."] },
  lumache: { t: "Lumache", r: ["Cercale la sera, sotto il vaso e tra le foglie, e toglile a mano.", "Una barriera di gusci d'uovo tritati o di sabbia sulla terra le tiene lontane."] },
  oziorrinco: { t: "Oziorrinco (coleottero che rosicchia)", r: ["Le foglie rosicchiate a mezzaluna sui bordi sono il segno tipico: la notte cerca gli adulti con una torcia.", "Le larve mangiano le radici: in primavera al vivaio trovi i nematodi apposta da sciogliere nell'acqua."] }
};

window.SINTOMI = [
  { id: "gialle", e: "🟡", n: "Foglie gialle", c: (r) => r < .5 ? [["troppaAcqua", 3, "È stata annaffiata da poco: se la terra è ancora bagnata, è quasi sempre troppa acqua."], ["vecchie", 1]] : r > 1.3 ? [["poca", 3, "È da un po' che non beve."], ["vecchie", 1]] : [["vecchie", 2], ["troppaAcqua", 2, "Tocca la terra: se è bagnata a 3–4 cm di profondità, è troppa acqua."], ["luce", 1], ["concime", 1]] },
  { id: "punte", e: "🤎", n: "Punte o bordi secchi", c: (r, s) => [["ariaSecca", /umidit/i.test(s.umid) ? 3 : 2, /umidit/i.test(s.umid) ? "Questa pianta ama l'umidità." : ""], ["poca", r > 1.2 ? 2 : 0, "È da un po' che non beve."], ["calcare", 1]] },
  { id: "molli", e: "🥀", n: "Foglie molli o cadenti", c: (r) => r > 1 ? [["poca", 3, "È da un po' che non beve: probabilmente ha solo sete."], ["freddo", 1]] : r < .5 ? [["marciume", 2, "È stata annaffiata da poco eppure è afflosciata: le radici potrebbero non assorbire più."], ["troppaAcqua", 2], ["freddo", 1]] : [["poca", 2], ["troppaAcqua", 2, "Tocca la terra: se è bagnata e la pianta è molle, è troppa acqua."], ["freddo", 1]] },
  { id: "macchie", e: "🟤", n: "Macchie marroni o nere", c: (r, s) => [["sole", /indirett|poca|ombra|mezz/i.test(s.luce) ? 2 : 1, /indirett|poca|ombra|mezz/i.test(s.luce) ? "Questa pianta non vuole il sole diretto." : ""], ["macchieFungo", 2], ["freddo", 1], ["batteri", 1]] },
  { id: "polvere", e: "⚪", n: "Polvere bianca sulle foglie", c: () => [["oidio", 3]] },
  { id: "cotone", e: "☁️", n: "Batuffoli bianchi o scudetti", c: () => [["cocciniglia", 3]] },
  { id: "ragnatele", e: "🕸️", n: "Ragnatele fini, puntini chiari", c: () => [["ragnetto", 3], ["ariaSecca", 1]] },
  { id: "insetti", e: "🐛", n: "Insetti piccoli sulle foglie", c: () => [["afidi", 2], ["tripidi", 2], ["moscaBianca", 1]] },
  { id: "moscerini", e: "🪰", n: "Moscerini sulla terra", c: () => [["moscerini", 3], ["troppaAcqua", 2, "I moscerini vivono nella terra sempre umida."]] },
  { id: "pallida", e: "🌱", n: "Cresce lunga e pallida", c: () => [["luce", 3, "Si allunga per cercare luce."], ["concime", 1]] },
  { id: "cadono", e: "🍂", n: "Perde foglie all'improvviso", c: (r) => [["freddo", 2, "Di solito succede dopo uno spostamento o uno spiffero."], r < .5 ? ["troppaAcqua", 2] : ["poca", r > 1.2 ? 2 : 1], ["luce", 1]] },
  { id: "base", e: "🫠", n: "Fusto scuro e molle alla base", c: () => [["marciume", 3, "Il fusto molle alla base è il segno del marciume."], ["troppaAcqua", 2]] },
  { id: "muffa", e: "🌫️", n: "Muffa grigia", c: () => [["muffa", 3]] },
  { id: "rosicchiate", e: "🐌", n: "Foglie rosicchiate", c: () => [["lumache", 2], ["oziorrinco", 2]] }
];

/* Risultati di Pl@ntNet (nomi scientifici) → il nostro problema */
window.FOTO = [
  [/Pseudococc|Planococc|Coccus|Coccidae|Diaspid|Saissetia|scale|mealybug|cocciniglia/i, "cocciniglia"],
  [/Tetranych|Oligonych|Acari|Tarsonem|mite|ragnetto|acaro/i, "ragnetto"],
  [/Aphid|aphis|Myzus|afide/i, "afidi"],
  [/Thrip|Thysanopt|tripide/i, "tripidi"],
  [/Aleyrod|Trialeurod|Bemisia|whitefly|aleirode/i, "moscaBianca"],
  [/Bradysia|Sciar|fungus gnat/i, "moscerini"],
  [/Erysiph|Oidium|Podosph|Golovinomyces|powdery mildew|oidio/i, "oidio"],
  [/Botrytis|grey mould|grey mildew|muffa grigia/i, "muffa"],
  [/Pythium|Phytophthora|Rhizoctonia|Fusarium|root rot|collar rot|marciume/i, "marciume"],
  [/Puccini|Uromyces|Melampsora|rust|ruggine/i, "ruggine"],
  [/Xanthomonas|Pseudomonas|Erwinia|Pectobacterium|Dickeya|bacterial|batteric/i, "batteri"],
  [/virus|viroid/i, "virus"],
  [/Gastropoda|Helix|Arion|Deroceras|slug|snail|lumac/i, "lumache"],
  [/Otiorhynch|weevil|oziorrinco/i, "oziorrinco"],
  [/Colletotrichum|Alternaria|Cercospora|Septoria|Phyllosticta|Ascochyta|Cylindrocladium|Myrothecium|leaf spot|anthracnose|antracnosi|blight/i, "macchieFungo"]
];
