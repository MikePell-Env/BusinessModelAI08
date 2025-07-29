// 3D Business Model Canvas - Babylon.js Playground Script
// Based on Canvas3DBabylon.tsx implementation

var createScene = function () {
    // Create engine and scene
    var scene = new BABYLON.Scene(engine);
    
    // Set background to light gray (#e9ecef)
    scene.clearColor = new BABYLON.Color4(233/255, 236/255, 239/255, 1.0);
    
    // Global variables for interaction state
    var contentPanels = [];
    var originalHeights = {};
    var selectedObjectName = null;
    var isOrthographic = false;
    var rootMesh = null;
    
    // Business Model Canvas sample data
    var sampleCanvas = {
        name: "Sample Business Model",
        elements: [
            { name: "Key Partners", content: "Strategic partnerships and alliances that support our business model." },
            { name: "Key Activities", content: "Core activities required to deliver our value proposition." },
            { name: "Key Resources", content: "Critical assets needed to make our business model work." },
            { name: "Value Propositions", content: "Products and services that create value for customer segments." },
            { name: "Customer Relationships", content: "Types of relationships we establish with customer segments." },
            { name: "Customer Channels", content: "How we reach and deliver value to our customers." },
            { name: "Customer Segments", content: "Different groups of people our organization aims to serve." }
        ]
    };

    // Create perspective camera
    var perspectiveCamera = new BABYLON.ArcRotateCamera(
        "perspectiveCamera",
        -Math.PI / 2.5,  // Alpha - angled from the side
        Math.PI / 6,     // Beta - high angle for top-down perspective
        25,              // Radius - distance from target
        BABYLON.Vector3.Zero(),
        scene
    );
    perspectiveCamera.setTarget(BABYLON.Vector3.Zero());
    perspectiveCamera.attachControl(canvas, true);
    
    // Reduce mouse wheel sensitivity for smoother zooming
    perspectiveCamera.wheelPrecision = 50;
    
    // Set camera limits
    perspectiveCamera.lowerRadiusLimit = 5;
    perspectiveCamera.upperRadiusLimit = 25;
    perspectiveCamera.lowerBetaLimit = 0.1;
    perspectiveCamera.upperBetaLimit = Math.PI / 2.2;
    
    // Create orthographic camera for top view
    var orthoCamera = new BABYLON.FreeCamera("orthoCamera", new BABYLON.Vector3(0, 15, 0), scene);
    orthoCamera.setTarget(BABYLON.Vector3.Zero());
    orthoCamera.rotation.y = Math.PI; // 180 degree rotation
    orthoCamera.mode = 1; // ORTHOGRAPHIC_CAMERA
    
    // Set orthographic projection
    var aspectRatio = engine.getRenderWidth() / engine.getRenderHeight();
    var orthoSize = 10;
    
    if (aspectRatio > 1) {
        orthoCamera.orthoTop = orthoSize;
        orthoCamera.orthoBottom = -orthoSize;
        orthoCamera.orthoLeft = -orthoSize * aspectRatio;
        orthoCamera.orthoRight = orthoSize * aspectRatio;
    } else {
        orthoCamera.orthoTop = orthoSize / aspectRatio;
        orthoCamera.orthoBottom = -orthoSize / aspectRatio;
        orthoCamera.orthoLeft = -orthoSize;
        orthoCamera.orthoRight = orthoSize;
    }
    
    orthoCamera.inputs.clear(); // Disable rotation controls
    scene.activeCamera = perspectiveCamera;

    // Enhanced lighting setup for semi-gloss black plastic
    var hemisphericLight = new BABYLON.HemisphericLight("hemisphericLight", new BABYLON.Vector3(0, 1, 0), scene);
    hemisphericLight.intensity = 1.2;
    hemisphericLight.diffuse = new BABYLON.Color3(0.9, 0.9, 0.9);
    hemisphericLight.specular = new BABYLON.Color3(0.2, 0.2, 0.2);
    
    var directionalLight = new BABYLON.DirectionalLight("directionalLight", new BABYLON.Vector3(-1, -1, -1), scene);
    directionalLight.intensity = 1.8;
    directionalLight.diffuse = new BABYLON.Color3(1, 1, 1);
    directionalLight.specular = new BABYLON.Color3(0.3, 0.3, 0.3);
    
    var directionalLight2 = new BABYLON.DirectionalLight("directionalLight2", new BABYLON.Vector3(1, -0.8, 0.5), scene);
    directionalLight2.intensity = 1.2;
    directionalLight2.diffuse = new BABYLON.Color3(0.95, 0.95, 1);
    directionalLight2.specular = new BABYLON.Color3(0.2, 0.2, 0.25);

    // Create ground with powder blue background and white gridlines
    var ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 14 }, scene);
    
    // Create dynamic texture for powder blue grid pattern
    var gridTexture = new BABYLON.DynamicTexture("gridTexture", {width: 1024, height: 1024}, scene, false);
    var gridContext = gridTexture.getContext();
    
    // Fill with powder blue background
    gridContext.fillStyle = "#a7dbfc";
    gridContext.fillRect(0, 0, 1024, 1024);
    
    // Draw white grid lines
    gridContext.strokeStyle = "#FFFFFF";
    gridContext.lineWidth = 1;
    
    // Vertical lines
    for (var i = 0; i <= 1024; i += 32) {
        gridContext.beginPath();
        gridContext.moveTo(i, 0);
        gridContext.lineTo(i, 1024);
        gridContext.stroke();
    }
    
    // Horizontal lines
    for (var i = 0; i <= 1024; i += 32) {
        gridContext.beginPath();
        gridContext.moveTo(0, i);
        gridContext.lineTo(1024, i);
        gridContext.stroke();
    }
    
    gridTexture.update();
    
    // Apply powder blue material with grid texture
    var groundMaterial = new BABYLON.StandardMaterial("groundMaterial", scene);
    groundMaterial.diffuseTexture = gridTexture;
    groundMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.2);
    groundMaterial.specularPower = 64;
    groundMaterial.alpha = 0.5;
    ground.material = groundMaterial;

    // Create border rails
    var railHeight = 0.15;
    var railWidth = 0.2;
    var railColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    
    var railMaterial = new BABYLON.StandardMaterial("railMaterial", scene);
    railMaterial.diffuseColor = railColor;
    railMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    
    // Create 4 border rails
    var northRail = BABYLON.MeshBuilder.CreateBox("northRail", {
        width: 20 + railWidth*2, height: railHeight, depth: railWidth
    }, scene);
    northRail.position = new BABYLON.Vector3(0, railHeight/2, -7 - railWidth/2);
    northRail.material = railMaterial;
    
    var southRail = BABYLON.MeshBuilder.CreateBox("southRail", {
        width: 20 + railWidth*2, height: railHeight, depth: railWidth
    }, scene);
    southRail.position = new BABYLON.Vector3(0, railHeight/2, 7 + railWidth/2);
    southRail.material = railMaterial;
    
    var eastRail = BABYLON.MeshBuilder.CreateBox("eastRail", {
        width: railWidth, height: railHeight, depth: 14
    }, scene);
    eastRail.position = new BABYLON.Vector3(10 + railWidth/2, railHeight/2, 0);
    eastRail.material = railMaterial;
    
    var westRail = BABYLON.MeshBuilder.CreateBox("westRail", {
        width: railWidth, height: railHeight, depth: 14
    }, scene);
    westRail.position = new BABYLON.Vector3(-10 - railWidth/2, railHeight/2, 0);
    westRail.material = railMaterial;

    // Create environment for reflections
    var environmentHelper = scene.createDefaultEnvironment({
        createGround: false,
        createSkybox: false,
        skyboxSize: 100,
        groundColor: new BABYLON.Color3(0.9, 0.9, 0.9)
    });
    
    if (environmentHelper) {
        scene.environmentIntensity = 1.0;
    }

    // Create GUI for content panels
    var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    // Function to apply height state based on selection
    function applyHeightState() {
        if (Object.keys(originalHeights).length === 0) {
            console.log("📏 Skipping height state - original heights not yet loaded");
            return;
        }
        
        contentPanels.forEach(function(panelData) {
            var mesh = panelData.mesh;
            var sectionName = mesh.bmcSectionName;
            if (!sectionName) return;
            
            var targetHeight;
            if (!selectedObjectName) {
                // No selection: all at original height
                targetHeight = originalHeights[sectionName];
            } else if (sectionName === selectedObjectName) {
                // Selected: original height
                targetHeight = originalHeights[sectionName];
            } else {
                // Non-selected: flattened
                targetHeight = 0.1;
            }
            
            // Apply height by scaling Y
            var originalHeight = originalHeights[sectionName] || 1.0;
            var scaleRatio = targetHeight / originalHeight;
            mesh.scaling.y = scaleRatio;
            
            console.log("📏 " + sectionName + ": height " + targetHeight + " (scale: " + scaleRatio + ")");
        });
    }

    // Function to create BMC section
    function createBMCSection(sectionData, index) {
        var name = sectionData.name;
        var position = sectionData.position;
        var color = sectionData.color;
        var height = sectionData.height || 1.0;
        
        // Create section transform node
        var sectionTransform = new BABYLON.TransformNode(name + "Transform", scene);
        sectionTransform.parent = rootMesh;
        sectionTransform.position = new BABYLON.Vector3(position[0], position[1], position[2]);
        
        // Create mesh based on section type
        var mesh;
        if (name === "Value Propositions") {
            mesh = BABYLON.MeshBuilder.CreateCylinder(name, { height: height, diameter: 2 }, scene);
        } else {
            mesh = BABYLON.MeshBuilder.CreateBox(name, { width: 2, height: height, depth: 1.5 }, scene);
        }
        
        mesh.parent = sectionTransform;
        mesh.bmcSectionName = name;
        
        // Create semi-gloss black plastic material
        var material = new BABYLON.PBRMetallicRoughnessMaterial(name + "Material", scene);
        material.baseColor = new BABYLON.Color3(0.005, 0.005, 0.005); // Very dark black
        material.metallicFactor = 0.0; // Not metallic
        material.roughnessFactor = 0.7; // Semi-gloss
        material.environmentIntensity = 0.3;
        
        mesh.material = material;
        mesh.receiveShadows = true;
        
        // Store original properties
        mesh.originalColor = material.baseColor.clone();
        mesh.originalMaterial = material;
        mesh.isClicked = false;
        
        // Create content panel
        createContentPanel(mesh, name, index);
        
        // Add interactions
        setupMeshInteractions(mesh, name, material);
        
        contentPanels.push({ panel: null, mesh: mesh, material: material });
    }

    // Function to create content panel
    function createContentPanel(mesh, sectionName, index) {
        var contentPanel = new BABYLON.GUI.Rectangle("contentPanel_" + index);
        contentPanel.widthInPixels = 320;
        contentPanel.heightInPixels = 240;
        contentPanel.cornerRadius = 12;
        contentPanel.color = "white";
        contentPanel.thickness = 2;
        contentPanel.background = "rgba(255, 255, 255, 0.95)";
        contentPanel.isVisible = false;
        contentPanel.zIndex = 3000;
        
        // Create title
        var titleText = new BABYLON.GUI.TextBlock("titleText_" + index, sectionName);
        titleText.color = "black";
        titleText.fontSize = "14px";
        titleText.fontWeight = "bold";
        titleText.fontFamily = "Arial, sans-serif";
        titleText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        titleText.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        titleText.paddingTop = "8px";
        titleText.height = "25px";
        
        // Create close button
        var closeButton = new BABYLON.GUI.TextBlock("closeButton_" + index, "X");
        closeButton.color = "grey";
        closeButton.fontSize = "16px";
        closeButton.fontWeight = "bold";
        closeButton.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        closeButton.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        closeButton.topInPixels = 8;
        closeButton.leftInPixels = -12;
        closeButton.widthInPixels = 20;
        closeButton.heightInPixels = 20;
        closeButton.isPointerBlocker = true;
        
        // Create content text
        var contentText = new BABYLON.GUI.TextBlock("contentText_" + index, "");
        contentText.color = "black";
        contentText.fontSize = "13px";
        contentText.fontFamily = "Arial, sans-serif";
        contentText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        contentText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        contentText.paddingTop = "45px";
        contentText.paddingLeft = "15px";
        contentText.paddingRight = "15px";
        contentText.paddingBottom = "15px";
        contentText.textWrapping = true;
        
        // Set content from sample data
        var elementData = sampleCanvas.elements.find(function(el) { return el.name === sectionName; });
        if (elementData) {
            contentText.text = elementData.content;
        }
        
        contentPanel.addControl(titleText);
        contentPanel.addControl(closeButton);
        contentPanel.addControl(contentText);
        advancedTexture.addControl(contentPanel);
        
        // Position panel above mesh
        contentPanel.linkWithMesh(mesh);
        contentPanel.linkOffsetY = "-200px";
        
        // Store references
        mesh.contentPanel = contentPanel;
        mesh.contentText = contentText;
        
        // Close button functionality
        closeButton.onPointerClickObservable.add(function() {
            unselectObject(mesh, sectionName);
        });
    }

    // Function to setup mesh interactions
    function setupMeshInteractions(mesh, sectionName, material) {
        mesh.actionManager = new BABYLON.ActionManager(scene);
        
        // Hover enter
        mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOverTrigger, function() {
            if (!mesh.isClicked && !selectedObjectName) {
                var brightBlueColor = new BABYLON.Color3(0.0, 0.3, 0.8);
                material.baseColor = brightBlueColor;
                
                // Set all objects to 100% opacity
                contentPanels.forEach(function(panelData) {
                    panelData.material.alpha = 1.0;
                });
                
                console.log("💡 Hover enter: " + sectionName);
            }
        }));
        
        // Hover exit
        mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPointerOutTrigger, function() {
            if (!mesh.isClicked && !selectedObjectName) {
                material.baseColor = mesh.originalColor;
                console.log("🔄 Hover exit: " + sectionName);
            }
        }));
        
        // Click
        mesh.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnPickTrigger, function() {
            if (mesh.isClicked) {
                unselectObject(mesh, sectionName);
            } else {
                selectObject(mesh, sectionName, material);
            }
        }));
    }

    // Function to select object
    function selectObject(mesh, sectionName, material) {
        // Clear any existing selection
        if (selectedObjectName) {
            var currentSelected = contentPanels.find(function(p) { return p.mesh.bmcSectionName === selectedObjectName; });
            if (currentSelected) {
                unselectObject(currentSelected.mesh, selectedObjectName);
            }
        }
        
        selectedObjectName = sectionName;
        mesh.isClicked = true;
        
        // Set blue color
        var brightBlueColor = new BABYLON.Color3(0.0, 0.3, 0.8);
        material.baseColor = brightBlueColor;
        
        // Show content panel
        if (mesh.contentPanel) {
            mesh.contentPanel.isVisible = true;
        }
        
        // Apply height state (selected at original height, others flattened)
        applyHeightState();
        
        // Set opacity (selected 100%, others 50%)
        contentPanels.forEach(function(panelData) {
            panelData.material.alpha = panelData.mesh === mesh ? 1.0 : 0.5;
        });
        
        console.log("🔒 Selected: " + sectionName);
    }

    // Function to unselect object
    function unselectObject(mesh, sectionName) {
        selectedObjectName = null;
        mesh.isClicked = false;
        
        // Restore original color
        mesh.material.baseColor = mesh.originalColor;
        
        // Hide content panel
        if (mesh.contentPanel) {
            mesh.contentPanel.isVisible = false;
        }
        
        // Restore all heights directly (bypassing state timing issues)
        contentPanels.forEach(function(panelData) {
            var objMesh = panelData.mesh;
            var objSectionName = objMesh.bmcSectionName;
            if (objSectionName && originalHeights[objSectionName]) {
                var originalHeight = originalHeights[objSectionName];
                var originalScale = originalHeight / (originalHeight || 1.0); // Should be 1.0
                objMesh.scaling.y = 1.0; // Reset to original scale
                console.log("🔓 Restored " + objSectionName + " to original height");
            }
            
            // Restore opacity
            panelData.material.alpha = 1.0;
        });
        
        console.log("🔓 Unselected: " + sectionName);
    }

    // Function to switch camera modes
    function switchToOrthographic() {
        if (rootMesh) {
            rootMesh.rotation = new BABYLON.Vector3(0, Math.PI, 0);
        }
        scene.activeCamera = orthoCamera;
        isOrthographic = true;
        console.log("🔄 Switched to orthographic (3D Top) view");
    }

    function switchToPerspective() {
        if (rootMesh) {
            rootMesh.rotation = BABYLON.Vector3.Zero();
        }
        scene.activeCamera = perspectiveCamera;
        isOrthographic = false;
        console.log("🔄 Switched to perspective (3D View) view");
    }

    // Load Business Model Canvas (placeholder geometry - replace with GLB loading)
    function loadBusinessModelCanvas() {
        console.log("📦 Creating 3D Business Model Canvas...");
        
        // Create root transform node
        rootMesh = new BABYLON.TransformNode("bmcRoot", scene);
        rootMesh.position = new BABYLON.Vector3(0, 0.1, 0);
        rootMesh.scaling = new BABYLON.Vector3(8, 8, 8);
        
        // Business model canvas sections with positions (circular layout)
        var sections = [
            { name: "Key Partners", position: [-3, 0, 1.5], color: [0.0, 0.8, 0.0], height: 1.0 },
            { name: "Key Activities", position: [-1.5, 0, 3], color: [1.0, 0.5, 0.0], height: 1.0 },
            { name: "Key Resources", position: [-3, 0, -1.5], color: [0.8, 0.0, 0.0], height: 1.0 },
            { name: "Value Propositions", position: [0, 0, 0], color: [0.0, 0.0, 1.0], height: 3.0 },
            { name: "Customer Relationships", position: [1.5, 0, 3], color: [1.0, 1.0, 0.0], height: 1.0 },
            { name: "Customer Channels", position: [0, 0, -3], color: [0.0, 1.0, 1.0], height: 1.0 },
            { name: "Customer Segments", position: [3, 0, 1.5], color: [0.5, 0.0, 1.0], height: 1.0 }
        ];
        
        // Store original heights
        sections.forEach(function(section) {
            originalHeights[section.name] = section.height;
        });
        
        // Create each section
        sections.forEach(function(sectionData, index) {
            createBMCSection(sectionData, index);
        });
        
        console.log("✅ BMC created with " + sections.length + " sections");
    }

    // Initialize the Business Model Canvas
    loadBusinessModelCanvas();

    // Keyboard controls for camera switching (optional)
    scene.onKeyboardObservable.add(function(kbInfo) {
        switch (kbInfo.type) {
            case BABYLON.KeyboardEventTypes.KEYDOWN:
                if (kbInfo.event.key === "1") {
                    switchToPerspective();
                } else if (kbInfo.event.key === "2") {
                    switchToOrthographic();
                }
                break;
        }
    });

    console.log("✅ 3D Business Model Canvas loaded!");
    console.log("📝 Instructions:");
    console.log("   - Hover: Objects turn blue");
    console.log("   - Click: Select object & show content panel");
    console.log("   - Selection: Non-selected objects flatten to 0.1 height");
    console.log("   - Keyboard: Press '1' for 3D View, '2' for 3D Top");
    console.log("   - Replace placeholder geometry with GLB model using BABYLON.SceneLoader.ImportMesh()");

    return scene;
};

// Note: Replace the placeholder geometry creation with actual GLB model loading:
/*
BABYLON.SceneLoader.ImportMesh("", "path/to/models/", "BMC_blender_09_complete_1753576063858.glb", scene, function (meshes) {
    rootMesh = meshes[0];
    // Setup interactions for loaded meshes
    // Apply materials and configure BMC sections
});
*/