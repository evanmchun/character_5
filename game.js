import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

// Add environment map
const envMapLoader = new THREE.CubeTextureLoader();
const envMap = envMapLoader.load([
    'https://threejs.org/examples/textures/cube/Park2/posx.jpg',
    'https://threejs.org/examples/textures/cube/Park2/negx.jpg',
    'https://threejs.org/examples/textures/cube/Park2/posy.jpg',
    'https://threejs.org/examples/textures/cube/Park2/negy.jpg',
    'https://threejs.org/examples/textures/cube/Park2/posz.jpg',
    'https://threejs.org/examples/textures/cube/Park2/negz.jpg'
]);
scene.environment = envMap;

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(10, 10, 10); // Isometric position
camera.lookAt(0, 0, 0); // Look at the center of the scene

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

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // Increased intensity from 0.5 to 1.0
scene.add(ambientLight);

// Main directional light (sun)
const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
mainLight.position.set(5, 5, 2);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.near = 0.1;
mainLight.shadow.camera.far = 100;
scene.add(mainLight);

// Fill light from the back
const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
backLight.position.set(-5, 3, -5);
backLight.castShadow = false;
scene.add(backLight);

// Fill light from the front
const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
fillLight.position.set(2, 2, 5);
fillLight.castShadow = false;
scene.add(fillLight);

// Setup your camera and target offset
const cameraOffset = new THREE.Vector3(0, 2, -10); // Lowered height from 5 to 2
const targetPosition = new THREE.Vector3();
const minDistance = 1; // Reduced minimum distance from 3 to 1
const maxDistance = 20;
let currentDistance = 10;

// Mouse rotation controls
let rotation = new THREE.Vector2(); // yaw only
let isMouseDown = false;

window.addEventListener("mousedown", () => isMouseDown = true);
window.addEventListener("mouseup", () => isMouseDown = false);
window.addEventListener("mousemove", (e) => {
  if (isMouseDown) {
    rotation.x -= e.movementX * 0.002; // horizontal rotation only
  }
});

// Add mouse wheel zoom
window.addEventListener("wheel", (e) => {
  currentDistance += e.deltaY * 0.01; // Increased zoom sensitivity from 0.01 to 0.1
  currentDistance = Math.max(minDistance, Math.min(maxDistance, currentDistance));
});

function updateCamera() {
    if (!character) return;
    
    // Calculate camera position based on character position
    const offset = new THREE.Vector3(
        currentDistance * Math.cos(Math.PI / 4), // 45 degrees
        currentDistance * Math.sin(Math.PI / 4), // 45 degrees
        currentDistance * Math.cos(Math.PI / 4)  // 45 degrees
    );
    
    // Calculate desired position
    const desiredPosition = character.position.clone().add(offset);
    
    // Smooth camera movement (lerp)
    camera.position.lerp(desiredPosition, 0.1);
    
    // Look at the character
    camera.lookAt(character.position);
}

// Animation setup
let mixer;
let idleAction;
let runAction;
let fastRunAction;
let moonwalkAction;  // Add moonwalk action
let currentAction;
let character;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
const moveSpeed = 0.02;
const sprintSpeed = 0.05; // Faster speed when sprinting
const rotateSpeed = 0.05; // Reduced from 0.5 to 0.1 for slower turning

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
        
        // Enable shadows and adjust material properties for all meshes in the character
        character.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                // Adjust material properties
                if (child.material) {
                    child.material.roughness = 1.0;  // Maximum roughness for matte appearance
                    child.material.metalness = 0.0;  // No metallic reflection
                    child.material.envMapIntensity = 0.0;  // No environment map reflection
                    child.material.envMap = null;  // Remove environment map
                }
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

                        // Load moonwalk animation
                        loader.load('character/ch_moonwalk.fbx',
                            (moonwalkFbx) => {
                                console.log('Moonwalk animation loaded successfully');
                                const moonwalkClip = moonwalkFbx.animations[0];
                                moonwalkAction = mixer.clipAction(moonwalkClip);
                                moonwalkAction.play();
                                moonwalkAction.stop(); // Start in idle state
                                console.log('Moonwalk animation ready:', moonwalkClip.name);
                            },
                            (xhr) => {
                                console.log((xhr.loaded / xhr.total * 100) + '% moonwalk animation loaded');
                            },
                            (error) => {
                                console.error('Error loading moonwalk animation:', error);
                            }
                        );
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

function updateCharacterMovement() {
    if (!character) return;

    // Calculate movement direction in world space
    const moveDirection = new THREE.Vector3();
    if (keys.w) moveDirection.z += 1;
    if (keys.s) moveDirection.z -= 1;
    if (keys.a) moveDirection.x += 1;
    if (keys.d) moveDirection.x -= 1;

    // Normalize movement vector
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
        
        // Determine current speed and animation
        const isSprinting = keys.shift;
        const currentSpeed = isSprinting ? sprintSpeed : moveSpeed;
        let targetAction;
        
        // Choose animation based on movement
        if (keys.s) {
            console.log('S key pressed, selecting moonwalk animation');
            targetAction = moonwalkAction; // Use moonwalk when pressing S
        } else if (isSprinting) {
            targetAction = fastRunAction;
        } else {
            targetAction = runAction;
        }
        
        // Update animation
        if (currentAction !== targetAction) {
            console.log('Switching to animation:', targetAction ? targetAction.getClip().name : 'none');
            currentAction.fadeOut(0.2);
            targetAction.reset().fadeIn(0.2).play();
            currentAction = targetAction;
        }

        // Convert movement direction to local space (relative to character's rotation)
        moveDirection.applyQuaternion(character.quaternion);

        // Move character in the direction it's facing
        character.position.x += moveDirection.x * currentSpeed;
        character.position.z += moveDirection.z * currentSpeed;

        // Only rotate when moving sideways (A or D)
        if (keys.a || keys.d) {
            const targetRotation = Math.atan2(moveDirection.x, moveDirection.z);
            
            // Handle angle wrapping for smooth rotation
            let currentRotation = character.rotation.y;
            let diff = targetRotation - currentRotation;
            
            // Normalize the difference to the shortest path
            if (diff > Math.PI) diff -= 2 * Math.PI;
            if (diff < -Math.PI) diff += 2 * Math.PI;
            
            // Apply the rotation
            character.rotation.y = currentRotation + diff * rotateSpeed;
        }
    } else {
        // Return to idle animation
        if (currentAction !== idleAction) {
            currentAction.fadeOut(0.2);
            idleAction.reset().fadeIn(0.2).play();
            currentAction = idleAction;
        }
    }
}

// Animation loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    // Update animation mixer
    if (mixer) {
        mixer.update(clock.getDelta());
    }
    
    // Update character movement
    updateCharacterMovement();
    
    // Update camera position
    updateCamera();
    
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