export function renderUsersSection() {
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Firestore</p>
          <h2>Strumenti amministrazione cloud</h2>
        </div>
        <span class="role-pill">cloud-ready</span>
      </div>
      <p class="muted" style="margin-top: 0;">
        La piattaforma utilizza Firebase Auth per l'accesso e Firestore come database cloud principale. Questi strumenti servono per backup, restore e sincronizzazioni manuali avanzate.
      </p>

      <div class="inline" style="margin-bottom: 12px;">
        <button class="btn" type="button" data-action="backup-firestore">Backup su Firestore</button>
        <button class="btn secondary" type="button" data-action="restore-firestore">Ripristina da Firestore</button>
      </div>

      <div class="inline" style="margin-bottom: 12px;">
        <button class="btn secondary" type="button" data-action="push-sports-days-firestore">Invia giornate</button>
        <button class="btn secondary" type="button" data-action="pull-sports-days-firestore">Carica giornate</button>
      </div>

      <div class="inline" style="margin-bottom: 12px;">
        <button class="btn secondary" type="button" data-action="push-sports-firestore">Invia sport</button>
        <button class="btn secondary" type="button" data-action="pull-sports-firestore">Carica sport</button>
      </div>

      <div class="inline" style="margin-bottom: 12px;">
        <button class="btn secondary" type="button" data-action="push-years-firestore">Invia anni</button>
        <button class="btn secondary" type="button" data-action="pull-years-firestore">Carica anni</button>
      </div>

      <div class="inline" style="margin-bottom: 12px;">
        <button class="btn secondary" type="button" data-action="push-sections-firestore">Invia sezioni</button>
        <button class="btn secondary" type="button" data-action="pull-sections-firestore">Carica sezioni</button>
      </div>

      <div class="inline" style="margin-bottom: 12px;">
        <button class="btn secondary" type="button" data-action="push-participants-firestore">Invia partecipanti</button>
        <button class="btn secondary" type="button" data-action="pull-participants-firestore">Carica partecipanti</button>
      </div>

      <div class="inline">
        <button class="btn secondary" type="button" data-action="push-relay-teams-firestore">Invia squadre</button>
        <button class="btn secondary" type="button" data-action="pull-relay-teams-firestore">Carica squadre</button>
      </div>
    </section>
  `;
}
