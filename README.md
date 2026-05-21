# Giornate sportive scolastiche

Web application statica per gestire giornate sportive scolastiche con ruoli, partecipanti, risultati e classifiche.

## Avvio

Apri `index.html` nel browser, oppure servi la cartella con un qualsiasi server statico.

L'app usa Firebase Auth per l'accesso di amministratori e docenti, mentre gli spettatori possono entrare senza autenticazione. I dati applicativi sono salvati in Firestore nello snapshot `appData/main`; `localStorage` resta usato solo per la sessione di login del browser.

## Funzionalita principali

- Login Firebase, accesso spettatore e strumenti cloud per amministratori.
- Ruoli `Administrator`, `Docente` e `Spettatore/Ospite`.
- Pannello amministratore in header con conteggio scritture Firebase e controllo per sospendere o riabilitare l'accesso ospite.
- Creazione, modifica ed eliminazione delle giornate sportive per amministratori.
- Configurazione di sport, prove, finalisti della velocita, anni e sezioni.
- Gestione partecipanti per sport, anno, sezione e sesso.
- Inserimento risultati inline per Vortex, Salto in lungo, Resistenza, Velocita e Staffetta.
- Qualifiche e finali separate per la Velocita.
- Classifiche automatiche con sezioni accorpate per anno e sesso.

## Persistenza

- Firestore e l'unica source of truth dei dati sportivi condivisi tra dispositivi.
- Gli utenti non vengono salvati nello snapshot applicativo: credenziali e profili vivono in Firebase Auth e nella collection Firestore dedicata ai profili.
- Lo snapshot `appData/main` mantiene `users` vuoto per compatibilita di schema e per evitare dati legacy o password locali.
