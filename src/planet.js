export const EARTH_MASS_KG = 5.9722e24;
const EARTH_DENSITY_GCM3 = 5.51;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const getCompressionFactor = (massEarth) =>
  massEarth > 2 ? 1 + Math.min(0.35, Math.log10(massEarth) * 0.2) : 1;

export class Planet {
  constructor({
    name,
    type,
    massEarth,
    radiusEarth,
    densityGcm3,
    semiMajorAxisAU,
    eccentricity,
    atmosphere,
    estimatedTemperatureK,
    habitability,
    initialMeanAnomaly = 0,
    inclinationDeg = 0,
    longitudeAscendingNodeDeg = 0,
    argumentOfPeriapsisDeg = 0
  }) {
    if (!Number.isFinite(massEarth) || massEarth <= 0) {
      throw new Error(`Invalid massEarth for planet ${name}`);
    }

    if (!Number.isFinite(radiusEarth) || radiusEarth <= 0) {
      throw new Error(`Invalid radiusEarth for planet ${name}`);
    }

    if (!Number.isFinite(semiMajorAxisAU) || semiMajorAxisAU <= 0) {
      throw new Error(`Invalid semiMajorAxisAU for planet ${name}`);
    }

    if (!Number.isFinite(eccentricity) || eccentricity < 0 || eccentricity >= 1) {
      throw new Error(`Invalid eccentricity for planet ${name}`);
    }

    this.name = name;
    this.type = type;
    this.massEarth = massEarth;
    this.radiusEarth = radiusEarth;
    this.densityGcm3 =
      densityGcm3 ??
      clamp((EARTH_DENSITY_GCM3 * massEarth * getCompressionFactor(massEarth)) / (radiusEarth ** 3), 0.2, 20);
    this.semiMajorAxisAU = semiMajorAxisAU;
    this.eccentricity = eccentricity;
    this.atmosphere = atmosphere;
    this.estimatedTemperatureK = estimatedTemperatureK;
    this.habitability = habitability;
    this.initialMeanAnomaly = initialMeanAnomaly;
    this.inclinationDeg = inclinationDeg;
    this.longitudeAscendingNodeDeg = longitudeAscendingNodeDeg;
    this.argumentOfPeriapsisDeg = argumentOfPeriapsisDeg;
  }

  getMassKg() {
    return this.massEarth * EARTH_MASS_KG;
  }

  static fromData(data) {
    return new Planet(data);
  }
}
