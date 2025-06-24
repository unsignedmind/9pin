// Basic nine-pin bowling game using Matter.js
const { Engine, Render, Runner, World, Bodies, Body, Events, Mouse, MouseConstraint } = Matter;

const engine = Engine.create();
const world = engine.world;
// Disable gravity for a top-down view so pins don't fall off the screen
world.gravity.y = 0;

const canvas = document.getElementById('gameCanvas');
const width = window.innerWidth;
const height = window.innerHeight;
canvas.width = width;
canvas.height = height;

const render = Render.create({
  canvas: canvas,
  engine: engine,
  options: {
    width: width,
    height: height,
    wireframes: false,
    background: '#fafafa'
  }
});

Render.run(render);
Runner.run(Runner.create(), engine);

// Boundaries
// Narrow lane around the pins
const pinRadius = 15;
// Space between pins (doubled from the original layout)
const pinSpacing = pinRadius * 5;
const startX = width / 2;
// Width between the two gutters
const gutterOffset = pinSpacing * 2;
const laneWidth = gutterOffset * 2;

const ground = Bodies.rectangle(startX, height - 20, laneWidth + 40, 40, {
  isStatic: true
});
const leftWall = Bodies.rectangle(startX - laneWidth / 2, height / 2, 40, height, {
  isStatic: true
});
const rightWall = Bodies.rectangle(startX + laneWidth / 2, height / 2, 40, height, {
  isStatic: true
});
const topSensor = Bodies.rectangle(startX, 20, laneWidth + 40, 20, {
  isStatic: true,
  isSensor: true
});
World.add(world, [ground, leftWall, rightWall, topSensor]);

// Pins setup (diamond arrangement)
// Start position roughly a quarter way down the lane
const startY = height / 4;

// Gutters detect when the ball leaves the lane. The gap from the outermost
// pin to each gutter equals half the width of the full pin formation.
const gutterWidth = 80;
const gutterLeft = Bodies.rectangle(startX - gutterOffset, height / 2, gutterWidth, height, {
  isStatic: true,
  isSensor: true
});
const gutterRight = Bodies.rectangle(startX + gutterOffset, height / 2, gutterWidth, height, {
  isStatic: true,
  isSensor: true
});
World.add(world, [gutterLeft, gutterRight]);
let pins = [];

function setupPins() {
  // Remove any existing pins and recreate them with the desired spacing
  pins.forEach((pin) => World.remove(world, pin));
  pins = [];
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i <= row; i++) {
      const x = startX + (i - row / 2) * pinSpacing;
      const y = startY - row * pinSpacing;
      const pin = Bodies.circle(x, y, pinRadius, { restitution: 0.5 });
      pin.startX = x;
      pin.startY = y;
      pin.scored = false;
      pins.push(pin);
    }
  }
  World.add(world, pins);
}

setupPins();

// Bowling ball
const ball = Bodies.circle(width / 2, height - 60, 20, { restitution: 0.5 });
World.add(world, ball);

// Velocity limit control
const maxVelocityInput = document.getElementById('maxVelocity');
let maxVelocity = 20;
maxVelocityInput.value = maxVelocity;
maxVelocityInput.addEventListener('input', () => {
  const v = parseFloat(maxVelocityInput.value);
  if (!isNaN(v)) maxVelocity = v;
});

// Spin controls
const spinSlider = document.getElementById('spinSlider');
const minSpinInput = document.getElementById('minSpin');
const maxSpinInput = document.getElementById('maxSpin');
const spinValueDisplay = document.getElementById('spinValue');
const SPIN_CURVE_FORCE = 0.0005;
let minSpin = -1;
let maxSpin = 1;
spinSlider.min = minSpin;
spinSlider.max = maxSpin;
spinSlider.value = 0;
spinValueDisplay.textContent = '0';
minSpinInput.value = minSpin;
maxSpinInput.value = maxSpin;

spinSlider.addEventListener('input', () => {
  spinValueDisplay.textContent = spinSlider.value;
});

minSpinInput.addEventListener('input', () => {
  const v = parseFloat(minSpinInput.value);
  if (!isNaN(v)) {
    minSpin = v;
    spinSlider.min = v;
    if (parseFloat(spinSlider.value) < v) spinSlider.value = v;
    spinValueDisplay.textContent = spinSlider.value;
  }
});

maxSpinInput.addEventListener('input', () => {
  const v = parseFloat(maxSpinInput.value);
  if (!isNaN(v)) {
    maxSpin = v;
    spinSlider.max = v;
    if (parseFloat(spinSlider.value) > v) spinSlider.value = v;
    spinValueDisplay.textContent = spinSlider.value;
  }
});

// Mouse control
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
  mouse: mouse,
  constraint: {
    stiffness: 0.2,
    render: { visible: false }
  }
});
World.add(world, mouseConstraint);
render.mouse = mouse;

// Apply spin when the ball is released
Events.on(mouseConstraint, 'enddrag', (event) => {
  if (event.body === ball) {
    const spin = parseFloat(spinSlider.value);
    if (!isNaN(spin)) {
      Body.setAngularVelocity(ball, spin);
      spinValueDisplay.textContent = spinSlider.value;
    }
  }
});

// Clamp ball velocity based on user input
Events.on(engine, 'beforeUpdate', () => {
  const vx = ball.velocity.x;
  const vy = ball.velocity.y;
  const speed = Math.sqrt(vx * vx + vy * vy);
  if (speed > maxVelocity && speed !== 0) {
    const scale = maxVelocity / speed;
    Body.setVelocity(ball, { x: vx * scale, y: vy * scale });
  }
  if (!ballLaunched && speed > 0.1) {
    ballLaunched = true;
  }
  if (ballLaunched && speed > 0.1 && Math.abs(ball.angularVelocity) > 0.001) {
    const forceX = ball.angularVelocity * SPIN_CURVE_FORCE;
    Body.applyForce(ball, ball.position, { x: forceX, y: 0 });
  }
});

// Reset button handler
document.getElementById('resetButton').addEventListener('click', reset);

// Reset function
function reset() {
  score = 0;
  gameOver = false;
  ballLaunched = false;
  gutterHit = false;
  Body.setPosition(ball, { x: width / 2, y: height - 60 });
  Body.setVelocity(ball, { x: 0, y: 0 });
  Body.setAngularVelocity(ball, 0);

  setupPins();
}

// Track scoring and game state
let score = 0;
let gutterHit = false;
let gameOver = false;
let ballLaunched = false;

Events.on(engine, 'collisionStart', (event) => {
  if (gutterHit) return;
  event.pairs.forEach(({ bodyA, bodyB }) => {
    if (
      (bodyA === ball && (bodyB === gutterLeft || bodyB === gutterRight)) ||
      (bodyB === ball && (bodyA === gutterLeft || bodyA === gutterRight))
    ) {
      gutterHit = true;
      gameOver = true;
      setTimeout(() => {
        alert('Gutter! Score: 0');
        reset();
        gutterHit = false;
        gameOver = false;
      }, 100);
    }

    // Stop the ball or pins if they touch the top sensor
    const hitTopSensorA = bodyA === topSensor && (bodyB === ball || pins.includes(bodyB));
    const hitTopSensorB = bodyB === topSensor && (bodyA === ball || pins.includes(bodyA));
    if (hitTopSensorA || hitTopSensorB) {
      const target = hitTopSensorA ? bodyB : bodyA;
      Body.setVelocity(target, { x: 0, y: 0 });
      Body.setAngularVelocity(target, 0);
    }
  });
});
Events.on(engine, 'afterUpdate', () => {
  // Award points for pins that tip over past a certain angle
  pins.forEach((pin) => {
    if (!pin.scored && (pin.angle > 0.7 || pin.angle < -0.7)) {
      pin.scored = true;
      score += 1;
      World.remove(world, pin);
      pins = pins.filter((p) => p !== pin);
    }
  });

  // Determine if the ball and all pins have come to rest
  const threshold = 0.05;
  const ballStopped =
    Math.abs(ball.velocity.x) < threshold && Math.abs(ball.velocity.y) < threshold;
  const pinsStopped = pins.every(
    (p) => Math.abs(p.velocity.x) < threshold && Math.abs(p.velocity.y) < threshold
  );

  if (ballLaunched && !gameOver && ballStopped && pinsStopped) {
    gameOver = true;
    setTimeout(() => {
      alert('Score: ' + score);
      reset();
    }, 500);
  }
});

reset();
