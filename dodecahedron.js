"use strict";

var shadedCube = function() {

    var canvas;
    var gl;

    var numPositions = 60; // Update for 20 triangles in dodecahedron (3 vertices each)
    var positionsArray = [];
    var normalsArray = [];

    const r = 0.4; // Skala objek
    const A = (1 + Math.sqrt(5)) / 2; // Golden ratio
    const B = 1 / A;
    
    // Definisikan radius karakteristik untuk mengguling
    const radius = 0.2588; // Radius karakteristik, disesuaikan dengan skala objek

    // vertices dan faces
    var vertices = [
        vec4(r, r, r, 1), vec4(r, r, -r, 1), vec4(r, -r, r, 1), vec4(r, -r, -r, 1),
        vec4(-r, r, r, 1), vec4(-r, r, -r, 1), vec4(-r, -r, r, 1), vec4(-r, -r, -r, 1),
        vec4(0, B*r, A*r, 1), vec4(0, B*r, -A*r, 1), vec4(0, -B*r, A*r, 1), vec4(0, -B*r, -A*r, 1),
        vec4(B*r, A*r, 0, 1), vec4(B*r, -A*r, 0, 1), vec4(-B*r, A*r, 0, 1), vec4(-B*r, -A*r, 0, 1),
        vec4(A*r, 0, B*r, 1), vec4(A*r, 0, -B*r, 1), vec4(-A*r, 0, B*r, 1), vec4(-A*r, 0, -B*r, 1)
    ];
    
    var faces = [
        [0, 16, 2, 10, 8], [0, 8, 4, 14, 12], [16, 17, 1, 12, 0], [1, 9, 11, 3, 17],
        [1, 12, 14, 5, 9], [2, 13, 15, 6, 10], [13, 3, 17, 16, 2], [3, 11, 7, 15, 13],
        [4, 8, 10, 6, 18], [14, 5, 19, 18, 4], [5, 19, 7, 11, 9], [15, 7, 19, 18, 6]
    ];

    var lightPosition = vec4(1.0, 1.0, 1.0, 0.0);
    var lightAmbient = vec4(0.5, 0.5, 0.5, 1.0);
    var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
    var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

    var materialAmbient = vec4(1.0, 0.0, 1.0, 1.0);
    var materialDiffuse = vec4(1.0, 0.8, 0.0, 1.0);
    var materialSpecular = vec4(1.0, 0.8, 0.0, 1.0);
    var materialShininess = 20.0;

    var modelViewMatrix, projectionMatrix;
    var viewerPos;
    var program;

    var xAxis = 0;
    var yAxis = 1;
    var zAxis = 2;
    var axis = 0;
    var theta = vec3(0, 0, 0);

    var thetaLoc;

    var flag = false;

    // Variabel untuk fisika
    var position = vec3(0, 0, 0); // Posisi awal
    var velocity = vec3(0, 0, 0); // Kecepatan awal
    var acceleration = vec3(0, 0, 0); // Percepatan awal
    var mass = 1.0; // Massa awal

    // Variabel untuk rotasi guling
    var rollingRotationMatrix = mat4(); // Matriks rotasi guling
    rollingRotationMatrix = mat4(); // Inisialisasi sebagai identitas

    init();

    function colorDodecahedron() {
        for (let i = 0; i < faces.length; i++) {
            let a = faces[i][0];
            let b = faces[i][1];
            let c = faces[i][2];
            let d = faces[i][3];
            let e = faces[i][4];
            
            // Membagi pentagon menjadi tiga segitiga yang tidak saling bertumpuk
            quad(a, b, e); // Segitiga 1: a-b-e
            quad(b, c, e); // Segitiga 2: b-c-e
            quad(c, d, e); // Segitiga 3: c-d-e
        }
    }
    
    // Fungsi quad tetap sama
    function quad(a, b, c) {
        var t1 = subtract(vertices[b], vertices[a]);
        var t2 = subtract(vertices[c], vertices[b]);
        var normal = cross(t1, t2);
        normal = vec3(normal);
    
        positionsArray.push(vertices[a]);
        normalsArray.push(normal);
        positionsArray.push(vertices[b]);
        normalsArray.push(normal);
        positionsArray.push(vertices[c]);
        normalsArray.push(normal);
    }

    function init() {
        canvas = document.getElementById("gl-canvas");
        gl = canvas.getContext('webgl2');
        if (!gl) alert("WebGL 2.0 isn't available");

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.enable(gl.DEPTH_TEST);

        // Load shaders and initialize attribute buffers
        program = initShaders(gl, "vertex-shader", "fragment-shader");
        gl.useProgram(program);

        colorDodecahedron();

        var nBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

        var normalLoc = gl.getAttribLocation(program, "aNormal");
        gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(normalLoc);

        var vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);

        var positionLoc = gl.getAttribLocation(program, "aPosition");
        gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionLoc);

        thetaLoc = gl.getUniformLocation(program, "theta");

        viewerPos = vec3(0.0, 0.0, -5.0); // Disesuaikan untuk skala yang lebih kecil

        // Ganti proyeksi dari ortografis ke perspektif
        var fovy = 45; // Field of view dalam derajat
        var aspect = canvas.width / canvas.height; // Rasio aspek kanvas
        var near = 0.1;
        var far = 100.0;
        projectionMatrix = perspective(fovy, aspect, near, far); // Menggunakan proyeksi perspektif

        var ambientProduct = mult(lightAmbient, materialAmbient);
        var diffuseProduct = mult(lightDiffuse, materialDiffuse);
        var specularProduct = mult(lightSpecular, materialSpecular);

        // Kontrol rotasi
        document.getElementById("ButtonX").onclick = function() { axis = xAxis; };
        document.getElementById("ButtonY").onclick = function() { axis = yAxis; };
        document.getElementById("ButtonZ").onclick = function() { axis = zAxis; };
        document.getElementById("ButtonT").onclick = function() { flag = !flag; };

        // Kontrol fisika
        document.getElementById("applyForce").onclick = applyForce;

        // Coloring
        document.getElementById("ambientR").oninput = updateLightColors;
        document.getElementById("ambientG").oninput = updateLightColors;
        document.getElementById("ambientB").oninput = updateLightColors;

        document.getElementById("diffuseR").oninput = updateLightColors;
        document.getElementById("diffuseG").oninput = updateLightColors;
        document.getElementById("diffuseB").oninput = updateLightColors;

        document.getElementById("specularR").oninput = updateLightColors;
        document.getElementById("specularG").oninput = updateLightColors;
        document.getElementById("specularB").oninput = updateLightColors;

        document.getElementById("lightX").oninput = updateLightPosition;
        document.getElementById("lightY").oninput = updateLightPosition;
        document.getElementById("lightZ").oninput = updateLightPosition;

        updateLightColors();
        updateLightPosition();

        gl.uniform1f(gl.getUniformLocation(program, "uShininess"), materialShininess);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "uProjectionMatrix"), false, flatten(projectionMatrix));

        render();
    }

    function updateLightColors() {
        lightAmbient = vec4(
            parseFloat(document.getElementById("ambientR").value) / 255,
            parseFloat(document.getElementById("ambientG").value) / 255,
            parseFloat(document.getElementById("ambientB").value) / 255,
            1.0
        );

        lightDiffuse = vec4(
            parseFloat(document.getElementById("diffuseR").value) / 255,
            parseFloat(document.getElementById("diffuseG").value) / 255,
            parseFloat(document.getElementById("diffuseB").value) / 255,
            1.0
        );

        lightSpecular = vec4(
            parseFloat(document.getElementById("specularR").value) / 255,
            parseFloat(document.getElementById("specularG").value) / 255,
            parseFloat(document.getElementById("specularB").value) / 255,
             1.0
        );

        var ambientProduct = mult(lightAmbient, materialAmbient);
        var diffuseProduct = mult(lightDiffuse, materialDiffuse);
        var specularProduct = mult(lightSpecular, materialSpecular);

        gl.uniform4fv(gl.getUniformLocation(program, "uAmbientProduct"), ambientProduct);
        gl.uniform4fv(gl.getUniformLocation(program, "uDiffuseProduct"), diffuseProduct);
        gl.uniform4fv(gl.getUniformLocation(program, "uSpecularProduct"), specularProduct);
    }

    function updateLightPosition() {
        lightPosition = vec4(
            parseFloat(document.getElementById("lightX").value),
            parseFloat(document.getElementById("lightY").value),
            parseFloat(document.getElementById("lightZ").value),
            0.0
        );
        gl.uniform4fv(gl.getUniformLocation(program, "uLightPosition"), lightPosition);
    }

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if (flag) {
            theta[axis] += 0.1;
        }

        modelViewMatrix = lookAt(viewerPos, vec3(0, 0, 0), vec3(0, 1, 0));
        modelViewMatrix = mult(modelViewMatrix, rotate(theta[0], vec3(1, 0, 0)));
        modelViewMatrix = mult(modelViewMatrix, rotate(theta[1], vec3(0, 1, 0)));
        modelViewMatrix = mult(modelViewMatrix, rotate(theta[2], vec3(0, 0, 1)));

        gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModelViewMatrix"), false, flatten(modelViewMatrix));

        for (let i = 0; i < positionsArray.length; i += 3) {
            gl.drawArrays(gl.TRIANGLES, i, 3);
        }

        // Input elemen
        var forceXInput = document.getElementById("forceX");
        var forceYInput = document.getElementById("forceY");
        var forceZInput = document.getElementById("forceZ");
        var massInput = document.getElementById("mass");
    }
        // Fungsi untuk menerapkan gaya
        function applyForce() {
            var Fx = parseFloat(document.getElementById("forceX").value);
            var Fy = parseFloat(document.getElementById("forceY").value);
            var Fz = parseFloat(document.getElementById("forceZ").value);
            mass = parseFloat(document.getElementById("mass").value);
        
            // Validasi input
            if (isNaN(Fx) || isNaN(Fy) || isNaN(Fz) || isNaN(mass) || mass <= 0) {
                alert("Masukkan nilai yang valid untuk gaya dan massa.");
                return;
            }
        
            // Hitung percepatan: a = F / m
            var F = vec3(Fx, Fy, Fz);
            var a = scale(1.0 / mass, F);
            
            // Update percepatan dan kecepatan
            acceleration = add(acceleration, a);
        }
        
        function render() {
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
            // Hitung delta time menggunakan waktu aktual untuk akurasi yang lebih baik
            var currentTime = Date.now();
            if (!render.lastTime) render.lastTime = currentTime;
            var deltaTime = (currentTime - render.lastTime) / 1000.0; // dalam detik
            render.lastTime = currentTime;
        
            // Update kecepatan dan posisi
            velocity = add(velocity, scale(deltaTime, acceleration));
            position = add(position, scale(deltaTime, velocity));
        
            // Jangan reset percepatan setiap frame secara langsung
            acceleration = vec3(0, 0, 0); 
            // -> ini dipindahkan ke `applyForce` agar tidak di-reset setiap frame
        
            // Rotasi Guling Berdasarkan Kecepatan
            var v = velocity;
            var vMag = length(v);
        
            if (vMag > 1e-5) { // Threshold untuk menghindari rotasi saat kecepatan sangat rendah
                var vDir = normalize(v);
                var up = vec3(0, 1, 0);
                var rotationAxis = cross(up, vDir);
                var axisLength = length(rotationAxis);
        
                if (axisLength < 1e-5) {
                    rotationAxis = vec3(1, 0, 0);
                } else {
                    rotationAxis = scale(1.0 / axisLength, rotationAxis);
                }
        
                var distance = vMag * deltaTime;
                var angle = (distance / radius) * (180.0 / Math.PI);
        
                var rotationMatrix = rotate(angle, rotationAxis);
                rollingRotationMatrix = mult(rotationMatrix, rollingRotationMatrix);
            }
        
            modelViewMatrix = lookAt(viewerPos, vec3(0, 0, 0), vec3(0, 1, 0));
            modelViewMatrix = mult(modelViewMatrix, translate(position[0], position[1], position[2]));
            modelViewMatrix = mult(modelViewMatrix, rollingRotationMatrix);
            modelViewMatrix = mult(modelViewMatrix, rotate(theta[axis], axis === xAxis ? vec3(1, 0, 0) :
                                                                      axis === yAxis ? vec3(0, 1, 0) :
                                                                                       vec3(0, 0, 1)));
        
            gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModelViewMatrix"), false, flatten(modelViewMatrix));
        
            // Draw dodecahedron
            for (let i = 0; i < positionsArray.length; i += 3) {
                gl.drawArrays(gl.TRIANGLES, i, 3);
            }
        
            if (flag) {
                theta[axis] += 2.0 * deltaTime * 60.0; // Sesuaikan kecepatan rotasi
                if (theta[axis] >= 360.0) theta[axis] -= 360.0;
            }
        
            requestAnimationFrame(render);
        }
    };        

window.onload = shadedCube;
