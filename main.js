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
const ground = Bodies.rectangle(width / 2, height - 20, width, 40, { isStatic: true });
const leftWall = Bodies.rectangle(0, height / 2, 40, height, { isStatic: true });
const rightWall = Bodies.rectangle(width, height / 2, 40, height, { isStatic: true });
World.add(world, [ground, leftWall, rightWall]);

// Gutters detect when the ball leaves the lane
const gutterWidth = 80;
const gutterLeft = Bodies.rectangle(40 + gutterWidth / 2, height / 2, gutterWidth, height, {
  isStatic: true,
  isSensor: true
});
const gutterRight = Bodies.rectangle(width - (40 + gutterWidth / 2), height / 2, gutterWidth, height, {
  isStatic: true,
  isSensor: true
});
World.add(world, [gutterLeft, gutterRight]);

// Pins setup (diamond arrangement)
const pinRadius = 15;
const startX = width / 2;
// Original starting height, used now that gravity is disabled so
// the pins stay in place.
const startY = height / 4;
// Space between pins (doubled from the original layout)
const pinSpacing = pinRadius * 5;
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
