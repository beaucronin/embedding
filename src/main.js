'use strict'

import RayInput from 'ray-input';

import queryString from 'query-string';
import {
	WebSocketDataset, 
	Dataset
} from './dataset.js';
import {
	Embedding,
	MeshEmbedding,
	RandomEmbedding,
	ScatterEmbedding,
	PathEmbedding,
	ConsoleEmbedding
} from './embedding.js';
import { detectMode } from './detection-utils.js';

var embeddings = [];

export function initScene(controlType = "") {
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.z = 10;
	const cameraControls = new THREE.VRControls(camera);
	cameraControls.standing = true;

	const renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild( renderer.domElement );
    const effect = new THREE.VREffect(renderer);
	effect.setSize( window.innerWidth, window.innerHeight );

	const manager = new WebVRManager(renderer, effect);

	var onResize = function(e) {
	  effect.setSize(window.innerWidth, window.innerHeight);
	  camera.aspect = window.innerWidth / window.innerHeight;
	  camera.updateProjectionMatrix();
	}

	window.addEventListener('resize', onResize, true);
	window.addEventListener('vrdisplaypresentchange', onResize, true);

    // putting the input in the THREE global for now; probably want embeddings to fire 
    // events when meshes are added/removed rather than referencing the input directly
	THREE.input = new RayInput(camera, renderer.domElement);
	THREE.input.setSize(renderer.getSize());
	scene.add(THREE.input.getMesh());

	// NOTE: relies on the webvr polyfill being present to always have a valid display
	var vrDisplay;
	navigator.getVRDisplays().then(function(displays) {
	    if (displays.length > 0) {
	      	vrDisplay = displays[0];
	      	vrDisplay.requestAnimationFrame(animate);
	    }
	});

    return { scene, camera, manager, effect, cameraControls, vrDisplay };
}

var lastRender = 0;
export function animate(timestamp) {
	if (! timestamp) timestamp = Date.now();
	var delta = Math.min(timestamp - lastRender, 500);
  	lastRender = timestamp;

  	for (let e of embeddings) {
		e.embed();
  	}
	THREE.input.update();
    cameraControls.update();
    manager.render( scene, camera, timestamp );
    // FIXME: is this render call necessary?
    // effect.render( scene, camera );
    vrDisplay.requestAnimationFrame( animate );

}

export function register(embedding) {
	embeddings.push(embedding);
}

module.exports = {
	Dataset: Dataset,
	WebSocketDataset: WebSocketDataset,
	Embedding: Embedding,
	MeshEmbedding: MeshEmbedding,
	RandomEmbedding: RandomEmbedding,
	ScatterEmbedding: ScatterEmbedding,
	PathEmbedding: PathEmbedding,
	ConsoleEmbedding: ConsoleEmbedding,
	initScene: initScene,
	animate: animate,
	queryString: queryString,
	detectMode: detectMode,
	register: register
}
