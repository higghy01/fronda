"""Pezzi in comune ai programmi automatici di Fronda (girano su GitHub)."""
import datetime as dt
import json
import os
import sys
from zoneinfo import ZoneInfo

ROMA = ZoneInfo("Europe/Rome")


def chiave():
    """La chiave dell'account di servizio di Firebase (segreto FIREBASE_CHIAVE). Se manca, esce senza errore."""
    testo = os.environ.get("FIREBASE_CHIAVE", "").strip()
    if not testo:
        print("Manca il segreto FIREBASE_CHIAVE: promemoria non ancora attivi.")
        sys.exit(0)
    return json.loads(testo)


def database():
    import firebase_admin
    from firebase_admin import credentials, firestore
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(chiave()))
    return firestore.client()


def adesso():
    return dt.datetime.now(ROMA)
