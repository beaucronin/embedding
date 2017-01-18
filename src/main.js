'use strict'

/**
 * @author Beau Cronin <beau.cronin@gmail.com>
 */

import * as THREE from 'three';
import './external/VRControls.js';
import './external/VREffect.js';
import RayInput from 'ray-input';
import TWEEN from 'tween.js';
import { detectMode } from './detection-utils.js';
import { VRDisplay } from 'webvr-polyfill';
import WebVRManager from 'webvr-boilerplate';

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
	ConsoleEmbedding,
	AggregateEmbedding
} from './embedding.js';
import {
	latLongToEuclidean,
	degToRad,
	ajaxWithCallback,
	categoricalMap
} from './utils.js';

var embeddings = [];
var updateFunc;
var lastRender = 0;
var vrDisplay;
export var input;

/**
 * Convenience function to create a responsive THREE scene and related objects. Returns a number 
 * of objects that should probably be kept around by the enclosing script.
 */
export function initScene(options = {}) {
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.z = 10;
	
	// The VRControls object updates the camera position in response to position and orientation
	// changes of the HMD.
	const cameraControls = new THREE.VRControls(camera);
	cameraControls.standing = true;

	// This renderer is the standard WebGL renderer; it may be further processed for VR use depending
	// on the mode selected by the webvr-boilerplate
	const renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild( renderer.domElement );
    
    // The VREffect is responsible for distorting the rendered image to match the optics of the HMD,
    // as well as rendering different, offset images for each eye
    const effect = new THREE.VREffect(renderer);
	effect.setSize( window.innerWidth, window.innerHeight );

	// The WebVRManager is provided by the webvr-boilerplate, and handles detection of display hardware
	// (desktop, mobile, VR) and switching between regular and VR modes
	const manager = new WebVRManager(renderer, effect);

	var onResize = function(e) {
	  effect.setSize(window.innerWidth, window.innerHeight);
	  camera.aspect = window.innerWidth / window.innerHeight;
	  camera.updateProjectionMatrix();
	}

	window.addEventListener('resize', onResize, true);
	window.addEventListener('vrdisplaypresentchange', onResize, true);

    // TODO putting the input in the THREE global for now; probably want embeddings to fire 
    // events when meshes are added/removed rather than referencing the input directly
	input = new RayInput(camera, renderer.domElement);
	input.setSize(renderer.getSize());
	scene.add(input.getMesh());

	updateFunc = options.updateFunc;

    return { scene, camera, manager, effect, cameraControls };
}

export function startAnimation() {
	// NOTE: assumes the webvr polyfill is present, so can count on a valid display
	navigator.getVRDisplays().then(function(displays) {
	    if (displays.length > 0) {
	      	vrDisplay = displays[0];
	      	vrDisplay.requestAnimationFrame(animate);
	    }
	});
}

/**
 * The core animation call that is executed for each frame. Updates all registered
 * embeddings, the pointer controls, and the camera position. Renders the scene
 * using the WebVRManager, which applies the VREffect if in VR mode.
 */
export function animate(timestamp) {
	if (! timestamp) timestamp = Date.now();
	var delta = Math.min(timestamp - lastRender, 500);
  	lastRender = timestamp;

  	for (let e of embeddings) {
		e.embed();
  	}
  	TWEEN.update();
	input.update();
    cameraControls.update();
    if (updateFunc) updateFunc(delta);

    manager.render( scene, camera, timestamp );

    vrDisplay.requestAnimationFrame( animate );
}

/**
 * Register an embedding so that it will be updated on each animation frame.
 * @param {Embedding} embedding - The embedding
 */
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
	AggregateEmbedding,
	initScene: initScene,
	animate: animate,
	detectMode: detectMode,
	register: register,
	startAnimation,
	utils: {
		degToRad,
		latLongToEuclidean,
		ajaxWithCallback,
		categoricalMap
	},
	THREE,
	input
}
