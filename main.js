// Basic nine-pin bowling game using Matter.js
const { Engine, Render, Runner, World, Bodies, Body, Events, Mouse, MouseConstraint } = Matter;

const engine = Engine.create();
const world = engine.world;

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

// Pins setup (diamond arrangement)
const pinRadius = 15;
const startX = width / 2;
const startY = height / 4;
let pins = [];
for (let row = 0; row < 3; row++) {
  for (let i = 0; i <= row; i++) {
    const x = startX + (i - row / 2) * pinRadius * 2.5;
    const y = startY - row * pinRadius * 2.5;
    const pin = Bodies.circle(x, y, pinRadius, { restitution: 0.5 });
    pins.push(pin);
  }
}
World.add(world, pins);

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

// Reset function
function reset() {
  Body.setPosition(ball, { x: width / 2, y: height - 60 });
  Body.setVelocity(ball, { x: 0, y: 0 });
  Body.setAngularVelocity(ball, 0);

  pins.forEach((pin, index) => {
    const row = Math.floor((Math.sqrt(8 * index + 1) - 1) / 2);
    const idxInRow = index - (row * (row + 1)) / 2;
    const x = startX + (idxInRow - row / 2) * pinRadius * 2.5;
    const y = startY - row * pinRadius * 2.5;
    Body.setPosition(pin, { x, y });
    Body.setVelocity(pin, { x: 0, y: 0 });
    Body.setAngularVelocity(pin, 0);
  });
}

// Simple scoring when pins fall below a certain angle
let score = 0;
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
      score = 0;
      pins = [];
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i <= row; i++) {
          const x = startX + (i - row / 2) * pinRadius * 2.5;
          const y = startY - row * pinRadius * 2.5;
          const pin = Bodies.circle(x, y, pinRadius, { restitution: 0.5 });
          pins.push(pin);
        }
      }
      World.add(world, pins);
      reset();
    }, 1000);
  }
});

reset();
