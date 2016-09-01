# Builds and infra
- Get watched builds working with gulp + browserify
- Figure out testing framework
- Build status, code coverage etc. reported in README widgets

# Design
- x Figure out Dataset & Embedding lifecycle and update/render loop
- Figure out Datapoint attribute mapping scheme (convention only?)
- Figure out animation flow
- Interaction tools (all with aural and haptic feedback, usable with both Vive and Touch):
	- Pointer with adjustable barrel width
	- Net with adjustable length and diameter
	- Gravity gun
- FocusEmbeddings, for providing info on a single datapoint
	- DrillDownEmbedding, a configurable panel that displays attribute values (text, numbers, images, etc)
- AggregateEmbeddings, providing summaries of datasets based on analytic-style queries (possibly windowed)

# Implement

## Basics
- x Passing in basic embedding parameters: position, orientation, scale
- x Use points objects to back scatter-type embeddings (random, scatter, snow)
- add dp update animations with tweens
- Color scales and interpolation
- Lighting and material styles

## Datasets
- CSV loading into Dataset
- SQL query loading into Dataset
- Websocket-backed Datasets
- Server-side datasets, where the actual data lives in a node server

## Embeddings
- 3D force-directed graph layout

# Examples
- Tweet stream as river
- 