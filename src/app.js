import { generateStarSystem } from "./system-generator.js";
import { Simulation } from "./simulation.js";
import { adaptToThreeJS } from "./render/adapters.js";
import { createThreeRenderer } from "./render/three-renderer.js";

const app = document.querySelector("#app");
const stats = document.querySelector("#stats");
const systemName = document.querySelector("#system-name");
const pauseToggle = document.querySelector("#pause-toggle");
const focusSelect = document.querySelector("#focus-select");

let seed = Math.floor(Math.random() * 1_000_000);
let system = generateStarSystem({ seed });
let simulation = Simulation.fromSystemData(system);
let lastTimestamp = performance.now();

const renderer = createThreeRenderer({
  container: app,
  onSelect(name) {
    focusSelect.value = name;
    renderer.focus(name);
  }
});

const formatYears = (seconds) => (seconds / (365.25 * 24 * 60 * 60)).toFixed(2);

const setSystem = (nextSeed) => {
  seed = nextSeed;
  system = generateStarSystem({ seed });
  simulation = Simulation.fromSystemData(system);
  systemName.textContent = `${system.systemName} · seed ${seed}`;
  pauseToggle.textContent = "Pause";

  focusSelect.replaceChildren(
    ...system.stars.map((star) => new Option(`Étoile · ${star.name}`, star.name)),
    ...system.planets.map((planet) => new Option(`Planète · ${planet.name}`, planet.name))
  );
};

const updateStats = (state) => {
  const stableLimit = system.stability?.primaryOrbitLimitAU;
  stats.innerHTML = `
    <span>Temps simulé : ${formatYears(state.simulationTimeSeconds)} années</span>
    <span>Étoiles : ${state.stars.length} · Planètes : ${state.planets.length}</span>
    <span>Zone habitable : ${system.habitableZone.innerAU.toFixed(3)}–${system.habitableZone.outerAU.toFixed(3)} UA</span>
    <span>Limite stable primaire : ${stableLimit ? `${stableLimit.toFixed(3)} UA` : "non contrainte"}</span>
  `;
};

document.querySelector("#regenerate").addEventListener("click", () => {
  setSystem(Math.floor(Math.random() * 1_000_000));
  renderer.focusOrigin();
});

pauseToggle.addEventListener("click", () => {
  simulation.togglePause();
  pauseToggle.textContent = simulation.paused ? "Reprendre" : "Pause";
});

document.querySelectorAll("[data-speed]").forEach((button) => {
  button.addEventListener("click", () => {
    simulation.setTimeScale(Number(button.dataset.speed));
  });
});

document.querySelector("#focus-origin").addEventListener("click", () => {
  renderer.focusOrigin();
});

focusSelect.addEventListener("change", () => {
  renderer.focus(focusSelect.value);
});

const animate = (timestamp) => {
  const deltaSeconds = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;
  const state = simulation.step(deltaSeconds);
  const renderState = adaptToThreeJS(state, { distanceScale: 20 });
  renderer.update(renderState);
  renderer.render();
  updateStats(state);
  requestAnimationFrame(animate);
};

setSystem(seed);
requestAnimationFrame(animate);
