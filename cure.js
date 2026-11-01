/* Banca dati delle cure, in italiano.
   e = ogni quanti giorni annaffiare d'estate (apr–set), i = d'inverno (ott–mar).
   art = disegno usato quando la pianta non ha ancora una foto; c = i suoi due verdi. */
window.SPECIE = {
  monstera:{n:"Monstera",l:"Monstera deliciosa",e:7,i:12,luce:"Luce indiretta forte",umid:"Ama l'umidità",art:"monstera",c:["#2F6B3F","#3F8A52"],tip:"Annaffia quando i primi 3–4 cm di terra sono asciutti. Pulisci le foglie con un panno umido."},
  pothos:{n:"Pothos",l:"Epipremnum aureum",e:7,i:10,luce:"Anche poca luce",umid:"Normale",art:"trailing",c:["#3E7F3A","#9CC45A"],tip:"Se le foglie si afflosciano ha sete. Le talee mettono radici in un bicchiere d'acqua."},
  filodendro:{n:"Filodendro",l:"Philodendron hederaceum",e:7,i:10,luce:"Luce indiretta",umid:"Normale",art:"trailing",c:["#2F6E36","#5FA04A"],tip:"Cresce ricadente o su un tutore. Foglie gialle di solito vogliono dire troppa acqua."},
  sansevieria:{n:"Sansevieria",l:"Dracaena trifasciata",e:14,i:28,luce:"Qualsiasi luce",umid:"Aria secca va bene",art:"spike",c:["#2C5A3A","#B9C76A"],tip:"Teme più l'acqua in eccesso che la siccità. In inverno quasi niente."},
  zamioculcas:{n:"Zamioculcas",l:"Zamioculcas zamiifolia",e:14,i:24,luce:"Luce indiretta",umid:"Normale",art:"fern",c:["#1F5A33","#2F7A45"],tip:"Fa scorta d'acqua nelle radici: lascia asciugare bene tra un'annaffiatura e l'altra."},
  ficus:{n:"Ficus elastica",l:"Ficus elastica",e:8,i:14,luce:"Luce forte, poco sole diretto",umid:"Normale",art:"round",c:["#1E3F2C","#38604A"],tip:"Non spostarlo spesso: cambia posto e perde le foglie."},
  ficuslyrata:{n:"Ficus lyrata",l:"Ficus lyrata",e:7,i:12,luce:"Luce forte",umid:"Normale",art:"round",c:["#2A5A36","#4C8A55"],tip:"Odia gli spifferi e i cambi di posto. Girala un po' ogni mese verso la luce."},
  benjamin:{n:"Ficus benjamin",l:"Ficus benjamina",e:6,i:10,luce:"Luce forte",umid:"Normale",art:"coin",c:["#2E6A3A","#7FB25E"],tip:"Perde foglie se lo sposti o se sente freddo: poi ricresce."},
  spatifillo:{n:"Spatifillo",l:"Spathiphyllum wallisii",e:5,i:8,luce:"Mezz'ombra",umid:"Ama l'umidità",art:"monstera",c:["#2A6A3C","#4E9A5E"],tip:"Quando ha sete abbassa le foglie: dopo l'acqua si rialza in poche ore."},
  calathea:{n:"Calathea",l:"Goeppertia",e:5,i:8,luce:"Mezz'ombra",umid:"Molta umidità",art:"round",c:["#3D6B47","#A8C79A"],tip:"Meglio acqua a temperatura ambiente, senza calcare. Punte secche = aria troppo secca."},
  maranta:{n:"Maranta",l:"Maranta leuconeura",e:5,i:8,luce:"Mezz'ombra",umid:"Molta umidità",art:"round",c:["#2F5E3A","#9BC27A"],tip:"La sera chiude le foglie verso l'alto: è normale, \"prega\"."},
  aloe:{n:"Aloe vera",l:"Aloe vera",e:14,i:30,luce:"Sole",umid:"Aria secca",art:"spike",c:["#5E8F6A","#9EC1A3"],tip:"Terra per cactus e vaso con il buco. In inverno una volta al mese."},
  cactus:{n:"Cactus",l:"Cactaceae",e:21,i:40,luce:"Sole pieno",umid:"Aria secca",art:"cactus",c:["#3E7A4A","#6FA36E"],tip:"Da novembre a febbraio quasi a secco: è il suo riposo."},
  succulenta:{n:"Piante grasse",l:"Echeveria, Crassula e simili",e:12,i:25,luce:"Sole",umid:"Aria secca",art:"coin",c:["#5C8F78","#9CC3A8"],tip:"Annaffia solo quando la terra è asciutta del tutto, poi bagna bene e lascia scolare."},
  crassula:{n:"Albero di giada",l:"Crassula ovata",e:12,i:25,luce:"Sole",umid:"Aria secca",art:"coin",c:["#3F7A4E","#86B97A"],tip:"Foglie raggrinzite = ha sete. Foglie molli e trasparenti = troppa acqua."},
  orchidea:{n:"Orchidea",l:"Phalaenopsis",e:7,i:10,luce:"Luce indiretta",umid:"Ama l'umidità",art:"orchid",c:["#2E6640","#D07AB0"],tip:"Immergi il vaso 10 minuti in acqua e lascia scolare bene. Radici argentate = ha sete."},
  pilea:{n:"Pilea",l:"Pilea peperomioides",e:7,i:12,luce:"Luce indiretta forte",umid:"Normale",art:"coin",c:["#3F8A4A","#7DBA6A"],tip:"Girala ogni settimana, così cresce dritta e non verso la finestra."},
  peperomia:{n:"Peperomia",l:"Peperomia obtusifolia",e:10,i:16,luce:"Luce indiretta",umid:"Normale",art:"coin",c:["#2D6A3A","#6BAE5C"],tip:"Foglie carnose: tiene l'acqua, meglio poca che troppa."},
  felce:{n:"Felce",l:"Nephrolepis exaltata",e:3,i:5,luce:"Mezz'ombra",umid:"Molta umidità",art:"fern",c:["#3B7A3A","#7FB55B"],tip:"Terra sempre appena umida. Ottima in bagno se c'è luce."},
  chlorophytum:{n:"Falangio",l:"Chlorophytum comosum",e:6,i:10,luce:"Luce indiretta",umid:"Normale",art:"spike",c:["#3C7A3E","#C9DE9A"],tip:"Fa piantine figlie sui rami: si staccano e si mettono in un vasetto."},
  dracena:{n:"Dracena",l:"Dracaena fragrans",e:9,i:14,luce:"Luce indiretta",umid:"Normale",art:"spike",c:["#2F5F38","#9DBE5E"],tip:"Punte marroni spesso vengono dal calcare: meglio acqua lasciata riposare una notte."},
  yucca:{n:"Yucca",l:"Yucca elephantipes",e:10,i:21,luce:"Sole",umid:"Aria secca",art:"spike",c:["#2F6640","#7FAE6B"],tip:"Resiste a tutto tranne all'acqua ferma nel sottovaso."},
  kentia:{n:"Kentia",l:"Howea forsteriana",e:7,i:12,luce:"Luce indiretta",umid:"Normale",art:"fern",c:["#2C6338","#5D9B5A"],tip:"Palma da appartamento tranquilla. Togli le foglie secche alla base."},
  areca:{n:"Areca",l:"Dypsis lutescens",e:5,i:9,luce:"Luce forte",umid:"Ama l'umidità",art:"fern",c:["#3A7A3F","#9CC066"],tip:"Vuole terra sempre un po' umida e aria non troppo secca."},
  strelitzia:{n:"Strelitzia",l:"Strelitzia nicolai",e:8,i:14,luce:"Luce forte",umid:"Normale",art:"spike",c:["#2B5E3E","#5D9B6B"],tip:"Le foglie si strappano da sole: è normale, non è malata."},
  anthurium:{n:"Anthurium",l:"Anthurium andraeanum",e:6,i:10,luce:"Luce indiretta",umid:"Ama l'umidità",art:"monstera",c:["#245A33","#D6453F"],tip:"Fiorisce di più con molta luce, ma niente sole diretto."},
  alocasia:{n:"Alocasia",l:"Alocasia",e:5,i:9,luce:"Luce indiretta forte",umid:"Molta umidità",art:"round",c:["#1F4A30","#4C8058"],tip:"D'inverno può perdere foglie e riposare: annaffia meno e aspetta."},
  edera:{n:"Edera",l:"Hedera helix",e:5,i:9,luce:"Luce indiretta",umid:"Normale",art:"trailing",c:["#2B5A33","#7DAA5A"],tip:"Preferisce il fresco: lontana dai termosifoni."},
  tradescantia:{n:"Tradescantia",l:"Tradescantia zebrina",e:5,i:9,luce:"Luce forte",umid:"Normale",art:"trailing",c:["#5A4A7A","#9FB8C9"],tip:"Più luce ha, più i colori diventano accesi."},
  begonia:{n:"Begonia",l:"Begonia",e:5,i:8,luce:"Luce indiretta",umid:"Ama l'umidità",art:"round",c:["#3A5E3E","#C25C7A"],tip:"Bagna la terra, non le foglie: si macchiano."},
  ciclamino:{n:"Ciclamino",l:"Cyclamen persicum",e:4,i:5,luce:"Luce, ambiente fresco",umid:"Normale",art:"orchid",c:["#2E5E3A","#E05A8A"],tip:"Annaffia dal sottovaso e svuotalo dopo 15 minuti. Ama il fresco."},
  stellanatale:{n:"Stella di Natale",l:"Euphorbia pulcherrima",e:5,i:6,luce:"Luce forte",umid:"Normale",art:"round",c:["#2F5E3A","#C8323A"],tip:"Teme freddo e spifferi. Annaffia quando la terra in superficie è asciutta."},
  basilico:{n:"Basilico",l:"Ocimum basilicum",e:2,i:4,luce:"Sole",umid:"Normale",art:"coin",c:["#3E8A3A","#79C25A"],tip:"Togli i fiori appena spuntano: le foglie restano più profumate."},
  rosmarino:{n:"Rosmarino",l:"Salvia rosmarinus",e:7,i:14,luce:"Sole pieno",umid:"Aria secca",art:"fern",c:["#3E6A50","#7FA58C"],tip:"Odia i ristagni: vaso di coccio e terra che drena."},
  menta:{n:"Menta",l:"Mentha",e:3,i:6,luce:"Sole o mezz'ombra",umid:"Normale",art:"coin",c:["#3F8F4A","#86CC6A"],tip:"Cresce tantissimo: meglio da sola in un vaso."},
  bonsai:{n:"Bonsai",l:"Ficus ginseng e simili",e:3,i:5,luce:"Luce forte",umid:"Ama l'umidità",art:"coin",c:["#2E6A3A","#5E9E52"],tip:"Vaso piccolo, si asciuga in fretta: controlla spesso la terra."},
  altro:{n:"Altra pianta",l:"Tipo non in elenco",e:7,i:10,luce:"Luce indiretta",umid:"Normale",art:"monstera",c:["#356B42","#5E9A63"],tip:"Tocca la terra con un dito: se i primi 2–3 cm sono asciutti, è ora di annaffiare. Puoi cambiare i giorni quando vuoi."}
};

/* Collega i nomi scientifici restituiti dal riconoscimento (Pl@ntNet) alle nostre schede.
   Prima la specie esatta, poi il genere, poi la famiglia. */
window.ABBINA = {
  specie: {"Dracaena trifasciata":"sansevieria","Sansevieria trifasciata":"sansevieria","Ficus elastica":"ficus","Ficus lyrata":"ficuslyrata","Ficus benjamina":"benjamin","Ficus microcarpa":"bonsai","Crassula ovata":"crassula","Euphorbia pulcherrima":"stellanatale","Salvia rosmarinus":"rosmarino","Rosmarinus officinalis":"rosmarino","Aloe vera":"aloe","Spathiphyllum wallisii":"spatifillo"},
  genere: {Monstera:"monstera",Epipremnum:"pothos",Scindapsus:"pothos",Philodendron:"filodendro",Thaumatophyllum:"filodendro",Sansevieria:"sansevieria",Zamioculcas:"zamioculcas",Ficus:"ficus",Spathiphyllum:"spatifillo",Goeppertia:"calathea",Calathea:"calathea",Ctenanthe:"calathea",Stromanthe:"calathea",Maranta:"maranta",Aloe:"aloe",Echeveria:"succulenta",Sedum:"succulenta",Haworthia:"succulenta",Haworthiopsis:"succulenta",Kalanchoe:"succulenta",Graptopetalum:"succulenta",Crassula:"crassula",Phalaenopsis:"orchidea",Pilea:"pilea",Peperomia:"peperomia",Nephrolepis:"felce",Asplenium:"felce",Adiantum:"felce",Chlorophytum:"chlorophytum",Dracaena:"dracena",Yucca:"yucca",Howea:"kentia",Dypsis:"areca",Chamaedorea:"kentia",Strelitzia:"strelitzia",Anthurium:"anthurium",Alocasia:"alocasia",Colocasia:"alocasia",Hedera:"edera",Tradescantia:"tradescantia",Begonia:"begonia",Cyclamen:"ciclamino",Ocimum:"basilico",Mentha:"menta"},
  famiglia: {Cactaceae:"cactus",Crassulaceae:"succulenta",Orchidaceae:"orchidea",Nephrolepidaceae:"felce",Polypodiaceae:"felce",Pteridaceae:"felce",Aspleniaceae:"felce",Arecaceae:"kentia",Marantaceae:"calathea"}
};
