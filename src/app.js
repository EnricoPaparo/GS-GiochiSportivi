import { restoreSession, setSession } from "./auth/authService.js";
import { listenFirebaseAuth, logoutFirebaseUser, mapFirebaseUserToSession } from "./auth/firebaseAuthService.js";
import { getFirebaseUserProfile } from "./auth/firebaseUserService.js";
import { bootstrapFirestoreFirstDb } from "./data/firestoreBootstrapRepository.js";
import { render as renderUi } from "./ui/render.js";
import { bindEventHandlers } from "./events/eventHandlers.js";
import { bindFirestoreBackupHandlers } from "./events/firestoreBackupHandlers.js";
import { bindRouteChange, restoreRouteFromUrl, syncRouteToUrl } from "./routing.js";
import { state } from "./state.js";

const app = document.querySelector("#app");
function render() {
  renderUi(app);
  syncRouteToUrl();
}

function renderBootstrapError() {
  app.innerHTML = `
    <main class="auth-page">
      <section class="auth-panel">
        <p class="eyebrow">Firestore non disponibile</p>
        <h1>Impossibile caricare i dati</h1>
        <p>Controlla la connessione e ricarica la pagina. Nessun dato locale verra usato come fallback.</p>
      </section>
    </main>
  `;
}

async function activateFirebaseSession(firebaseUser) {
  const profile = await getFirebaseUserProfile(firebaseUser.uid);

  if (!profile?.role) {
    await logoutFirebaseUser();
    setSession(null);
    state.view = "auth";
    render();
    return;
  }

  setSession({
    ...mapFirebaseUserToSession(firebaseUser),
    provider: "firebase",
    role: profile.role
  });

  if (state.view === "auth") {
    state.view = "dashboard";
  }

  restoreRouteFromUrl();
  render();
}

async function initializeApplication() {
  const bootstrap = await bootstrapFirestoreFirstDb();
  if (bootstrap.error) {
    renderBootstrapError();
    return;
  }

  restoreSession();
  restoreRouteFromUrl();

  listenFirebaseAuth(async (firebaseUser) => {
    if (!firebaseUser) {
      if (state.user?.provider === "firebase") {
        setSession(null);
        state.view = "auth";
        render();
      }
      return;
    }

    await activateFirebaseSession(firebaseUser);
  });

  bindEventHandlers(app, render);
  bindFirestoreBackupHandlers(app, render);
  bindRouteChange(render);

  render();
}

initializeApplication();
