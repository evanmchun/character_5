import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1, 3);
camera.lookAt(0, 0, 0);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Add a ground plane
const groundGeometry = new THREE.PlaneGeometry(10, 10);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x808080,
    roughness: 0.8,
    metalness: 0.2
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0; // Ground at y = 0
ground.receiveShadow = true;
scene.add(ground);

// Add a grid helper
const gridHelper = new THREE.GridHelper(10, 10);
gridHelper.position.y = 0; // Grid at y = 0
scene.add(gridHelper);

// Add axes helper
const axesHelper = new THREE.AxesHelper(5);
axesHelper.position.y = 0; // Axes at y = 0
scene.add(axesHelper);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 1;
controls.maxDistance = 10;

// Animation setup
let mixer;
let idleAction;
let runAction;
let fastRunAction;
let currentAction;
let character;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
const moveSpeed = 0.02;
const sprintSpeed = 0.05; // Faster speed when sprinting
const rotateSpeed = 0.5;

// Keyboard controls
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false
};

window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() in keys) {
        keys[event.key.toLowerCase()] = true;
    } else if (event.key === 'Shift') {
        keys.shift = true;
    }
});

window.addEventListener('keyup', (event) => {
    if (event.key.toLowerCase() in keys) {
        keys[event.key.toLowerCase()] = false;
    } else if (event.key === 'Shift') {
        keys.shift = false;
    }
});

// Load FBX character
const loader = new FBXLoader();

// Load idle animation
loader.load('character/ch_idle.fbx', 
    (fbx) => {
        console.log('Idle animation loaded successfully');
        character = fbx;
        
        // Reset transformations
        character.position.set(0, 0, 0);
        character.rotation.set(0, 0, 0);
        character.scale.set(1, 1, 1);
        
        // Set the scale
        const scale = 0.5;
        character.scale.set(scale, scale, scale);
        
        // Enable shadows for all meshes in the character
        character.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        scene.add(character);
        
        // Position the character manually
        character.position.y = 0; // Start at ground level
        
        // Add transparent bounding box
        const boxHelper = new THREE.BoxHelper(character, 0xffff00);
        boxHelper.material.transparent = true;
        boxHelper.material.opacity = .0;
        scene.add(boxHelper);

        // Set up idle animation
        mixer = new THREE.AnimationMixer(character);
        const idleClip = fbx.animations[0];
        idleAction = mixer.clipAction(idleClip);
        idleAction.play();
        currentAction = idleAction;
        console.log('Playing idle animation:', idleClip.name);

        // Load run animation
        loader.load('character/ch_run.fbx',
            (runFbx) => {
                console.log('Run animation loaded successfully');
                const runClip = runFbx.animations[0];
                runAction = mixer.clipAction(runClip);
                runAction.play();
                runAction.stop(); // Start in idle state
                console.log('Run animation ready:', runClip.name);

                // Load fast run animation
                loader.load('character/ch_fast_run.fbx',
                    (fastRunFbx) => {
                        console.log('Fast run animation loaded successfully');
                        const fastRunClip = fastRunFbx.animations[0];
                        fastRunAction = mixer.clipAction(fastRunClip);
                        fastRunAction.play();
                        fastRunAction.stop(); // Start in idle state
                        console.log('Fast run animation ready:', fastRunClip.name);
                    },
                    (xhr) => {
                        console.log((xhr.loaded / xhr.total * 100) + '% fast run animation loaded');
                    },
                    (error) => {
                        console.error('Error loading fast run animation:', error);
                    }
                );
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% run animation loaded');
            },
            (error) => {
                console.error('Error loading run animation:', error);
            }
        );
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% idle animation loaded');
    },
    (error) => {
        console.error('Error loading idle animation:', error);
    }
);

// Animation loop
const clock = new THREE.Clock();

function updateCharacterMovement() {
    if (!character) return;

    // Calculate movement direction
    const moveDirection = new THREE.Vector3();
    if (keys.w) moveDirection.z -= 1;
    if (keys.s) moveDirection.z += 1;
    if (keys.a) moveDirection.x -= 1;
    if (keys.d) moveDirection.x += 1;

    // Normalize movement vector
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
        
        // Determine current speed and animation
        const isSprinting = keys.shift;
        const currentSpeed = isSprinting ? sprintSpeed : moveSpeed;
        const targetAction = isSprinting ? fastRunAction : runAction;
        
        // Update animation
        if (currentAction !== targetAction) {
            currentAction.fadeOut(0.2);
            targetAction.reset().fadeIn(0.2).play();
            currentAction = targetAction;
        }

        // Calculate rotation
        const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
        character.rotation.y = THREE.MathUtils.lerp(character.rotation.y, targetRotation, rotateSpeed);

        // Move character
        character.position.x += moveDirection.x * currentSpeed;
        character.position.z += moveDirection.z * currentSpeed;
    } else {
        // Return to idle animation
        if (currentAction !== idleAction) {
            currentAction.fadeOut(0.2);
            idleAction.reset().fadeIn(0.2).play();
            currentAction = idleAction;
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update animation mixer
    if (mixer) {
        mixer.update(clock.getDelta());
    }
    
    // Update character movement
    updateCharacterMovement();
    
    controls.update();
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Add error handling for WebGL
renderer.domElement.addEventListener('webglcontextlost', (event) => {
    console.error('WebGL context lost');
    event.preventDefault();
}, false);

animate(); 