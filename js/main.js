// ============================================================================
// SKYFORGE: PLANE EVOLUTION - 3D RUNNER GAME
// ============================================================================

// ---------- GAME STATE & CONFIG ----------
const GAME_CONFIG = {
    runwayWidth: 20,
    playerSpeed: 40,             // forward speed (units/sec)
    lateralSpeed: 20,            // steering speed
    cameraDistance: 15,
    cameraHeight: 6,
    maxShield: 2,
    tiers: [
        { id: 1, name: "ORIGAMI GLIDER", expTarget: 100, fireRate: 0.40, bulletSpeed: 85, damage: 1, color: 0xffffff, icon: "📄", weapon: "Dart Cannons (1x)", rateText: "Normal", feature: "Nimble Origami Aerodynamics", armorText: "3 Shields" },
        { id: 2, name: "VINTAGE BIPLANE", expTarget: 250, fireRate: 0.35, bulletSpeed: 95, damage: 1.5, color: 0xd29a56, icon: "🛩️", weapon: "Dual Prop Guns (2x)", rateText: "Fast", feature: "Spinning Wooden Propeller", armorText: "3 Shields" },
        { id: 3, name: "WARBIRD FIGHTER", expTarget: 500, fireRate: 0.26, bulletSpeed: 110, damage: 2, color: 0x3d688a, icon: "✈️", weapon: "Twin Wing Autocannons", rateText: "Rapid", feature: "Reinforced Metal Fuselage", armorText: "4 Shields" },
        { id: 4, name: "SUPERSONIC JET", expTarget: 900, fireRate: 0.18, bulletSpeed: 130, damage: 3, color: 0x242a38, icon: "🚀", weapon: "Quad Plasma Rounds", rateText: "Very Rapid", feature: "Dual Afterburner Thrusters", armorText: "4 Shields" },
        { id: 5, name: "SKYFORGE STARFIGHTER", expTarget: 1500, fireRate: 0.1, bulletSpeed: 150, damage: 5, color: 0x0a1931, icon: "🛸", weapon: "Hyper-Velocity Plasma Salvo", rateText: "Extreme", feature: "Energy Shield Matrix", armorText: "5 Shields" }
    ]
};

const gameState = {
    mode: "MENU", // "MENU", "PLAYING", "GAMEOVER", "PAUSED", "CRASHING"
    score: 0,
    coins: 0,
    distance: 0,
    gatesPassed: 0,
    shield: 3,
    maxShield: 3,
    exp: 0,
    tierIndex: 0,
    soundEnabled: true,
    lastShotTime: 0
};

// ---------- DOM ELEMENTS ----------
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const exitButton = document.getElementById("exitButton");
const pauseBtn = document.getElementById("pauseBtn");
const hudExitBtn = document.getElementById("hudExitBtn");
const resumeButton = document.getElementById("resumeButton");
const pauseRestartButton = document.getElementById("pauseRestartButton");
const pauseExitButton = document.getElementById("pauseExitButton");

const gameMenu = document.getElementById("game");
const gameOverModal = document.getElementById("gameOverModal");
const pauseModal = document.getElementById("pauseModal");
const damageFlash = document.getElementById("damageFlash");
const healFlash = document.getElementById("healFlash");
const hud = document.getElementById("hud");

const scoreVal = document.getElementById("scoreVal");
const coinsVal = document.getElementById("coinsVal");
const tierLabel = document.getElementById("tierLabel");
const planeName = document.getElementById("planeName");
const evolutionFill = document.getElementById("evolutionFill");
const expVal = document.getElementById("expVal");
const expTarget = document.getElementById("expTarget");
const healthFill = document.getElementById("healthFill");
const healthText = document.getElementById("healthText");
const soundToggleBtn = document.getElementById("soundToggleBtn");
const levelUpBanner = document.getElementById("levelUpBanner");
const bannerTierName = document.getElementById("bannerTierName");

// 5 Era Selector DOM Elements
const eraChips = document.querySelectorAll("#eraSelectorRow .era-chip");
const previewPlaneTitle = document.getElementById("previewPlaneTitle");
const previewArmor = document.getElementById("previewArmor");
const previewWeapon = document.getElementById("previewWeapon");
const previewRate = document.getElementById("previewRate");
const previewFeature = document.getElementById("previewFeature");
let selectedStartingTier = 0;

const pauseScore = document.getElementById("pauseScore");
const pauseDistance = document.getElementById("pauseDistance");
const gameOverTitle = document.getElementById("gameOverTitle");
const destructionReason = document.getElementById("destructionReason");
const finalScore = document.getElementById("finalScore");
const finalCoins = document.getElementById("finalCoins");
const finalDistance = document.getElementById("finalDistance");
const finalGates = document.getElementById("finalGates");
const finalTierName = document.getElementById("finalTierName");
const finalPlaneIcon = document.getElementById("finalPlaneIcon");

// ============================================================================
// PROCEDURAL AUDIO SYNTHESIZER (Web Audio API)
// ============================================================================
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
    }
}

function playTone(freq, type, duration, gainStart = 0.2, gainEnd = 0.001) {
    if (!gameState.soundEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(gainStart, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(gainEnd, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
}

function playWarningAlarm() {
    if (!gameState.soundEnabled || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(440, now + 0.1);
        osc.frequency.setValueAtTime(880, now + 0.2);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.35);
    } catch (e) {}
}

function playHullCrunchSound() {
    if (!gameState.soundEnabled || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        // White noise-like crunch
        const bufferSize = audioCtx.sampleRate * 0.25;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.08));
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + 0.25);
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start(now);
    } catch (e) {}
}

function playHeavyDestructionSound() {
    if (!gameState.soundEnabled || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        // Low explosive rumble
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.8);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.8);
    } catch (e) {}
}

function playHealSound() {
    if (!gameState.soundEnabled || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);
            gain.gain.setValueAtTime(0.18, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.25);
        });
    } catch (e) {}
}

function playLaserSound(tier) {
    if (!gameState.soundEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const now = audioCtx.currentTime;
        osc.type = tier >= 4 ? "sawtooth" : "square";
        const startFreq = 600 + tier * 150;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    } catch (e) {}
}

function playCoinSound() {
    if (!gameState.soundEnabled || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        [987.77, 1318.51].forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);
            gain.gain.setValueAtTime(0.15, now + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.18);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.18);
        });
    } catch (e) {}
}

function playGateSound(isPositive) {
    if (!gameState.soundEnabled || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        if (isPositive) {
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = "triangle";
                osc.frequency.setValueAtTime(freq, now + i * 0.05);
                gain.gain.setValueAtTime(0.18, now + i * 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.2);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now + i * 0.05);
                osc.stop(now + i * 0.05 + 0.2);
            });
        } else {
            [220, 160].forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(freq, now + i * 0.1);
                gain.gain.setValueAtTime(0.2, now + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.18);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now + i * 0.1);
                osc.stop(now + i * 0.1 + 0.18);
            });
        }
    } catch (e) {}
}

function playEvolveSound() {
    if (!gameState.soundEnabled || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const notes = [440, 554.37, 659.25, 880, 1108.73];
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = "square";
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.22, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.35);
        });
    } catch (e) {}
}

function playExplosionSound() {
    if (!gameState.soundEnabled || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(25, now + 0.3);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    } catch (e) {}
}

// ============================================================================
// 3D SCENE SETUP
// ============================================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1428);
scene.fog = new THREE.FogExp2(0x0a1428, 0.007);

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    800
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xddeeff, 0.9);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffaed, 1.4);
sunLight.position.set(30, 60, 40);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 250;
const d = 30;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
scene.add(sunLight);

const skyLight = new THREE.HemisphereLight(0x00f0ff, 0x111122, 0.6);
scene.add(skyLight);

// ============================================================================
// PROCEDURAL 3D AIRCRAFT MODELS (5 EVOLUTION TIERS)
// ============================================================================
const playerGroup = new THREE.Group();
playerGroup.position.set(0, 1.2, 0);
scene.add(playerGroup);

let currentPlaneModel = null;
let propellerMesh = null;
let jetExhaustMeshes = [];

// Helper material factories
const matWhite = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3, metalness: 0.1 });
const matDark = new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 0.5, metalness: 0.8 });
const matNeonCyan = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00d0ff, emissiveIntensity: 0.8 });
const matNeonOrange = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.9 });
const matGold = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });

function createTier1Origami() {
    const group = new THREE.Group();
    // Fuselage crease
    const bodyGeo = new THREE.ConeGeometry(0.3, 2.4, 4);
    const body = new THREE.Mesh(bodyGeo, matWhite);
    body.rotation.x = -Math.PI / 2;
    body.scale.set(1, 1, 0.35);
    group.add(body);

    // Delta paper wings
    const wingGeo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
        0, 0.1, -1.1,     // Nose
        -1.8, 0.05, 0.9,  // Left wing tip
        0, 0.05, 0.5,     // Tail center
        0, 0.1, -1.1,     // Nose
        0, 0.05, 0.5,     // Tail center
        1.8, 0.05, 0.9    // Right wing tip
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    wingGeo.computeVertexNormals();
    const wings = new THREE.Mesh(wingGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.4 }));
    group.add(wings);

    // Subtle paper fin
    const finGeo = new THREE.BufferGeometry();
    const finVertices = new Float32Array([
        0, 0.05, -0.4,
        0, 0.6, 0.7,
        0, 0.05, 0.7
    ]);
    finGeo.setAttribute('position', new THREE.BufferAttribute(finVertices, 3));
    finGeo.computeVertexNormals();
    const fin = new THREE.Mesh(finGeo, new THREE.MeshStandardMaterial({ color: 0x00e5ff, side: THREE.DoubleSide }));
    group.add(fin);

    return group;
}

function createTier2Biplane() {
    const group = new THREE.Group();
    const matWood = new THREE.MeshStandardMaterial({ color: 0xd28e46, roughness: 0.6 });
    const matYellow = new THREE.MeshStandardMaterial({ color: 0xf5c342, roughness: 0.4 });

    // Fuselage
    const fuseGeo = new THREE.CylinderGeometry(0.35, 0.2, 2.6, 8);
    const fuse = new THREE.Mesh(fuseGeo, matWood);
    fuse.rotation.x = -Math.PI / 2;
    group.add(fuse);

    // Upper and Lower Wings
    const wingGeo = new THREE.BoxGeometry(3.6, 0.06, 0.7);
    const topWing = new THREE.Mesh(wingGeo, matYellow);
    topWing.position.set(0, 0.5, -0.2);
    group.add(topWing);

    const bottomWing = new THREE.Mesh(wingGeo, matYellow);
    bottomWing.position.set(0, -0.2, -0.2);
    group.add(bottomWing);

    // Struts
    const strutGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.7);
    [-1.4, 1.4].forEach(x => {
        const strut = new THREE.Mesh(strutGeo, matDark);
        strut.position.set(x, 0.15, -0.2);
        group.add(strut);
    });

    // Tail
    const tailHGeo = new THREE.BoxGeometry(1.2, 0.04, 0.4);
    const tailH = new THREE.Mesh(tailHGeo, matYellow);
    tailH.position.set(0, 0.15, 1.1);
    group.add(tailH);

    const tailVGeo = new THREE.BoxGeometry(0.04, 0.5, 0.4);
    const tailV = new THREE.Mesh(tailVGeo, matWood);
    tailV.position.set(0, 0.4, 1.1);
    group.add(tailV);

    // Propeller
    const propGroup = new THREE.Group();
    const bladeGeo = new THREE.BoxGeometry(1.1, 0.08, 0.02);
    const blade = new THREE.Mesh(bladeGeo, matDark);
    const hubGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const hub = new THREE.Mesh(hubGeo, matGold);
    propGroup.add(blade, hub);
    propGroup.position.set(0, 0, -1.35);
    group.add(propGroup);
    propellerMesh = propGroup;

    return group;
}

function createTier3Warbird() {
    const group = new THREE.Group();
    const matCamo = new THREE.MeshStandardMaterial({ color: 0x3d647a, metalness: 0.5, roughness: 0.3 });
    const matCanopy = new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.8 });

    // Streamlined Fuselage
    const fuseGeo = new THREE.CylinderGeometry(0.42, 0.18, 3.2, 12);
    const fuse = new THREE.Mesh(fuseGeo, matCamo);
    fuse.rotation.x = -Math.PI / 2;
    group.add(fuse);

    // Canopy
    const canopyGeo = new THREE.SphereGeometry(0.32, 10, 8);
    canopyGeo.scale(0.8, 1, 1.6);
    const canopy = new THREE.Mesh(canopyGeo, matCanopy);
    canopy.position.set(0, 0.32, -0.1);
    group.add(canopy);

    // Low-set Wings with slight dihedral
    const wingGeo = new THREE.BoxGeometry(4.4, 0.08, 1.0);
    const wings = new THREE.Mesh(wingGeo, matCamo);
    wings.position.set(0, -0.08, -0.3);
    group.add(wings);

    // Twin Machine Gun Barrels on wings
    const gunGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6);
    [-1.2, 1.2].forEach(x => {
        const gun = new THREE.Mesh(gunGeo, matDark);
        gun.rotation.x = -Math.PI / 2;
        gun.position.set(x, -0.06, -0.7);
        group.add(gun);
    });

    // Tail Assembly
    const tailH = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.45), matCamo);
    tailH.position.set(0, 0.1, 1.4);
    const tailV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.65, 0.5), matCamo);
    tailV.position.set(0, 0.45, 1.4);
    group.add(tailH, tailV);

    // 3-blade Propeller
    const propGroup = new THREE.Group();
    for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.02), matDark);
        b.rotation.z = (i * Math.PI * 2) / 3;
        b.position.y = 0.25;
        propGroup.add(b);
    }
    const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.4, 10), matGold);
    noseCone.rotation.x = -Math.PI / 2;
    propGroup.add(noseCone);
    propGroup.position.set(0, 0, -1.65);
    group.add(propGroup);
    propellerMesh = propGroup;

    return group;
}

function createTier4SupersonicJet() {
    const group = new THREE.Group();
    const matJet = new THREE.MeshStandardMaterial({ color: 0x1f242e, metalness: 0.8, roughness: 0.2 });
    const matVisor = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });

    // Sharp stealth fuselage
    const bodyGeo = new THREE.ConeGeometry(0.5, 3.8, 6);
    const body = new THREE.Mesh(bodyGeo, matJet);
    body.rotation.x = -Math.PI / 2;
    body.scale.set(1.1, 1, 0.6);
    group.add(body);

    // Gold tinted visor
    const visorGeo = new THREE.BoxGeometry(0.3, 0.2, 1.0);
    const visor = new THREE.Mesh(visorGeo, matVisor);
    visor.position.set(0, 0.22, -0.4);
    group.add(visor);

    // Swept delta wings
    const wingGeo = new THREE.BufferGeometry();
    const wingVerts = new Float32Array([
        0, 0, -1.0,
        -2.5, -0.05, 1.2,
        0, 0, 1.2,

        0, 0, -1.0,
        0, 0, 1.2,
        2.5, -0.05, 1.2
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVerts, 3));
    wingGeo.computeVertexNormals();
    const wings = new THREE.Mesh(wingGeo, matJet);
    group.add(wings);

    // Twin canted vertical fins
    [-0.5, 0.5].forEach(x => {
        const finGeo = new THREE.BoxGeometry(0.06, 0.7, 0.6);
        const fin = new THREE.Mesh(finGeo, matJet);
        fin.position.set(x, 0.45, 1.1);
        fin.rotation.z = x > 0 ? -0.25 : 0.25;
        group.add(fin);
    });

    // Dual Jet Engine Nozzles with glowing flame
    jetExhaustMeshes = [];
    [-0.32, 0.32].forEach(x => {
        const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.6, 12), matDark);
        nozzle.rotation.x = Math.PI / 2;
        nozzle.position.set(x, 0, 1.7);
        group.add(nozzle);

        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.2, 8), matNeonOrange);
        flame.rotation.x = Math.PI / 2;
        flame.position.set(x, 0, 2.3);
        group.add(flame);
        jetExhaustMeshes.push(flame);
    });

    return group;
}

function createTier5Starfighter() {
    const group = new THREE.Group();
    const matHull = new THREE.MeshStandardMaterial({ color: 0x0c1322, metalness: 0.9, roughness: 0.1 });
    const matCyanGlow = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 1.2 });
    const matMagentaGlow = new THREE.MeshStandardMaterial({ color: 0xff007f, emissive: 0xff007f, emissiveIntensity: 1.2 });

    // Central starfighter chassis
    const bodyGeo = new THREE.CylinderGeometry(0.2, 0.6, 4.2, 8);
    const body = new THREE.Mesh(bodyGeo, matHull);
    body.rotation.x = -Math.PI / 2;
    body.scale.set(1.2, 1, 0.6);
    group.add(body);

    // Forward swept sci-fi wings
    const wingGeo = new THREE.BufferGeometry();
    const wingVerts = new Float32Array([
        0, 0.05, -0.6,
        -3.2, 0.1, -1.2,
        -1.6, 0, 1.4,

        0, 0.05, -0.6,
        -1.6, 0, 1.4,
        0, 0, 1.4,

        0, 0.05, -0.6,
        1.6, 0, 1.4,
        3.2, 0.1, -1.2,

        0, 0.05, -0.6,
        0, 0, 1.4,
        1.6, 0, 1.4
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVerts, 3));
    wingGeo.computeVertexNormals();
    const wings = new THREE.Mesh(wingGeo, matHull);
    group.add(wings);

    // Glowing Neon Wing Trims
    [-3.2, 3.2].forEach(x => {
        const crystalGeo = new THREE.ConeGeometry(0.12, 1.2, 6);
        const crystal = new THREE.Mesh(crystalGeo, matCyanGlow);
        crystal.rotation.x = -Math.PI / 2;
        crystal.position.set(x, 0.1, -0.7);
        group.add(crystal);
    });

    // Plasma Engine Core
    const coreGeo = new THREE.TorusGeometry(0.45, 0.08, 12, 24);
    const core = new THREE.Mesh(coreGeo, matMagentaGlow);
    core.position.set(0, 0.05, 1.7);
    group.add(core);

    // Plasma Exhaust Cone
    jetExhaustMeshes = [];
    const plasmaFlame = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.8, 12), matCyanGlow);
    plasmaFlame.rotation.x = Math.PI / 2;
    plasmaFlame.position.set(0, 0.05, 2.7);
    group.add(plasmaFlame);
    jetExhaustMeshes.push(plasmaFlame);

    // Glowing energy shield aura (wireframe)
    const shieldGeo = new THREE.SphereGeometry(2.3, 16, 12);
    const shieldMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        wireframe: true,
        transparent: true,
        opacity: 0.25
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.name = "shieldMesh";
    group.add(shieldMesh);

    return group;
}

function updatePlaneModel() {
    // Remove previous model
    if (currentPlaneModel) {
        playerGroup.remove(currentPlaneModel);
    }
    propellerMesh = null;
    jetExhaustMeshes = [];

    const tier = gameState.tierIndex + 1;
    switch (tier) {
        case 1: currentPlaneModel = createTier1Origami(); break;
        case 2: currentPlaneModel = createTier2Biplane(); break;
        case 3: currentPlaneModel = createTier3Warbird(); break;
        case 4: currentPlaneModel = createTier4SupersonicJet(); break;
        case 5: currentPlaneModel = createTier5Starfighter(); break;
        default: currentPlaneModel = createTier5Starfighter(); break;
    }

    currentPlaneModel.traverse(node => {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
        }
    });

    playerGroup.add(currentPlaneModel);

    // Spawn level-up particle burst
    spawnShockwave(playerGroup.position.x, playerGroup.position.y, playerGroup.position.z);
}

// ============================================================================
// RUNWAY & TRACK ENVIRONMENT (Endless Scrolling Track)
// ============================================================================
const SEGMENT_LENGTH = 70;
const TOTAL_SEGMENTS = 6;
const trackSegments = [];

const runwayMat = new THREE.MeshStandardMaterial({
    color: 0x141b26,
    roughness: 0.8,
    metalness: 0.2
});

const borderMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff
});

function createTrackSegment(zPos) {
    const group = new THREE.Group();

    // Main asphalt runway
    const floorGeo = new THREE.PlaneGeometry(GAME_CONFIG.runwayWidth, SEGMENT_LENGTH);
    const floor = new THREE.Mesh(floorGeo, runwayMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);

    // Glowing Neon Runway Borders
    const railGeo = new THREE.BoxGeometry(0.3, 0.4, SEGMENT_LENGTH);
    const leftRail = new THREE.Mesh(railGeo, borderMat);
    leftRail.position.set(-GAME_CONFIG.runwayWidth / 2, 0.2, 0);
    const rightRail = new THREE.Mesh(railGeo, borderMat);
    rightRail.position.set(GAME_CONFIG.runwayWidth / 2, 0.2, 0);
    group.add(leftRail, rightRail);

    // Center dashed white/cyan marks
    const dashGeo = new THREE.BoxGeometry(0.3, 0.05, 4);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xdff6ff });
    for (let z = -SEGMENT_LENGTH / 2 + 4; z < SEGMENT_LENGTH / 2; z += 9) {
        const dash = new THREE.Mesh(dashGeo, dashMat);
        dash.position.set(0, 0.06, z);
        group.add(dash);
    }

    // Underside floating sci-fi structure
    const underGeo = new THREE.BoxGeometry(GAME_CONFIG.runwayWidth - 1, 3, SEGMENT_LENGTH);
    const underMat = new THREE.MeshStandardMaterial({ color: 0x070c14, roughness: 0.9 });
    const under = new THREE.Mesh(underGeo, underMat);
    under.position.set(0, -1.6, 0);
    group.add(under);

    group.position.z = zPos;
    scene.add(group);
    return group;
}

function initTrack() {
    for (let i = 0; i < TOTAL_SEGMENTS; i++) {
        const z = -i * SEGMENT_LENGTH + 20;
        trackSegments.push(createTrackSegment(z));
    }
}

// Low-Poly Sky Clouds & Floating Mountain Vistas
const cloudsGroup = new THREE.Group();
scene.add(cloudsGroup);
const cloudGeo = new THREE.DodecahedronGeometry(6, 1);
const cloudMat = new THREE.MeshStandardMaterial({
    color: 0x223a5e,
    roughness: 0.9,
    transparent: true,
    opacity: 0.65
});

for (let i = 0; i < 45; i++) {
    const cloud = new THREE.Mesh(cloudGeo, cloudMat);
    const side = Math.random() > 0.5 ? 1 : -1;
    cloud.position.set(
        side * (25 + Math.random() * 80),
        -10 + Math.random() * 45,
        -Math.random() * 400
    );
    const scale = 0.8 + Math.random() * 2.5;
    cloud.scale.set(scale * 1.8, scale * 0.8, scale * 1.5);
    cloudsGroup.add(cloud);
}

// ============================================================================
// UPGRADE GATES SYSTEM
// ============================================================================
const gates = [];
const GATE_TYPES = [
    { text: "+35 EXP", type: "exp", value: 35, positive: true },
    { text: "+75 EXP", type: "exp", value: 75, positive: true },
    { text: "+120 EXP", type: "exp", value: 120, positive: true },
    { text: "EVOLVE!", type: "evolve", value: 1, positive: true },
    { text: "REPAIR HULL (+1)", type: "shield", value: 1, positive: true },
    { text: "SHIELD OVERCHARGE", type: "shield_max", value: 1, positive: true },
    { text: "-1 SHIELD DMG", type: "shield_damage", value: 1, positive: false },
    { text: "-45 EXP", type: "exp", value: -45, positive: false },
    { text: "-80 EXP", type: "exp", value: -80, positive: false }
];

function createGateCanvasTexture(text, isPositive) {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    if (isPositive) {
        grad.addColorStop(0, "rgba(0, 255, 136, 0.85)");
        grad.addColorStop(1, "rgba(0, 240, 255, 0.4)");
    } else {
        grad.addColorStop(0, "rgba(255, 51, 102, 0.85)");
        grad.addColorStop(1, "rgba(180, 0, 50, 0.4)");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);

    // Border
    ctx.lineWidth = 8;
    ctx.strokeStyle = isPositive ? "#00ff88" : "#ff3366";
    ctx.strokeRect(4, 4, 248, 120);

    // Text
    ctx.font = "bold 30px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 8;
    ctx.fillText(text, 128, 64);

    return new THREE.CanvasTexture(canvas);
}

function spawnGatePair(zPos) {
    const laneWidth = GAME_CONFIG.runwayWidth / 2; // 7
    const laneX = [-laneWidth / 2, laneWidth / 2]; // -3.5, 3.5

    // Choose one positive gate, and one alternate gate
    const posOptions = GATE_TYPES.filter(g => g.positive);
    const negOptions = GATE_TYPES.filter(g => !g.positive);

    const leftType = Math.random() > 0.35 ? posOptions[Math.floor(Math.random() * posOptions.length)] : negOptions[Math.floor(Math.random() * negOptions.length)];
    const rightType = !leftType.positive ? posOptions[Math.floor(Math.random() * posOptions.length)] : (Math.random() > 0.5 ? negOptions[Math.floor(Math.random() * negOptions.length)] : posOptions[Math.floor(Math.random() * posOptions.length)]);

    [ { type: leftType, x: laneX[0] }, { type: rightType, x: laneX[1] } ].forEach(gateData => {
        const group = new THREE.Group();

        // Arch Frame
        const frameMat = new THREE.MeshStandardMaterial({
            color: gateData.type.positive ? 0x00ff88 : 0xff3366,
            metalness: 0.8,
            roughness: 0.2
        });

        // Posts
        const postGeo = new THREE.BoxGeometry(0.35, 4.5, 0.35);
        const pLeft = new THREE.Mesh(postGeo, frameMat);
        pLeft.position.set(-2.8, 2.2, 0);
        const pRight = new THREE.Mesh(postGeo, frameMat);
        pRight.position.set(2.8, 2.2, 0);
        const topBar = new THREE.Mesh(new THREE.BoxGeometry(5.95, 0.45, 0.45), frameMat);
        topBar.position.set(0, 4.4, 0);
        group.add(pLeft, pRight, topBar);

        // Glass banner inside arch
        const bannerTexture = createGateCanvasTexture(gateData.type.text, gateData.type.positive);
        const bannerMat = new THREE.MeshBasicMaterial({
            map: bannerTexture,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
        });
        const banner = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3.8), bannerMat);
        banner.position.set(0, 2.2, 0);
        group.add(banner);

        group.position.set(gateData.x, 0, zPos);
        group.userData = {
            isGate: true,
            data: gateData.type,
            active: true,
            box: new THREE.Box3()
        };

        scene.add(group);
        gates.push(group);
    });
}

// ============================================================================
// COLLECTIBLES (Gold Coins, Nanite Repair Pickups) & OBSTACLES
// ============================================================================
const coins = [];
const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 16);
coinGeo.rotateX(Math.PI / 2);
const coinMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.85,
    roughness: 0.2
});

function spawnCoinRow(zPos) {
    const lane = (Math.random() - 0.5) * (GAME_CONFIG.runwayWidth - 4);
    for (let i = 0; i < 4; i++) {
        const coin = new THREE.Mesh(coinGeo, coinMat);
        coin.position.set(lane, 1.2, zPos - i * 3.5);
        coin.userData = { active: true };
        scene.add(coin);
        coins.push(coin);
    }
}

// Nanite Repair Capsules (Green Healing Items)
const repairs = [];
const repairCrossGeo = new THREE.BoxGeometry(0.75, 0.24, 0.24);
const repairCrossGeo2 = new THREE.BoxGeometry(0.24, 0.75, 0.24);
const repairMat = new THREE.MeshStandardMaterial({
    color: 0x00ff88,
    emissive: 0x00ff88,
    emissiveIntensity: 0.9,
    roughness: 0.2
});

function spawnRepairPickup(zPos) {
    const group = new THREE.Group();
    const c1 = new THREE.Mesh(repairCrossGeo, repairMat);
    const c2 = new THREE.Mesh(repairCrossGeo2, repairMat);
    const aura = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 8), new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        wireframe: true,
        transparent: true,
        opacity: 0.35
    }));
    group.add(c1, c2, aura);
    const lane = (Math.random() - 0.5) * (GAME_CONFIG.runwayWidth - 4);
    group.position.set(lane, 1.3, zPos);
    group.userData = { active: true };
    scene.add(group);
    repairs.push(group);
}

// Destructible Aerial Targets / Drones / Armored Barricades / Laser Hazards
const obstacles = [];
const droneGeo = new THREE.DodecahedronGeometry(0.85, 0);
const droneMat = new THREE.MeshStandardMaterial({
    color: 0xbf1b3a,
    emissive: 0x550011,
    metalness: 0.6,
    roughness: 0.3
});

const armoredGeo = new THREE.BoxGeometry(1.6, 1.6, 1.2);
const armoredMat = new THREE.MeshStandardMaterial({
    color: 0x3d0c18,
    emissive: 0x880022,
    emissiveIntensity: 0.5,
    metalness: 0.8,
    roughness: 0.2
});

const laserPillarGeo = new THREE.CylinderGeometry(0.25, 0.25, 4.0, 8);
const laserBeamGeo = new THREE.BoxGeometry(3.4, 0.18, 0.18);
const laserMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });

function spawnObstacleCluster(zPos) {
    const isHeavy = Math.random() < 0.45;
    if (isHeavy) {
        if (Math.random() < 0.5) {
            // Heavy Armored Barricade (High HP, cannot be one-shotted)
            const x = (Math.random() - 0.5) * (GAME_CONFIG.runwayWidth - 4);
            const armored = new THREE.Mesh(armoredGeo, armoredMat);
            armored.position.set(x, 1.4, zPos);
            armored.userData = {
                active: true,
                isArmored: true,
                hp: 8 + gameState.tierIndex * 4,
                maxHp: 8 + gameState.tierIndex * 4,
                radius: 1.2
            };
            scene.add(armored);
            obstacles.push(armored);
        } else {
            // Indestructible Laser Beam Barrier - requires physical steering dodge!
            const group = new THREE.Group();
            const p1 = new THREE.Mesh(laserPillarGeo, armoredMat);
            p1.position.set(-1.7, 2.0, 0);
            const p2 = new THREE.Mesh(laserPillarGeo, armoredMat);
            p2.position.set(1.7, 2.0, 0);
            const beam = new THREE.Mesh(laserBeamGeo, laserMat);
            beam.position.set(0, 1.4, 0);
            group.add(p1, p2, beam);
            const x = (Math.random() - 0.5) * (GAME_CONFIG.runwayWidth - 5);
            group.position.set(x, 0, zPos);
            group.userData = {
                active: true,
                isLaserHazard: true,
                hp: 9999, // indestructible by guns
                radius: 1.8
            };
            scene.add(group);
            obstacles.push(group);
        }
    } else {
        // Standard Drones
        const count = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * (GAME_CONFIG.runwayWidth - 3);
            const drone = new THREE.Mesh(droneGeo, droneMat);
            drone.position.set(x, 1.3, zPos + (Math.random() - 0.5) * 6);
            drone.userData = {
                active: true,
                hp: 3 + gameState.tierIndex * 2,
                maxHp: 3 + gameState.tierIndex * 2,
                radius: 1.0
            };
            scene.add(drone);
            obstacles.push(drone);
        }
    }
}

// Initial obstacle/gate spawning down the track
function populateTrack() {
    for (let z = -60; z > -350; z -= 55) {
        spawnGatePair(z);
        spawnCoinRow(z - 18);
        if (Math.random() < 0.6) {
            spawnRepairPickup(z - 28);
        }
        spawnObstacleCluster(z - 38);
    }
}

// ============================================================================
// BULLETS & PROJECTILES
// ============================================================================
const bullets = [];
const bulletGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 6);
bulletGeo.rotateX(Math.PI / 2);
const bulletMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

function fireBullets() {
    const tier = GAME_CONFIG.tiers[gameState.tierIndex];
    playLaserSound(tier.id);

    const spawnPos = playerGroup.position.clone();

    if (tier.id === 1) {
        // Single center shot
        const b = new THREE.Mesh(bulletGeo, bulletMat);
        b.position.copy(spawnPos);
        b.position.z -= 1.4;
        scene.add(b);
        bullets.push({ mesh: b, damage: tier.damage, speed: tier.bulletSpeed });
    } else if (tier.id === 2 || tier.id === 3) {
        // Dual wing cannons
        [-0.8, 0.8].forEach(xOff => {
            const b = new THREE.Mesh(bulletGeo, bulletMat);
            b.position.set(spawnPos.x + xOff, spawnPos.y, spawnPos.z - 1.4);
            scene.add(b);
            bullets.push({ mesh: b, damage: tier.damage, speed: tier.bulletSpeed });
        });
    } else {
        // Quad / Triple plasma salvo
        [-1.3, -0.45, 0.45, 1.3].forEach(xOff => {
            const b = new THREE.Mesh(bulletGeo, bulletMat);
            b.position.set(spawnPos.x + xOff, spawnPos.y, spawnPos.z - 1.4);
            scene.add(b);
            bullets.push({ mesh: b, damage: tier.damage, speed: tier.bulletSpeed });
        });
    }
}

// ============================================================================
// PARTICLE SYSTEMS
// ============================================================================
const particles = [];
const particleGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);

function spawnDebris(x, y, z, colorHex = 0xff3366, count = 12) {
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    for (let i = 0; i < count; i++) {
        const p = new THREE.Mesh(particleGeo, mat);
        p.position.set(x, y, z);
        const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 14,
            Math.random() * 10 + 2,
            (Math.random() - 0.5) * 14
        );
        scene.add(p);
        particles.push({ mesh: p, vel, life: 1.0, maxLife: 1.0 });
    }
}

function spawnShockwave(x, y, z) {
    const ringGeo = new THREE.RingGeometry(0.4, 0.9, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, y, z);
    scene.add(ring);
    particles.push({
        mesh: ring,
        isRing: true,
        vel: new THREE.Vector3(0, 0, 0),
        life: 1.0,
        maxLife: 1.0
    });
}

function spawnFireParticle(x, y, z) {
    const pGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
    const pMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xff3700 : 0xffaa00 });
    const p = new THREE.Mesh(pGeo, pMat);
    p.position.set(
        x + (Math.random() - 0.5) * 0.7,
        y + (Math.random() - 0.5) * 0.5,
        z + (Math.random() - 0.5) * 0.7
    );
    const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 4 + 2,
        (Math.random() - 0.5) * 4
    );
    scene.add(p);
    particles.push({ mesh: p, vel, life: 0.6, maxLife: 0.6 });
}

function spawnSmokeParticle(x, y, z) {
    const pGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
    const pMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.8 });
    const p = new THREE.Mesh(pGeo, pMat);
    p.position.set(
        x + (Math.random() - 0.5) * 0.9,
        y + (Math.random() - 0.5) * 0.6,
        z + (Math.random() - 0.5) * 0.9
    );
    const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2.5,
        Math.random() * 3 + 2.5,
        (Math.random() - 0.5) * 2.5
    );
    scene.add(p);
    particles.push({ mesh: p, vel, life: 1.0, maxLife: 1.0 });
}

// ============================================================================
// CRASH & DESTRUCTION SYSTEM
// ============================================================================
let cameraShakeIntensity = 0;
const crashState = {
    timer: 0,
    duration: 1.6,
    reason: "Hull Obliterated in Mid-Air",
    velocity: new THREE.Vector3(),
    rotVelocity: new THREE.Vector3(),
    hitGround: false,
    debrisParts: []
};

function triggerPlaneDestruction(reason) {
    if (gameState.mode === "CRASHING" || gameState.mode === "GAMEOVER") return;

    gameState.mode = "CRASHING";
    crashState.timer = 0;
    crashState.duration = 1.6;
    crashState.reason = reason || "Hull Compromised &bull; Obliterated in Mid-Air";
    crashState.hitGround = false;

    // Upward pop + forward tumble
    crashState.velocity.set(
        (Math.random() - 0.5) * 7,
        3.5,
        -GAME_CONFIG.playerSpeed * 0.55
    );

    // Violent chaotic rotation
    crashState.rotVelocity.set(
        Math.random() * 6 + 5,
        (Math.random() - 0.5) * 8,
        (Math.random() > 0.5 ? 1 : -1) * (14 + Math.random() * 8)
    );

    cameraShakeIntensity = 1.2;
    damageFlash.classList.add("flash-heavy");

    playWarningAlarm();
    playHullCrunchSound();
    playHeavyDestructionSound();

    // Spawn sheared wing debris
    crashState.debrisParts = [];
    const wingDebrisGeo = new THREE.BoxGeometry(1.6, 0.12, 0.8);
    const currentTier = GAME_CONFIG.tiers[gameState.tierIndex];
    const wingMat = new THREE.MeshStandardMaterial({ color: currentTier.color, roughness: 0.4 });

    [-2.2, 2.2].forEach(xOff => {
        const wingMesh = new THREE.Mesh(wingDebrisGeo, wingMat);
        wingMesh.position.set(playerGroup.position.x + xOff, playerGroup.position.y, playerGroup.position.z);
        scene.add(wingMesh);
        crashState.debrisParts.push({
            mesh: wingMesh,
            vel: new THREE.Vector3(xOff * 3.5, Math.random() * 6 + 2, (Math.random() - 0.5) * 6),
            rot: new THREE.Vector3(Math.random() * 12, Math.random() * 12, Math.random() * 12)
        });
    });
}

function updateCrashing(delta, now) {
    crashState.timer += delta;

    // Air drag & gravity on crashing plane
    crashState.velocity.z *= 0.98;
    crashState.velocity.y -= 19 * delta;

    playerGroup.position.addScaledVector(crashState.velocity, delta);
    playerGroup.rotation.x += crashState.rotVelocity.x * delta;
    playerGroup.rotation.y += crashState.rotVelocity.y * delta;
    playerGroup.rotation.z += crashState.rotVelocity.z * delta;

    // Fire and thick smoke trails pouring out of wreckage
    spawnFireParticle(playerGroup.position.x, playerGroup.position.y, playerGroup.position.z);
    spawnSmokeParticle(playerGroup.position.x, playerGroup.position.y, playerGroup.position.z);

    // Update tumbling wing parts
    for (let i = crashState.debrisParts.length - 1; i >= 0; i--) {
        const d = crashState.debrisParts[i];
        d.mesh.position.addScaledVector(d.vel, delta);
        d.mesh.rotation.x += d.rot.x * delta;
        d.mesh.rotation.y += d.rot.y * delta;
        d.mesh.rotation.z += d.rot.z * delta;
        d.vel.y -= 20 * delta;
        if (d.mesh.position.y < 0.2) {
            d.vel.set(0, 0, 0);
            d.mesh.position.y = 0.2;
        }
    }

    // Impact with runway floor
    if (playerGroup.position.y <= 0.25 && !crashState.hitGround) {
        crashState.hitGround = true;
        playerGroup.position.y = 0.2;
        crashState.velocity.set(0, 0, 0);
        crashState.rotVelocity.set(0, 0, 0);

        // Huge final ground fireball & blast
        playHeavyDestructionSound();
        spawnDebris(playerGroup.position.x, 0.6, playerGroup.position.z, 0xff3300, 35);
        spawnDebris(playerGroup.position.x, 0.6, playerGroup.position.z, 0xffd700, 20);
        spawnDebris(playerGroup.position.x, 0.6, playerGroup.position.z, 0x111111, 20);
        spawnShockwave(playerGroup.position.x, 0.2, playerGroup.position.z);

        cameraShakeIntensity = 1.4;
        playerGroup.visible = false;
    }

    // Camera trails behind crash site with heavy shake
    camera.position.x += (playerGroup.position.x * 0.4 - camera.position.x) * 4 * delta;
    camera.position.y += (Math.max(3.5, playerGroup.position.y + 4.5) - camera.position.y) * 4 * delta;
    camera.position.z += (playerGroup.position.z + 14 - camera.position.z) * 4 * delta;
    camera.lookAt(playerGroup.position.x, Math.max(0.5, playerGroup.position.y), playerGroup.position.z - 4);

    if (cameraShakeIntensity > 0.01) {
        camera.position.x += (Math.random() - 0.5) * cameraShakeIntensity;
        camera.position.y += (Math.random() - 0.5) * cameraShakeIntensity;
        cameraShakeIntensity *= 0.94;
    }

    // Update ongoing particles
    updateParticles(delta);

    // End of crash animation -> Game Over Screen
    if (crashState.timer >= crashState.duration) {
        damageFlash.classList.remove("flash-heavy");
        showGameOver(crashState.reason);
    }
}

function showGameOver(reason) {
    gameState.mode = "GAMEOVER";

    gameOverTitle.textContent = "💥 AIRCRAFT DESTROYED 💥";
    destructionReason.textContent = reason;

    finalScore.textContent = Math.floor(gameState.score).toLocaleString();
    finalCoins.textContent = gameState.coins;
    finalDistance.textContent = Math.floor(gameState.distance) + " m";
    finalGates.textContent = gameState.gatesPassed;

    const currentTier = GAME_CONFIG.tiers[gameState.tierIndex];
    finalTierName.textContent = `Tier ${currentTier.id}: ${currentTier.name}`;
    finalPlaneIcon.textContent = currentTier.icon;

    hud.classList.add("hidden");
    gameOverModal.classList.remove("hidden");
}

// ============================================================================
// PAUSE & RESUME & EXIT TO MENU
// ============================================================================
function pauseGame() {
    if (gameState.mode !== "PLAYING") return;
    gameState.mode = "PAUSED";

    pauseScore.textContent = Math.floor(gameState.score).toLocaleString();
    pauseDistance.textContent = Math.floor(gameState.distance) + " m";
    pauseModal.classList.remove("hidden");

    playTone(440, "sine", 0.15);
}

function resumeGame() {
    if (gameState.mode !== "PAUSED") return;
    gameState.mode = "PLAYING";
    pauseModal.classList.add("hidden");

    playTone(660, "sine", 0.15);
}

function togglePause() {
    if (gameState.mode === "PLAYING") {
        pauseGame();
    } else if (gameState.mode === "PAUSED") {
        resumeGame();
    }
}

function exitToMenu() {
    gameState.mode = "MENU";

    // Hide all in-game modals & HUD
    hud.classList.add("hidden");
    pauseModal.classList.add("hidden");
    gameOverModal.classList.add("hidden");
    levelUpBanner.classList.add("hidden");
    damageFlash.classList.remove("flash-active", "flash-heavy");

    // Clean up active 3D game objects
    cleanAllDynamicObjects();

    // Reset camera & player to idle menu position
    camera.position.set(0, 8, 18);
    camera.lookAt(0, 0, -20);
    playerGroup.position.set(0, 1.2, 0);
    playerGroup.rotation.set(0, 0, 0);
    playerGroup.visible = true;

    gameState.tierIndex = 0;
    updatePlaneModel();

    // Reveal main start menu
    gameMenu.classList.remove("hidden");

    playTone(330, "triangle", 0.25);
}

// ============================================================================
// INPUT & CONTROLS
// ============================================================================
let targetPlayerX = 0;
let isPointerDown = false;
let pointerStartX = 0;
let playerStartX = 0;

const keysPressed = {
    ArrowLeft: false,
    ArrowRight: false,
    KeyA: false,
    KeyD: false
};

window.addEventListener("keydown", e => {
    if (keysPressed.hasOwnProperty(e.code)) {
        keysPressed[e.code] = true;
    }
    // Pause hotkey: Esc or P
    if (e.code === "Escape" || e.code === "KeyP") {
        togglePause();
    }
});

window.addEventListener("keyup", e => {
    if (keysPressed.hasOwnProperty(e.code)) {
        keysPressed[e.code] = false;
    }
});

// Pointer & Touch Drag Controls
window.addEventListener("pointerdown", e => {
    if (gameState.mode !== "PLAYING") return;
    isPointerDown = true;
    pointerStartX = e.clientX;
    playerStartX = targetPlayerX;
});

window.addEventListener("pointermove", e => {
    if (gameState.mode !== "PLAYING") return;
    if (isPointerDown) {
        const deltaX = e.clientX - pointerStartX;
        const sensitivity = 0.035;
        const halfW = GAME_CONFIG.runwayWidth / 2 - 1.2;
        targetPlayerX = THREE.MathUtils.clamp(playerStartX + deltaX * sensitivity, -halfW, halfW);
    } else {
        // Mouse hover position steering
        const normX = (e.clientX / window.innerWidth) * 2 - 1;
        const halfW = GAME_CONFIG.runwayWidth / 2 - 1.2;
        targetPlayerX = normX * halfW;
    }
});

window.addEventListener("pointerup", () => {
    isPointerDown = false;
});

// Sound Toggle Button
soundToggleBtn.addEventListener("click", () => {
    gameState.soundEnabled = !gameState.soundEnabled;
    soundToggleBtn.textContent = gameState.soundEnabled ? "🔊" : "🔇";
});

// HUD & Modal Button Listeners
pauseBtn.addEventListener("click", pauseGame);
resumeButton.addEventListener("click", resumeGame);
pauseRestartButton.addEventListener("click", () => {
    pauseModal.classList.add("hidden");
    startGame();
});
pauseExitButton.addEventListener("click", () => {
    pauseModal.classList.add("hidden");
    exitToMenu();
});
hudExitBtn.addEventListener("click", exitToMenu);
exitButton.addEventListener("click", exitToMenu);

// ============================================================================
// MAIN MENU 5 ERA SELECTOR
// ============================================================================
function initEraSelector() {
    eraChips.forEach(chip => {
        chip.addEventListener("click", () => {
            const tier = parseInt(chip.dataset.tier);
            selectedStartingTier = tier;
            eraChips.forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            updateMenuPlanePreview(tier);
            playTone(480 + tier * 90, "triangle", 0.15);
        });
    });
    updateMenuPlanePreview(selectedStartingTier);
}

function updateMenuPlanePreview(tierIdx) {
    gameState.tierIndex = tierIdx;
    updatePlaneModel();
    const tierData = GAME_CONFIG.tiers[tierIdx];
    if (previewPlaneTitle) previewPlaneTitle.textContent = `Tier ${tierData.id}: ${tierData.name}`;
    if (previewArmor) previewArmor.textContent = tierData.armorText || `${tierData.id + 2} Shields`;
    if (previewWeapon) previewWeapon.textContent = tierData.weapon || "Standard Cannons";
    if (previewRate) previewRate.textContent = tierData.rateText || "Normal";
    if (previewFeature) previewFeature.textContent = tierData.feature || "Aerodynamic Airframe";
}

// ============================================================================
// HEALTH & REPAIR SYSTEM
// ============================================================================
function healPlayer(amount) {
    gameState.shield = Math.min(gameState.maxShield, gameState.shield + amount);

    healFlash.classList.add("flash-active");
    setTimeout(() => healFlash.classList.remove("flash-active"), 180);

    spawnShockwave(playerGroup.position.x, playerGroup.position.y, playerGroup.position.z);
    playHealSound();
    updateHUD();
}

function damagePlayer(amount, reason) {
    gameState.shield -= amount;

    damageFlash.classList.add("flash-active");
    setTimeout(() => damageFlash.classList.remove("flash-active"), 150);

    cameraShakeIntensity = 0.75;
    playTone(120, "sawtooth", 0.3, 0.3);
    updateHUD();

    if (gameState.shield <= 0) {
        triggerPlaneDestruction(reason);
    }
}

// ============================================================================
// GAME LIFECYCLE & STATE MANAGEMENT
// ============================================================================
function startGame() {
    initAudio();

    // Reset Game State with selected starting aircraft
    gameState.mode = "PLAYING";
    gameState.score = 0;
    gameState.coins = 0;
    gameState.distance = 0;
    gameState.gatesPassed = 0;
    furthestTrackZ = -300; // Reset endless spawner anchor

    gameState.tierIndex = selectedStartingTier;
    gameState.maxShield = GAME_CONFIG.tiers[selectedStartingTier].id >= 5 ? 5 : (GAME_CONFIG.tiers[selectedStartingTier].id >= 3 ? 4 : 3);
    gameState.shield = gameState.maxShield;
    gameState.exp = selectedStartingTier === 0 ? 0 : GAME_CONFIG.tiers[selectedStartingTier - 1].expTarget;
    gameState.lastShotTime = 0;
    cameraShakeIntensity = 0;

    targetPlayerX = 0;
    playerGroup.position.set(0, 1.2, 0);
    playerGroup.rotation.set(0, 0, 0);
    playerGroup.visible = true;

    // Hide Menus & Show HUD
    gameMenu.classList.add("hidden");
    pauseModal.classList.add("hidden");
    gameOverModal.classList.add("hidden");
    damageFlash.classList.remove("flash-active", "flash-heavy");
    healFlash.classList.remove("flash-active");
    hud.classList.remove("hidden");

    // Clean up dynamic scene objects
    cleanAllDynamicObjects();

    // Rebuild initial track and objects
    initTrack();
    populateTrack();
    updatePlaneModel();
    updateHUD();

    playTone(587.33, "triangle", 0.4);
}

function cleanAllDynamicObjects() {
    trackSegments.forEach(seg => scene.remove(seg));
    trackSegments.length = 0;

    gates.forEach(g => scene.remove(g));
    gates.length = 0;

    coins.forEach(c => scene.remove(c));
    coins.length = 0;

    repairs.forEach(r => scene.remove(r));
    repairs.length = 0;

    obstacles.forEach(o => scene.remove(o));
    obstacles.length = 0;

    bullets.forEach(b => scene.remove(b.mesh));
    bullets.length = 0;

    particles.forEach(p => scene.remove(p.mesh));
    particles.length = 0;

    if (crashState.debrisParts) {
        crashState.debrisParts.forEach(d => scene.remove(d.mesh));
        crashState.debrisParts.length = 0;
    }
}

function addExp(amount) {
    gameState.exp = Math.max(0, gameState.exp + amount);

    const currentTarget = GAME_CONFIG.tiers[gameState.tierIndex].expTarget;

    // Check Evolution
    if (gameState.exp >= currentTarget && gameState.tierIndex < GAME_CONFIG.tiers.length - 1) {
        gameState.tierIndex++;
        gameState.score += 500;
        playEvolveSound();
        updatePlaneModel();

        // Increase shield on evolve
        gameState.maxShield = Math.min(6, gameState.maxShield + 1);
        healPlayer(1);

        // Show level up banner
        const nextTier = GAME_CONFIG.tiers[gameState.tierIndex];
        bannerTierName.textContent = `TIER ${nextTier.id}: ${nextTier.name}`;
        levelUpBanner.classList.remove("hidden");
        levelUpBanner.style.animation = "none";
        void levelUpBanner.offsetWidth;
        levelUpBanner.style.animation = "bannerPop 2.2s forwards ease-in-out";
        setTimeout(() => {
            levelUpBanner.classList.add("hidden");
        }, 2200);
    }

    updateHUD();
}

function updateHUD() {
    scoreVal.textContent = Math.floor(gameState.score);
    coinsVal.textContent = `🪙 ${gameState.coins}`;

    const currentTier = GAME_CONFIG.tiers[gameState.tierIndex];
    tierLabel.textContent = `TIER ${currentTier.id}`;
    planeName.textContent = currentTier.name;

    const prevTarget = gameState.tierIndex === 0 ? 0 : GAME_CONFIG.tiers[gameState.tierIndex - 1].expTarget;
    const range = currentTier.expTarget - prevTarget;
    const progress = THREE.MathUtils.clamp((gameState.exp - prevTarget) / range, 0, 1);
    evolutionFill.style.width = `${progress * 100}%`;

    expVal.textContent = Math.floor(gameState.exp);
    expTarget.textContent = currentTier.expTarget;

    const healthPct = (gameState.shield / gameState.maxShield) * 100;
    healthFill.style.width = `${healthPct}%`;

    if (healthText) {
        healthText.textContent = `${gameState.shield} / ${gameState.maxShield}`;
        if (gameState.shield <= 1) {
            healthText.classList.add("critical");
            healthFill.parentElement.classList.add("critical-bar");
        } else {
            healthText.classList.remove("critical");
            healthFill.parentElement.classList.remove("critical-bar");
        }
    }
}

// Button Listeners
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

// ============================================================================
// MAIN ANIMATION & GAME LOOP
// ============================================================================
const clock = new THREE.Clock();
let furthestTrackZ = -300;

function animate() {
    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);
    const now = clock.getElapsedTime();

    if (gameState.mode === "PLAYING") {
        updateGameplay(delta, now);
    } else if (gameState.mode === "CRASHING") {
        updateCrashing(delta, now);
    } else if (gameState.mode === "PAUSED") {
        // Paused: Keep scene rendered, do not advance physics
    } else {
        // Idle floating menu animation
        playerGroup.position.y = 1.2 + Math.sin(now * 2) * 0.2;
        playerGroup.rotation.z = Math.sin(now * 1.5) * 0.08;
    }

    // Spin propeller if active
    if (propellerMesh && gameState.mode !== "PAUSED") {
        propellerMesh.rotation.z += 25 * delta;
    }

    // Flicker jet flames
    if (gameState.mode !== "PAUSED") {
        jetExhaustMeshes.forEach(flame => {
            flame.scale.y = 0.85 + Math.sin(now * 30) * 0.3;
        });
    }

    // Animate energy shield on Tier 5
    const shield = playerGroup.getObjectByName("shieldMesh");
    if (shield && gameState.mode !== "PAUSED") {
        shield.rotation.y += 0.8 * delta;
        shield.rotation.x += 0.4 * delta;
    }

    // Render Scene
    renderer.render(scene, camera);
}

function updateParticles(delta) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= delta * 1.8;
        if (p.isRing) {
            p.mesh.scale.multiplyScalar(1 + 4 * delta);
            p.mesh.material.opacity = Math.max(0, p.life);
        } else {
            p.mesh.position.addScaledVector(p.vel, delta);
            p.vel.y -= 18 * delta; // gravity
        }

        if (p.life <= 0) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }
}

function updateGameplay(delta, now) {
    const tier = GAME_CONFIG.tiers[gameState.tierIndex];

    // 1. Move Player Forward (Track previous and current Z for swept collision)
    const prevZ = playerGroup.position.z;
    const moveDist = GAME_CONFIG.playerSpeed * delta;
    playerGroup.position.z -= moveDist;
    const currZ = playerGroup.position.z;

    gameState.distance += moveDist;
    gameState.score += moveDist * 2;

    // 2. Lateral Player Steering (Keyboard & Drag)
    const halfW = GAME_CONFIG.runwayWidth / 2 - 1.2;
    if (keysPressed.ArrowLeft || keysPressed.KeyA) {
        targetPlayerX -= GAME_CONFIG.lateralSpeed * delta;
    }
    if (keysPressed.ArrowRight || keysPressed.KeyD) {
        targetPlayerX += GAME_CONFIG.lateralSpeed * delta;
    }
    targetPlayerX = THREE.MathUtils.clamp(targetPlayerX, -halfW, halfW);

    // Smooth lerp to target X
    const prevX = playerGroup.position.x;
    playerGroup.position.x += (targetPlayerX - playerGroup.position.x) * 12 * delta;

    // Aerodynamic Banking Roll & Wobble
    const deltaX = playerGroup.position.x - prevX;
    const targetRoll = -deltaX * 1.8;
    playerGroup.rotation.z += (targetRoll - playerGroup.rotation.z) * 10 * delta;
    playerGroup.rotation.y = -deltaX * 0.6;
    playerGroup.position.y = 1.2 + Math.sin(now * 4) * 0.08;

    // Visual damage smoke on player plane
    if (gameState.shield <= 2 && Math.random() < 0.28) {
        spawnSmokeParticle(playerGroup.position.x, playerGroup.position.y, playerGroup.position.z + 0.8);
    }
    if (gameState.shield <= 1 && Math.random() < 0.35) {
        spawnFireParticle(playerGroup.position.x, playerGroup.position.y, playerGroup.position.z + 0.8);
    }

    // 3. Smooth Camera Follow
    camera.position.x += (playerGroup.position.x * 0.55 - camera.position.x) * 8 * delta;
    camera.position.y = playerGroup.position.y + GAME_CONFIG.cameraHeight;
    camera.position.z = playerGroup.position.z + GAME_CONFIG.cameraDistance;
    camera.lookAt(playerGroup.position.x * 0.3, 1.4, playerGroup.position.z - 16);

    // Apply Camera Shake if any
    if (cameraShakeIntensity > 0.01) {
        camera.position.x += (Math.random() - 0.5) * cameraShakeIntensity;
        camera.position.y += (Math.random() - 0.5) * cameraShakeIntensity;
        cameraShakeIntensity *= 0.9;
    }

    // Sun follows player
    sunLight.position.z = playerGroup.position.z + 40;
    sunLight.target.position.z = playerGroup.position.z - 20;
    sunLight.target.updateMatrixWorld();

    // 4. Recycle Track Segments
    trackSegments.forEach(seg => {
        if (seg.position.z > playerGroup.position.z + SEGMENT_LENGTH) {
            seg.position.z -= TOTAL_SEGMENTS * SEGMENT_LENGTH;
        }
    });

    // 5. Auto-fire Projectiles
    if (now - gameState.lastShotTime >= tier.fireRate) {
        fireBullets();
        gameState.lastShotTime = now;
    }

    // 6. Update Bullets (capped at 55 units forward range so player sees combat)
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.mesh.position.z -= b.speed * delta;

        if (b.mesh.position.z < playerGroup.position.z - 55) {
            scene.remove(b.mesh);
            bullets.splice(i, 1);
            continue;
        }

        // Bullet vs Drone/Obstacle Collision
        let bulletHit = false;
        for (let j = obstacles.length - 1; j >= 0; j--) {
            const obs = obstacles[j];
            if (!obs.userData.active) continue;

            const dist = b.mesh.position.distanceTo(obs.position);
            if (dist < obs.userData.radius + 0.4) {
                // If it's an indestructible laser hazard, bullets deflect
                if (obs.userData.isLaserHazard) {
                    spawnDebris(b.mesh.position.x, b.mesh.position.y, b.mesh.position.z, 0xff0044, 4);
                    bulletHit = true;
                    break;
                }

                obs.userData.hp -= b.damage;
                spawnDebris(b.mesh.position.x, b.mesh.position.y, b.mesh.position.z, 0x00ffff, 4);

                if (obs.userData.hp <= 0) {
                    obs.userData.active = false;
                    playExplosionSound();
                    spawnDebris(obs.position.x, obs.position.y, obs.position.z, 0xff3366, 18);
                    scene.remove(obs);
                    obstacles.splice(j, 1);
                    gameState.score += obs.userData.isArmored ? 350 : 150;
                    addExp(obs.userData.isArmored ? 30 : 15);
                }

                bulletHit = true;
                break;
            }
        }

        if (bulletHit) {
            scene.remove(b.mesh);
            bullets.splice(i, 1);
        }
    }

    // 7. Update Coins (Swept Z Collision)
    for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i];
        c.rotation.z += 3 * delta;

        if (c.userData.active && c.position.z <= prevZ + 1.2 && c.position.z >= currZ - 1.2) {
            if (Math.abs(c.position.x - playerGroup.position.x) < 1.6) {
                c.userData.active = false;
                playCoinSound();
                spawnDebris(c.position.x, c.position.y, c.position.z, 0xffd700, 8);
                scene.remove(c);
                coins.splice(i, 1);
                gameState.coins++;
                gameState.score += 50;
                addExp(5);
                continue;
            }
        }

        if (c.position.z > currZ + 15) {
            scene.remove(c);
            coins.splice(i, 1);
        }
    }

    // 8. Update Nanite Repairs (Healing Pickups)
    for (let i = repairs.length - 1; i >= 0; i--) {
        const r = repairs[i];
        r.rotation.y += 2.5 * delta;
        r.rotation.z += 1.5 * delta;

        if (r.userData.active && r.position.z <= prevZ + 1.4 && r.position.z >= currZ - 1.4) {
            if (Math.abs(r.position.x - playerGroup.position.x) < 1.8) {
                r.userData.active = false;
                healPlayer(1);
                spawnDebris(r.position.x, r.position.y, r.position.z, 0x00ff88, 14);
                scene.remove(r);
                repairs.splice(i, 1);
                gameState.score += 100;
                continue;
            }
        }

        if (r.position.z > currZ + 15) {
            scene.remove(r);
            repairs.splice(i, 1);
        }
    }

    // 9. Update Gates (Swept Z Collision)
    for (let i = gates.length - 1; i >= 0; i--) {
        const g = gates[i];

        if (g.userData.active && g.position.z <= prevZ + 1.4 && g.position.z >= currZ - 1.4) {
            if (Math.abs(playerGroup.position.x - g.position.x) < 2.5) {
                g.userData.active = false;
                gameState.gatesPassed++;
                const data = g.userData.data;

                spawnDebris(g.position.x, 2, g.position.z, data.positive ? 0x00ff88 : 0xff3366, 20);

                if (data.type === "exp") {
                    addExp(data.value);
                    if (data.value < 0) {
                        damageFlash.classList.add("flash-active");
                        setTimeout(() => damageFlash.classList.remove("flash-active"), 120);
                        cameraShakeIntensity = 0.3;
                    }
                } else if (data.type === "evolve") {
                    const nextTarget = GAME_CONFIG.tiers[gameState.tierIndex].expTarget;
                    addExp(nextTarget - gameState.exp + 10);
                } else if (data.type === "shield") {
                    healPlayer(1);
                } else if (data.type === "shield_max") {
                    gameState.maxShield++;
                    healPlayer(1);
                } else if (data.type === "shield_damage") {
                    damagePlayer(1, "Critical Hazard Gate &bull; Core Overloaded");
                }

                playGateSound(data.positive);

                g.children.forEach(child => {
                    if (child.material) child.material.opacity = 0.2;
                });
            }
        }

        if (g.position.z > currZ + 15) {
            scene.remove(g);
            gates.splice(i, 1);
        }
    }

    // 10. Update Obstacles vs Player Collision (Swept Z Collision)
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.rotation.x += 1.5 * delta;
        obs.rotation.y += 1.8 * delta;

        if (obs.userData.active && obs.position.z <= prevZ + 1.4 && obs.position.z >= currZ - 1.4) {
            const hitRadius = obs.userData.radius || 1.2;
            if (Math.abs(obs.position.x - playerGroup.position.x) < hitRadius + 0.6) {
                obs.userData.active = false;
                spawnDebris(obs.position.x, obs.position.y, obs.position.z, 0xff3366, 20);
                scene.remove(obs);
                obstacles.splice(i, 1);

                const reason = obs.userData.isLaserHazard ?
                    "Laser Hazard Field &bull; Aircraft Sliced" :
                    (obs.userData.isArmored ? "Collision with Armored Barricade" : "Collision with Aerial Mine &bull; Hull Destroyed");

                damagePlayer(1, reason);
            }
        }

        if (obs.position.z > currZ + 15) {
            scene.remove(obs);
            obstacles.splice(i, 1);
        }
    }

    // 11. Endless Spawner Ahead
    if (playerGroup.position.z - 280 < furthestTrackZ) {
        furthestTrackZ -= 60;
        spawnGatePair(furthestTrackZ);
        spawnCoinRow(furthestTrackZ - 18);
        if (Math.random() < 0.6) {
            spawnRepairPickup(furthestTrackZ - 28);
        }
        spawnObstacleCluster(furthestTrackZ - 38);
    }

    // 12. Update Particles
    updateParticles(delta);

    updateHUD();
}

// ============================================================================
// WINDOW RESIZE HANDLER & INITIALIZATION
// ============================================================================
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize era selector & start loop
initEraSelector();
animate();
