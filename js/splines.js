var container, stats;

var camera, scene, renderer, splineCamera, cameraHelper, cameraEye;

var text, plane;

var targetRotation = 0;
var targetRotationOnMouseDown = 0;

var mouseX = 0;
var mouseXOnMouseDown = 0;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var binormal = new THREE.Vector3();
var normal = new THREE.Vector3();


var pipeSpline = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 10, -10), new THREE.Vector3(10, 0, -10), new THREE.Vector3(20, 0, 0), new THREE.Vector3(30, 0, 10), new THREE.Vector3(30, 0, 20), new THREE.Vector3(20, 0, 30), new THREE.Vector3(10, 0, 30), new THREE.Vector3(0, 0, 30), new THREE.Vector3(-10, 10, 30), new THREE.Vector3(-10, 20, 30), new THREE.Vector3(0, 30, 30), new THREE.Vector3(10, 30, 30), new THREE.Vector3(20, 30, 15), new THREE.Vector3(10, 30, 10), new THREE.Vector3(0, 30, 10), new THREE.Vector3(-10, 20, 10), new THREE.Vector3(-10, 10, 10), new THREE.Vector3(0, 0, 10), new THREE.Vector3(10, -10, 10), new THREE.Vector3(20, -15, 10), new THREE.Vector3(30, -15, 10), new THREE.Vector3(40, -15, 10), new THREE.Vector3(50, -15, 10), new THREE.Vector3(60, 0, 10), new THREE.Vector3(70, 0, 0), new THREE.Vector3(80, 0, 0), new THREE.Vector3(90, 0, 0), new THREE.Vector3(100, 0, 0)]);

var sampleClosedSpline = new THREE.ClosedSplineCurve3([
    new THREE.Vector3(0, -40, -40),
    new THREE.Vector3(0, 40, -40),
    new THREE.Vector3(0, 140, -40),
    new THREE.Vector3(0, 40, 40),
    new THREE.Vector3(0, -40, 40),
]);

// Keep a dictionary of Curve instances
var splines = {
    SampleClosedSpline: sampleClosedSpline,
    KnotCurve: new THREE.Curves.KnotCurve(),
    GrannyKnot: new THREE.Curves.GrannyKnot(),
    HeartCurve: new THREE.Curves.HeartCurve(3.5),
    VivianiCurve: new THREE.Curves.VivianiCurve(20),
    HelixCurve: new THREE.Curves.HelixCurve(),
    TrefoilKnot: new THREE.Curves.TrefoilKnot(),
    TorusKnot: new THREE.Curves.TorusKnot(20),
    CinquefoilKnot: new THREE.Curves.CinquefoilKnot(20),
    TrefoilPolynomialKnot: new THREE.Curves.TrefoilPolynomialKnot(14),
    FigureEightPolynomialKnot: new THREE.Curves.FigureEightPolynomialKnot(),
    DecoratedTorusKnot4a: new THREE.Curves.DecoratedTorusKnot4a(),
    DecoratedTorusKnot4b: new THREE.Curves.DecoratedTorusKnot4b(),
    DecoratedTorusKnot5a: new THREE.Curves.DecoratedTorusKnot5a(),
    DecoratedTorusKnot5c: new THREE.Curves.DecoratedTorusKnot5c(),
    PipeSpline: pipeSpline
};

var splineSelect = $('select#spline');
for ( spline in splines ) {
    var option = $('<option />', {value: spline, text: spline});
    splineSelect.append(option);
}
splineSelect.val('GrannyKnot');

// This returns an animatable function to update geometry vertexColors
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
            draw_while_loading: false,
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
        // console.log('updating colors in gifPlayer');
        var colors = [];

        try {
            imageData = context.getImageData(0, 0, 50, 150);
        } catch (e) {
            console.log('error getting imageData in gifPlayer:', e);
            return;
        }

        for (var i = 0; i < tubeMesh.geometry.vertices.length * 4; i += 4) {
            m = i % imageData.data.length;
            r = imageData.data[m];
            g = imageData.data[m + 1];
            b = imageData.data[m + 2];
            color = new THREE.Color(RGB2Hex(r, g, b));
            colors.push(color);
        }

        tubeMesh.geometry.colors = colors;
        tubeMesh.geometry.colorsNeedUpdate = true;
    };
};
var gif = gifPlayer('/images/animations/animation5.png');

function RGB2Hex(r, g, b) {
    var hex = b;
    hex |= (g << 8);
    hex |= (r << 16);
    return hex;
}

extrudePath = new THREE.Curves.TrefoilKnot();

var closed = true;
var parent;
var tube, tubeMesh;
var animation = false, lookAhead = false;
var scale;
var showCameraHelper = false;

function addTube() {

    var value = document.getElementById('spline').value;

    var segments = parseInt(document.getElementById('segments').value);
    // closed = document.getElementById('closed').checked;

    var radiusSegments = parseInt(document.getElementById('radiusSegments').value);

    if (tubeMesh) parent.remove(tubeMesh);

    extrudePath = splines[value];

    tube = new THREE.TubeGeometry(extrudePath, segments, 2, radiusSegments, closed);

    for (var i = 0; i < tube.vertices.length; i++) {
        var vertex = tube.vertices[i];
        // vertex.add( new THREE.Vector3( getRandomInRange(-0.25, 0.25), getRandomInRange(-0.25, 0.25), getRandomInRange(-0.25, 0.25) ) );
        vertex.add( new THREE.Vector3( 0, 0, 0 ) );
    }

    addGeometry(tube, 0xff00ff);
    setScale();

}

function setScale() {
    scale = parseInt( document.getElementById('scale').value );
    tubeMesh.scale.set( scale, scale, scale );
}

function getRandomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

function addGeometry( geometry, color ) {
    var pointsMaterial = new THREE.PointsMaterial({
        size: 2,
        map: texture,
        vertexColors: THREE.VertexColors,
        transparent: true,
        alphaTest: 0.5
    });

    var colors = [];
    for (var i = 0; i < geometry.vertices.length; i++) {
        colors.push(new THREE.Color(0x99cccc));
    }
    geometry.colors = colors;

    tubeMesh = new THREE.Points(geometry, pointsMaterial);
    parent.add( tubeMesh );

}

function animateCamera( toggle ) {

    if ( toggle ) {

        animation = animation === false;
        document.getElementById('animation').value = 'Camera Spline Animation View: ' + (animation? 'ON': 'OFF');

    }

    lookAhead = document.getElementById('lookAhead').checked;

    showCameraHelper = document.getElementById('cameraHelper').checked;

    cameraHelper.visible = showCameraHelper;
    cameraEye.visible = showCameraHelper;
}

var loader = new THREE.TextureLoader();
loader.load('/images/textures/ball.png', function (t) {
    texture = t;
    init();
    animate();
});

window.setTimeout(function () {
    var tl = new TimelineLite();

    tl.to('.loader h1, .loader span', 1, {
        y: -20,
        opacity: 0,
        ease: Expo.easeIn
    }, 0);

    tl.to('.loader .bg', 0.75, {
        y: '-101%',
        ease: Expo.easeIn
    }, 0.5);

    tl.set('nav', {
        opacity: 1
    }, 0);

    tl.fromTo('nav .bg', 0.5, {
        y: '101%'
    }, {
        y: '0%',
        ease: Expo.easeOut
    }, 1.25);

    tl.staggerFromTo('nav h1, nav form > div', 1, {
        y: '101%',
        opacity: 0
    }, {
        y: '0%',
        opacity: 1,
        ease: Expo.easeOut
    }, 0.025, 1.5);
}, 1000);

function init() {

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.set(0, 65, 500);

    scene = new THREE.Scene();

    var light = new THREE.DirectionalLight( 0xffffff );
    light.position.set( 0, 0, 1 );
    scene.add( light );

    parent = new THREE.Object3D();
    parent.position.y = 100;
    scene.add( parent );

    splineCamera = new THREE.PerspectiveCamera( 84, window.innerWidth / window.innerHeight, 0.01, 1000 );
    parent.add( splineCamera );

    cameraHelper = new THREE.CameraHelper( splineCamera );
    scene.add( cameraHelper );

    addTube();

    // Debug point

    cameraEye = new THREE.Mesh( new THREE.SphereGeometry( 3 ), new THREE.MeshBasicMaterial( { color: 0xdddddd } ) );
    parent.add( cameraEye );

    cameraHelper.visible = showCameraHelper;
    cameraEye.visible = showCameraHelper;

    if ( Detector.webgl ) {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } else {
        renderer = new THREE.CanvasRenderer();
    }

    // renderer.setClearColor( 0xf0f0f0 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    $('.renderer').append( renderer.domElement );

    stats = new Stats();
    $('body').append( stats.domElement );

    renderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
    renderer.domElement.addEventListener( 'touchstart', onDocumentTouchStart, false );
    renderer.domElement.addEventListener( 'touchmove', onDocumentTouchMove, false );

    window.addEventListener( 'resize', onWindowResize, false );
}

function onWindowResize() {

    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

//

function onDocumentMouseDown(event) {

    event.preventDefault();

    renderer.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
    renderer.domElement.addEventListener( 'mouseup', onDocumentMouseUp, false );
    renderer.domElement.addEventListener( 'mouseout', onDocumentMouseOut, false );

    mouseXOnMouseDown = event.clientX - windowHalfX;
    targetRotationOnMouseDown = targetRotation;

}

function onDocumentMouseMove(event) {

    mouseX = event.clientX - windowHalfX;

    targetRotation = targetRotationOnMouseDown + (mouseX - mouseXOnMouseDown) * 0.02;

}

function onDocumentMouseUp(event) {

    renderer.domElement.removeEventListener( 'mousemove', onDocumentMouseMove, false );
    renderer.domElement.removeEventListener( 'mouseup', onDocumentMouseUp, false );
    renderer.domElement.removeEventListener( 'mouseout', onDocumentMouseOut, false );

}

function onDocumentMouseOut(event) {

    renderer.domElement.removeEventListener( 'mousemove', onDocumentMouseMove, false );
    renderer.domElement.removeEventListener( 'mouseup', onDocumentMouseUp, false );
    renderer.domElement.removeEventListener( 'mouseout', onDocumentMouseOut, false );

}

function onDocumentTouchStart(event) {

    if (event.touches.length == 1) {

        event.preventDefault();

        mouseXOnMouseDown = event.touches[ 0 ].pageX - windowHalfX;
        targetRotationOnMouseDown = targetRotation;

    }

}

function onDocumentTouchMove(event) {

    if (event.touches.length == 1) {

        event.preventDefault();

        mouseX = event.touches[ 0 ].pageX - windowHalfX;
        targetRotation = targetRotationOnMouseDown + ( mouseX - mouseXOnMouseDown ) * 0.05;

    }

}

//

function animate() {

    requestAnimationFrame( animate );

    gif();
    render();
    stats.update();
}

function render() {

    // Try Animate Camera Along Spline
    var time = Date.now();
    var looptime = 30 * 1000;
    var t = ( time % looptime ) / looptime;

    var pos = tube.parameters.path.getPointAt( t );
    pos.multiplyScalar( scale );

    // interpolation
    var segments = tube.tangents.length;
    var pickt = t * segments;
    var pick = Math.floor( pickt );
    var pickNext = ( pick + 1 ) % segments;

    binormal.subVectors( tube.binormals[ pickNext ], tube.binormals[ pick ] );
    binormal.multiplyScalar( pickt - pick ).add( tube.binormals[ pick ] );


    var dir = tube.parameters.path.getTangentAt( t );

    var offset = 0;

    normal.copy( binormal ).cross( dir );

    // We move on a offset on its binormal
    pos.add( normal.clone().multiplyScalar( offset ) );

    splineCamera.position.copy( pos );
    cameraEye.position.copy( pos );


    // Camera Orientation 1 - default look at
    // splineCamera.lookAt( lookAt );

    // Using arclength for stablization in look ahead.
    var lookAt = tube.parameters.path.getPointAt( ( t + 30 / tube.parameters.path.getLength() ) % 1 ).multiplyScalar( scale );

    // Camera Orientation 2 - up orientation via normal
    if (!lookAhead)
    lookAt.copy( pos ).add( dir );
    splineCamera.matrix.lookAt(splineCamera.position, lookAt, normal);
    splineCamera.rotation.setFromRotationMatrix( splineCamera.matrix, splineCamera.rotation.order );

    cameraHelper.update();

    parent.rotation.y += ( targetRotation - parent.rotation.y ) * 0.05;

    renderer.render( scene, animation === true ? splineCamera : camera );

}
