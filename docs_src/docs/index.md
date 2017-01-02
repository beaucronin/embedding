# Welcome to Embedding

Embedding is a javascript library that makes it easy to create data-driven immersive environments - by _embedding_ data points in space and time.

Embedding relies heavily on the "Borisphere" of tools to provide a [responsive experience](http://smus.com/responsive-vr/) that works well on desktop, mobile, and [WebVR](https://w3c.github.io/webvr/) platforms. In particular, it uses the [WebVR polyfill](https://github.com/googlevr/webvr-polyfill), the [WebVR boilerplate](https://github.com/borismus/webvr-boilerplate) library, and [ray-input](https://github.com/borismus/ray-input) to provide pointing-based input across these platforms. WebVR support in various browsers is changing fast, and you can view the latest Embedding compatibility report.

Similar to how [D3](https://d3js.org/) builds on HTML and the DOM, including canvases and SVG, Embedding provides an abstraction layer over 3D objects defined in [WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API) and [three.js](http://threejs.org/), including geometries, materials, and lighting. A primary goal of Embeding is to enable developers who are not 3D experts to create beautiful, effective, and compelling data-driven environments.

## Where to go next

- Check out the [getting started guide](getting-started.md) to see how easy it is to create your first data-driven environment.
- Take a look at some examples to get a sense for the range of possibilities.
- View the main [embedding project repo](https://github.com/beaucronin/embedding) on github.
- Clone or download the embedding boilerplate repo to get started on your own project.
- We'd love your help in building and testing Embedding! Read about [contributing](contributing.md), checkout the [roadmap](roadmap.md), or [file an issue](https://github.com/beaucronin/embedding/issues) with any bugs or problems.