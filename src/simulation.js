import { Planet } from "./planet.js";
import { orbitalPositionAtTime } from "./orbit.js";
import { Star } from "./star.js";

const MAX_DELTA_REAL_SECONDS = 0.25;
const ORBIT_SAMPLE_COUNT = 96;
const DEFAULT_STAR_POSITION = { x: 0, y: 0, z: 0 };

const addPositions = (a, b) => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z
});

const scalePosition = (position, factor) => ({
  x: position.x * factor,
  y: position.y * factor,
  z: position.z * factor
});

const sampleOrbitPathAU = (planet, starMassSolar, primaryPosition, periodSeconds) =>
  Array.from({ length: ORBIT_SAMPLE_COUNT + 1 }, (_, sample) => {
    const sampleTime = (periodSeconds * sample) / ORBIT_SAMPLE_COUNT;
    const orbit = orbitalPositionAtTime(planet, starMassSolar, sampleTime);
    return addPositions(primaryPosition, { x: orbit.x, y: orbit.y, z: orbit.z });
  });

export class Simulation {
  constructor({ stars, star, planets }) {
    this.stars = stars?.length ? stars : [star];
    this.star = this.stars[0];
    this.planets = planets;
    this.simulationTimeSeconds = 0;
    this.timeScale = 1;
    this.paused = false;
    this.cachedState = null;
    this.cachedAtTimeSeconds = null;
  }

  static fromSystemData(systemData) {
    const stars = (systemData.stars || [systemData.star]).map((starData) => Star.fromData(starData));
    const planets = systemData.planets.map((planetData) => Planet.fromData(planetData));
    return new Simulation({ stars, planets });
  }

  invalidateCache() {
    this.cachedState = null;
    this.cachedAtTimeSeconds = null;
  }

  setTimeScale(nextScale) {
    if (!Number.isFinite(nextScale) || nextScale < 0) {
      throw new Error(`Unsupported time scale: ${nextScale}. Expected a non-negative number.`);
    }

    this.timeScale = nextScale;
    this.invalidateCache();
  }

  pause() {
    this.paused = true;
    this.invalidateCache();
  }

  resume() {
    this.paused = false;
    this.invalidateCache();
  }

  togglePause() {
    if (this.paused) {
      this.resume();
      return;
    }

    this.pause();
  }

  step(deltaRealSeconds) {
    if (!Number.isFinite(deltaRealSeconds)) {
      throw new Error(`Invalid deltaRealSeconds: ${deltaRealSeconds}`);
    }

    if (!this.paused && deltaRealSeconds > 0 && this.timeScale > 0) {
      this.simulationTimeSeconds += Math.min(deltaRealSeconds, MAX_DELTA_REAL_SECONDS) * this.timeScale;
      this.invalidateCache();
    }

    return this.getState();
  }

  getPrimaryPositionAU(starStates) {
    return starStates.find((star) => star.name === this.star.name)?.positionAU || DEFAULT_STAR_POSITION;
  }

  getStarStates() {
    const primaryPosition = { ...DEFAULT_STAR_POSITION };
    const primary = {
      name: this.star.name,
      spectralType: this.star.spectralType,
      massSolar: this.star.massSolar,
      luminositySolar: this.star.luminositySolar,
      radiusSolar: this.star.radiusSolar,
      temperatureK: this.star.temperatureK,
      positionAU: primaryPosition
    };
    const companionStates = [];

    for (const companion of this.stars.slice(1)) {
      if (!companion.orbit) {
        continue;
      }

      const centralMassSolar = this.star.massSolar + companion.massSolar;
      const relativeOrbit = orbitalPositionAtTime(
        {
          name: companion.name,
          semiMajorAxisAU: companion.orbit.semiMajorAxisAU,
          eccentricity: companion.orbit.eccentricity,
          initialMeanAnomaly: companion.orbit.initialMeanAnomaly ?? 0,
          inclinationDeg: companion.orbit.inclinationDeg ?? 0,
          longitudeAscendingNodeDeg: companion.orbit.longitudeAscendingNodeDeg ?? 0,
          argumentOfPeriapsisDeg: companion.orbit.argumentOfPeriapsisDeg ?? 0
        },
        centralMassSolar,
        this.simulationTimeSeconds
      );
      const relativePosition = {
        x: relativeOrbit.x,
        y: relativeOrbit.y,
        z: relativeOrbit.z
      };
      const primaryShare = companion.massSolar / centralMassSolar;
      const companionShare = this.star.massSolar / centralMassSolar;

      primary.positionAU = addPositions(primary.positionAU, scalePosition(relativePosition, -primaryShare));
      companionStates.push({
        name: companion.name,
        spectralType: companion.spectralType,
        massSolar: companion.massSolar,
        luminositySolar: companion.luminositySolar,
        radiusSolar: companion.radiusSolar,
        temperatureK: companion.temperatureK,
        orbit: relativeOrbit,
        positionAU: scalePosition(relativePosition, companionShare)
      });
    }

    return [primary, ...companionStates];
  }

  getPlanetStates(starStates = this.getStarStates()) {
    const primaryPosition = this.getPrimaryPositionAU(starStates);

    return this.planets.map((planet) => {
      const orbit = orbitalPositionAtTime(planet, this.star.massSolar, this.simulationTimeSeconds);
      const relativePositionAU = { x: orbit.x, y: orbit.y, z: orbit.z };
      return {
        name: planet.name,
        type: planet.type,
        massEarth: planet.massEarth,
        radiusEarth: planet.radiusEarth,
        semiMajorAxisAU: planet.semiMajorAxisAU,
        eccentricity: planet.eccentricity,
        orbit,
        relativePositionAU,
        primaryPositionAU: primaryPosition,
        positionAU: addPositions(primaryPosition, relativePositionAU),
        orbitPathAU: sampleOrbitPathAU(planet, this.star.massSolar, primaryPosition, orbit.periodSeconds),
        estimatedTemperatureK: planet.estimatedTemperatureK,
        habitability: planet.habitability,
        atmosphere: planet.atmosphere
      };
    });
  }

  getState() {
    if (this.cachedState && this.cachedAtTimeSeconds === this.simulationTimeSeconds) {
      return this.cachedState;
    }

    const stars = this.getStarStates();
    const states = this.planets.map((planet) => ({
      name: planet.name,
      type: planet.type,
      orbit: orbitalPositionAtTime(planet, this.star.massSolar, this.simulationTimeSeconds),
      estimatedTemperatureK: planet.estimatedTemperatureK,
      habitability: planet.habitability
    }));
    const planets = this.getPlanetStates(stars);

    this.cachedState = {
      paused: this.paused,
      timeScale: this.timeScale,
      simulationTimeSeconds: this.simulationTimeSeconds,
      stars,
      planets,
      planetStates: states
    };
    this.cachedAtTimeSeconds = this.simulationTimeSeconds;

    return this.cachedState;
  }
}
