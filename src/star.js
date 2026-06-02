import {
  getLuminosityFromMass,
  getRadiusFromMass,
  getTemperatureFromMass
} from "./stellar-distribution.js";
export const G = 6.67430e-11;
export const SOLAR_MASS_KG = 1.98847e30;
export const AU_IN_METERS = 1.495978707e11;

export class Star {
  constructor({ name, spectralType, massSolar, luminositySolar, temperatureK, radiusSolar }) {
    this.name = name;
    this.spectralType = spectralType;
    this.massSolar = massSolar;
    this.luminositySolar = luminositySolar ?? getLuminosityFromMass(massSolar);
    this.radiusSolar = radiusSolar ?? getRadiusFromMass(massSolar);
    this.temperatureK = temperatureK ?? getTemperatureFromMass(massSolar);
  }

  getMassKg() {
    return this.massSolar * SOLAR_MASS_KG;
  }

  getGravitationalParameter() {
    return G * this.getMassKg();
  }

  static fromData(data) {
    return new Star(data);
  }
}
