"""Ogni ora: a ogni telefono iscritto manda il promemoria del mattino, all'ora che ha scelto,
solo se almeno una pianta ha sete. Stesse regole dell'app (app.js: ogni, mancano)."""
import datetime as dt
import json

from py_vapid import Vapid
from pywebpush import WebPushException, webpush

from comune import adesso, database


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
    for doc in db.collection("telefoni").stream():
        t = doc.to_dict()
        if t.get("inviato") == oggi:
            continue
        try:
            ora_scelta = int(str(t.get("ora", "09:00")).split(":")[0])
        except ValueError:
            ora_scelta = 9
        if ora.hour < ora_scelta:
            continue
        sete = da_annaffiare(t, ora.date())
        if sete:
            corpo = {"title": "Fronda", "body": testo(sete), "tag": f"acqua-{oggi}"}
            try:
                webpush(json.loads(t["sub"]), json.dumps(corpo), vapid_private_key=vapid,
                        vapid_claims={"sub": "https://higghy01.github.io/fronda/"}, ttl=6 * 3600)
                mandati += 1
            except WebPushException as e:
                stato = getattr(e.response, "status_code", None)
                if stato in (404, 410):
                    doc.reference.delete()
                    print("Iscrizione scaduta, tolta.")
                    continue
                print(f"Invio non riuscito ({stato}).")
                continue
        doc.reference.update({"inviato": oggi})
    print(f"Promemoria mandati: {mandati}.")


if __name__ == "__main__":
    main()
