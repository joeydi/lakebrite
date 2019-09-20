/**
 * LED Cube simulator in THREE.js
 *
 * Effects/animations from:
 *      http://www.instructables.com/id/Led-Cube-8x8x8/ by Christian Moen and
 *          Ståle Kristoffersen.
 *      http://www.kevindarrah.com/?cat=99 by Kevin Darrah
 *
 */

if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container,
    scene,
    camera,
    renderer,
    controls,
    stats,
    resolutionX = 50,
    resolutionY = 15,
    resolutionZ = 10,
    distanceX = 8,
    distanceY = 6,
    layerOffset = true,
    particles,
    texture,
    start = 0,
    delay = 0;

var gifPlayer = function(src) {
    var img = document.createElement('img'),
        oldGifs = document.querySelectorAll('.jsgif, canvas[data-apng-src]'),
        gif,
        context,
        imageData,
        x, y, z,
        r, g, b,
        i,
        color;

    // Remove old gif/png players
    Array.prototype.forEach.call( oldGifs, function( node ) {
        node.parentNode.removeChild( node );
    });

    img.setAttribute('src', src);
    document.body.appendChild(img);

    if (-1 !== src.indexOf('.gif')) {
        gif = new SuperGif({
            gif: img,
            loop_mode: true,
            auto_play: true,
            draw_while_loading: true,
            show_progress_bar: true
        });

        gif.load(function () {
            context = gif.get_canvas().getContext('2d');
        });
    } else if (-1 !== src.indexOf('.png') || -1 !== src.indexOf('.apng')) {
        APNG.animateImage(img).then(function () {
            context = $('canvas[data-apng-src]').get(0).getContext('2d');
        });
    } else {
        alert('File must be either Animated GIF or Animated PNG');
    }

    return function () {
        var colors = [];

        try {
            imageData = context.getImageData(0, 0, resolutionX, resolutionY*resolutionZ);
        } catch (e) {
            return;
        }

        for (var i = 0; i < resolutionX * resolutionY * resolutionZ * 4; i += 4) {
            r = imageData.data[i];
            g = imageData.data[i + 1];
            b = imageData.data[i + 2];
            color = new THREE.Color(RGB2Hex(r, g, b));
            colors.push(color);
        }

        particles.geometry.colors = colors;
        particles.geometry.colorsNeedUpdate = true;
    };
};

var guiParams = {
    gif: 'images/animations/fmm.png',
    spin: false,
    axes: false
};

var animation = gifPlayer(guiParams.gif);

// do async texture loading, then kick things off
var loader = new THREE.TextureLoader();
loader.load('images/textures/ball.png', function (t) {
    texture = t;
    initScene();
    animate();
});

function initScene() {
    scene = new THREE.Scene();

    // camera
    var SCREEN_WIDTH = window.innerWidth,
        SCREEN_HEIGHT = window.innerHeight,
        VIEW_ANGLE = 45,
        ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT,
        NEAR = 0.1,
        FAR = 10000;

    camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
    scene.add(camera);
    camera.position.set(-80, 0, 350);
    camera.lookAt(scene.position);

    // renderer
    if ( Detector.webgl ) {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } else {
        renderer = new THREE.CanvasRenderer();
    }
    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    container = document.getElementById('container');
    container.appendChild( renderer.domElement );

    // controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI/2;
    controls.autoRotate = guiParams.spin;

    // Overall offset for the array
    var offset_x = -distanceX * (resolutionX - 1) / 4,
        offset_y = distanceY * (resolutionY - 1) / 2,
        offset_z = distanceY * (resolutionZ - 1) / 2;

    var pointsMaterial = new THREE.PointsMaterial({
        size: 4,
        // map: texture,
        vertexColors: THREE.VertexColors,
        transparent: true,
        alphaTest: 0.5
    });

    // Create the vertices
    var geometry = new THREE.Geometry();
    for (var z = 0; z < resolutionZ; z++) {
        for (var y = 0; y < resolutionY; y++) {
            for (var x = 0; x < resolutionX; x++) {
                if ( layerOffset && 0 !== x % 2 ) {
                    var vertex = new THREE.Vector3(distanceX/2*x, distanceY*-y + distanceY/2, distanceY*-z - distanceY/2);
                } else {
                    var vertex = new THREE.Vector3(distanceX/2*x, distanceY*-y, distanceY*-z);
                }

                geometry.vertices.push(vertex);
            }
        }
    }

    // Create the initial colors
    var colors = [];
    for (var i = 0; i < resolutionX * resolutionY * resolutionZ; i++) {
        colors.push(new THREE.Color(0x0));
    }
    geometry.colors = colors;

    // Create the particle system and add it to the scene
    particles = new THREE.Points(geometry, pointsMaterial);
    particles.position.set(offset_x, offset_y, offset_z);
    scene.add(particles);

    // axes
    axes = buildAxes(1000);
    if (guiParams.axes) {
        scene.add(axes);
    }

    window.addEventListener('resize', onWindowResize, false);
}

function initGUI() {
    var container = $('.controls'),
        spinInput = $('input[name="spin"]'),
        axesInput = $('input[name="axes"]'),
        gifLink = $('.gif-select a');

    spinInput.change(function () {
        controls.autoRotate = !controls.autoRotate;
    });

    axesInput.change(function () {
        guiParams.axes = !guiParams.axes;

        var func = guiParams.axes ? 'add' : 'remove';
        scene[func](axes);
    });

    gifLink.click(function (e) {
        e.preventDefault();

        var href = $(this).attr('href');

        animation = gifPlayer(href);
    });

    // stats
    stats = new Stats();
    container.prepend( stats.domElement );
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    animation();
    renderer.render(scene, camera);
    controls.update();
    stats.update();
}

function cube_check_coords(x, y, z) {
    return (x >= 0 && x < resolutionX && y >= 0 && y < resolutionY && z >= 0 && z < resolutionZ);
}

function cube_get_color(x, y, z) {
    if (!cube_check_coords(x, y, z)) {
        return -1;
    }

    var i = ( (z * resolutionX * resolutionY) + (y * resolutionX) + (x) ),
        color = particles.geometry.colors[i];

    return color.getHex();
}

function cube_set_color(x, y, z, color) {
    if (!cube_check_coords(x, y, z)) {
        return -1;
    }

    var i = ( (z * resolutionX * resolutionY) + (y * resolutionX) + (x) );

    particles.geometry.colors[i].setHex(color);
    particles.geometry.colorsNeedUpdate = true;
}

function cube_clear(color) {
    if (typeof color === 'undefined') {
        color = 0x0;
    }

    var colors = [];
    for (var i = 0; i < resolutionX * resolutionY * resolutionZ; i++) {
        colors.push(new THREE.Color(color));
    }

    particles.geometry.colors = colors;
    particles.geometry.colorsNeedUpdate = true;
}

function buildAxes( length ) {
    var axes = new THREE.Object3D();

    axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( length, 0, 0 ), 0x20D8FE, false ) ); // +X
    axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( -length, 0, 0 ), 0x20D8FE, true) ); // -X
    axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, length, 0 ), 0x20D8FE, false ) ); // +Y
    axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, -length, 0 ), 0x20D8FE, true ) ); // -Y
    axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, length ), 0x20D8FE, false ) ); // +Z
    axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, -length ), 0x20D8FE, true ) ); // -Z

    return axes;
}

function buildAxis( src, dst, colorHex, dashed ) {
    var geom = new THREE.Geometry(),
        mat;

    if(dashed) {
        mat = new THREE.LineDashedMaterial({ linewidth: 1, color: colorHex, dashSize: 1, gapSize: 1 });
    } else {
        mat = new THREE.LineBasicMaterial({ linewidth: 1, color: colorHex });
    }

    geom.vertices.push( src.clone() );
    geom.vertices.push( dst.clone() );

    // This one is SUPER important, otherwise dashed lines will appear as simple plain lines
    geom.computeLineDistances();

    var axis = new THREE.Line( geom, mat, THREE.LineSegments );

    return axis;

}

function RGB2Hex(r, g, b) {
    var hex = b;
    hex |= (g << 8);
    hex |= (r << 16);
    return hex;
}

$(document).ready(function () {
    initGUI();
});
