"""Prepara Firebase per i promemoria di Fronda, senza passare dalla console:
1. pubblica le regole del database (firestore.rules);
2. crea le chiavi per le notifiche (VAPID) se non ci sono: la privata resta nel database, leggibile solo da qui;
3. scrive il nome del progetto, che serve all'app (config.js)."""
import base64
import pathlib
import sys

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from google.auth.transport.requests import AuthorizedSession
from google.oauth2 import service_account

from comune import chiave, database

API = "https://firebaserules.googleapis.com/v1"


def pubblica_regole(k):
    progetto = k["project_id"]
    cred = service_account.Credentials.from_service_account_info(k, scopes=["https://www.googleapis.com/auth/cloud-platform"])
    s = AuthorizedSession(cred)
    testo = (pathlib.Path(__file__).resolve().parent.parent / "firestore.rules").read_text(encoding="utf-8")
    r = s.post(f"{API}/projects/{progetto}/rulesets", json={"source": {"files": [{"name": "firestore.rules", "content": testo}]}})
    if not r.ok:
        print(f"Regole non accettate ({r.status_code}): {r.text[:600]}")
        sys.exit(1)
    nome = f"projects/{progetto}/releases/cloud.firestore"
    rs = r.json()["name"]
    r = s.patch(f"{API}/{nome}", json={"release": {"name": nome, "rulesetName": rs}})
    if r.status_code == 404:
        r = s.post(f"{API}/projects/{progetto}/releases", json={"name": nome, "rulesetName": rs})
    if not r.ok:
        print(f"Regole non attivate ({r.status_code}): {r.text[:600]}")
        sys.exit(1)
    print("Regole del database: pubblicate.")


def b64(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def chiavi_vapid(db):
    priv_doc = db.collection("segreti").document("vapid")
    if priv_doc.get().exists:
        print("Chiavi delle notifiche: già pronte.")
        return
    p = ec.generate_private_key(ec.SECP256R1())
    privata = p.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()
    pubblica = b64(p.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint))
    priv_doc.set({"pem": privata})
    db.collection("config").document("pubblica").set({"vapid": pubblica})
    print("Chiavi delle notifiche: create.")


def main():
    k = chiave()
    pubblica_regole(k)
    chiavi_vapid(database())
    print(f"PROGETTO={k['project_id']}")


if __name__ == "__main__":
    main()
