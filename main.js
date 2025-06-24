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
World.add(world, [ground, leftWall, rightWall]);

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

// Clamp ball velocity based on user input
Events.on(engine, 'beforeUpdate', () => {
  const vx = ball.velocity.x;
  const vy = ball.velocity.y;
  const speed = Math.sqrt(vx * vx + vy * vy);
  if (speed > maxVelocity && speed !== 0) {
    const scale = maxVelocity / speed;
    Body.setVelocity(ball, { x: vx * scale, y: vy * scale });
  }
});

// Reset button handler
document.getElementById('resetButton').addEventListener('click', reset);

// Reset function
function reset() {
  score = 0;
  Body.setPosition(ball, { x: width / 2, y: height - 60 });
  Body.setVelocity(ball, { x: 0, y: 0 });
  Body.setAngularVelocity(ball, 0);

  setupPins();
}

// Simple scoring when pins fall below a certain angle
let score = 0;
let gutterHit = false;

Events.on(engine, 'collisionStart', (event) => {
  if (gutterHit) return;
  event.pairs.forEach(({ bodyA, bodyB }) => {
    if (
      (bodyA === ball && (bodyB === gutterLeft || bodyB === gutterRight)) ||
      (bodyB === ball && (bodyA === gutterLeft || bodyA === gutterRight))
    ) {
      gutterHit = true;
      setTimeout(() => {
        alert('Gutter! Score: 0');
        reset();
        gutterHit = false;
      }, 100);
    }
  });
});
Events.on(engine, 'afterUpdate', () => {
  pins.forEach((pin) => {
    if (!pin.isSleeping && (pin.angle > 0.7 || pin.angle < -0.7)) {
      score += 1;
      World.remove(world, pin);
      pins = pins.filter((p) => p !== pin);
    }
  });

  if (pins.length === 0) {
    setTimeout(() => {
      alert('Score: ' + score);
      reset();
    }, 1000);
  }
});

reset();
