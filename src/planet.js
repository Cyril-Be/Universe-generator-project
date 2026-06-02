export const EARTH_MASS_KG = 5.9722e24;

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
    this.name = name;
    this.type = type;
    this.massEarth = massEarth;
    this.radiusEarth = radiusEarth;
    this.densityGcm3 = densityGcm3;
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
