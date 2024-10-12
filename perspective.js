"use strict";

var shadedCube = function() {

    var canvas;
    var gl;

    var numPositions = 60; // Update for 20 triangles in dodecahedron (3 vertices each)
    var positionsArray = [];
    var normalsArray = [];

    const r =0.4; // Skala objek
    const A = (1 + Math.sqrt(5)) / 2; // Golden ratio
    const B = 1 / A;
    
    // vertices dan faces 2
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

    var ctm;
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

        viewerPos = vec3(0.0, 0.0, -3.0); // Adjusted for smaller scale

        projectionMatrix = ortho(-1, 1, -1, 1, -100, 100);

        var ambientProduct = mult(lightAmbient, materialAmbient);
        var diffuseProduct = mult(lightDiffuse, materialDiffuse);
        var specularProduct = mult(lightSpecular, materialSpecular);

        document.getElementById("ButtonX").onclick = function() { axis = xAxis; };
        document.getElementById("ButtonY").onclick = function() { axis = yAxis; };
        document.getElementById("ButtonZ").onclick = function() { axis = zAxis; };
        document.getElementById("ButtonT").onclick = function() { flag = !flag; };

        gl.uniform4fv(gl.getUniformLocation(program, "uAmbientProduct"), ambientProduct);
        gl.uniform4fv(gl.getUniformLocation(program, "uDiffuseProduct"), diffuseProduct);
        gl.uniform4fv(gl.getUniformLocation(program, "uSpecularProduct"), specularProduct);
        gl.uniform4fv(gl.getUniformLocation(program, "uLightPosition"), lightPosition);
        gl.uniform1f(gl.getUniformLocation(program, "uShininess"), materialShininess);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "uProjectionMatrix"), false, flatten(projectionMatrix));

        render();
    }

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        modelViewMatrix = lookAt(viewerPos, vec3(0, 0, 0), vec3(0, 1, 0));
        modelViewMatrix = mult(modelViewMatrix, rotate(theta[axis], axis === 0 ? vec3(1, 0, 0) : axis === 1 ? vec3(0, 1, 0) : vec3(0, 0, 1)));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModelViewMatrix"), false, flatten(modelViewMatrix));

        // Draw dodecahedron
        for (let i = 0; i < positionsArray.length; i += 3) {
            gl.drawArrays(gl.TRIANGLES, i, 3);
        }

        if (flag) {
            theta[axis] += 2.0; // Adjust rotation speed as necessary
        }

        requestAnimationFrame(render);
    }
};

window.onload = shadedCube;
