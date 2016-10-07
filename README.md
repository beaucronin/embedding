# embedding
Embedding is a javascript library that makes it easy to create data-driven environments. It is built on three.js, and takes inspiration from D3.

**NOTE: Embedding is embryonic, and not yet ready for any use other than playing and experimenting. Issues, discussion, and PRs very welcome!**

A major hypothesis driving the development of Embedding is that direct navigation and manipulation of environments provide fundamentally new opportunities in the creation of compelling data visualization, exploration, and discovery experiences - in particular, the ability to directly change the viewpoint via position- and direction-tracked camera in VR.

# Installation

# How do I use it?

Glad you asked! Here's about the simplest thing you can do:

```javascript
var scene, renderer, camera, dataset, embedding;
var N = 50;

// initialize the scene, renderer, and camera objects and inject into the DOM
EMBED.initScene();

// create a simple Dataset with x, y, and z attributes
dataset = new EMBED.Dataset();
for (let i = 0; i < N; i++) 
	dataset.add(
		{ _id: i, 
			x: i / (N / 10) - 5, 
			y: 4 * Math.sin(i * 2 * Math.PI / N), 
			z: 0 
		}
	);

// create an embedding that will place the points in the Dataset into space
embedding = new EMBED.ScatterEmbedding(
	scene, dataset, {pointColor: 0x339933, pointSize: .5});

// start a simple render loop
EMBED.animate();
```
[fiddle](https://jsfiddle.net/beaucronin/ctd4u9r2/)

Note that there's nothing special happening in the `EMBED.initScene()` and `EMBED.animate()` functions - these are just convenience methods that set up minimal three.js environments and a simple animate loop, respectively (you can find them here). For substantial projects, you'll probably handle this yourself.

### That's...kind of cool. But what if my data is changing - what if new data is arriving, for example?

Just add and remove new data points to the Dataset as needed, and the Embedding will update itself.

```javascript
dataset = new EMBED.Dataset();
window.setInterval(function() {
	if (i < N) {
    dataset.add(
      { _id: i, 
        x: i / (N / 10) - 5, 
        y: 4 * Math.sin(i * 2 * Math.PI / N), 
        z: 0 
      }
    );  	
  	i++;
  }
}, DELAY);

embedding = new EMBED.ScatterEmbedding(
	scene, dataset, {pointColor: 0x339933, pointSize: .5});
```
[fiddle](https://jsfiddle.net/beaucronin/v43yx59a/)

### OK, but what if _existing_ datapoints are being updated?

You can also update values in the Dataset, and the Embedding will change to match. It will even perform configurable animations to help the viewer to see what is changing.

```javascript
var N = 50;
var j = 0;
var DELAY = 50;
var start = (new Date()).getTime();

dataset = new EMBED.Dataset();
for (let i = 0; i < N; i++) 
	dataset.add(
		{ _id: i, 
			x: i / (N / 10) - 5, 
			y: 4 * Math.sin(i * 2 * Math.PI / N), 
			z: 0 
		}
	);
  
window.setInterval(function() {
  let elapsed = (new Date()).getTime() - start;
  dataset.update(
  	j, 'y', 4 * Math.sin(j * 2 * Math.PI / N - (elapsed/5000)))
  j = ++j % N;
}, DELAY);
```
[fiddle](https://jsfiddle.net/beaucronin/624sh5ce/)

### That's fine if I just want to see little balls dance around, but you were talking about data-driven _environments_, weren't you?

Yes indeed. There are many other embedding types besides the simple scatter plot we've been looking at up until now. As just one example, you can visualize streams FIXME

And, you can easily [develop your own embeddings]() to create data-driven environments with your own art and assets.

### But what if the data isn't just sitting in the browser? What if it's being piped over a websocket? Or on a server-side file? Or in a database?

That's what the `WebsocketDataset` is for - just point it at the right place and you're good to go. You can also pass in an adapter function that will process the messages from the socket.

```javascript
// TODO
```

### OK, but I really want to do all of this in VR. It's the future, after all - the last medium, and all  that. How much work is it to get one of these environments into WebVR?

No work at all, thanks to the [three.js VR viewer](https://github.com/mflux/three-vr-viewer) from [mflux](https://github.com/mflux). For example, VR-enabling the previous example looks like this:

FIXME

# Main Abstractions

- A *dataset* is a collection of data points. 
	- Data points can have arbitrary attributes, and always have a default value attribute
	- Basic dataset types are data frames, graphs
	- Datasets can have many backing implementations, including implementations that load and/or stream data from non-local data stores
	- Datasets can be updated: data points added and removed, and existing data points modified. These changes are tracked via an event system, and dependent embeddings notified

- An *embedding* is a method of placing data points in space. Embeddings can be static, in which case the position and rendering of each data point is fixed, or dynamic
	- Embeddings are characterized by 
		- Placement
		- Rendering
		- Updating
	- Multiple embeddings can depend on the same dataset

# Lifecycle

- An `EMBED.Dataset` object, _D_ is created
- A `THREE.Scene` object, _S_ is created
- An `EMBED.Embedding` object _E_ is created, with references to _S_ and _D_
	- _E_ registers itself with _D_ to receive change notifications
- As datapoints _dp_ in _D_ are added, removed, or updated:
	- _D_ send an event to _E_ (possibly multiple registered)
	- _E_ stores event payload (_dp_ `id`, event type, etc) for future reference
- _E_`.embed()` is called (once, or in the animate() loop, or as needed)
	- if _E_ is not initialized
		- creates necessary objects and state
		- iterates over _dp_ in _D_
			- creates rendering objects and state
		- sets initialized to `true`
	- else (_E_ is initialized)
		- iterates over change events
			- updates object state
		- clears change events

# Relationship to other projects

- Three.js is the foundation for Embedding. It is a general-purpose 3D engine, and does not contain the abtractions that save so much effort in Embedding.
- D3 is, in many ways, the inspiration for Embedding. D3 stands for "data-driven documents", whereas Embedding is all about creating "data-driven environments" - environments which the user is able to explore directly.
- A-Frame is a declarative framework for WebVR. It makes it very easy to create scenes whose components are largely fixed and static; by constrast, Embedding makes it easy to create environments whose components are not known at coding time, but are dynamically generated by the data.
- WebVR is the  W3C specification that describes common VR functionality from within web browsers, including the API available to developers of VR libraries and experiences. It is supported by both Chrome and Firefox.
