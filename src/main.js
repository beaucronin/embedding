'use strict'

var Papa = require('papaparse');
var assign = require('object-assign');
var TWEEN = require('tween.js');
var queryString = require('query-string');

var embeddings = [];

var animateEmbeddings = function() {
	for (e in embeddings) {
		//
	}
}

function initScene() {
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.z = 10;

	renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );
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
