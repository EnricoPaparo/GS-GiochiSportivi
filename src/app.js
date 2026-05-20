import { restoreSession } from "./auth/authService.js";
import { render as renderUi } from "./ui/render.js";
import { bindEventHandlers } from "./events/eventHandlers.js";

const app = document.querySelector("#app");
function render() {
  renderUi(app);
}

restoreSession();
bindEventHandlers(app, render);
render();



