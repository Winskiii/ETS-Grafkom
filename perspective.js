"use strict";

var perspectiveExample = function() {
    var canvas;
    var gl;

    var numVertices = 108;  // 12 faces * 3 triangles per face * 3 vertices per triangle

    var positionsArray = [];
    var colorsArray = [];

    var near = 0.3;
    var far = 3.0;
    var radius = 4.0;
    var theta = 0.0;
    var phi = 0.0;
    var dr = 5.0 * Math.PI/180.0;

    var fovy = 45.0;
    var aspect;

    var modelViewMatrixLoc, projectionMatrixLoc;
    var modelViewMatrix, projectionMatrix;
    var eye;
    const at = vec3(0.0, 0.0, 0.0);
    const up = vec3(0.0, 1.0, 0.0);

    // Dodecahedron vertices and faces
    var vertices = [];
    var faces = [];

    function calculateDodecahedronGeometry() {
        const A = (1 + Math.sqrt(5)) / 2; // Golden ratio
        const B = 1 / A;
        const r = 0.5; // Scale factor

        vertices = [
            vec4(r, r, r, 1), vec4(r, r, -r, 1), vec4(r, -r, r, 1), vec4(r, -r, -r, 1),
            vec4(-r, r, r, 1), vec4(-r, r, -r, 1), vec4(-r, -r, r, 1), vec4(-r, -r, -r, 1),
            vec4(0, B*r, A*r, 1), vec4(0, B*r, -A*r, 1), vec4(0, -B*r, A*r, 1), vec4(0, -B*r, -A*r, 1),
            vec4(B*r, A*r, 0, 1), vec4(B*r, -A*r, 0, 1), vec4(-B*r, A*r, 0, 1), vec4(-B*r, -A*r, 0, 1),
            vec4(A*r, 0, B*r, 1), vec4(A*r, 0, -B*r, 1), vec4(-A*r, 0, B*r, 1), vec4(-A*r, 0, -B*r, 1)
        ];

        faces = [
            [0, 16, 2, 10, 8], [0, 8, 4, 14, 12], [16, 17, 1, 12, 0], [1, 9, 11, 3, 17],
            [1, 12, 14, 5, 9], [2, 13, 15, 6, 10], [13, 3, 17, 16, 2], [3, 11, 7, 15, 13],
            [4, 8, 10, 6, 18], [14, 5, 19, 18, 4], [5, 19, 7, 11, 9], [15, 7, 19, 18, 6]
        ];
    }

    function createDodecahedron() {
        calculateDodecahedronGeometry();
        for (let face of faces) {
            let color = vertexColors[Math.floor(Math.random() * vertexColors.length)];
            // Triangulate the pentagon
            for (let i = 1; i < 4; i++) {
                positionsArray.push(vertices[face[0]]);
                positionsArray.push(vertices[face[i]]);
                positionsArray.push(vertices[face[i+1]]);
                colorsArray.push(color);
                colorsArray.push(color);
                colorsArray.push(color);
            }
        }
    }

    var vertexColors = [
        vec4(1.0, 0.0, 0.0, 1.0),  // red
        vec4(1.0, 1.0, 0.0, 1.0),  // yellow
        vec4(0.0, 1.0, 0.0, 1.0),  // green
        vec4(0.0, 0.0, 1.0, 1.0),  // blue
        vec4(1.0, 0.0, 1.0, 1.0),  // magenta
        vec4(0.0, 1.0, 1.0, 1.0),  // cyan
        vec4(1.0, 0.5, 0.0, 1.0),  // orange
        vec4(0.5, 0.0, 1.0, 1.0),  // purple
    ];

    init();

    function init() {
        canvas = document.getElementById("gl-canvas");

        gl = canvas.getContext('webgl2');
        if (!gl) alert("WebGL 2.0 isn't available");

        gl.viewport(0, 0, canvas.width, canvas.height);

        aspect = canvas.width/canvas.height;

        gl.clearColor(1.0, 1.0, 1.0, 1.0);

        gl.enable(gl.DEPTH_TEST);

        var program = initShaders(gl, "vertex-shader", "fragment-shader");
        gl.useProgram(program);

        createDodecahedron();

        var cBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW);

        var colorLoc = gl.getAttribLocation(program, "aColor");
        gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(colorLoc);

        var vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);

        var positionLoc = gl.getAttribLocation(program, "aPosition");
        gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionLoc);

        modelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
        projectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");

        document.getElementById("Button1").onclick = function(){near *= 1.1; far *= 1.1;};
        document.getElementById("Button2").onclick = function(){near *= 0.9; far *= 0.9;};
        document.getElementById("Button3").onclick = function(){radius *= 2.0;};
        document.getElementById("Button4").onclick = function(){radius *= 0.5;};
        document.getElementById("Button5").onclick = function(){theta += dr;};
        document.getElementById("Button6").onclick = function(){theta -= dr;};
        document.getElementById("Button7").onclick = function(){phi += dr;};
        document.getElementById("Button8").onclick = function(){phi -= dr;};

        render();
    }

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        eye = vec3(radius*Math.sin(theta)*Math.cos(phi),
            radius*Math.sin(theta)*Math.sin(phi), radius*Math.cos(theta));
        modelViewMatrix = lookAt(eye, at, up);
        projectionMatrix = perspective(fovy, aspect, near, far);

        gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
        gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

        gl.drawArrays(gl.TRIANGLES, 0, numVertices);
        requestAnimationFrame(render);
    }
}

perspectiveExample();