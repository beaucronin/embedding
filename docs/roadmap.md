# Embeddings

- Snowfall: each point is realized as a particle, governed by simple physics; configuration by gravity, turbulence, point mass and size
	- Placement is initially randomized
	- Rendering is by input parameters, and also possibly by binding to data point attributes
	- Updating is by physics (gravity, turbulence)
- River: each point is realized as a mesh that follows a path
	- Placement is initialized at path start, possibly with some randomization
	- Rendering is by input parameters and data point attribute binding
	- Updating is by physics (fluid dynamics)
- Tree: each point is realized as a "leaf" on a hierarchical tree structure whose branches can grow and shrink over time
- Graph: each point is a node on a graph
	- Placement is by graph layout algorithm, such as force directed
- Geo: each point is located in space
	- Placement is by datapoint attributes plus mapping projection
- Planar: each point is located in a (possibly curved) plane
- FocusEmbeddings, for providing info on a single datapoint
	- DrillDownEmbedding, a configurable panel that displays attribute values (text, numbers, images, etc)
- AggregateEmbeddings, providing summaries of datasets based on analytic-style queries (possibly windowed)


# Datasets

- Websocket

# Interactivity

- Pointer with adjustable barrel width
- Net with adjustable length and diameter
- Gravity gun


# Showcase Examples
- Blockchain stream
- Twitter stream
