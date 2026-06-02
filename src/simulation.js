import { Planet } from "./planet.js";
import { orbitalPositionAtTime } from "./orbit.js";
import { Star } from "./star.js";

const VALID_TIME_SCALES = new Set([1, 10, 100]);

export class Simulation {
  constructor({ star, planets }) {
    this.star = star;
    this.planets = planets;
    this.simulationTimeSeconds = 0;
    this.timeScale = 1;
    this.paused = false;
    this.cachedPlanetStates = null;
    this.cachedAtTimeSeconds = null;
  }

  static fromSystemData(systemData) {
    const star = Star.fromData(systemData.star);
    const planets = systemData.planets.map((planetData) => Planet.fromData(planetData));
    return new Simulation({ star, planets });
  }

  setTimeScale(nextScale) {
    if (!VALID_TIME_SCALES.has(nextScale)) {
      throw new Error(`Unsupported time scale: ${nextScale}. Expected one of: 1, 10, 100.`);
    }

    this.timeScale = nextScale;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.cachedPlanetStates = null;
    this.cachedAtTimeSeconds = null;
  }

  togglePause() {
    if (this.paused) {
      this.resume();
      return;
    }

    this.pause();
  }

  step(deltaRealSeconds) {
    if (!this.paused && deltaRealSeconds > 0) {
      this.simulationTimeSeconds += deltaRealSeconds * this.timeScale;
      this.cachedPlanetStates = null;
      this.cachedAtTimeSeconds = null;
    }

    return this.getPlanetStates();
  }

  getPlanetStates() {
    if (this.cachedPlanetStates && this.cachedAtTimeSeconds === this.simulationTimeSeconds) {
      return this.cachedPlanetStates;
    }

    const states = this.planets.map((planet) => ({
      name: planet.name,
      type: planet.type,
      orbit: orbitalPositionAtTime(planet, this.star.massSolar, this.simulationTimeSeconds),
      estimatedTemperatureK: planet.estimatedTemperatureK,
      habitability: planet.habitability
    }));

    this.cachedPlanetStates = states;
    this.cachedAtTimeSeconds = this.simulationTimeSeconds;

    return states;
  }

  getState() {
    return {
      paused: this.paused,
      timeScale: this.timeScale,
      simulationTimeSeconds: this.simulationTimeSeconds,
      planets: this.getPlanetStates()
    };
  }
}
