
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>BMC 3D Visualization</title>
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="https://cdn.babylonjs.com/gui/babylon.gui.min.js"></script>
  <style>
    html, body { margin: 0; overflow: hidden; }
    canvas { width: 100%; height: 100vh; display: block; }
    .label {
      position: absolute;
      background: rgba(255,255,255,0.85);
      padding: 4px 8px;
      border-radius: 4px;
      font-family: sans-serif;
      font-size: 12px;
      pointer-events: none;
      transform: translate(-50%, -100%);
      white-space: nowrap;
    }
  </style>
</head>
<body>
<canvas id="renderCanvas"></canvas>
<script>
  const canvas = document.getElementById("renderCanvas");
  const engine = new BABYLON.Engine(canvas, true);
  const scene = new BABYLON.Scene(engine);

  const camera = new BABYLON.ArcRotateCamera("Camera", Math.PI/2, Math.PI/3, 15, BABYLON.Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0), scene);

  const labeledShapes = [
    { label: 'Customer Segments', points: [{"x":0.046,"y":3.56},{"x":-0.633,"y":3.229},{"x":-1.22,"y":2.355},{"x":-1.574,"y":1.175},{"x":-1.684,"y":-0.325},{"x":-1.533,"y":-1.6},{"x":-1.057,"y":-2.898},{"x":-0.453,"y":-3.595},{"x":0.238,"y":-3.772},{"x":0.865,"y":-3.453},{"x":1.481,"y":-2.521},{"x":1.818,"y":-1.364},{"x":1.922,"y":0.1},{"x":1.771,"y":1.375},{"x":1.341,"y":2.591},{"x":0.743,"y":3.335}]},
    { label: 'Customer Relationships', points: [{"x":-5.0,"y":4.976},{"x":-5.0,"y":-5.0},{"x":-3.217,"y":-5.0},{"x":-3.217,"y":4.976}]},
    { label: 'Customer Channels', points: [{"x":3.217,"y":4.988},{"x":3.217,"y":-4.976},{"x":5.0,"y":-4.988},{"x":5.0,"y":5.0}]},
    { label: 'Value Proposition', points: [{"x":-2.991,"y":-0.136},{"x":-1.963,"y":-0.159},{"x":-1.603,"y":2.296},{"x":-0.97,"y":3.536},{"x":-0.18,"y":4.126},{"x":-0.174,"y":4.976},{"x":-2.997,"y":4.976}]},
    { label: 'Key Partners', points: [{"x":-2.991,"y":-0.584},{"x":-2.997,"y":-5.0},{"x":-0.174,"y":-5.0},{"x":-0.174,"y":-4.244},{"x":-0.865,"y":-3.772},{"x":-1.469,"y":-2.769},{"x":-1.94,"y":-0.584}]},
    { label: 'Key Activities', points: [{"x":0.366,"y":4.976},{"x":0.366,"y":4.174},{"x":1.202,"y":3.548},{"x":1.812,"y":2.391},{"x":2.108,"y":1.175},{"x":2.207,"y":-0.136},{"x":2.991,"y":-0.124},{"x":2.997,"y":4.988}]},
    { label: 'Key Resources', points: [{"x":2.985,"y":-0.549},{"x":2.207,"y":-0.549},{"x":2.979,"y":-0.596},{"x":2.973,"y":-4.953},{"x":0.383,"y":-4.941},{"x":0.395,"y":-4.268},{"x":1.736,"y":-2.769},{"x":2.178,"y":-0.573},{"x":1.731,"y":-2.721},{"x":0.354,"y":-4.268},{"x":0.354,"y":-4.988},{"x":2.997,"y":-4.988}]},
    { label: 'Revenue Streams', points: [{"x":2.515,"y":-3.914},{"x":2.52,"y":-4.091},{"x":2.538,"y":-4.079},{"x":2.538,"y":-3.973},{"x":2.549,"y":-3.949},{"x":2.567,"y":-3.973},{"x":2.573,"y":-4.091},{"x":2.59,"y":-4.079},{"x":2.59,"y":-3.985},{"x":2.607,"y":-3.949},{"x":2.619,"y":-3.973},{"x":2.619,"y":-4.079},{"x":2.642,"y":-4.079},{"x":2.636,"y":-3.926},{"x":2.607,"y":-3.914},{"x":2.59,"y":-3.937},{"x":2.573,"y":-3.914}]},
    { label: 'Cost Structure', points: [{"x":2.439,"y":-3.914},{"x":2.41,"y":-3.961},{"x":2.404,"y":-4.008},{"x":2.41,"y":-4.02},{"x":2.41,"y":-4.044},{"x":2.427,"y":-4.079},{"x":2.456,"y":-4.091},{"x":2.462,"y":-4.079},{"x":2.485,"y":-4.067},{"x":2.497,"y":-4.02},{"x":2.497,"y":-3.985},{"x":2.48,"y":-3.926},{"x":2.468,"y":-3.914}]}
  ];

  function worldToScreen(pos, camera, canvas) {
    const transform = BABYLON.Vector3.Project(pos, BABYLON.Matrix.Identity(), scene.getTransformMatrix(), camera.viewport.toGlobal(canvas.width, canvas.height));
    return { x: transform.x, y: transform.y };
  }

  labeledShapes.forEach((shape, idx) => {
    const polygonPoints = shape.points.map(p => new BABYLON.Vector3(p.x, 0, p.y));
    const mesh = BABYLON.MeshBuilder.ExtrudePolygon("region_" + idx, {
      shape: polygonPoints,
      depth: 1,
      sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);

    // Center label using average of polygon points
    const center = polygonPoints.reduce((acc, p) => acc.add(p), new BABYLON.Vector3(0, 0, 0)).scale(1 / polygonPoints.length);
    mesh.metadata = { label: shape.label, center: center };

    // Create HTML label
    const div = document.createElement('div');
    div.className = 'label';
    div.textContent = shape.label;
    document.body.appendChild(div);
    mesh.metadata.htmlElement = div;
  });

  engine.runRenderLoop(() => {
    scene.render();

    // Update label positions
    labeledShapes.forEach((shape, idx) => {
      const mesh = scene.getMeshByName("region_" + idx);
      const html = mesh.metadata.htmlElement;
      const screen = worldToScreen(mesh.metadata.center.add(new BABYLON.Vector3(0, 1.1, 0)), camera, canvas);
      html.style.left = screen.x + "px";
      html.style.top = screen.y + "px";
    });
  });

  window.addEventListener("resize", () => engine.resize());
</script>
</body>
</html>
