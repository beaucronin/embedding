'use strict'

var Papa = require('papaparse');
var assign = require('object-assign');
var TWEEN = require('tween.js');
var queryString = require('query-string');

var controls;

var embeddings = [];

var animateEmbeddings = function() {
	for (e in embeddings) {
		//
	}
}

function initScene(controlType = "") {
	if (controlType.toLowerCase() == "vr") {
		// use mflux's webvr harness
		const { scene, camera, renderer, events, toggleVR, controllers, vrEffect } = VRViewer({THREE});
		return { scene, camera, renderer };
	} else {
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
		camera.position.z = 10;

		const renderer = new THREE.WebGLRenderer();
		renderer.setSize( window.innerWidth, window.innerHeight );
	    document.body.appendChild( renderer.domElement );

	    if (controlType.toLowerCase() == "orbit") {
	    	const OrbitControls = require('three-orbit-controls')(THREE);
	    	controls = new OrbitControls(camera, renderer.domElement);
	    }
	    return { scene, camera, renderer };		
	}
}

function animate() {

    requestAnimationFrame( animate );
	embedding.embed();
    renderer.render( scene, camera );

}

module.exports = {
	Dataset: Dataset,
	WebSocketDataset: WebSocketDataset,
	Embedding: Embedding,
	RandomEmbedding: RandomEmbedding,
	ScatterEmbedding: ScatterEmbedding,
	PathEmbedding: PathEmbedding,
	initScene: initScene,
	animate: animate,
	queryString: queryString
}
