# Fronda

App per seguire le piante di casa: quando annaffiarle, consigli in italiano e le proprie foto.
Si apre dal browser dell'iPhone e si aggiunge alla schermata Home (Condividi → "Aggiungi alla schermata Home").

- Piante e foto restano **solo sul telefono** (IndexedDB). Dalle Impostazioni si salva una copia di sicurezza.
- Le cure stanno in `cure.js` (giorni d'estate e d'inverno per ogni tipo di pianta).
- `sw.js` tiene una copia per usarla senza rete: a ogni modifica alzare `VERSIONE` e il `?v=` dei file in `index.html`.

Pubblicazione: GitHub Pages dal ramo `main` (Settings → Pages).
