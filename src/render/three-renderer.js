import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 30, 70);

const makeLabel = (text) => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = 256;
  canvas.height = 64;
  context.font = "28px sans-serif";
  context.fillStyle = "rgba(255, 255, 255, 0.92)";
  context.textAlign = "center";
  context.fillText(text, canvas.width / 2, 42);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(5, 1.25, 1);
  sprite.position.y = 1.1;
  return sprite;
};

const vectorFromPosition = (position) => new THREE.Vector3(position.x, position.y, position.z);

export class ThreeRenderer {
  constructor({ container, onSelect } = {}) {
    this.container = container || document.body;
    this.onSelect = onSelect;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#020617");
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 4000);
    this.camera.position.copy(DEFAULT_CAMERA_POSITION);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.starMeshes = new Map();
    this.planetMeshes = new Map();
    this.orbitLines = new Map();
    this.selectedName = null;

    this.scene.add(new THREE.AmbientLight("#7a8db8", 0.25));

    this.handleResize = this.handleResize.bind(this);
    this.handleClick = this.handleClick.bind(this);
    window.addEventListener("resize", this.handleResize);
    this.renderer.domElement.addEventListener("click", this.handleClick);
    this.handleResize();
  }

  dispose() {
    window.removeEventListener("resize", this.handleResize);
    this.renderer.domElement.removeEventListener("click", this.handleClick);
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }

  handleResize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  handleClick(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const objects = [...this.planetMeshes.values()].map((entry) => entry.mesh);
    const intersections = this.raycaster.intersectObjects(objects);
    if (!intersections.length) {
      return;
    }

    this.selectedName = intersections[0].object.userData.name;
    this.onSelect?.(this.selectedName);
  }

  getOrCreateStar(star) {
    if (this.starMeshes.has(star.name)) {
      return this.starMeshes.get(star.name);
    }

    const geometry = new THREE.SphereGeometry(star.radius, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: star.color });
    const mesh = new THREE.Mesh(geometry, material);
    const light = new THREE.PointLight(star.color, Math.max(1.5, star.luminositySolar * 2), 250);
    const label = makeLabel(star.name);
    mesh.add(light);
    mesh.add(label);
    this.scene.add(mesh);

    const entry = { mesh, light, label };
    this.starMeshes.set(star.name, entry);
    return entry;
  }

  getOrCreatePlanet(planet) {
    if (this.planetMeshes.has(planet.name)) {
      return this.planetMeshes.get(planet.name);
    }

    const geometry = new THREE.SphereGeometry(planet.radius, 24, 24);
    const material = new THREE.MeshStandardMaterial({
      color: planet.color,
      roughness: 0.78,
      metalness: 0.05
    });
    const mesh = new THREE.Mesh(geometry, material);
    const label = makeLabel(planet.name);
    mesh.userData.name = planet.name;
    mesh.add(label);
    this.scene.add(mesh);

    const entry = { mesh, label };
    this.planetMeshes.set(planet.name, entry);
    return entry;
  }

  updateOrbitLine(planet) {
    const existing = this.orbitLines.get(planet.name);
    if (existing) {
      this.scene.remove(existing);
      existing.geometry.dispose();
      existing.material.dispose();
    }

    const points = planet.orbitPoints.map((point) => vectorFromPosition(point));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: planet.color,
      transparent: true,
      opacity: planet.name === this.selectedName ? 0.75 : 0.22
    });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    this.orbitLines.set(planet.name, line);
  }

  update(renderState) {
    const activeStars = new Set(renderState.stars.map((star) => star.name));
    const activePlanets = new Set(renderState.planets.map((planet) => planet.name));

    for (const star of renderState.stars) {
      const entry = this.getOrCreateStar(star);
      entry.mesh.position.copy(vectorFromPosition(star.position));
      entry.mesh.scale.setScalar(star.radius / entry.mesh.geometry.parameters.radius);
    }

    for (const planet of renderState.planets) {
      const entry = this.getOrCreatePlanet(planet);
      entry.mesh.position.copy(vectorFromPosition(planet.position));
      entry.mesh.scale.setScalar(planet.radius / entry.mesh.geometry.parameters.radius);
      entry.label.visible = planet.name === this.selectedName || renderState.planets.length <= 12;
      this.updateOrbitLine(planet);
    }

    for (const [name, entry] of this.starMeshes.entries()) {
      if (!activeStars.has(name)) {
        this.scene.remove(entry.mesh);
        this.starMeshes.delete(name);
      }
    }

    for (const [name, entry] of this.planetMeshes.entries()) {
      if (!activePlanets.has(name)) {
        this.scene.remove(entry.mesh);
        this.planetMeshes.delete(name);
      }
    }
  }

  focus(name) {
    const entry = this.planetMeshes.get(name) || this.starMeshes.get(name);
    if (!entry) {
      return;
    }

    this.selectedName = name;
    const target = entry.mesh.position.clone();
    this.controls.target.copy(target);
    this.camera.position.copy(target.clone().add(new THREE.Vector3(0, 6, 14)));
    this.controls.update();
  }

  focusOrigin() {
    this.selectedName = null;
    this.controls.target.set(0, 0, 0);
    this.camera.position.copy(DEFAULT_CAMERA_POSITION);
    this.controls.update();
  }

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

export function createThreeRenderer(options) {
  return new ThreeRenderer(options);
}
