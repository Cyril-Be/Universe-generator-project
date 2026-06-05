import assert from "node:assert/strict";

import { generateStarSystem } from "../src/system-generator.js";
import { Simulation } from "../src/simulation.js";
import { adaptToThreeJS } from "../src/render/adapters.js";

const isFinitePosition = (position) =>
  Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z);

for (let seed = 1; seed <= 100; seed += 1) {
  const system = generateStarSystem({ seed });
  assert.ok(system.stars.length >= 1);
  assert.ok(system.habitableZone.innerAU > 0);
  assert.ok(system.habitableZone.outerAU > system.habitableZone.innerAU);

  const stableLimit = system.stability.primaryOrbitLimitAU;
  for (const planet of system.planets) {
    assert.ok(planet.semiMajorAxisAU > 0);
    assert.ok(planet.eccentricity >= 0 && planet.eccentricity < 1);
    if (stableLimit) {
      assert.ok(planet.semiMajorAxisAU * (1 + planet.eccentricity) <= stableLimit);
    }
  }

  const simulation = Simulation.fromSystemData(system);
  simulation.setTimeScale(100);
  const state = simulation.step(1 / 60);
  assert.equal(state.timeScale, 100);
  assert.equal(state.stars.length, system.stars.length);
  assert.equal(state.planets.length, system.planets.length);

  for (const star of state.stars) {
    assert.ok(isFinitePosition(star.positionAU));
  }

  for (const planet of state.planets) {
    assert.ok(isFinitePosition(planet.positionAU));
    assert.ok(Number.isFinite(planet.orbit.periodSeconds));
  }

  const renderState = adaptToThreeJS(state, { distanceScale: 20 });
  assert.equal(renderState.stars.length, state.stars.length);
  assert.equal(renderState.planets.length, state.planets.length);
}
