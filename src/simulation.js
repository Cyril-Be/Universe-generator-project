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
  }

  togglePause() {
    this.paused = !this.paused;
  }

  step(deltaRealSeconds) {
    if (!this.paused && deltaRealSeconds > 0) {
      this.simulationTimeSeconds += deltaRealSeconds * this.timeScale;
    }

    return this.getPlanetStates();
  }

  getPlanetStates() {
    return this.planets.map((planet) => ({
      name: planet.name,
      type: planet.type,
      orbit: orbitalPositionAtTime(planet, this.star.massSolar, this.simulationTimeSeconds),
      estimatedTemperatureK: planet.estimatedTemperatureK,
      habitability: planet.habitability
    }));
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
