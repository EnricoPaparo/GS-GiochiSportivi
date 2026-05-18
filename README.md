# Giornate sportive scolastiche

Web application statica per gestire giornate sportive scolastiche con ruoli, partecipanti, risultati e classifiche.

## Avvio

Apri `index.html` nel browser, oppure servi la cartella con un qualsiasi server statico.

Credenziali iniziali:

- Username: `administrator`
- Password: `administrator`
- Ruolo: `Administrator`

I dati vengono salvati nel `localStorage` del browser nella chiave `giornateSportive.db.v1`.

## Funzionalita principali

- Login, accesso spettatore e sezione `Utenze` per creare, modificare ed eliminare utenti.
- Ruoli `Administrator`, `Docente` e `Spettatore/Ospite`.
- Creazione, modifica ed eliminazione delle giornate sportive per amministratori.
- Configurazione di sport, prove, finalisti della velocita, anni e sezioni.
- Gestione partecipanti per sport, anno, sezione e sesso.
- Inserimento risultati inline per Vortex, Salto in lungo, Staffetta e Velocita.
- Qualifiche e finali separate per la Velocita.
- Classifiche automatiche con sezioni accorpate per anno e sesso.
