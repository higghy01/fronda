"""Ogni ora: a ogni telefono iscritto manda il promemoria del mattino, all'ora che ha scelto,
solo se almeno una pianta ha sete. Stesse regole dell'app (app.js: ogni, mancano)."""
import datetime as dt
import json
import time
from urllib.parse import urlparse

from py_vapid import Vapid
from pywebpush import WebPushException, webpush

from comune import adesso, database

# Gli unici servizi a cui si mandano gli avvisi (Apple, Google, Mozilla, Microsoft): le regole del database fanno lo stesso controllo.
SERVIZI = ("web.push.apple.com", "fcm.googleapis.com", "updates.push.services.mozilla.com")
# GitHub ferma il programma dopo 5 minuti: ci si ferma prima, gli altri telefoni al giro dopo.
TEMPO_MAX = 4 * 60


def iscrizione(t):
    """L'iscrizione del telefono, solo se punta a un servizio di notifica vero; altrimenti None."""
    try:
        sub = json.loads(t["sub"])
        indirizzo = urlparse(sub["endpoint"])
    except (KeyError, TypeError, ValueError):
        return None
    host = indirizzo.hostname or ""
    if indirizzo.scheme == "https" and (host in SERVIZI or host.endswith(".notify.windows.com")):
        return sub
    return None


def inverno(giorno):
    return giorno.month >= 10 or giorno.month <= 3


def da_annaffiare(t, oggi):
    stag = t.get("stagioni", True) and inverno(oggi)
    sete = []
    for p in t.get("piante", []):
        try:
            ultima = dt.date.fromisoformat(p["l"])
            ogni = int(p["i"] if stag else p["e"])
        except (KeyError, ValueError, TypeError):
            continue
        if (oggi - ultima).days >= ogni:
            sete.append(p.get("n") or "Una pianta")
    return sete


def testo(sete):
    if len(sete) == 1:
        return f"{sete[0]} ha sete oggi"
    if len(sete) <= 3:
        return ", ".join(sete[:-1]) + f" e {sete[-1]} hanno sete oggi"
    return f"{sete[0]}, {sete[1]} e altre {len(sete) - 2} piante hanno sete oggi"


def main():
    db = database()
    priv = db.collection("segreti").document("vapid").get()
    if not priv.exists:
        print("Chiavi delle notifiche mancanti: lanciare prima 'Prepara Firebase'.")
        return
    vapid = Vapid.from_pem(priv.to_dict()["pem"].encode())
    ora = adesso()
    oggi = ora.date().isoformat()
    mandati = 0
    inizio = time.monotonic()
    for doc in db.collection("telefoni").stream():
        if time.monotonic() - inizio > TEMPO_MAX:
            print("Tempo finito: gli altri al prossimo giro.")
            break
        t = doc.to_dict()
        if t.get("inviato") == oggi:
            continue
        sub = iscrizione(t)
        if sub is None:
            doc.reference.delete()
            print("Iscrizione non valida, tolta.")
            continue
        try:
            ora_scelta = int(str(t.get("ora", "09:00")).split(":")[0])
        except ValueError:
            ora_scelta = 9
        if ora.hour < ora_scelta:
            continue
        sete = da_annaffiare(t, ora.date())
        if sete:
            corpo = {"title": "Rigo", "body": testo(sete), "tag": f"acqua-{oggi}"}
            try:
                webpush(sub, json.dumps(corpo), vapid_private_key=vapid,
                        vapid_claims={"sub": "https://higghy01.github.io"}, ttl=6 * 3600, timeout=10)
                mandati += 1
            except WebPushException as e:
                stato = getattr(e.response, "status_code", None)
                if stato in (404, 410):
                    doc.reference.delete()
                    print("Iscrizione scaduta, tolta.")
                    continue
                print(f"Invio non riuscito ({stato}).")
                continue
            except Exception as e:  # rete lenta o servizio giù: si riprova al giro dopo
                print(f"Invio non riuscito ({type(e).__name__}: {str(e)[:120]}).")
                continue
        doc.reference.update({"inviato": oggi})
    print(f"Promemoria mandati: {mandati}.")


if __name__ == "__main__":
    main()
