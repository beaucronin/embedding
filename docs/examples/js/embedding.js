(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.EMBED = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

(function () {
    try {
        cachedSetTimeout = setTimeout;
    } catch (e) {
        cachedSetTimeout = function () {
            throw new Error('setTimeout is not defined');
        }
    }
    try {
        cachedClearTimeout = clearTimeout;
    } catch (e) {
        cachedClearTimeout = function () {
            throw new Error('clearTimeout is not defined');
        }
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        return setTimeout(fun, 0);
    } else {
        return cachedSetTimeout.call(null, fun, 0);
    }
}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        clearTimeout(marker);
    } else {
        cachedClearTimeout.call(null, marker);
    }
}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
'use strict';

var has = Object.prototype.hasOwnProperty;

//
// We store our EE objects in a plain object whose properties are event names.
// If `Object.create(null)` is not supported we prefix the event names with a
// `~` to make sure that the built-in object properties are not overridden or
// used as an attack vector.
// We also assume that `Object.create(null)` is available when the event name
// is an ES6 Symbol.
//
var prefix = typeof Object.create !== 'function' ? '~' : false;

/**
 * Representation of a single EventEmitter function.
 *
 * @param {Function} fn Event handler to be called.
 * @param {Mixed} context Context for function execution.
 * @param {Boolean} [once=false] Only emit once
 * @api private
 */
function EE(fn, context, once) {
  this.fn = fn;
  this.context = context;
  this.once = once || false;
}

/**
 * Minimal EventEmitter interface that is molded against the Node.js
 * EventEmitter interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() { /* Nothing to set */ }

/**
 * Hold the assigned EventEmitters by name.
 *
 * @type {Object}
 * @private
 */
EventEmitter.prototype._events = undefined;

/**
 * Return an array listing the events for which the emitter has registered
 * listeners.
 *
 * @returns {Array}
 * @api public
 */
EventEmitter.prototype.eventNames = function eventNames() {
  var events = this._events
    , names = []
    , name;

  if (!events) return names;

  for (name in events) {
    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
  }

  if (Object.getOwnPropertySymbols) {
    return names.concat(Object.getOwnPropertySymbols(events));
  }

  return names;
};

/**
 * Return a list of assigned event listeners.
 *
 * @param {String} event The events that should be listed.
 * @param {Boolean} exists We only need to know if there are listeners.
 * @returns {Array|Boolean}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event, exists) {
  var evt = prefix ? prefix + event : event
    , available = this._events && this._events[evt];

  if (exists) return !!available;
  if (!available) return [];
  if (available.fn) return [available.fn];

  for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
    ee[i] = available[i].fn;
  }

  return ee;
};

/**
 * Emit an event to all registered event listeners.
 *
 * @param {String} event The name of the event.
 * @returns {Boolean} Indication if we've emitted an event.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return false;

  var listeners = this._events[evt]
    , len = arguments.length
    , args
    , i;

  if ('function' === typeof listeners.fn) {
    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

    switch (len) {
      case 1: return listeners.fn.call(listeners.context), true;
      case 2: return listeners.fn.call(listeners.context, a1), true;
      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
    }

    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    listeners.fn.apply(listeners.context, args);
  } else {
    var length = listeners.length
      , j;

    for (i = 0; i < length; i++) {
      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

      switch (len) {
        case 1: listeners[i].fn.call(listeners[i].context); break;
        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
        default:
          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
            args[j - 1] = arguments[j];
          }

          listeners[i].fn.apply(listeners[i].context, args);
      }
    }
  }

  return true;
};

/**
 * Register a new EventListener for the given event.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} [context=this] The context of the function.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  var listener = new EE(fn, context || this)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Add an EventListener that's only called once.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} [context=this] The context of the function.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  var listener = new EE(fn, context || this, true)
    , evt = prefix ? prefix + event : event;

  if (!this._events) this._events = prefix ? {} : Object.create(null);
  if (!this._events[evt]) this._events[evt] = listener;
  else {
    if (!this._events[evt].fn) this._events[evt].push(listener);
    else this._events[evt] = [
      this._events[evt], listener
    ];
  }

  return this;
};

/**
 * Remove event listeners.
 *
 * @param {String} event The event we want to remove.
 * @param {Function} fn The listener that we need to find.
 * @param {Mixed} context Only remove listeners matching this context.
 * @param {Boolean} once Only remove once listeners.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
  var evt = prefix ? prefix + event : event;

  if (!this._events || !this._events[evt]) return this;

  var listeners = this._events[evt]
    , events = [];

  if (fn) {
    if (listeners.fn) {
      if (
           listeners.fn !== fn
        || (once && !listeners.once)
        || (context && listeners.context !== context)
      ) {
        events.push(listeners);
      }
    } else {
      for (var i = 0, length = listeners.length; i < length; i++) {
        if (
             listeners[i].fn !== fn
          || (once && !listeners[i].once)
          || (context && listeners[i].context !== context)
        ) {
          events.push(listeners[i]);
        }
      }
    }
  }

  //
  // Reset the array, or remove it completely if we have no more listeners.
  //
  if (events.length) {
    this._events[evt] = events.length === 1 ? events[0] : events;
  } else {
    delete this._events[evt];
  }

  return this;
};

/**
 * Remove all listeners or only the listeners for the specified event.
 *
 * @param {String} event The event want to remove all listeners for.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  if (!this._events) return this;

  if (event) delete this._events[prefix ? prefix + event : event];
  else this._events = prefix ? {} : Object.create(null);

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

//
// Expose the prefix.
//
EventEmitter.prefixed = prefix;

//
// Expose the module.
//
if ('undefined' !== typeof module) {
  module.exports = EventEmitter;
}

},{}],3:[function(require,module,exports){
'use strict';
/* eslint-disable no-unused-vars */
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

function shouldUseNative() {
	try {
		if (!Object.assign) {
			return false;
		}

		// Detect buggy property enumeration order in older V8 versions.

		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
		var test1 = new String('abc');  // eslint-disable-line
		test1[5] = 'de';
		if (Object.getOwnPropertyNames(test1)[0] === '5') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test2 = {};
		for (var i = 0; i < 10; i++) {
			test2['_' + String.fromCharCode(i)] = i;
		}
		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
			return test2[n];
		});
		if (order2.join('') !== '0123456789') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test3 = {};
		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
			test3[letter] = letter;
		});
		if (Object.keys(Object.assign({}, test3)).join('') !==
				'abcdefghijklmnopqrst') {
			return false;
		}

		return true;
	} catch (e) {
		// We don't expect any of the above to throw, but better to be safe.
		return false;
	}
}

module.exports = shouldUseNative() ? Object.assign : function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (Object.getOwnPropertySymbols) {
			symbols = Object.getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};

},{}],4:[function(require,module,exports){
/*!
	Papa Parse
	v4.1.2
	https://github.com/mholt/PapaParse
*/
(function(global)
{
	"use strict";

	var IS_WORKER = !global.document && !!global.postMessage,
		IS_PAPA_WORKER = IS_WORKER && /(\?|&)papaworker(=|&|$)/.test(global.location.search),
		LOADED_SYNC = false, AUTO_SCRIPT_PATH;
	var workers = {}, workerIdCounter = 0;

	var Papa = {};

	Papa.parse = CsvToJson;
	Papa.unparse = JsonToCsv;

	Papa.RECORD_SEP = String.fromCharCode(30);
	Papa.UNIT_SEP = String.fromCharCode(31);
	Papa.BYTE_ORDER_MARK = "\ufeff";
	Papa.BAD_DELIMITERS = ["\r", "\n", "\"", Papa.BYTE_ORDER_MARK];
	Papa.WORKERS_SUPPORTED = !IS_WORKER && !!global.Worker;
	Papa.SCRIPT_PATH = null;	// Must be set by your code if you use workers and this lib is loaded asynchronously

	// Configurable chunk sizes for local and remote files, respectively
	Papa.LocalChunkSize = 1024 * 1024 * 10;	// 10 MB
	Papa.RemoteChunkSize = 1024 * 1024 * 5;	// 5 MB
	Papa.DefaultDelimiter = ",";			// Used if not specified and detection fails

	// Exposed for testing and development only
	Papa.Parser = Parser;
	Papa.ParserHandle = ParserHandle;
	Papa.NetworkStreamer = NetworkStreamer;
	Papa.FileStreamer = FileStreamer;
	Papa.StringStreamer = StringStreamer;

	if (typeof module !== 'undefined' && module.exports)
	{
		// Export to Node...
		module.exports = Papa;
	}
	else if (isFunction(global.define) && global.define.amd)
	{
		// Wireup with RequireJS
		define(function() { return Papa; });
	}
	else
	{
		// ...or as browser global
		global.Papa = Papa;
	}

	if (global.jQuery)
	{
		var $ = global.jQuery;
		$.fn.parse = function(options)
		{
			var config = options.config || {};
			var queue = [];

			this.each(function(idx)
			{
				var supported = $(this).prop('tagName').toUpperCase() == "INPUT"
								&& $(this).attr('type').toLowerCase() == "file"
								&& global.FileReader;

				if (!supported || !this.files || this.files.length == 0)
					return true;	// continue to next input element

				for (var i = 0; i < this.files.length; i++)
				{
					queue.push({
						file: this.files[i],
						inputElem: this,
						instanceConfig: $.extend({}, config)
					});
				}
			});

			parseNextFile();	// begin parsing
			return this;		// maintains chainability


			function parseNextFile()
			{
				if (queue.length == 0)
				{
					if (isFunction(options.complete))
						options.complete();
					return;
				}

				var f = queue[0];

				if (isFunction(options.before))
				{
					var returned = options.before(f.file, f.inputElem);

					if (typeof returned === 'object')
					{
						if (returned.action == "abort")
						{
							error("AbortError", f.file, f.inputElem, returned.reason);
							return;	// Aborts all queued files immediately
						}
						else if (returned.action == "skip")
						{
							fileComplete();	// parse the next file in the queue, if any
							return;
						}
						else if (typeof returned.config === 'object')
							f.instanceConfig = $.extend(f.instanceConfig, returned.config);
					}
					else if (returned == "skip")
					{
						fileComplete();	// parse the next file in the queue, if any
						return;
					}
				}

				// Wrap up the user's complete callback, if any, so that ours also gets executed
				var userCompleteFunc = f.instanceConfig.complete;
				f.instanceConfig.complete = function(results)
				{
					if (isFunction(userCompleteFunc))
						userCompleteFunc(results, f.file, f.inputElem);
					fileComplete();
				};

				Papa.parse(f.file, f.instanceConfig);
			}

			function error(name, file, elem, reason)
			{
				if (isFunction(options.error))
					options.error({name: name}, file, elem, reason);
			}

			function fileComplete()
			{
				queue.splice(0, 1);
				parseNextFile();
			}
		}
	}


	if (IS_PAPA_WORKER)
	{
		global.onmessage = workerThreadReceivedMessage;
	}
	else if (Papa.WORKERS_SUPPORTED)
	{
		AUTO_SCRIPT_PATH = getScriptPath();

		// Check if the script was loaded synchronously
		if (!document.body)
		{
			// Body doesn't exist yet, must be synchronous
			LOADED_SYNC = true;
		}
		else
		{
			document.addEventListener('DOMContentLoaded', function () {
				LOADED_SYNC = true;
			}, true);
		}
	}




	function CsvToJson(_input, _config)
	{
		_config = _config || {};

		if (_config.worker && Papa.WORKERS_SUPPORTED)
		{
			var w = newWorker();

			w.userStep = _config.step;
			w.userChunk = _config.chunk;
			w.userComplete = _config.complete;
			w.userError = _config.error;

			_config.step = isFunction(_config.step);
			_config.chunk = isFunction(_config.chunk);
			_config.complete = isFunction(_config.complete);
			_config.error = isFunction(_config.error);
			delete _config.worker;	// prevent infinite loop

			w.postMessage({
				input: _input,
				config: _config,
				workerId: w.id
			});

			return;
		}

		var streamer = null;
		if (typeof _input === 'string')
		{
			if (_config.download)
				streamer = new NetworkStreamer(_config);
			else
				streamer = new StringStreamer(_config);
		}
		else if ((global.File && _input instanceof File) || _input instanceof Object)	// ...Safari. (see issue #106)
			streamer = new FileStreamer(_config);

		return streamer.stream(_input);
	}






	function JsonToCsv(_input, _config)
	{
		var _output = "";
		var _fields = [];

		// Default configuration

		/** whether to surround every datum with quotes */
		var _quotes = false;

		/** delimiting character */
		var _delimiter = ",";

		/** newline character(s) */
		var _newline = "\r\n";

		unpackConfig();

		if (typeof _input === 'string')
			_input = JSON.parse(_input);

		if (_input instanceof Array)
		{
			if (!_input.length || _input[0] instanceof Array)
				return serialize(null, _input);
			else if (typeof _input[0] === 'object')
				return serialize(objectKeys(_input[0]), _input);
		}
		else if (typeof _input === 'object')
		{
			if (typeof _input.data === 'string')
				_input.data = JSON.parse(_input.data);

			if (_input.data instanceof Array)
			{
				if (!_input.fields)
					_input.fields = _input.data[0] instanceof Array
									? _input.fields
									: objectKeys(_input.data[0]);

				if (!(_input.data[0] instanceof Array) && typeof _input.data[0] !== 'object')
					_input.data = [_input.data];	// handles input like [1,2,3] or ["asdf"]
			}

			return serialize(_input.fields || [], _input.data || []);
		}

		// Default (any valid paths should return before this)
		throw "exception: Unable to serialize unrecognized input";


		function unpackConfig()
		{
			if (typeof _config !== 'object')
				return;

			if (typeof _config.delimiter === 'string'
				&& _config.delimiter.length == 1
				&& Papa.BAD_DELIMITERS.indexOf(_config.delimiter) == -1)
			{
				_delimiter = _config.delimiter;
			}

			if (typeof _config.quotes === 'boolean'
				|| _config.quotes instanceof Array)
				_quotes = _config.quotes;

			if (typeof _config.newline === 'string')
				_newline = _config.newline;
		}


		/** Turns an object's keys into an array */
		function objectKeys(obj)
		{
			if (typeof obj !== 'object')
				return [];
			var keys = [];
			for (var key in obj)
				keys.push(key);
			return keys;
		}

		/** The double for loop that iterates the data and writes out a CSV string including header row */
		function serialize(fields, data)
		{
			var csv = "";

			if (typeof fields === 'string')
				fields = JSON.parse(fields);
			if (typeof data === 'string')
				data = JSON.parse(data);

			var hasHeader = fields instanceof Array && fields.length > 0;
			var dataKeyedByField = !(data[0] instanceof Array);

			// If there a header row, write it first
			if (hasHeader)
			{
				for (var i = 0; i < fields.length; i++)
				{
					if (i > 0)
						csv += _delimiter;
					csv += safe(fields[i], i);
				}
				if (data.length > 0)
					csv += _newline;
			}

			// Then write out the data
			for (var row = 0; row < data.length; row++)
			{
				var maxCol = hasHeader ? fields.length : data[row].length;

				for (var col = 0; col < maxCol; col++)
				{
					if (col > 0)
						csv += _delimiter;
					var colIdx = hasHeader && dataKeyedByField ? fields[col] : col;
					csv += safe(data[row][colIdx], col);
				}

				if (row < data.length - 1)
					csv += _newline;
			}

			return csv;
		}

		/** Encloses a value around quotes if needed (makes a value safe for CSV insertion) */
		function safe(str, col)
		{
			if (typeof str === "undefined" || str === null)
				return "";

			str = str.toString().replace(/"/g, '""');

			var needsQuotes = (typeof _quotes === 'boolean' && _quotes)
							|| (_quotes instanceof Array && _quotes[col])
							|| hasAny(str, Papa.BAD_DELIMITERS)
							|| str.indexOf(_delimiter) > -1
							|| str.charAt(0) == ' '
							|| str.charAt(str.length - 1) == ' ';

			return needsQuotes ? '"' + str + '"' : str;
		}

		function hasAny(str, substrings)
		{
			for (var i = 0; i < substrings.length; i++)
				if (str.indexOf(substrings[i]) > -1)
					return true;
			return false;
		}
	}

	/** ChunkStreamer is the base prototype for various streamer implementations. */
	function ChunkStreamer(config)
	{
		this._handle = null;
		this._paused = false;
		this._finished = false;
		this._input = null;
		this._baseIndex = 0;
		this._partialLine = "";
		this._rowCount = 0;
		this._start = 0;
		this._nextChunk = null;
		this.isFirstChunk = true;
		this._completeResults = {
			data: [],
			errors: [],
			meta: {}
		};
		replaceConfig.call(this, config);

		this.parseChunk = function(chunk)
		{
			// First chunk pre-processing
			if (this.isFirstChunk && isFunction(this._config.beforeFirstChunk))
			{
				var modifiedChunk = this._config.beforeFirstChunk(chunk);
				if (modifiedChunk !== undefined)
					chunk = modifiedChunk;
			}
			this.isFirstChunk = false;

			// Rejoin the line we likely just split in two by chunking the file
			var aggregate = this._partialLine + chunk;
			this._partialLine = "";

			var results = this._handle.parse(aggregate, this._baseIndex, !this._finished);
			
			if (this._handle.paused() || this._handle.aborted())
				return;
			
			var lastIndex = results.meta.cursor;
			
			if (!this._finished)
			{
				this._partialLine = aggregate.substring(lastIndex - this._baseIndex);
				this._baseIndex = lastIndex;
			}

			if (results && results.data)
				this._rowCount += results.data.length;

			var finishedIncludingPreview = this._finished || (this._config.preview && this._rowCount >= this._config.preview);

			if (IS_PAPA_WORKER)
			{
				global.postMessage({
					results: results,
					workerId: Papa.WORKER_ID,
					finished: finishedIncludingPreview
				});
			}
			else if (isFunction(this._config.chunk))
			{
				this._config.chunk(results, this._handle);
				if (this._paused)
					return;
				results = undefined;
				this._completeResults = undefined;
			}

			if (!this._config.step && !this._config.chunk) {
				this._completeResults.data = this._completeResults.data.concat(results.data);
				this._completeResults.errors = this._completeResults.errors.concat(results.errors);
				this._completeResults.meta = results.meta;
			}

			if (finishedIncludingPreview && isFunction(this._config.complete) && (!results || !results.meta.aborted))
				this._config.complete(this._completeResults);

			if (!finishedIncludingPreview && (!results || !results.meta.paused))
				this._nextChunk();

			return results;
		};

		this._sendError = function(error)
		{
			if (isFunction(this._config.error))
				this._config.error(error);
			else if (IS_PAPA_WORKER && this._config.error)
			{
				global.postMessage({
					workerId: Papa.WORKER_ID,
					error: error,
					finished: false
				});
			}
		};

		function replaceConfig(config)
		{
			// Deep-copy the config so we can edit it
			var configCopy = copy(config);
			configCopy.chunkSize = parseInt(configCopy.chunkSize);	// parseInt VERY important so we don't concatenate strings!
			if (!config.step && !config.chunk)
				configCopy.chunkSize = null;  // disable Range header if not streaming; bad values break IIS - see issue #196
			this._handle = new ParserHandle(configCopy);
			this._handle.streamer = this;
			this._config = configCopy;	// persist the copy to the caller
		}
	}


	function NetworkStreamer(config)
	{
		config = config || {};
		if (!config.chunkSize)
			config.chunkSize = Papa.RemoteChunkSize;
		ChunkStreamer.call(this, config);

		var xhr;

		if (IS_WORKER)
		{
			this._nextChunk = function()
			{
				this._readChunk();
				this._chunkLoaded();
			};
		}
		else
		{
			this._nextChunk = function()
			{
				this._readChunk();
			};
		}

		this.stream = function(url)
		{
			this._input = url;
			this._nextChunk();	// Starts streaming
		};

		this._readChunk = function()
		{
			if (this._finished)
			{
				this._chunkLoaded();
				return;
			}

			xhr = new XMLHttpRequest();
			
			if (!IS_WORKER)
			{
				xhr.onload = bindFunction(this._chunkLoaded, this);
				xhr.onerror = bindFunction(this._chunkError, this);
			}

			xhr.open("GET", this._input, !IS_WORKER);
			
			if (this._config.chunkSize)
			{
				var end = this._start + this._config.chunkSize - 1;	// minus one because byte range is inclusive
				xhr.setRequestHeader("Range", "bytes="+this._start+"-"+end);
				xhr.setRequestHeader("If-None-Match", "webkit-no-cache"); // https://bugs.webkit.org/show_bug.cgi?id=82672
			}

			try {
				xhr.send();
			}
			catch (err) {
				this._chunkError(err.message);
			}

			if (IS_WORKER && xhr.status == 0)
				this._chunkError();
			else
				this._start += this._config.chunkSize;
		}

		this._chunkLoaded = function()
		{
			if (xhr.readyState != 4)
				return;

			if (xhr.status < 200 || xhr.status >= 400)
			{
				this._chunkError();
				return;
			}

			this._finished = !this._config.chunkSize || this._start > getFileSize(xhr);
			this.parseChunk(xhr.responseText);
		}

		this._chunkError = function(errorMessage)
		{
			var errorText = xhr.statusText || errorMessage;
			this._sendError(errorText);
		}

		function getFileSize(xhr)
		{
			var contentRange = xhr.getResponseHeader("Content-Range");
			return parseInt(contentRange.substr(contentRange.lastIndexOf("/") + 1));
		}
	}
	NetworkStreamer.prototype = Object.create(ChunkStreamer.prototype);
	NetworkStreamer.prototype.constructor = NetworkStreamer;


	function FileStreamer(config)
	{
		config = config || {};
		if (!config.chunkSize)
			config.chunkSize = Papa.LocalChunkSize;
		ChunkStreamer.call(this, config);

		var reader, slice;

		// FileReader is better than FileReaderSync (even in worker) - see http://stackoverflow.com/q/24708649/1048862
		// But Firefox is a pill, too - see issue #76: https://github.com/mholt/PapaParse/issues/76
		var usingAsyncReader = typeof FileReader !== 'undefined';	// Safari doesn't consider it a function - see issue #105

		this.stream = function(file)
		{
			this._input = file;
			slice = file.slice || file.webkitSlice || file.mozSlice;

			if (usingAsyncReader)
			{
				reader = new FileReader();		// Preferred method of reading files, even in workers
				reader.onload = bindFunction(this._chunkLoaded, this);
				reader.onerror = bindFunction(this._chunkError, this);
			}
			else
				reader = new FileReaderSync();	// Hack for running in a web worker in Firefox

			this._nextChunk();	// Starts streaming
		};

		this._nextChunk = function()
		{
			if (!this._finished && (!this._config.preview || this._rowCount < this._config.preview))
				this._readChunk();
		}

		this._readChunk = function()
		{
			var input = this._input;
			if (this._config.chunkSize)
			{
				var end = Math.min(this._start + this._config.chunkSize, this._input.size);
				input = slice.call(input, this._start, end);
			}
			var txt = reader.readAsText(input, this._config.encoding);
			if (!usingAsyncReader)
				this._chunkLoaded({ target: { result: txt } });	// mimic the async signature
		}

		this._chunkLoaded = function(event)
		{
			// Very important to increment start each time before handling results
			this._start += this._config.chunkSize;
			this._finished = !this._config.chunkSize || this._start >= this._input.size;
			this.parseChunk(event.target.result);
		}

		this._chunkError = function()
		{
			this._sendError(reader.error);
		}

	}
	FileStreamer.prototype = Object.create(ChunkStreamer.prototype);
	FileStreamer.prototype.constructor = FileStreamer;


	function StringStreamer(config)
	{
		config = config || {};
		ChunkStreamer.call(this, config);

		var string;
		var remaining;
		this.stream = function(s)
		{
			string = s;
			remaining = s;
			return this._nextChunk();
		}
		this._nextChunk = function()
		{
			if (this._finished) return;
			var size = this._config.chunkSize;
			var chunk = size ? remaining.substr(0, size) : remaining;
			remaining = size ? remaining.substr(size) : '';
			this._finished = !remaining;
			return this.parseChunk(chunk);
		}
	}
	StringStreamer.prototype = Object.create(StringStreamer.prototype);
	StringStreamer.prototype.constructor = StringStreamer;



	// Use one ParserHandle per entire CSV file or string
	function ParserHandle(_config)
	{
		// One goal is to minimize the use of regular expressions...
		var FLOAT = /^\s*-?(\d*\.?\d+|\d+\.?\d*)(e[-+]?\d+)?\s*$/i;

		var self = this;
		var _stepCounter = 0;	// Number of times step was called (number of rows parsed)
		var _input;				// The input being parsed
		var _parser;			// The core parser being used
		var _paused = false;	// Whether we are paused or not
		var _aborted = false;   // Whether the parser has aborted or not
		var _delimiterError;	// Temporary state between delimiter detection and processing results
		var _fields = [];		// Fields are from the header row of the input, if there is one
		var _results = {		// The last results returned from the parser
			data: [],
			errors: [],
			meta: {}
		};

		if (isFunction(_config.step))
		{
			var userStep = _config.step;
			_config.step = function(results)
			{
				_results = results;

				if (needsHeaderRow())
					processResults();
				else	// only call user's step function after header row
				{
					processResults();

					// It's possbile that this line was empty and there's no row here after all
					if (_results.data.length == 0)
						return;

					_stepCounter += results.data.length;
					if (_config.preview && _stepCounter > _config.preview)
						_parser.abort();
					else
						userStep(_results, self);
				}
			};
		}

		/**
		 * Parses input. Most users won't need, and shouldn't mess with, the baseIndex
		 * and ignoreLastRow parameters. They are used by streamers (wrapper functions)
		 * when an input comes in multiple chunks, like from a file.
		 */
		this.parse = function(input, baseIndex, ignoreLastRow)
		{
			if (!_config.newline)
				_config.newline = guessLineEndings(input);

			_delimiterError = false;
			if (!_config.delimiter)
			{
				var delimGuess = guessDelimiter(input);
				if (delimGuess.successful)
					_config.delimiter = delimGuess.bestDelimiter;
				else
				{
					_delimiterError = true;	// add error after parsing (otherwise it would be overwritten)
					_config.delimiter = Papa.DefaultDelimiter;
				}
				_results.meta.delimiter = _config.delimiter;
			}

			var parserConfig = copy(_config);
			if (_config.preview && _config.header)
				parserConfig.preview++;	// to compensate for header row

			_input = input;
			_parser = new Parser(parserConfig);
			_results = _parser.parse(_input, baseIndex, ignoreLastRow);
			processResults();
			return _paused ? { meta: { paused: true } } : (_results || { meta: { paused: false } });
		};

		this.paused = function()
		{
			return _paused;
		};

		this.pause = function()
		{
			_paused = true;
			_parser.abort();
			_input = _input.substr(_parser.getCharIndex());
		};

		this.resume = function()
		{
			_paused = false;
			self.streamer.parseChunk(_input);
		};

		this.aborted = function () {
			return _aborted;
		}

		this.abort = function()
		{
			_aborted = true;
			_parser.abort();
			_results.meta.aborted = true;
			if (isFunction(_config.complete))
				_config.complete(_results);
			_input = "";
		};

		function processResults()
		{
			if (_results && _delimiterError)
			{
				addError("Delimiter", "UndetectableDelimiter", "Unable to auto-detect delimiting character; defaulted to '"+Papa.DefaultDelimiter+"'");
				_delimiterError = false;
			}

			if (_config.skipEmptyLines)
			{
				for (var i = 0; i < _results.data.length; i++)
					if (_results.data[i].length == 1 && _results.data[i][0] == "")
						_results.data.splice(i--, 1);
			}

			if (needsHeaderRow())
				fillHeaderFields();

			return applyHeaderAndDynamicTyping();
		}

		function needsHeaderRow()
		{
			return _config.header && _fields.length == 0;
		}

		function fillHeaderFields()
		{
			if (!_results)
				return;
			for (var i = 0; needsHeaderRow() && i < _results.data.length; i++)
				for (var j = 0; j < _results.data[i].length; j++)
					_fields.push(_results.data[i][j]);
			_results.data.splice(0, 1);
		}

		function applyHeaderAndDynamicTyping()
		{
			if (!_results || (!_config.header && !_config.dynamicTyping))
				return _results;

			for (var i = 0; i < _results.data.length; i++)
			{
				var row = {};

				for (var j = 0; j < _results.data[i].length; j++)
				{
					if (_config.dynamicTyping)
					{
						var value = _results.data[i][j];
						if (value == "true" || value == "TRUE")
							_results.data[i][j] = true;
						else if (value == "false" || value == "FALSE")
							_results.data[i][j] = false;
						else
							_results.data[i][j] = tryParseFloat(value);
					}

					if (_config.header)
					{
						if (j >= _fields.length)
						{
							if (!row["__parsed_extra"])
								row["__parsed_extra"] = [];
							row["__parsed_extra"].push(_results.data[i][j]);
						}
						else
							row[_fields[j]] = _results.data[i][j];
					}
				}

				if (_config.header)
				{
					_results.data[i] = row;
					if (j > _fields.length)
						addError("FieldMismatch", "TooManyFields", "Too many fields: expected " + _fields.length + " fields but parsed " + j, i);
					else if (j < _fields.length)
						addError("FieldMismatch", "TooFewFields", "Too few fields: expected " + _fields.length + " fields but parsed " + j, i);
				}
			}

			if (_config.header && _results.meta)
				_results.meta.fields = _fields;
			return _results;
		}

		function guessDelimiter(input)
		{
			var delimChoices = [",", "\t", "|", ";", Papa.RECORD_SEP, Papa.UNIT_SEP];
			var bestDelim, bestDelta, fieldCountPrevRow;

			for (var i = 0; i < delimChoices.length; i++)
			{
				var delim = delimChoices[i];
				var delta = 0, avgFieldCount = 0;
				fieldCountPrevRow = undefined;

				var preview = new Parser({
					delimiter: delim,
					preview: 10
				}).parse(input);

				for (var j = 0; j < preview.data.length; j++)
				{
					var fieldCount = preview.data[j].length;
					avgFieldCount += fieldCount;

					if (typeof fieldCountPrevRow === 'undefined')
					{
						fieldCountPrevRow = fieldCount;
						continue;
					}
					else if (fieldCount > 1)
					{
						delta += Math.abs(fieldCount - fieldCountPrevRow);
						fieldCountPrevRow = fieldCount;
					}
				}

				if (preview.data.length > 0)
					avgFieldCount /= preview.data.length;

				if ((typeof bestDelta === 'undefined' || delta < bestDelta)
					&& avgFieldCount > 1.99)
				{
					bestDelta = delta;
					bestDelim = delim;
				}
			}

			_config.delimiter = bestDelim;

			return {
				successful: !!bestDelim,
				bestDelimiter: bestDelim
			}
		}

		function guessLineEndings(input)
		{
			input = input.substr(0, 1024*1024);	// max length 1 MB

			var r = input.split('\r');

			if (r.length == 1)
				return '\n';

			var numWithN = 0;
			for (var i = 0; i < r.length; i++)
			{
				if (r[i][0] == '\n')
					numWithN++;
			}

			return numWithN >= r.length / 2 ? '\r\n' : '\r';
		}

		function tryParseFloat(val)
		{
			var isNumber = FLOAT.test(val);
			return isNumber ? parseFloat(val) : val;
		}

		function addError(type, code, msg, row)
		{
			_results.errors.push({
				type: type,
				code: code,
				message: msg,
				row: row
			});
		}
	}





	/** The core parser implements speedy and correct CSV parsing */
	function Parser(config)
	{
		// Unpack the config object
		config = config || {};
		var delim = config.delimiter;
		var newline = config.newline;
		var comments = config.comments;
		var step = config.step;
		var preview = config.preview;
		var fastMode = config.fastMode;

		// Delimiter must be valid
		if (typeof delim !== 'string'
			|| Papa.BAD_DELIMITERS.indexOf(delim) > -1)
			delim = ",";

		// Comment character must be valid
		if (comments === delim)
			throw "Comment character same as delimiter";
		else if (comments === true)
			comments = "#";
		else if (typeof comments !== 'string'
			|| Papa.BAD_DELIMITERS.indexOf(comments) > -1)
			comments = false;

		// Newline must be valid: \r, \n, or \r\n
		if (newline != '\n' && newline != '\r' && newline != '\r\n')
			newline = '\n';

		// We're gonna need these at the Parser scope
		var cursor = 0;
		var aborted = false;

		this.parse = function(input, baseIndex, ignoreLastRow)
		{
			// For some reason, in Chrome, this speeds things up (!?)
			if (typeof input !== 'string')
				throw "Input must be a string";

			// We don't need to compute some of these every time parse() is called,
			// but having them in a more local scope seems to perform better
			var inputLen = input.length,
				delimLen = delim.length,
				newlineLen = newline.length,
				commentsLen = comments.length;
			var stepIsFunction = typeof step === 'function';

			// Establish starting state
			cursor = 0;
			var data = [], errors = [], row = [], lastCursor = 0;

			if (!input)
				return returnable();

			if (fastMode || (fastMode !== false && input.indexOf('"') === -1))
			{
				var rows = input.split(newline);
				for (var i = 0; i < rows.length; i++)
				{
					var row = rows[i];
					cursor += row.length;
					if (i !== rows.length - 1)
						cursor += newline.length;
					else if (ignoreLastRow)
						return returnable();
					if (comments && row.substr(0, commentsLen) == comments)
						continue;
					if (stepIsFunction)
					{
						data = [];
						pushRow(row.split(delim));
						doStep();
						if (aborted)
							return returnable();
					}
					else
						pushRow(row.split(delim));
					if (preview && i >= preview)
					{
						data = data.slice(0, preview);
						return returnable(true);
					}
				}
				return returnable();
			}

			var nextDelim = input.indexOf(delim, cursor);
			var nextNewline = input.indexOf(newline, cursor);

			// Parser loop
			for (;;)
			{
				// Field has opening quote
				if (input[cursor] == '"')
				{
					// Start our search for the closing quote where the cursor is
					var quoteSearch = cursor;

					// Skip the opening quote
					cursor++;

					for (;;)
					{
						// Find closing quote
						var quoteSearch = input.indexOf('"', quoteSearch+1);

						if (quoteSearch === -1)
						{
							if (!ignoreLastRow) {
								// No closing quote... what a pity
								errors.push({
									type: "Quotes",
									code: "MissingQuotes",
									message: "Quoted field unterminated",
									row: data.length,	// row has yet to be inserted
									index: cursor
								});
							}
							return finish();
						}

						if (quoteSearch === inputLen-1)
						{
							// Closing quote at EOF
							var value = input.substring(cursor, quoteSearch).replace(/""/g, '"');
							return finish(value);
						}

						// If this quote is escaped, it's part of the data; skip it
						if (input[quoteSearch+1] == '"')
						{
							quoteSearch++;
							continue;
						}

						if (input[quoteSearch+1] == delim)
						{
							// Closing quote followed by delimiter
							row.push(input.substring(cursor, quoteSearch).replace(/""/g, '"'));
							cursor = quoteSearch + 1 + delimLen;
							nextDelim = input.indexOf(delim, cursor);
							nextNewline = input.indexOf(newline, cursor);
							break;
						}

						if (input.substr(quoteSearch+1, newlineLen) === newline)
						{
							// Closing quote followed by newline
							row.push(input.substring(cursor, quoteSearch).replace(/""/g, '"'));
							saveRow(quoteSearch + 1 + newlineLen);
							nextDelim = input.indexOf(delim, cursor);	// because we may have skipped the nextDelim in the quoted field

							if (stepIsFunction)
							{
								doStep();
								if (aborted)
									return returnable();
							}
							
							if (preview && data.length >= preview)
								return returnable(true);

							break;
						}
					}

					continue;
				}

				// Comment found at start of new line
				if (comments && row.length === 0 && input.substr(cursor, commentsLen) === comments)
				{
					if (nextNewline == -1)	// Comment ends at EOF
						return returnable();
					cursor = nextNewline + newlineLen;
					nextNewline = input.indexOf(newline, cursor);
					nextDelim = input.indexOf(delim, cursor);
					continue;
				}

				// Next delimiter comes before next newline, so we've reached end of field
				if (nextDelim !== -1 && (nextDelim < nextNewline || nextNewline === -1))
				{
					row.push(input.substring(cursor, nextDelim));
					cursor = nextDelim + delimLen;
					nextDelim = input.indexOf(delim, cursor);
					continue;
				}

				// End of row
				if (nextNewline !== -1)
				{
					row.push(input.substring(cursor, nextNewline));
					saveRow(nextNewline + newlineLen);

					if (stepIsFunction)
					{
						doStep();
						if (aborted)
							return returnable();
					}

					if (preview && data.length >= preview)
						return returnable(true);

					continue;
				}

				break;
			}


			return finish();


			function pushRow(row)
			{
				data.push(row);
				lastCursor = cursor;
			}

			/**
			 * Appends the remaining input from cursor to the end into
			 * row, saves the row, calls step, and returns the results.
			 */
			function finish(value)
			{
				if (ignoreLastRow)
					return returnable();
				if (typeof value === 'undefined')
					value = input.substr(cursor);
				row.push(value);
				cursor = inputLen;	// important in case parsing is paused
				pushRow(row);
				if (stepIsFunction)
					doStep();
				return returnable();
			}

			/**
			 * Appends the current row to the results. It sets the cursor
			 * to newCursor and finds the nextNewline. The caller should
			 * take care to execute user's step function and check for
			 * preview and end parsing if necessary.
			 */
			function saveRow(newCursor)
			{
				cursor = newCursor;
				pushRow(row);
				row = [];
				nextNewline = input.indexOf(newline, cursor);
			}

			/** Returns an object with the results, errors, and meta. */
			function returnable(stopped)
			{
				return {
					data: data,
					errors: errors,
					meta: {
						delimiter: delim,
						linebreak: newline,
						aborted: aborted,
						truncated: !!stopped,
						cursor: lastCursor + (baseIndex || 0)
					}
				};
			}

			/** Executes the user's step function and resets data & errors. */
			function doStep()
			{
				step(returnable());
				data = [], errors = [];
			}
		};

		/** Sets the abort flag */
		this.abort = function()
		{
			aborted = true;
		};

		/** Gets the cursor position */
		this.getCharIndex = function()
		{
			return cursor;
		};
	}


	// If you need to load Papa Parse asynchronously and you also need worker threads, hard-code
	// the script path here. See: https://github.com/mholt/PapaParse/issues/87#issuecomment-57885358
	function getScriptPath()
	{
		var scripts = document.getElementsByTagName('script');
		return scripts.length ? scripts[scripts.length - 1].src : '';
	}

	function newWorker()
	{
		if (!Papa.WORKERS_SUPPORTED)
			return false;
		if (!LOADED_SYNC && Papa.SCRIPT_PATH === null)
			throw new Error(
				'Script path cannot be determined automatically when Papa Parse is loaded asynchronously. ' +
				'You need to set Papa.SCRIPT_PATH manually.'
			);
		var workerUrl = Papa.SCRIPT_PATH || AUTO_SCRIPT_PATH;
		// Append "papaworker" to the search string to tell papaparse that this is our worker.
		workerUrl += (workerUrl.indexOf('?') !== -1 ? '&' : '?') + 'papaworker';
		var w = new global.Worker(workerUrl);
		w.onmessage = mainThreadReceivedMessage;
		w.id = workerIdCounter++;
		workers[w.id] = w;
		return w;
	}

	/** Callback when main thread receives a message */
	function mainThreadReceivedMessage(e)
	{
		var msg = e.data;
		var worker = workers[msg.workerId];
		var aborted = false;

		if (msg.error)
			worker.userError(msg.error, msg.file);
		else if (msg.results && msg.results.data)
		{
			var abort = function() {
				aborted = true;
				completeWorker(msg.workerId, { data: [], errors: [], meta: { aborted: true } });
			};

			var handle = {
				abort: abort,
				pause: notImplemented,
				resume: notImplemented
			};

			if (isFunction(worker.userStep))
			{
				for (var i = 0; i < msg.results.data.length; i++)
				{
					worker.userStep({
						data: [msg.results.data[i]],
						errors: msg.results.errors,
						meta: msg.results.meta
					}, handle);
					if (aborted)
						break;
				}
				delete msg.results;	// free memory ASAP
			}
			else if (isFunction(worker.userChunk))
			{
				worker.userChunk(msg.results, handle, msg.file);
				delete msg.results;
			}
		}

		if (msg.finished && !aborted)
			completeWorker(msg.workerId, msg.results);
	}

	function completeWorker(workerId, results) {
		var worker = workers[workerId];
		if (isFunction(worker.userComplete))
			worker.userComplete(results);
		worker.terminate();
		delete workers[workerId];
	}

	function notImplemented() {
		throw "Not implemented.";
	}

	/** Callback when worker thread receives a message */
	function workerThreadReceivedMessage(e)
	{
		var msg = e.data;

		if (typeof Papa.WORKER_ID === 'undefined' && msg)
			Papa.WORKER_ID = msg.workerId;

		if (typeof msg.input === 'string')
		{
			global.postMessage({
				workerId: Papa.WORKER_ID,
				results: Papa.parse(msg.input, msg.config),
				finished: true
			});
		}
		else if ((global.File && msg.input instanceof File) || msg.input instanceof Object)	// thank you, Safari (see issue #106)
		{
			var results = Papa.parse(msg.input, msg.config);
			if (results)
				global.postMessage({
					workerId: Papa.WORKER_ID,
					results: results,
					finished: true
				});
		}
	}

	/** Makes a deep copy of an array or object (mostly) */
	function copy(obj)
	{
		if (typeof obj !== 'object')
			return obj;
		var cpy = obj instanceof Array ? [] : {};
		for (var key in obj)
			cpy[key] = copy(obj[key]);
		return cpy;
	}

	function bindFunction(f, self)
	{
		return function() { f.apply(self, arguments); };
	}

	function isFunction(func)
	{
		return typeof func === 'function';
	}
})(typeof window !== 'undefined' ? window : this);

},{}],5:[function(require,module,exports){
'use strict';
var strictUriEncode = require('strict-uri-encode');
var objectAssign = require('object-assign');

function encode(value, opts) {
	if (opts.encode) {
		return opts.strict ? strictUriEncode(value) : encodeURIComponent(value);
	}

	return value;
}

exports.extract = function (str) {
	return str.split('?')[1] || '';
};

exports.parse = function (str) {
	// Create an object with no prototype
	// https://github.com/sindresorhus/query-string/issues/47
	var ret = Object.create(null);

	if (typeof str !== 'string') {
		return ret;
	}

	str = str.trim().replace(/^(\?|#|&)/, '');

	if (!str) {
		return ret;
	}

	str.split('&').forEach(function (param) {
		var parts = param.replace(/\+/g, ' ').split('=');
		// Firefox (pre 40) decodes `%3D` to `=`
		// https://github.com/sindresorhus/query-string/pull/37
		var key = parts.shift();
		var val = parts.length > 0 ? parts.join('=') : undefined;

		key = decodeURIComponent(key);

		// missing `=` should be `null`:
		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
		val = val === undefined ? null : decodeURIComponent(val);

		if (ret[key] === undefined) {
			ret[key] = val;
		} else if (Array.isArray(ret[key])) {
			ret[key].push(val);
		} else {
			ret[key] = [ret[key], val];
		}
	});

	return ret;
};

exports.stringify = function (obj, opts) {
	var defaults = {
		encode: true,
		strict: true
	};

	opts = objectAssign(defaults, opts);

	return obj ? Object.keys(obj).sort().map(function (key) {
		var val = obj[key];

		if (val === undefined) {
			return '';
		}

		if (val === null) {
			return encode(key, opts);
		}

		if (Array.isArray(val)) {
			var result = [];

			val.slice().forEach(function (val2) {
				if (val2 === undefined) {
					return;
				}

				if (val2 === null) {
					result.push(encode(key, opts));
				} else {
					result.push(encode(key, opts) + '=' + encode(val2, opts));
				}
			});

			return result.join('&');
		}

		return encode(key, opts) + '=' + encode(val, opts);
	}).filter(function (x) {
		return x.length > 0;
	}).join('&') : '';
};

},{"object-assign":3,"strict-uri-encode":6}],6:[function(require,module,exports){
'use strict';
module.exports = function (str) {
	return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
		return '%' + c.charCodeAt(0).toString(16).toUpperCase();
	});
};

},{}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var HEAD_ELBOW_OFFSET = new THREE.Vector3(0.155, -0.465, -0.15);
var ELBOW_WRIST_OFFSET = new THREE.Vector3(0, 0, -0.25);
var WRIST_CONTROLLER_OFFSET = new THREE.Vector3(0, 0, 0.05);
var ARM_EXTENSION_OFFSET = new THREE.Vector3(-0.08, 0.14, 0.08);

var ELBOW_BEND_RATIO = 0.4; // 40% elbow, 60% wrist.
var EXTENSION_RATIO_WEIGHT = 0.4;

var MIN_ANGULAR_SPEED = 0.61; // 35 degrees per second (in radians).

/**
 * Represents the arm model for the Daydream controller. Feed it a camera and
 * the controller. Update it on a RAF.
 *
 * Get the model's pose using getPose().
 */

var OrientationArmModel = function () {
  function OrientationArmModel() {
    _classCallCheck(this, OrientationArmModel);

    this.isLeftHanded = false;

    // Current and previous controller orientations.
    this.controllerQ = new THREE.Quaternion();
    this.lastControllerQ = new THREE.Quaternion();

    // Current and previous head orientations.
    this.headQ = new THREE.Quaternion();

    // Current head position.
    this.headPos = new THREE.Vector3();

    // Positions of other joints (mostly for debugging).
    this.elbowPos = new THREE.Vector3();
    this.wristPos = new THREE.Vector3();

    // Current and previous times the model was updated.
    this.time = null;
    this.lastTime = null;

    // Root rotation.
    this.rootQ = new THREE.Quaternion();

    // Current pose that this arm model calculates.
    this.pose = {
      orientation: new THREE.Quaternion(),
      position: new THREE.Vector3()
    };
  }

  /**
   * Methods to set controller and head pose (in world coordinates).
   */


  _createClass(OrientationArmModel, [{
    key: 'setControllerOrientation',
    value: function setControllerOrientation(quaternion) {
      this.lastControllerQ.copy(this.controllerQ);
      this.controllerQ.copy(quaternion);
    }
  }, {
    key: 'setHeadOrientation',
    value: function setHeadOrientation(quaternion) {
      this.headQ.copy(quaternion);
    }
  }, {
    key: 'setHeadPosition',
    value: function setHeadPosition(position) {
      this.headPos.copy(position);
    }
  }, {
    key: 'setLeftHanded',
    value: function setLeftHanded(isLeftHanded) {
      // TODO(smus): Implement me!
      this.isLeftHanded = isLeftHanded;
    }

    /**
     * Called on a RAF.
     */

  }, {
    key: 'update',
    value: function update() {
      this.time = performance.now();

      // If the controller's angular velocity is above a certain amount, we can
      // assume torso rotation and move the elbow joint relative to the
      // camera orientation.
      var headYawQ = this.getHeadYawOrientation_();
      var timeDelta = (this.time - this.lastTime) / 1000;
      var angleDelta = this.quatAngle_(this.lastControllerQ, this.controllerQ);
      var controllerAngularSpeed = angleDelta / timeDelta;
      if (controllerAngularSpeed > MIN_ANGULAR_SPEED) {
        // Attenuate the Root rotation slightly.
        this.rootQ.slerp(headYawQ, angleDelta / 10);
      } else {
        this.rootQ.copy(headYawQ);
      }

      // We want to move the elbow up and to the center as the user points the
      // controller upwards, so that they can easily see the controller and its
      // tool tips.
      var controllerEuler = new THREE.Euler().setFromQuaternion(this.controllerQ, 'YXZ');
      var controllerXDeg = THREE.Math.radToDeg(controllerEuler.x);
      var extensionRatio = this.clamp_((controllerXDeg - 11) / (50 - 11), 0, 1);

      // Controller orientation in camera space.
      var controllerCameraQ = this.rootQ.clone().inverse();
      controllerCameraQ.multiply(this.controllerQ);

      // Calculate elbow position.
      var elbowPos = this.elbowPos;
      elbowPos.copy(this.headPos).add(HEAD_ELBOW_OFFSET);
      var elbowOffset = new THREE.Vector3().copy(ARM_EXTENSION_OFFSET);
      elbowOffset.multiplyScalar(extensionRatio);
      elbowPos.add(elbowOffset);

      // Calculate joint angles. Generally 40% of rotation applied to elbow, 60%
      // to wrist, but if controller is raised higher, more rotation comes from
      // the wrist.
      var totalAngle = this.quatAngle_(controllerCameraQ, new THREE.Quaternion());
      var totalAngleDeg = THREE.Math.radToDeg(totalAngle);
      var lerpSuppression = 1 - Math.pow(totalAngleDeg / 180, 4); // TODO(smus): ???

      var elbowRatio = ELBOW_BEND_RATIO;
      var wristRatio = 1 - ELBOW_BEND_RATIO;
      var lerpValue = lerpSuppression * (elbowRatio + wristRatio * extensionRatio * EXTENSION_RATIO_WEIGHT);

      var wristQ = new THREE.Quaternion().slerp(controllerCameraQ, lerpValue);
      var invWristQ = wristQ.inverse();
      var elbowQ = controllerCameraQ.clone().multiply(invWristQ);

      // Calculate our final controller position based on all our joint rotations
      // and lengths.
      /*
      position_ =
        root_rot_ * (
          controller_root_offset_ +
      2:      (arm_extension_ * amt_extension) +
      1:      elbow_rot * (kControllerForearm + (wrist_rot * kControllerPosition))
        );
      */
      var wristPos = this.wristPos;
      wristPos.copy(WRIST_CONTROLLER_OFFSET);
      wristPos.applyQuaternion(wristQ);
      wristPos.add(ELBOW_WRIST_OFFSET);
      wristPos.applyQuaternion(elbowQ);
      wristPos.add(this.elbowPos);

      var offset = new THREE.Vector3().copy(ARM_EXTENSION_OFFSET);
      offset.multiplyScalar(extensionRatio);

      var position = new THREE.Vector3().copy(this.wristPos);
      position.add(offset);
      position.applyQuaternion(this.rootQ);

      var orientation = new THREE.Quaternion().copy(this.controllerQ);

      // Set the resulting pose orientation and position.
      this.pose.orientation.copy(orientation);
      this.pose.position.copy(position);

      this.lastTime = this.time;
    }

    /**
     * Returns the pose calculated by the model.
     */

  }, {
    key: 'getPose',
    value: function getPose() {
      return this.pose;
    }

    /**
     * Debug methods for rendering the arm model.
     */

  }, {
    key: 'getForearmLength',
    value: function getForearmLength() {
      return ELBOW_WRIST_OFFSET.length();
    }
  }, {
    key: 'getElbowPosition',
    value: function getElbowPosition() {
      var out = this.elbowPos.clone();
      return out.applyQuaternion(this.rootQ);
    }
  }, {
    key: 'getWristPosition',
    value: function getWristPosition() {
      var out = this.wristPos.clone();
      return out.applyQuaternion(this.rootQ);
    }
  }, {
    key: 'getHeadYawOrientation_',
    value: function getHeadYawOrientation_() {
      var headEuler = new THREE.Euler().setFromQuaternion(this.headQ, 'YXZ');
      headEuler.x = 0;
      headEuler.z = 0;
      var destinationQ = new THREE.Quaternion().setFromEuler(headEuler);
      return destinationQ;
    }
  }, {
    key: 'clamp_',
    value: function clamp_(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }
  }, {
    key: 'quatAngle_',
    value: function quatAngle_(q1, q2) {
      var vec1 = new THREE.Vector3(0, 0, -1);
      var vec2 = new THREE.Vector3(0, 0, -1);
      vec1.applyQuaternion(q1);
      vec2.applyQuaternion(q2);
      return vec1.angleTo(vec2);
    }
  }]);

  return OrientationArmModel;
}();

exports.default = OrientationArmModel;

},{}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _rayInteractionModes = require('./ray-interaction-modes');

var _rayInteractionModes2 = _interopRequireDefault(_rayInteractionModes);

var _util = require('./util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /*
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Copyright 2016 Google Inc. All Rights Reserved.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Licensed under the Apache License, Version 2.0 (the "License");
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * you may not use this file except in compliance with the License.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * You may obtain a copy of the License at
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *     http://www.apache.org/licenses/LICENSE-2.0
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Unless required by applicable law or agreed to in writing, software
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * distributed under the License is distributed on an "AS IS" BASIS,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * See the License for the specific language governing permissions and
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * limitations under the License.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */

var DRAG_DISTANCE_PX = 10;

/**
 * Enumerates all possible interaction modes. Sets up all event handlers (mouse,
 * touch, etc), interfaces with gamepad API.
 *
 * Emits events:
 *    action: Input is activated (mousedown, touchstart, daydream click, vive
 *    trigger).
 *    release: Input is deactivated (mouseup, touchend, daydream release, vive
 *    release).
 *    cancel: Input is canceled (eg. we scrolled instead of tapping on
 *    mobile/desktop).
 *    pointermove(2D position): The pointer is moved (mouse or touch).
 */

var RayController = function (_EventEmitter) {
  _inherits(RayController, _EventEmitter);

  function RayController(renderer) {
    _classCallCheck(this, RayController);

    var _this = _possibleConstructorReturn(this, (RayController.__proto__ || Object.getPrototypeOf(RayController)).call(this));

    _this.renderer = renderer;

    _this.availableInteractions = {};

    // Handle interactions.
    window.addEventListener('mousedown', _this.onMouseDown_.bind(_this));
    window.addEventListener('mousemove', _this.onMouseMove_.bind(_this));
    window.addEventListener('mouseup', _this.onMouseUp_.bind(_this));
    window.addEventListener('touchstart', _this.onTouchStart_.bind(_this));
    window.addEventListener('touchmove', _this.onTouchMove_.bind(_this));
    window.addEventListener('touchend', _this.onTouchEnd_.bind(_this));

    // The position of the pointer.
    _this.pointer = new THREE.Vector2();
    // The previous position of the pointer.
    _this.lastPointer = new THREE.Vector2();
    // Position of pointer in Normalized Device Coordinates (NDC).
    _this.pointerNdc = new THREE.Vector2();
    // How much we have dragged (if we are dragging).
    _this.dragDistance = 0;
    // Are we dragging or not.
    _this.isDragging = false;
    // Is pointer active or not.
    _this.isTouchActive = false;

    // Gamepad events.
    _this.gamepad = null;

    // VR Events.
    if (!navigator.getVRDisplays) {
      console.warn('WebVR API not available! Consider using the webvr-polyfill.');
    } else {
      navigator.getVRDisplays().then(function (displays) {
        _this.vrDisplay = displays[0];
      });
    }
    return _this;
  }

  _createClass(RayController, [{
    key: 'getInteractionMode',
    value: function getInteractionMode() {
      // TODO: Debugging only.
      //return InteractionModes.DAYDREAM;

      var gamepad = this.getVRGamepad_();

      if (gamepad) {
        var pose = gamepad.pose;
        // If there's a gamepad connected, determine if it's Daydream or a Vive.
        if (pose.hasPosition) {
          return _rayInteractionModes2.default.VR_6DOF;
        }

        if (pose.hasOrientation) {
          return _rayInteractionModes2.default.VR_3DOF;
        }
      } else {
        // If there's no gamepad, it might be Cardboard, magic window or desktop.
        if ((0, _util.isMobile)()) {
          // Either Cardboard or magic window, depending on whether we are
          // presenting.
          if (this.vrDisplay && this.vrDisplay.isPresenting) {
            return _rayInteractionModes2.default.VR_0DOF;
          } else {
            return _rayInteractionModes2.default.TOUCH;
          }
        } else {
          // We must be on desktop.
          return _rayInteractionModes2.default.MOUSE;
        }
      }
      // By default, use TOUCH.
      return _rayInteractionModes2.default.TOUCH;
    }
  }, {
    key: 'getGamepadPose',
    value: function getGamepadPose() {
      var gamepad = this.getVRGamepad_();
      return gamepad.pose;
    }

    /**
     * Get if there is an active touch event going on.
     * Only relevant on touch devices
     */

  }, {
    key: 'getIsTouchActive',
    value: function getIsTouchActive() {
      return this.isTouchActive;
    }
  }, {
    key: 'setSize',
    value: function setSize(size) {
      this.size = size;
    }
  }, {
    key: 'update',
    value: function update() {
      var mode = this.getInteractionMode();
      if (mode == _rayInteractionModes2.default.VR_3DOF || mode == _rayInteractionModes2.default.VR_6DOF) {
        // If we're dealing with a gamepad, check every animation frame for a
        // pressed action.
        var isGamepadPressed = this.getGamepadButtonPressed_();
        if (isGamepadPressed && !this.wasGamepadPressed) {
          this.emit('raydown');
        }
        if (!isGamepadPressed && this.wasGamepadPressed) {
          this.emit('rayup');
        }
        this.wasGamepadPressed = isGamepadPressed;
      }
    }
  }, {
    key: 'getGamepadButtonPressed_',
    value: function getGamepadButtonPressed_() {
      var gamepad = this.getVRGamepad_();
      if (!gamepad) {
        // If there's no gamepad, the button was not pressed.
        return false;
      }
      // Check for clicks.
      for (var j = 0; j < gamepad.buttons.length; ++j) {
        if (gamepad.buttons[j].pressed) {
          return true;
        }
      }
      return false;
    }
  }, {
    key: 'onMouseDown_',
    value: function onMouseDown_(e) {
      this.startDragging_(e);
      this.emit('raydown');
    }
  }, {
    key: 'onMouseMove_',
    value: function onMouseMove_(e) {
      this.updatePointer_(e);
      this.updateDragDistance_();
      this.emit('pointermove', this.pointerNdc);
    }
  }, {
    key: 'onMouseUp_',
    value: function onMouseUp_(e) {
      this.endDragging_();
    }
  }, {
    key: 'onTouchStart_',
    value: function onTouchStart_(e) {
      this.isTouchActive = true;
      var t = e.touches[0];
      this.startDragging_(t);
      this.updateTouchPointer_(e);

      this.emit('pointermove', this.pointerNdc);
      this.emit('raydown');

      // Prevent synthetic mouse event from being created.
      e.preventDefault();
    }
  }, {
    key: 'onTouchMove_',
    value: function onTouchMove_(e) {
      this.updateTouchPointer_(e);
      this.updateDragDistance_();

      // Prevent synthetic mouse event from being created.
      e.preventDefault();
    }
  }, {
    key: 'onTouchEnd_',
    value: function onTouchEnd_(e) {
      this.endDragging_();

      // Prevent synthetic mouse event from being created.
      e.preventDefault();
      this.isTouchActive = false;
    }
  }, {
    key: 'updateTouchPointer_',
    value: function updateTouchPointer_(e) {
      // If there's no touches array, ignore.
      if (e.touches.length === 0) {
        console.warn('Received touch event with no touches.');
        return;
      }
      var t = e.touches[0];
      this.updatePointer_(t);
    }
  }, {
    key: 'updatePointer_',
    value: function updatePointer_(e) {
      // How much the pointer moved.
      this.pointer.set(e.clientX, e.clientY);
      this.pointerNdc.x = e.clientX / this.size.width * 2 - 1;
      this.pointerNdc.y = -(e.clientY / this.size.height) * 2 + 1;
    }
  }, {
    key: 'updateDragDistance_',
    value: function updateDragDistance_() {
      if (this.isDragging) {
        var distance = this.lastPointer.sub(this.pointer).length();
        this.dragDistance += distance;
        this.lastPointer.copy(this.pointer);

        //console.log('dragDistance', this.dragDistance);
        if (this.dragDistance > DRAG_DISTANCE_PX) {
          this.emit('raycancel');
          this.isDragging = false;
        }
      }
    }
  }, {
    key: 'startDragging_',
    value: function startDragging_(e) {
      this.isDragging = true;
      this.lastPointer.set(e.clientX, e.clientY);
    }
  }, {
    key: 'endDragging_',
    value: function endDragging_() {
      if (this.dragDistance < DRAG_DISTANCE_PX) {
        this.emit('rayup');
      }
      this.dragDistance = 0;
      this.isDragging = false;
    }

    /**
     * Gets the first VR-enabled gamepad.
     */

  }, {
    key: 'getVRGamepad_',
    value: function getVRGamepad_() {
      // If there's no gamepad API, there's no gamepad.
      if (!navigator.getGamepads) {
        return null;
      }

      var gamepads = navigator.getGamepads();
      for (var i = 0; i < gamepads.length; ++i) {
        var gamepad = gamepads[i];

        // The array may contain undefined gamepads, so check for that as well as
        // a non-null pose.
        if (gamepad && gamepad.pose) {
          return gamepad;
        }
      }
      return null;
    }
  }]);

  return RayController;
}(_eventemitter2.default);

exports.default = RayController;

},{"./ray-interaction-modes":10,"./util":12,"eventemitter3":2}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _orientationArmModel = require('./orientation-arm-model');

var _orientationArmModel2 = _interopRequireDefault(_orientationArmModel);

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _rayRenderer = require('./ray-renderer');

var _rayRenderer2 = _interopRequireDefault(_rayRenderer);

var _rayController = require('./ray-controller');

var _rayController2 = _interopRequireDefault(_rayController);

var _rayInteractionModes = require('./ray-interaction-modes');

var _rayInteractionModes2 = _interopRequireDefault(_rayInteractionModes);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /*
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Copyright 2016 Google Inc. All Rights Reserved.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Licensed under the Apache License, Version 2.0 (the "License");
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * you may not use this file except in compliance with the License.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * You may obtain a copy of the License at
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *     http://www.apache.org/licenses/LICENSE-2.0
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Unless required by applicable law or agreed to in writing, software
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * distributed under the License is distributed on an "AS IS" BASIS,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * See the License for the specific language governing permissions and
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * limitations under the License.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */

/**
 * API wrapper for the input library.
 */
var RayInput = function (_EventEmitter) {
  _inherits(RayInput, _EventEmitter);

  function RayInput(camera) {
    _classCallCheck(this, RayInput);

    var _this = _possibleConstructorReturn(this, (RayInput.__proto__ || Object.getPrototypeOf(RayInput)).call(this));

    _this.camera = camera;
    _this.renderer = new _rayRenderer2.default(camera);
    _this.controller = new _rayController2.default();

    // Arm model needed to transform controller orientation into proper pose.
    _this.armModel = new _orientationArmModel2.default();

    _this.controller.on('raydown', _this.onRayDown_.bind(_this));
    _this.controller.on('rayup', _this.onRayUp_.bind(_this));
    _this.controller.on('raycancel', _this.onRayCancel_.bind(_this));
    _this.controller.on('pointermove', _this.onPointerMove_.bind(_this));
    _this.renderer.on('rayover', function (mesh) {
      _this.emit('rayover', mesh);
    });
    _this.renderer.on('rayout', function (mesh) {
      _this.emit('rayout', mesh);
    });

    // By default, put the pointer offscreen.
    _this.pointerNdc = new THREE.Vector2(1, 1);

    // Event handlers.
    _this.handlers = {};
    return _this;
  }

  _createClass(RayInput, [{
    key: 'add',
    value: function add(object, handlers) {
      this.renderer.add(object, handlers);
      this.handlers[object.id] = handlers;
    }
  }, {
    key: 'remove',
    value: function remove(object) {
      this.renderer.remove(object);
      delete this.handlers[object.id];
    }
  }, {
    key: 'update',
    value: function update() {
      var lookAt = new THREE.Vector3(0, 0, -1);
      lookAt.applyQuaternion(this.camera.quaternion);

      var mode = this.controller.getInteractionMode();
      switch (mode) {
        case _rayInteractionModes2.default.MOUSE:
          // Desktop mouse mode, mouse coordinates are what matters.
          this.renderer.setPointer(this.pointerNdc);
          // Hide the ray and reticle.
          this.renderer.setRayVisibility(false);
          this.renderer.setReticleVisibility(false);

          // In mouse mode ray renderer is always active.
          this.renderer.setActive(true);
          break;

        case _rayInteractionModes2.default.TOUCH:
          // Mobile magic window mode. Touch coordinates matter, but we want to
          // hide the reticle.
          this.renderer.setPointer(this.pointerNdc);

          // Hide the ray and the reticle.
          this.renderer.setRayVisibility(false);
          this.renderer.setReticleVisibility(false);

          // In touch mode the ray renderer is only active on touch.
          this.renderer.setActive(this.controller.getIsTouchActive());
          break;

        case _rayInteractionModes2.default.VR_0DOF:
          // Cardboard mode, we're dealing with a gaze reticle.
          this.renderer.setPosition(this.camera.position);
          this.renderer.setOrientation(this.camera.quaternion);

          // Reticle only.
          this.renderer.setRayVisibility(false);
          this.renderer.setReticleVisibility(true);

          // Ray renderer always active.
          this.renderer.setActive(true);
          break;

        case _rayInteractionModes2.default.VR_3DOF:
          // Daydream, our origin is slightly off (depending on handedness).
          // But we should be using the orientation from the gamepad.
          // TODO(smus): Implement the real arm model.
          var pose = this.controller.getGamepadPose();

          // Debug only: use camera as input controller.
          //let controllerOrientation = this.camera.quaternion;
          var controllerOrientation = new THREE.Quaternion().fromArray(pose.orientation);

          // Transform the controller into the camera coordinate system.
          /*
          controllerOrientation.multiply(
              new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
          controllerOrientation.x *= -1;
          controllerOrientation.z *= -1;
          */

          // Feed camera and controller into the arm model.
          this.armModel.setHeadOrientation(this.camera.quaternion);
          this.armModel.setHeadPosition(this.camera.position);
          this.armModel.setControllerOrientation(controllerOrientation);
          this.armModel.update();

          // Get resulting pose and configure the renderer.
          var modelPose = this.armModel.getPose();
          this.renderer.setPosition(modelPose.position);
          //this.renderer.setPosition(new THREE.Vector3());
          this.renderer.setOrientation(modelPose.orientation);
          //this.renderer.setOrientation(controllerOrientation);

          // Show ray and reticle.
          this.renderer.setRayVisibility(true);
          this.renderer.setReticleVisibility(true);

          // Ray renderer always active.
          this.renderer.setActive(true);
          break;

        case _rayInteractionModes2.default.VR_6DOF:
          // Vive, origin depends on the position of the controller.
          // TODO(smus)...
          var pose = this.controller.getGamepadPose();

          // Check that the pose is valid.
          if (!pose.orientation || !pose.position) {
            console.warn('Invalid gamepad pose. Can\'t update ray.');
            break;
          }
          var orientation = new THREE.Quaternion().fromArray(pose.orientation);
          var position = new THREE.Vector3().fromArray(pose.position);

          var composed = new THREE.Matrix4();
          var standingOrientation = new THREE.Quaternion();
          var standingPosition = new THREE.Vector3();
          var standingScale = new THREE.Vector();
          composed.makeRotationFromQuaternion(orientation);
          composed.setPosition(position);
          composed.premultiply(vrDisplay.stageParameters.sittingToStandingTransform);
          composed.decompose(standingPosition, standingOrientation, standingScale);

          this.renderer.setOrientation(standingOrientation);
          this.renderer.setPosition(standingPosition);

          // Show ray and reticle.
          this.renderer.setRayVisibility(true);
          this.renderer.setReticleVisibility(true);

          // Ray renderer always active.
          this.renderer.setActive(true);
          break;

        default:
          console.error('Unknown interaction mode.');
      }
      this.renderer.update();
      this.controller.update();
    }
  }, {
    key: 'setSize',
    value: function setSize(size) {
      this.controller.setSize(size);
    }
  }, {
    key: 'getMesh',
    value: function getMesh() {
      return this.renderer.getReticleRayMesh();
    }
  }, {
    key: 'getOrigin',
    value: function getOrigin() {
      return this.renderer.getOrigin();
    }
  }, {
    key: 'getDirection',
    value: function getDirection() {
      return this.renderer.getDirection();
    }
  }, {
    key: 'getRightDirection',
    value: function getRightDirection() {
      var lookAt = new THREE.Vector3(0, 0, -1);
      lookAt.applyQuaternion(this.camera.quaternion);
      return new THREE.Vector3().crossVectors(lookAt, this.camera.up);
    }
  }, {
    key: 'onRayDown_',
    value: function onRayDown_(e) {
      //console.log('onRayDown_');

      // Force the renderer to raycast.
      this.renderer.update();
      var mesh = this.renderer.getSelectedMesh();
      this.emit('raydown', mesh);

      this.renderer.setActive(true);
    }
  }, {
    key: 'onRayUp_',
    value: function onRayUp_(e) {
      //console.log('onRayUp_');
      var mesh = this.renderer.getSelectedMesh();
      this.emit('rayup', mesh);

      this.renderer.setActive(false);
    }
  }, {
    key: 'onRayCancel_',
    value: function onRayCancel_(e) {
      //console.log('onRayCancel_');
      var mesh = this.renderer.getSelectedMesh();
      this.emit('raycancel', mesh);
    }
  }, {
    key: 'onPointerMove_',
    value: function onPointerMove_(ndc) {
      this.pointerNdc.copy(ndc);
    }
  }]);

  return RayInput;
}(_eventemitter2.default);

exports.default = RayInput;

},{"./orientation-arm-model":7,"./ray-controller":8,"./ray-interaction-modes":10,"./ray-renderer":11,"eventemitter3":2}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var InteractionModes = {
  MOUSE: 1,
  TOUCH: 2,
  VR_0DOF: 3,
  VR_3DOF: 4,
  VR_6DOF: 5
};

exports.default = InteractionModes;

},{}],11:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _util = require('./util');

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /*
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Copyright 2016 Google Inc. All Rights Reserved.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Licensed under the Apache License, Version 2.0 (the "License");
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * you may not use this file except in compliance with the License.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * You may obtain a copy of the License at
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *     http://www.apache.org/licenses/LICENSE-2.0
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * Unless required by applicable law or agreed to in writing, software
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * distributed under the License is distributed on an "AS IS" BASIS,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * See the License for the specific language governing permissions and
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                * limitations under the License.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                */

var RETICLE_DISTANCE = 3;
var INNER_RADIUS = 0.02;
var OUTER_RADIUS = 0.04;
var RAY_RADIUS = 0.02;
var GRADIENT_IMAGE = (0, _util.base64)('image/png', 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAABdklEQVR4nO3WwXHEQAwDQcin/FOWw+BjuiPYB2q4G2nP933P9SO4824zgDADiDOAuHfb3/UjuKMAcQYQZwBx/gBxChCnAHEKEKcAcQoQpwBxChCnAHEGEGcAcf4AcQoQZwBxBhBnAHEGEGcAcQYQZwBxBhBnAHEGEGcAcQYQZwBxBhBnAHHvtt/1I7ijAHEGEGcAcf4AcQoQZwBxTkCcAsQZQJwTEKcAcQoQpwBxBhDnBMQpQJwCxClAnALEKUCcAsQpQJwCxClAnALEKUCcAsQpQJwBxDkBcQoQpwBxChCnAHEKEKcAcQoQpwBxChCnAHEKEGcAcU5AnALEKUCcAsQZQJwTEKcAcQYQ5wTEKUCcAcQZQJw/QJwCxBlAnAHEGUCcAcQZQJwBxBlAnAHEGUCcAcQZQJwBxBlAnAHEGUDcu+25fgR3FCDOAOIMIM4fIE4B4hQgTgHiFCBOAeIUIE4B4hQgzgDiDCDOHyBOAeIMIM4A4v4B/5IF9eD6QxgAAAAASUVORK5CYII=');

/**
 * Handles ray input selection from frame of reference of an arbitrary object.
 *
 * The source of the ray is from various locations:
 *
 * Desktop: mouse.
 * Magic window: touch.
 * Cardboard: camera.
 * Daydream: 3DOF controller via gamepad (and show ray).
 * Vive: 6DOF controller via gamepad (and show ray).
 *
 * Emits selection events:
 *     rayover(mesh): This mesh was selected.
 *     rayout(mesh): This mesh was unselected.
 */

var RayRenderer = function (_EventEmitter) {
  _inherits(RayRenderer, _EventEmitter);

  function RayRenderer(camera, opt_params) {
    _classCallCheck(this, RayRenderer);

    var _this = _possibleConstructorReturn(this, (RayRenderer.__proto__ || Object.getPrototypeOf(RayRenderer)).call(this));

    _this.camera = camera;

    var params = opt_params || {};

    // Which objects are interactive (keyed on id).
    _this.meshes = {};

    // Which objects are currently selected (keyed on id).
    _this.selected = {};

    // The raycaster.
    _this.raycaster = new THREE.Raycaster();

    // Position and orientation, in addition.
    _this.position = new THREE.Vector3();
    _this.orientation = new THREE.Quaternion();

    _this.root = new THREE.Object3D();

    // Add the reticle mesh to the root of the object.
    _this.reticle = _this.createReticle_();
    _this.root.add(_this.reticle);

    // Add the ray to the root of the object.
    _this.ray = _this.createRay_();
    _this.root.add(_this.ray);

    // How far the reticle is currently from the reticle origin.
    _this.reticleDistance = RETICLE_DISTANCE;
    return _this;
  }

  /**
   * Register an object so that it can be interacted with.
   */


  _createClass(RayRenderer, [{
    key: 'add',
    value: function add(object) {
      this.meshes[object.id] = object;
    }

    /**
     * Prevent an object from being interacted with.
     */

  }, {
    key: 'remove',
    value: function remove(object) {
      var id = object.id;
      if (!this.meshes[id]) {
        // If there's no existing mesh, we can't remove it.
        delete this.meshes[id];
      }
      // If the object is currently selected, remove it.
      if (this.selected[id]) {
        delete this.selected[object.id];
      }
    }
  }, {
    key: 'update',
    value: function update() {
      // Do the raycasting and issue various events as needed.
      for (var id in this.meshes) {
        var mesh = this.meshes[id];
        var intersects = this.raycaster.intersectObject(mesh, true);
        if (intersects.length > 1) {
          console.warn('Unexpected: multiple meshes intersected.');
        }
        var isIntersected = intersects.length > 0;
        var isSelected = this.selected[id];

        // If it's newly selected, send rayover.
        if (isIntersected && !isSelected) {
          this.selected[id] = true;
          if (this.isActive) {
            this.emit('rayover', mesh);
          }
        }

        // If it's no longer intersected, send rayout.
        if (!isIntersected && isSelected) {
          delete this.selected[id];
          this.moveReticle_(null);
          if (this.isActive) {
            this.emit('rayout', mesh);
          }
        }

        if (isIntersected) {
          this.moveReticle_(intersects);
        }
      }
    }

    /**
     * Sets the origin of the ray.
     * @param {Vector} vector Position of the origin of the picking ray.
     */

  }, {
    key: 'setPosition',
    value: function setPosition(vector) {
      this.position.copy(vector);
      this.raycaster.ray.origin.copy(vector);
      this.updateRaycaster_();
    }
  }, {
    key: 'getOrigin',
    value: function getOrigin() {
      return this.raycaster.ray.origin;
    }

    /**
     * Sets the direction of the ray.
     * @param {Vector} vector Unit vector corresponding to direction.
     */

  }, {
    key: 'setOrientation',
    value: function setOrientation(quaternion) {
      this.orientation.copy(quaternion);

      var pointAt = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
      this.raycaster.ray.direction.copy(pointAt);
      this.updateRaycaster_();
    }
  }, {
    key: 'getDirection',
    value: function getDirection() {
      return this.raycaster.ray.direction;
    }

    /**
     * Sets the pointer on the screen for camera + pointer based picking. This
     * superscedes origin and direction.
     *
     * @param {Vector2} vector The position of the pointer (screen coords).
     */

  }, {
    key: 'setPointer',
    value: function setPointer(vector) {
      this.raycaster.setFromCamera(vector, this.camera);
      this.updateRaycaster_();
    }

    /**
     * Gets the mesh, which includes reticle and/or ray. This mesh is then added
     * to the scene.
     */

  }, {
    key: 'getReticleRayMesh',
    value: function getReticleRayMesh() {
      return this.root;
    }

    /**
     * Gets the currently selected object in the scene.
     */

  }, {
    key: 'getSelectedMesh',
    value: function getSelectedMesh() {
      var count = 0;
      var mesh = null;
      for (var id in this.selected) {
        count += 1;
        mesh = this.meshes[id];
      }
      if (count > 1) {
        console.warn('More than one mesh selected.');
      }
      return mesh;
    }

    /**
     * Hides and shows the reticle.
     */

  }, {
    key: 'setReticleVisibility',
    value: function setReticleVisibility(isVisible) {
      this.reticle.visible = isVisible;
    }

    /**
     * Enables or disables the raycasting ray which gradually fades out from
     * the origin.
     */

  }, {
    key: 'setRayVisibility',
    value: function setRayVisibility(isVisible) {
      this.ray.visible = isVisible;
    }

    /**
     * Enables and disables the raycaster. For touch, where finger up means we
     * shouldn't be raycasting.
     */

  }, {
    key: 'setActive',
    value: function setActive(isActive) {
      // If nothing changed, do nothing.
      if (this.isActive == isActive) {
        return;
      }
      // TODO(smus): Show the ray or reticle adjust in response.
      this.isActive = isActive;

      if (!isActive) {
        this.moveReticle_(null);
        for (var id in this.selected) {
          var mesh = this.meshes[id];
          delete this.selected[id];
          this.emit('rayout', mesh);
        }
      }
    }
  }, {
    key: 'updateRaycaster_',
    value: function updateRaycaster_() {
      var ray = this.raycaster.ray;

      // Position the reticle at a distance, as calculated from the origin and
      // direction.
      var position = this.reticle.position;
      position.copy(ray.direction);
      position.multiplyScalar(this.reticleDistance);
      position.add(ray.origin);

      // Set position and orientation of the ray so that it goes from origin to
      // reticle.
      var delta = new THREE.Vector3().copy(ray.direction);
      delta.multiplyScalar(this.reticleDistance);
      this.ray.scale.y = delta.length();
      var arrow = new THREE.ArrowHelper(ray.direction, ray.origin);
      this.ray.rotation.copy(arrow.rotation);
      this.ray.position.addVectors(ray.origin, delta.multiplyScalar(0.5));
    }

    /**
     * Creates the geometry of the reticle.
     */

  }, {
    key: 'createReticle_',
    value: function createReticle_() {
      // Create a spherical reticle.
      var innerGeometry = new THREE.SphereGeometry(INNER_RADIUS, 32, 32);
      var innerMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.9
      });
      var inner = new THREE.Mesh(innerGeometry, innerMaterial);

      var outerGeometry = new THREE.SphereGeometry(OUTER_RADIUS, 32, 32);
      var outerMaterial = new THREE.MeshBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.3
      });
      var outer = new THREE.Mesh(outerGeometry, outerMaterial);

      var reticle = new THREE.Group();
      reticle.add(inner);
      reticle.add(outer);
      return reticle;
    }

    /**
     * Moves the reticle to a position so that it's just in front of the mesh that
     * it intersected with.
     */

  }, {
    key: 'moveReticle_',
    value: function moveReticle_(intersections) {
      // If no intersection, return the reticle to the default position.
      var distance = RETICLE_DISTANCE;
      if (intersections) {
        // Otherwise, determine the correct distance.
        var inter = intersections[0];
        distance = inter.distance;
      }

      this.reticleDistance = distance;
      this.updateRaycaster_();
      return;
    }
  }, {
    key: 'createRay_',
    value: function createRay_() {
      // Create a cylindrical ray.
      var geometry = new THREE.CylinderGeometry(RAY_RADIUS, RAY_RADIUS, 1, 32);
      var material = new THREE.MeshBasicMaterial({
        map: THREE.ImageUtils.loadTexture(GRADIENT_IMAGE),
        //color: 0xffffff,
        transparent: true,
        opacity: 0.3
      });
      var mesh = new THREE.Mesh(geometry, material);

      return mesh;
    }
  }]);

  return RayRenderer;
}(_eventemitter2.default);

exports.default = RayRenderer;

},{"./util":12,"eventemitter3":2}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isMobile = isMobile;
exports.base64 = base64;
/*
 * Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function isMobile() {
  var check = false;
  (function (a) {
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
  })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
}

function base64(mimeType, base64) {
  return 'data:' + mimeType + ';base64,' + base64;
}

},{}],13:[function(require,module,exports){
(function (process){
/**
 * Tween.js - Licensed under the MIT license
 * https://github.com/tweenjs/tween.js
 * ----------------------------------------------
 *
 * See https://github.com/tweenjs/tween.js/graphs/contributors for the full list of contributors.
 * Thank you all, you're awesome!
 */

var TWEEN = TWEEN || (function () {

	var _tweens = [];

	return {

		getAll: function () {

			return _tweens;

		},

		removeAll: function () {

			_tweens = [];

		},

		add: function (tween) {

			_tweens.push(tween);

		},

		remove: function (tween) {

			var i = _tweens.indexOf(tween);

			if (i !== -1) {
				_tweens.splice(i, 1);
			}

		},

		update: function (time, preserve) {

			if (_tweens.length === 0) {
				return false;
			}

			var i = 0;

			time = time !== undefined ? time : TWEEN.now();

			while (i < _tweens.length) {

				if (_tweens[i].update(time) || preserve) {
					i++;
				} else {
					_tweens.splice(i, 1);
				}

			}

			return true;

		}
	};

})();


// Include a performance.now polyfill
(function () {
	// In node.js, use process.hrtime.
	if (this.window === undefined && this.process !== undefined) {
		TWEEN.now = function () {
			var time = process.hrtime();

			// Convert [seconds, microseconds] to milliseconds.
			return time[0] * 1000 + time[1] / 1000;
		};
	}
	// In a browser, use window.performance.now if it is available.
	else if (this.window !== undefined &&
	         window.performance !== undefined &&
		 window.performance.now !== undefined) {

		// This must be bound, because directly assigning this function
		// leads to an invocation exception in Chrome.
		TWEEN.now = window.performance.now.bind(window.performance);
	}
	// Use Date.now if it is available.
	else if (Date.now !== undefined) {
		TWEEN.now = Date.now;
	}
	// Otherwise, use 'new Date().getTime()'.
	else {
		TWEEN.now = function () {
			return new Date().getTime();
		};
	}
})();


TWEEN.Tween = function (object) {

	var _object = object;
	var _valuesStart = {};
	var _valuesEnd = {};
	var _valuesStartRepeat = {};
	var _duration = 1000;
	var _repeat = 0;
	var _yoyo = false;
	var _isPlaying = false;
	var _reversed = false;
	var _delayTime = 0;
	var _startTime = null;
	var _easingFunction = TWEEN.Easing.Linear.None;
	var _interpolationFunction = TWEEN.Interpolation.Linear;
	var _chainedTweens = [];
	var _onStartCallback = null;
	var _onStartCallbackFired = false;
	var _onUpdateCallback = null;
	var _onCompleteCallback = null;
	var _onStopCallback = null;

	// Set all starting values present on the target object
	for (var field in object) {
		_valuesStart[field] = parseFloat(object[field], 10);
	}

	this.to = function (properties, duration) {

		if (duration !== undefined) {
			_duration = duration;
		}

		_valuesEnd = properties;

		return this;

	};

	this.start = function (time) {

		TWEEN.add(this);

		_isPlaying = true;

		_onStartCallbackFired = false;

		_startTime = time !== undefined ? time : TWEEN.now();
		_startTime += _delayTime;

		for (var property in _valuesEnd) {

			// Check if an Array was provided as property value
			if (_valuesEnd[property] instanceof Array) {

				if (_valuesEnd[property].length === 0) {
					continue;
				}

				// Create a local copy of the Array with the start value at the front
				_valuesEnd[property] = [_object[property]].concat(_valuesEnd[property]);

			}

			// If `to()` specifies a property that doesn't exist in the source object,
			// we should not set that property in the object
			if (_valuesStart[property] === undefined) {
				continue;
			}

			_valuesStart[property] = _object[property];

			if ((_valuesStart[property] instanceof Array) === false) {
				_valuesStart[property] *= 1.0; // Ensures we're using numbers, not strings
			}

			_valuesStartRepeat[property] = _valuesStart[property] || 0;

		}

		return this;

	};

	this.stop = function () {

		if (!_isPlaying) {
			return this;
		}

		TWEEN.remove(this);
		_isPlaying = false;

		if (_onStopCallback !== null) {
			_onStopCallback.call(_object);
		}

		this.stopChainedTweens();
		return this;

	};

	this.stopChainedTweens = function () {

		for (var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++) {
			_chainedTweens[i].stop();
		}

	};

	this.delay = function (amount) {

		_delayTime = amount;
		return this;

	};

	this.repeat = function (times) {

		_repeat = times;
		return this;

	};

	this.yoyo = function (yoyo) {

		_yoyo = yoyo;
		return this;

	};


	this.easing = function (easing) {

		_easingFunction = easing;
		return this;

	};

	this.interpolation = function (interpolation) {

		_interpolationFunction = interpolation;
		return this;

	};

	this.chain = function () {

		_chainedTweens = arguments;
		return this;

	};

	this.onStart = function (callback) {

		_onStartCallback = callback;
		return this;

	};

	this.onUpdate = function (callback) {

		_onUpdateCallback = callback;
		return this;

	};

	this.onComplete = function (callback) {

		_onCompleteCallback = callback;
		return this;

	};

	this.onStop = function (callback) {

		_onStopCallback = callback;
		return this;

	};

	this.update = function (time) {

		var property;
		var elapsed;
		var value;

		if (time < _startTime) {
			return true;
		}

		if (_onStartCallbackFired === false) {

			if (_onStartCallback !== null) {
				_onStartCallback.call(_object);
			}

			_onStartCallbackFired = true;

		}

		elapsed = (time - _startTime) / _duration;
		elapsed = elapsed > 1 ? 1 : elapsed;

		value = _easingFunction(elapsed);

		for (property in _valuesEnd) {

			// Don't update properties that do not exist in the source object
			if (_valuesStart[property] === undefined) {
				continue;
			}

			var start = _valuesStart[property] || 0;
			var end = _valuesEnd[property];

			if (end instanceof Array) {

				_object[property] = _interpolationFunction(end, value);

			} else {

				// Parses relative end values with start as base (e.g.: +10, -3)
				if (typeof (end) === 'string') {

					if (end.charAt(0) === '+' || end.charAt(0) === '-') {
						end = start + parseFloat(end, 10);
					} else {
						end = parseFloat(end, 10);
					}
				}

				// Protect against non numeric properties.
				if (typeof (end) === 'number') {
					_object[property] = start + (end - start) * value;
				}

			}

		}

		if (_onUpdateCallback !== null) {
			_onUpdateCallback.call(_object, value);
		}

		if (elapsed === 1) {

			if (_repeat > 0) {

				if (isFinite(_repeat)) {
					_repeat--;
				}

				// Reassign starting values, restart by making startTime = now
				for (property in _valuesStartRepeat) {

					if (typeof (_valuesEnd[property]) === 'string') {
						_valuesStartRepeat[property] = _valuesStartRepeat[property] + parseFloat(_valuesEnd[property], 10);
					}

					if (_yoyo) {
						var tmp = _valuesStartRepeat[property];

						_valuesStartRepeat[property] = _valuesEnd[property];
						_valuesEnd[property] = tmp;
					}

					_valuesStart[property] = _valuesStartRepeat[property];

				}

				if (_yoyo) {
					_reversed = !_reversed;
				}

				_startTime = time + _delayTime;

				return true;

			} else {

				if (_onCompleteCallback !== null) {
					_onCompleteCallback.call(_object);
				}

				for (var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++) {
					// Make the chained tweens start exactly at the time they should,
					// even if the `update()` method was called way past the duration of the tween
					_chainedTweens[i].start(_startTime + _duration);
				}

				return false;

			}

		}

		return true;

	};

};


TWEEN.Easing = {

	Linear: {

		None: function (k) {

			return k;

		}

	},

	Quadratic: {

		In: function (k) {

			return k * k;

		},

		Out: function (k) {

			return k * (2 - k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k;
			}

			return - 0.5 * (--k * (k - 2) - 1);

		}

	},

	Cubic: {

		In: function (k) {

			return k * k * k;

		},

		Out: function (k) {

			return --k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k + 2);

		}

	},

	Quartic: {

		In: function (k) {

			return k * k * k * k;

		},

		Out: function (k) {

			return 1 - (--k * k * k * k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k;
			}

			return - 0.5 * ((k -= 2) * k * k * k - 2);

		}

	},

	Quintic: {

		In: function (k) {

			return k * k * k * k * k;

		},

		Out: function (k) {

			return --k * k * k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k * k * k + 2);

		}

	},

	Sinusoidal: {

		In: function (k) {

			return 1 - Math.cos(k * Math.PI / 2);

		},

		Out: function (k) {

			return Math.sin(k * Math.PI / 2);

		},

		InOut: function (k) {

			return 0.5 * (1 - Math.cos(Math.PI * k));

		}

	},

	Exponential: {

		In: function (k) {

			return k === 0 ? 0 : Math.pow(1024, k - 1);

		},

		Out: function (k) {

			return k === 1 ? 1 : 1 - Math.pow(2, - 10 * k);

		},

		InOut: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if ((k *= 2) < 1) {
				return 0.5 * Math.pow(1024, k - 1);
			}

			return 0.5 * (- Math.pow(2, - 10 * (k - 1)) + 2);

		}

	},

	Circular: {

		In: function (k) {

			return 1 - Math.sqrt(1 - k * k);

		},

		Out: function (k) {

			return Math.sqrt(1 - (--k * k));

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return - 0.5 * (Math.sqrt(1 - k * k) - 1);
			}

			return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);

		}

	},

	Elastic: {

		In: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			return -Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI);

		},

		Out: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			return Math.pow(2, -10 * k) * Math.sin((k - 0.1) * 5 * Math.PI) + 1;

		},

		InOut: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			k *= 2;

			if (k < 1) {
				return -0.5 * Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI);
			}

			return 0.5 * Math.pow(2, -10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI) + 1;

		}

	},

	Back: {

		In: function (k) {

			var s = 1.70158;

			return k * k * ((s + 1) * k - s);

		},

		Out: function (k) {

			var s = 1.70158;

			return --k * k * ((s + 1) * k + s) + 1;

		},

		InOut: function (k) {

			var s = 1.70158 * 1.525;

			if ((k *= 2) < 1) {
				return 0.5 * (k * k * ((s + 1) * k - s));
			}

			return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);

		}

	},

	Bounce: {

		In: function (k) {

			return 1 - TWEEN.Easing.Bounce.Out(1 - k);

		},

		Out: function (k) {

			if (k < (1 / 2.75)) {
				return 7.5625 * k * k;
			} else if (k < (2 / 2.75)) {
				return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
			} else if (k < (2.5 / 2.75)) {
				return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
			} else {
				return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
			}

		},

		InOut: function (k) {

			if (k < 0.5) {
				return TWEEN.Easing.Bounce.In(k * 2) * 0.5;
			}

			return TWEEN.Easing.Bounce.Out(k * 2 - 1) * 0.5 + 0.5;

		}

	}

};

TWEEN.Interpolation = {

	Linear: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.Linear;

		if (k < 0) {
			return fn(v[0], v[1], f);
		}

		if (k > 1) {
			return fn(v[m], v[m - 1], m - f);
		}

		return fn(v[i], v[i + 1 > m ? m : i + 1], f - i);

	},

	Bezier: function (v, k) {

		var b = 0;
		var n = v.length - 1;
		var pw = Math.pow;
		var bn = TWEEN.Interpolation.Utils.Bernstein;

		for (var i = 0; i <= n; i++) {
			b += pw(1 - k, n - i) * pw(k, i) * v[i] * bn(n, i);
		}

		return b;

	},

	CatmullRom: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.CatmullRom;

		if (v[0] === v[m]) {

			if (k < 0) {
				i = Math.floor(f = m * (1 + k));
			}

			return fn(v[(i - 1 + m) % m], v[i], v[(i + 1) % m], v[(i + 2) % m], f - i);

		} else {

			if (k < 0) {
				return v[0] - (fn(v[0], v[0], v[1], v[1], -f) - v[0]);
			}

			if (k > 1) {
				return v[m] - (fn(v[m], v[m], v[m - 1], v[m - 1], f - m) - v[m]);
			}

			return fn(v[i ? i - 1 : 0], v[i], v[m < i + 1 ? m : i + 1], v[m < i + 2 ? m : i + 2], f - i);

		}

	},

	Utils: {

		Linear: function (p0, p1, t) {

			return (p1 - p0) * t + p0;

		},

		Bernstein: function (n, i) {

			var fc = TWEEN.Interpolation.Utils.Factorial;

			return fc(n) / fc(i) / fc(n - i);

		},

		Factorial: (function () {

			var a = [1];

			return function (n) {

				var s = 1;

				if (a[n]) {
					return a[n];
				}

				for (var i = n; i > 1; i--) {
					s *= i;
				}

				a[n] = s;
				return s;

			};

		})(),

		CatmullRom: function (p0, p1, p2, p3, t) {

			var v0 = (p2 - p0) * 0.5;
			var v1 = (p3 - p1) * 0.5;
			var t2 = t * t;
			var t3 = t * t2;

			return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (- 3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;

		}

	}

};

// UMD (Universal Module Definition)
(function (root) {

	if (typeof define === 'function' && define.amd) {

		// AMD
		define([], function () {
			return TWEEN;
		});

	} else if (typeof module !== 'undefined' && typeof exports === 'object') {

		// Node.js
		module.exports = TWEEN;

	} else if (root !== undefined) {

		// Global variable
		root.TWEEN = TWEEN;

	}

})(this);

}).call(this,require('_process'))

},{"_process":1}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.Datapoint = exports.WebSocketDataset = exports.Dataset = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _papaparse = require('papaparse');

var _papaparse2 = _interopRequireDefault(_papaparse);

var _objectAssign = require('object-assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Base Dataset class
 */
var Dataset = exports.Dataset = function () {

	/**
  *
  */
	function Dataset() {
		_classCallCheck(this, Dataset);

		this.datapoints = {};
		this.embeddings = [];
	}

	/**
  * A callback that is triggered after the dataset is loaded; typically used to create
  * an embedding based on the dataset.
  * @callback CSVDatasetCallback
  * @param {Dataset} dataset - The Dataset loaded from the csv file
  */

	/**
  * Create a {Dataset} from a csv file that can be found at the given url
  * @param {String} url - The url where the csv file can be found
  * @param {CSVDatasetCallback} callback
  */


	_createClass(Dataset, [{
		key: 'add',


		/**
   * Add a datapoint to the Dataset
   * @param {Datapoint} datapoint
   */
		value: function add(datapoint) {
			var d;
			if (!(datapoint instanceof Datapoint)) {
				d = new Datapoint(datapoint);
			} else {
				d = datapoint;
			}
			this.datapoints[d.id] = d;
			this.sendNotifications('add', d.id);
		}

		/**
   * Remove a datapoint from the Dataset
   * @param id - The id of the datapoint to remove
   */

	}, {
		key: 'remove',
		value: function remove(id) {
			delete this.datapoints[id];
			this.sendNotifications('remove', id);
		}

		/**
   * Modify the value of a datapoint attribute
   * @param id - The id of the datapoint to modify
   * @param k - The key whose value to modify
   @ @param v - The new value
   */

	}, {
		key: 'update',
		value: function update(id, k, v) {
			var dp = this.datapoints[id];
			if (dp) {
				var old = dp.get(k);
				dp.set(k, v);
				this.sendNotifications('update', id, k, v, old);
			}
		}
	}, {
		key: 'get',
		value: function get(id) {
			return this.datapoints[id];
		}
	}, {
		key: 'getIds',
		value: function getIds() {
			return Object.keys(this.datapoints);
		}
	}, {
		key: 'register',
		value: function register(embedding) {
			this.embeddings.push(embedding);
		}
	}, {
		key: 'sendNotifications',
		value: function sendNotifications(type, id) {
			var msg = { type: type, id: id };
			if (type == 'update') {
				msg.attr = arguments.length <= 2 ? undefined : arguments[2];
				msg.newVal = arguments.length <= 3 ? undefined : arguments[3];
				msg.oldVal = arguments.length <= 4 ? undefined : arguments[4];
			}
			this.embeddings.forEach(function (e) {
				return e.notify(msg);
			});
		}
	}], [{
		key: 'createFromCSV',
		value: function createFromCSV(url, callback) {
			_papaparse2.default.parse(url, {
				download: true,
				header: true,
				dynamicTyping: true,
				complete: function complete(results) {
					var ds = new Dataset();
					for (var i in results.data) {
						var dp = results.data[i];
						dp._id = i;
						ds.add(dp);
					}
					callback(ds);
				}
			});
		}
	}]);

	return Dataset;
}();

/**
 * A Dataset whose datapoints are received from a websocket.
 */


var WebSocketDataset = exports.WebSocketDataset = function (_Dataset) {
	_inherits(WebSocketDataset, _Dataset);

	function WebSocketDataset(url) {
		var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

		_classCallCheck(this, WebSocketDataset);

		options = (0, _objectAssign2.default)({ onmessage: function onmessage(x) {
				return x;
			}, init: function init(s) {} }, options);

		var _this = _possibleConstructorReturn(this, (WebSocketDataset.__proto__ || Object.getPrototypeOf(WebSocketDataset)).call(this));

		_this.options = options;
		_this.socket = new WebSocket(url);
		_this.socket.onopen = function () {
			return _this.options.init(_this.socket);
		};
		_this.socket.onmessage = function (m) {
			var d = this.options.onmessage(JSON.parse(m.data));
			this.add(d);
		}.bind(_this);
		return _this;
	}

	return WebSocketDataset;
}(Dataset);

var Datapoint = exports.Datapoint = function () {
	function Datapoint(values) {
		var idAttribute = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '_id';

		_classCallCheck(this, Datapoint);

		this.values = values;
		this.idAttribute = idAttribute;
	}

	_createClass(Datapoint, [{
		key: 'get',
		value: function get(k) {
			return this.values[k];
		}
	}, {
		key: 'set',
		value: function set(k, v) {
			this.values[k] = v;
		}
	}, {
		key: 'id',
		get: function get() {
			return this.values[this.idAttribute];
		}
	}]);

	return Datapoint;
}();

},{"object-assign":3,"papaparse":4}],15:[function(require,module,exports){
'use strict';

// logic here adapted from https://github.com/borismus/ray-input/blob/master/src/ray-controller.js

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.detectMode = detectMode;
var DISPLAY_TYPES = exports.DISPLAY_TYPES = {
	DESKTOP: 'DESKTOP_DISPLAY',
	MOBILE: 'MOBILE_DSIPLAY',
	VR: 'VR_DISPLAY'
};

var INPUT_TYPES = exports.INPUT_TYPES = {
	KB_MOUSE: 'KB_MOUSE_INPUT',
	TOUCH: 'TOUCH_INPUT',
	VR_GAZE: 'VR_GAZE_INPUT',
	VR_3DOF: 'VR_3DOF_INPUT',
	VR_6DOF: 'VR_6DOF_INPUT'
};

// https://github.com/borismus/ray-input/blob/master/src/util.js
function isMobile() {
	var check = false;
	(function (a) {
		if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
	})(navigator.userAgent || navigator.vendor || window.opera);
	return check;
}

function detectDisplay() {
	if (navigator.getVRDisplays) {
		return DISPLAY_TYPES.VR;
	} else {
		if (isMobile()) return DISPLAY_TYPES.MOBILE;else return DISPLAY_TYPES.DESKTOP;
	}
}

function detectInput(displayMode) {
	var gamepad = undefined;
	if (navigator.getGamepads) {
		var gamepads = navigator.getGamepads();
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = gamepads[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var _gamepad = _step.value;

				if (_gamepad && _gamepad.pose) {
					if (_gamepad.pose.hasPosition) return INPUT_TYPES.VR_6DOF;else if (_gamepad.pose.hasOrientation) return INPUT_TYPES.VR_3DOF;
				}
			}
		} catch (err) {
			_didIteratorError = true;
			_iteratorError = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion && _iterator.return) {
					_iterator.return();
				}
			} finally {
				if (_didIteratorError) {
					throw _iteratorError;
				}
			}
		}
	}

	// gamepad API not found or no VR gamepad found
	if (isMobile()) {
		if (displayMode == DISPLAY_TYPES.VR) return INPUT_TYPES.VR_GAZE;else return INPUT_TYPES.TOUCH;
	} else {
		return INPUT_TYPES.KB_MOUSE;
	}

	return INPUT_TYPES.TOUCH;
}

function detectMode() {
	var displayMode = detectDisplay();
	var inputMode = detectInput(displayMode);
	return { displayMode: displayMode, inputMode: inputMode };
}

},{}],16:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.AggregateEmbedding = exports.ConsoleEmbedding = exports.PathEmbedding = exports.ScatterEmbedding = exports.PointsEmbedding = exports.MeshEmbedding = exports.Embedding = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _objectAssign = require('object-assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var _tween = require('tween.js');

var _tween2 = _interopRequireDefault(_tween);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Base class for all embeddings.
 */
var Embedding = exports.Embedding = function () {
	/**
  * Embedding base constructor.
  * @constructor
  * @param scene - The scene to which the embedding belongs
  * @param {Dataset} dataset - The dataset that backs the embedding
  * @param {Object} [options={}] - Options describing the embedding's location and scale
  * @param {Number} [options.x=0] - x position of the embedding
  * @param {Number} [options.y=0] - y position of the embedding
  * @param {Number} [options.z=0] - z position of the embedding
  * @param {Number} [options.rx=0] - x rotation of the embedding
  * @param {Number} [options.ry=0] - y rotation of the embedding
  * @param {Number} [options.rz=0] - z rotation of the embedding
  * @param {Number} [options.sx=1] - x scale of the embedding
  * @param {Number} [options.sy=1] - y scale of the embedding
  * @param {Number} [options.sz=1] - z scale of the embedding
  */
	function Embedding(scene, dataset) {
		var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

		_classCallCheck(this, Embedding);

		this.dataset = dataset;
		if (dataset) dataset.register(this);
		this.obj3D = new THREE.Object3D();
		scene.add(this.obj3D);
		this.initialized = false;
		this.events = [];

		// set default position and rotation
		options = (0, _objectAssign2.default)({ x: 0, y: 0, z: 0 }, options);
		options = (0, _objectAssign2.default)({ rx: 0, ry: 0, rz: 0 }, options);
		options = (0, _objectAssign2.default)({ sx: 1, sy: 1, sz: 1 }, options);
		options = (0, _objectAssign2.default)({ mapping: {} }, options);
		this.options = options;
		this.obj3D.position.set(options.x, options.y, options.z);
		this.obj3D.rotation.set(options.rx, options.ry, options.rz);
		this.obj3D.scale.set(options.sx, options.sy, options.sz);
		// TODO canonicalize, sanitize mapping
		this.mapping = this.options.mapping;
	}

	/**
  * Translates from a source property of a datapoint to a target property of an embedding
  * element.
  */


	_createClass(Embedding, [{
		key: '_map',
		value: function _map(dp, src) {
			var tgt = this.mapping[src];
			return tgt ? dp.get(tgt) : dp.get(src);
		}

		/**
   * Translates from a source property of a datapoint to a target property of an embedding
   * element.
   */

	}, {
		key: '_mapAttr',
		value: function _mapAttr(src) {
			var tgt = this.mapping[src];
			return tgt ? tgt : src;
		}

		/**
   * Render the embedding - must be implemented by each concrete subclass.
   * @abstract
   */

	}, {
		key: 'embed',
		value: function embed() {
			// not implemented here
		}
	}, {
		key: 'notify',
		value: function notify(event) {
			this.events.push(event);
		}
	}, {
		key: 'getOpt',
		value: function getOpt(x) {
			var dp = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

			var a = this.options[x];
			if (typeof a == 'function') return a(dp);else return a;
		}
	}]);

	return Embedding;
}();

/**
 * Base class for embeddings that render Datapoints as individual meshes
 */


var MeshEmbedding = exports.MeshEmbedding = function (_Embedding) {
	_inherits(MeshEmbedding, _Embedding);

	function MeshEmbedding(scene, dataset) {
		var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

		_classCallCheck(this, MeshEmbedding);

		options = (0, _objectAssign2.default)({
			material: new THREE.MeshStandardMaterial({
				color: 0xff00ff,
				emissive: 0x072534,
				side: THREE.DoubleSide,
				shading: THREE.FlatShading
			})
		}, options);
		return _possibleConstructorReturn(this, (MeshEmbedding.__proto__ || Object.getPrototypeOf(MeshEmbedding)).call(this, scene, dataset, options));
	}

	/**
  * A default mesh creator; this can be overriden by subclasses 
  */


	_createClass(MeshEmbedding, [{
		key: 'createMeshForDatapoint',
		value: function createMeshForDatapoint(dp) {
			var geo = new THREE.BoxGeometry(this.getOpt("meshSizeX", dp), this.getOpt("meshSizeY", dp), this.getOpt("meshSizeZ", dp));
			var mat = this.getOpt('material').clone();
			return new THREE.Mesh(geo, mat);
		}
	}]);

	return MeshEmbedding;
}(Embedding);

/**
 * Base class for embedding backed by a Points object (i.e., particle clouds)
 */


var PointsEmbedding = exports.PointsEmbedding = function (_Embedding2) {
	_inherits(PointsEmbedding, _Embedding2);

	function PointsEmbedding(scene, dataset) {
		var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

		_classCallCheck(this, PointsEmbedding);

		options = (0, _objectAssign2.default)({
			pointType: "ball",
			pointSize: 0.2,
			pointColor: 0xffffff
		}, options);

		// TODO base64 encode and read from string
		var _this2 = _possibleConstructorReturn(this, (PointsEmbedding.__proto__ || Object.getPrototypeOf(PointsEmbedding)).call(this, scene, dataset, options));

		var sprite = new THREE.TextureLoader().load("https://rawgit.com/beaucronin/embedding/master/static/sprites/ball.png");
		var materialProps = {
			size: _this2.getOpt("pointSize"),
			sizeAttenuation: true,
			map: sprite,
			color: _this2.getOpt("pointColor"),
			alphaTest: 0.5,
			transparent: true
		};
		_this2.points = new THREE.Points(new THREE.Geometry(), new THREE.PointsMaterial(materialProps));
		_this2.points.geometry.vertices.push(new THREE.Vector3(0, 0, 0));
		_this2.obj3D.add(_this2.points);
		return _this2;
	}

	return PointsEmbedding;
}(Embedding);

/**
 * An embedding in which each datapoint is rendered as a vertex in a THREE.Points object.
 */


var ScatterEmbedding = exports.ScatterEmbedding = function (_PointsEmbedding) {
	_inherits(ScatterEmbedding, _PointsEmbedding);

	function ScatterEmbedding(scene, dataset) {
		var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

		_classCallCheck(this, ScatterEmbedding);

		options = (0, _objectAssign2.default)({
			bufferSize: 1000,
			moveSpeed: 2,
			autoScale: false,
			autoScaleRange: 10
		}, options);

		// mapping from datapoint ids to vertex indices
		var _this3 = _possibleConstructorReturn(this, (ScatterEmbedding.__proto__ || Object.getPrototypeOf(ScatterEmbedding)).call(this, scene, dataset, options));

		_this3.dpMap = {};

		// unallocated vertices 
		_this3.freeVertices = [];

		// initialize vertices and mark them as unallocated
		for (var i = 0; i < _this3.getOpt("bufferSize"); i++) {
			_this3.points.geometry.vertices.push(new THREE.Vector3(-1000000, -1000000, -1000000));
			_this3.freeVertices.push(i);
		}

		// create rescaling
		if (_this3.getOpt("autoScale")) {
			_this3._initAutoScale(_this3.getOpt("autoScaleRange"));
			console.log(_this3.rescale);
		} else if (_this3.getOpt("rescale")) {
			// TODO
		} else {
			_this3.rescale = new Rescaling();
		}

		_this3.tweens = {};
		return _this3;
	}

	_createClass(ScatterEmbedding, [{
		key: '_initAutoScale',
		value: function _initAutoScale(range) {
			var _this4 = this;

			var dps = this.dataset.getIds().map(function (id) {
				return _this4.dataset.get(id);
			});
			var xmin = Math.min.apply(Math, dps.map(function (dp) {
				return dp.get(_this4._mapAttr('x'));
			}));
			var xmax = Math.max.apply(Math, dps.map(function (dp) {
				return dp.get(_this4._mapAttr('x'));
			}));
			var ymin = Math.min.apply(Math, dps.map(function (dp) {
				return dp.get(_this4._mapAttr('y'));
			}));
			var ymax = Math.max.apply(Math, dps.map(function (dp) {
				return dp.get(_this4._mapAttr('y'));
			}));
			var zmin = Math.min.apply(Math, dps.map(function (dp) {
				return dp.get(_this4._mapAttr('z'));
			}));
			var zmax = Math.max.apply(Math, dps.map(function (dp) {
				return dp.get(_this4._mapAttr('z'));
			}));
			this.rescale = new Rescaling(-(xmax + xmin) / 2, -(ymax + ymin) / 2, -(zmax + zmin) / 2, range / (xmax - xmin), range / (ymax - ymin), range / (zmax - zmin));
		}
	}, {
		key: 'embed',
		value: function embed() {
			if (!this.initialized) {
				// add all datapoints already in the dataset
				for (var id in this.dataset.datapoints) {
					this._placeDatapoint(id);
				}
				this.points.geometry.verticesNeedUpdate = true;
				this.initialized = true;
			} else {
				// process events sent by the dataset since last embed() call
				if (this.events.length > 0) {
					for (var i in this.events) {
						var e = this.events[i];
						if (e.type == "add") this._placeDatapoint(e.id);else if (e.type == "remove") this._removeDatapoint(e.id);else if (e.type == "update") this._updateDatapoint(e.id, e);
					}
					// console.log("calling vertices update");
					this.points.geometry.verticesNeedUpdate = true;
				}
				this.events = [];
			}
		}
	}, {
		key: '_placeDatapoint',
		value: function _placeDatapoint(id) {
			var vi = this.freeVertices.pop();
			if (vi != undefined) {
				var dp = this.dataset.datapoints[id];
				if (!dp) return;
				this.points.geometry.vertices[vi].set(this.rescale.scaleX(this._map(dp, 'x')), this.rescale.scaleY(this._map(dp, 'y')), this.rescale.scaleZ(this._map(dp, 'z')));
				this.dpMap[id] = vi;
			} else {
				console.warn('Vertex buffer size exceeded');
			}
		}
	}, {
		key: '_removeDatapoint',
		value: function _removeDatapoint(id) {
			var vi = this.dpMap[id];
			if (vi != undefined) {
				this.points.geometry.vertices[vi].set(-1000000, -1000000, -1000000);
				delete this.dpMap[id];
				this.freeVertices.push(vi);
			}
		}
	}, {
		key: '_updateDatapoint',
		value: function _updateDatapoint(id, event) {
			var _this5 = this;

			var vi = this.dpMap[id];
			if (vi != undefined) {
				var geo;
				var obj;

				var _ret = function () {
					var dp = _this5.dataset.datapoints[id];
					if (!dp) return {
							v: void 0
						};
					// TODO other attributes beside position
					var v = _this5.points.geometry.vertices[vi];

					var start = { x: v.x, y: v.y, z: v.z };
					var end = {
						x: _this5.rescale.scaleX(_this5._map(dp, 'x')),
						y: _this5.rescale.scaleY(_this5._map(dp, 'y')),
						z: _this5.rescale.scaleZ(_this5._map(dp, 'z'))
					};
					var d = new THREE.Vector3(start.x, start.y, start.z).sub(new THREE.Vector3(end.x, end.y, end.z)).length();
					var t = 1000 * d / _this5.getOpt("moveSpeed", dp);

					geo = _this5.points.geometry;
					obj = _this5;

					if (_this5.tweens[vi]) {
						_this5.tweens[vi].stop();
						delete _this5.tweens[vi];
					}

					var tween = new _tween2.default.Tween(start).to(end, t).onUpdate(function () {
						v.set(this.x, this.y, this.z);
						geo.verticesNeedUpdate = true;
					}).onComplete(function () {
						return delete obj.tweens[id];
					}).onStop(function () {
						return delete obj.tweens[id];
					}).easing(_tween2.default.Easing.Exponential.InOut).start();
					_this5.tweens[vi] = tween;
				}();

				if ((typeof _ret === 'undefined' ? 'undefined' : _typeof(_ret)) === "object") return _ret.v;
			}
		}
	}]);

	return ScatterEmbedding;
}(PointsEmbedding);

/**
 * A {MeshEmbedding} in which each {Datapoint} is rendered as a Mesh that follows a
 * path defined by waypoints.
 */


var PathEmbedding = exports.PathEmbedding = function (_MeshEmbedding) {
	_inherits(PathEmbedding, _MeshEmbedding);

	function PathEmbedding(scene, dataset, waypoints, options) {
		_classCallCheck(this, PathEmbedding);

		options = (0, _objectAssign2.default)({
			meshSizeX: .2,
			meshSizeY: .2,
			meshSizeZ: .2,
			pathWidthX: 0,
			pathWidthY: 0,
			pathWidthZ: 0,
			description: '',
			removeAfter: true,
			pathTime: 10000
		}, options);

		var _this6 = _possibleConstructorReturn(this, (PathEmbedding.__proto__ || Object.getPrototypeOf(PathEmbedding)).call(this, scene, dataset, options));

		_this6.waypoints = waypoints.map(function (x) {
			return new THREE.Vector3(x[0], x[1], x[2]);
		});

		// mapping from datapoint ids to meshes
		_this6.dpMap = {};
		_this6.meshOffsets = {};
		_this6.tweens = {};
		return _this6;
	}

	_createClass(PathEmbedding, [{
		key: 'embed',
		value: function embed() {
			// note: ignore datapoints that are already present in the dataset

			// process events sent by the dataset since last embed() call
			if (this.events.length > 0) {
				for (var i in this.events) {
					var e = this.events[i];
					if (e.type == "add") this._placeDatapoint(e.id);else if (e.type == "remove") this._removeDatapoint(e.id);else if (e.type == "update") this._updateDatapoint(e.id, e);
				}
			}
			this.events = [];
		}
	}, {
		key: '_createMeshOffset',
		value: function _createMeshOffset(id) {
			var pwx = this.getOpt('pathWidthX');
			var pwy = this.getOpt('pathWidthY');
			var pwz = this.getOpt('pathWidthZ');
			var ox = pwx * Math.random() - pwx / 2;
			var oy = pwy * Math.random() - pwy / 2;
			var oz = pwz * Math.random() - pwz / 2;
			this.meshOffsets[id] = new THREE.Vector3(ox, oy, oz);
		}
	}, {
		key: '_placeDatapoint',
		value: function _placeDatapoint(id) {
			var dp = this.dataset.datapoints[id];
			var mesh = this.createMeshForDatapoint(dp);
			this._createMeshOffset(id);
			mesh.userData.description = this.getOpt("description", dp);
			this.dpMap[id] = mesh;
			this.obj3D.add(mesh);
			THREE.input.add(mesh);

			// create path tween
			var start = { x: this.waypoints[0].x, y: this.waypoints[0].y, z: this.waypoints[0].z };
			var end = {
				x: this.waypoints.slice(1).map(function (a) {
					return a.x;
				}),
				y: this.waypoints.slice(1).map(function (a) {
					return a.y;
				}),
				z: this.waypoints.slice(1).map(function (a) {
					return a.z;
				})
			};
			var t = this.getOpt("pathTime");
			var obj = this;
			var tween = new _tween2.default.Tween(start).to(end, t).interpolation(_tween2.default.Interpolation.CatmullRom).onUpdate(function () {
				// keep the x-axis of the mesh tangent to the path as it moves
				var oldPos = mesh.position.clone();
				var newPos = new THREE.Vector3(this.x, this.y, this.z);
				var dir = newPos.sub(oldPos).normalize();
				var axis = new THREE.Vector3(1, 0, 0);
				var offset = obj.meshOffsets[id];
				mesh.position.set(this.x + offset.x, this.y + offset.y, this.z + offset.z);
				// mesh.position.set(this.x, this.y, this.z);
				mesh.quaternion.setFromUnitVectors(axis, dir);
			}).onComplete(function () {
				delete obj.tweens[id];
				if (obj.getOpt("removeAfter")) obj.obj3D.remove(mesh);
			}).onStop(function () {
				return delete obj.tweens[id];
			}).start();
			this.tweens[id] = tween;
		}
	}, {
		key: '_removeDatapoint',
		value: function _removeDatapoint(id) {
			if (this.tweens[id]) this.tweens[id].stop();
			var mesh = this.dpMap[id];
			if (mesh) this.obj3D.remove(mesh);
		}
	}, {
		key: '_updateDatapoint',
		value: function _updateDatapoint(id, event) {
			// TODO implement
		}
	}]);

	return PathEmbedding;
}(MeshEmbedding);

var ConsoleEmbedding = exports.ConsoleEmbedding = function (_Embedding3) {
	_inherits(ConsoleEmbedding, _Embedding3);

	function ConsoleEmbedding(scene, dataset) {
		var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

		_classCallCheck(this, ConsoleEmbedding);

		options = (0, _objectAssign2.default)({
			font: "Bold 24px Arial",
			fillStyle: "rgba(255,0,0,0.95)"
		}, options);

		var _this7 = _possibleConstructorReturn(this, (ConsoleEmbedding.__proto__ || Object.getPrototypeOf(ConsoleEmbedding)).call(this, scene, dataset, options));

		_this7.canvas = document.createElement('canvas');
		_this7.canvas.width = 256;
		_this7.canvas.height = 128;
		_this7.context = _this7.canvas.getContext('2d');
		_this7.context.font = _this7.getOpt('font');
		_this7.context.fillStyle = _this7.getOpt('fillStyle');
		_this7.mesh = undefined;
		return _this7;
	}

	_createClass(ConsoleEmbedding, [{
		key: 'setText',
		value: function setText(text) {
			if (this.mesh) this.obj3D.remove(this.mesh);

			this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.context.fillText(text, 0, 25);
			var texture = new THREE.Texture(this.canvas);
			texture.needsUpdate = true;
			var material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
			material.transparent = true;
			this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.canvas.width * .1, this.canvas.height * .1), material);
			this.mesh.position.set(this.getOpt('x'), this.getOpt('y'), this.getOpt('z'));
			this.obj3D.add(this.mesh);
		}
	}]);

	return ConsoleEmbedding;
}(Embedding);

var AggregateEmbedding = exports.AggregateEmbedding = function (_Embedding4) {
	_inherits(AggregateEmbedding, _Embedding4);

	function AggregateEmbedding() {
		_classCallCheck(this, AggregateEmbedding);

		return _possibleConstructorReturn(this, (AggregateEmbedding.__proto__ || Object.getPrototypeOf(AggregateEmbedding)).apply(this, arguments));
	}

	return AggregateEmbedding;
}(Embedding);

var Rescaling = function () {
	function Rescaling() {
		var xo = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
		var yo = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
		var zo = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
		var xs = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 1;
		var ys = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 1;
		var zs = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 1;

		_classCallCheck(this, Rescaling);

		if (typeof xo == "number") {
			this.xo = xo;
			this.yo = yo;
			this.zo = zo;
			this.xs = xs;
			this.ys = ys;
			this.zs = zs;
		}
	}

	_createClass(Rescaling, [{
		key: 'scaleX',
		value: function scaleX(x) {
			return this.xs * (x + this.xo);
		}
	}, {
		key: 'scaleY',
		value: function scaleY(y) {
			return this.ys * (y + this.yo);
		}
	}, {
		key: 'scaleZ',
		value: function scaleZ(z) {
			return this.zs * (z + this.zo);
		}
	}]);

	return Rescaling;
}();

},{"object-assign":3,"tween.js":13}],17:[function(require,module,exports){
'use strict';

/**
 * @author Beau Cronin <beau.cronin@gmail.com>
 */

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.initScene = initScene;
exports.startAnimation = startAnimation;
exports.animate = animate;
exports.register = register;

var _rayInput = require('ray-input');

var _rayInput2 = _interopRequireDefault(_rayInput);

var _tween = require('tween.js');

var _tween2 = _interopRequireDefault(_tween);

var _queryString = require('query-string');

var _queryString2 = _interopRequireDefault(_queryString);

var _dataset = require('./dataset.js');

var _embedding = require('./embedding.js');

var _detectionUtils = require('./detection-utils.js');

var _utils = require('./utils.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var embeddings = [];
var lastRender = 0;
var vrDisplay;

/**
 * Convenience function to create a responsive THREE scene and related objects. Returns a number 
 * of objects that should probably be kept around by the enclosing script.
 */
function initScene() {
	var scene = new THREE.Scene();
	var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
	camera.position.z = 10;

	// The VRControls object updates the camera position in response to position and orientation
	// changes of the HMD.
	var cameraControls = new THREE.VRControls(camera);
	cameraControls.standing = true;

	// This renderer is the standard WebGL renderer; it may be further processed for VR use depending
	// on the mode selected by the webvr-boilerplate
	var renderer = new THREE.WebGLRenderer();
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setPixelRatio(window.devicePixelRatio);
	document.body.appendChild(renderer.domElement);

	// The VREffect is responsible for distorting the rendered image to match the optics of the HMD,
	// as well as rendering different, offset images for each eye
	var effect = new THREE.VREffect(renderer);
	effect.setSize(window.innerWidth, window.innerHeight);

	// The WebVRManager is provided by the webvr-boilerplate, and handles detection of display hardware
	// (desktop, mobile, VR) and switching between regular and VR modes
	var manager = new WebVRManager(renderer, effect);

	var onResize = function onResize(e) {
		effect.setSize(window.innerWidth, window.innerHeight);
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
	};

	window.addEventListener('resize', onResize, true);
	window.addEventListener('vrdisplaypresentchange', onResize, true);

	// TODO putting the input in the THREE global for now; probably want embeddings to fire 
	// events when meshes are added/removed rather than referencing the input directly
	THREE.input = new _rayInput2.default(camera, renderer.domElement);
	THREE.input.setSize(renderer.getSize());
	scene.add(THREE.input.getMesh());

	return { scene: scene, camera: camera, manager: manager, effect: effect, cameraControls: cameraControls };
}

function startAnimation() {
	// NOTE: assumes the webvr polyfill is present, so can count on a valid display
	navigator.getVRDisplays().then(function (displays) {
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
function animate(timestamp) {
	if (!timestamp) timestamp = Date.now();
	var delta = Math.min(timestamp - lastRender, 500);
	lastRender = timestamp;

	var _iteratorNormalCompletion = true;
	var _didIteratorError = false;
	var _iteratorError = undefined;

	try {
		for (var _iterator = embeddings[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
			var e = _step.value;

			e.embed();
		}
	} catch (err) {
		_didIteratorError = true;
		_iteratorError = err;
	} finally {
		try {
			if (!_iteratorNormalCompletion && _iterator.return) {
				_iterator.return();
			}
		} finally {
			if (_didIteratorError) {
				throw _iteratorError;
			}
		}
	}

	_tween2.default.update();
	THREE.input.update();
	cameraControls.update();
	manager.render(scene, camera, timestamp);

	vrDisplay.requestAnimationFrame(animate);
}

/**
 * Register an embedding so that it will be updated on each animation frame.
 * @param {Embedding} embedding - The embedding
 */
function register(embedding) {
	embeddings.push(embedding);
}

module.exports = {
	Dataset: _dataset.Dataset,
	WebSocketDataset: _dataset.WebSocketDataset,
	Embedding: _embedding.Embedding,
	MeshEmbedding: _embedding.MeshEmbedding,
	RandomEmbedding: _embedding.RandomEmbedding,
	ScatterEmbedding: _embedding.ScatterEmbedding,
	PathEmbedding: _embedding.PathEmbedding,
	ConsoleEmbedding: _embedding.ConsoleEmbedding,
	initScene: initScene,
	animate: animate,
	queryString: _queryString2.default,
	detectMode: _detectionUtils.detectMode,
	register: register,
	startAnimation: startAnimation,
	utils: {
		degToRad: _utils.degToRad,
		latLongToEuclidean: _utils.latLongToEuclidean,
		ajaxWithCallback: _utils.ajaxWithCallback
	}
};

},{"./dataset.js":14,"./detection-utils.js":15,"./embedding.js":16,"./utils.js":18,"query-string":5,"ray-input":9,"tween.js":13}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.normalPool = normalPool;
exports.normal = normal;
exports.degToRad = degToRad;
exports.latLongToEuclidean = latLongToEuclidean;
exports.ajaxWithCallback = ajaxWithCallback;

var _objectAssign = require('object-assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// from https://github.com/mock-end/random-normal
function normalPool(options) {

  var performanceCounter = 0;

  do {

    var idx = Math.round(normal({
      mean: options.mean,
      dev: options.dev
    }));

    if (idx < options.pool.length && idx >= 0) {
      return options.pool[idx];
    } else {
      performanceCounter++;
    }
  } while (performanceCounter < 100);
}

function normal(options) {

  options = (0, _objectAssign2.default)({ mean: 0, dev: 1, pool: [] }, options);

  // If a pool has been passed, then we are returning an item from that pool,
  // using the normal distribution settings that were passed in
  if (Array.isArray(options.pool) && options.pool.length > 0) {
    return normalPool(options);
  }

  // The Marsaglia Polar method
  var s;
  var u;
  var v;
  var norm;
  var mean = options.mean;
  var dev = options.dev;

  do {
    // U and V are from the uniform distribution on (-1, 1)
    u = Math.random() * 2 - 1;
    v = Math.random() * 2 - 1;

    s = u * u + v * v;
  } while (s >= 1);

  // Compute the standard normal variate
  norm = u * Math.sqrt(-2 * Math.log(s) / s);

  // Shape and scale
  return dev * norm + mean;
}

function degToRad(deg) {
  return deg * Math.PI / 180;
}

function latLongToEuclidean(lat, long) {
  var R = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
  var reverse = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;

  var radLat = degToRad(lat);
  var radLong = reverse ? degToRad(-long) : degToRad(long);
  var x = R * Math.cos(radLat) * Math.cos(radLong);
  var z = R * Math.cos(radLat) * Math.sin(radLong);
  var y = R * Math.sin(radLat);
  return { x: x, y: y, z: z };
}

function ajaxWithCallback(url, cb) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.send(null);
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status === 200) {
      cb(JSON.parse(xhr.responseText));
    }
  };
}

},{"object-assign":3}]},{},[17])(17)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy5udm0vdmVyc2lvbnMvbm9kZS92NC4zLjIvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi8ubnZtL3ZlcnNpb25zL25vZGUvdjQuMy4yL2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL2V2ZW50ZW1pdHRlcjMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvb2JqZWN0LWFzc2lnbi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9wYXBhcGFyc2UvcGFwYXBhcnNlLmpzIiwibm9kZV9tb2R1bGVzL3F1ZXJ5LXN0cmluZy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9xdWVyeS1zdHJpbmcvbm9kZV9tb2R1bGVzL3N0cmljdC11cmktZW5jb2RlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3JheS1pbnB1dC9zcmMvb3JpZW50YXRpb24tYXJtLW1vZGVsLmpzIiwibm9kZV9tb2R1bGVzL3JheS1pbnB1dC9zcmMvcmF5LWNvbnRyb2xsZXIuanMiLCJub2RlX21vZHVsZXMvcmF5LWlucHV0L3NyYy9yYXktaW5wdXQuanMiLCJub2RlX21vZHVsZXMvcmF5LWlucHV0L3NyYy9yYXktaW50ZXJhY3Rpb24tbW9kZXMuanMiLCJub2RlX21vZHVsZXMvcmF5LWlucHV0L3NyYy9yYXktcmVuZGVyZXIuanMiLCJub2RlX21vZHVsZXMvcmF5LWlucHV0L3NyYy91dGlsLmpzIiwibm9kZV9tb2R1bGVzL3R3ZWVuLmpzL3NyYy9Ud2Vlbi5qcyIsInNyYy9kYXRhc2V0LmpzIiwic3JjL2RldGVjdGlvbi11dGlscy5qcyIsInNyYy9lbWJlZGRpbmcuanMiLCJzcmMvbWFpbi5qcyIsInNyYy91dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7QUN0MkJBOzs7O0FBQ0E7Ozs7Ozs7Ozs7OztBQUVBOzs7SUFHYSxPLFdBQUEsTzs7QUFFWjs7O0FBR0Esb0JBQWM7QUFBQTs7QUFDYixPQUFLLFVBQUwsR0FBa0IsRUFBbEI7QUFDQSxPQUFLLFVBQUwsR0FBa0IsRUFBbEI7QUFDQTs7QUFFRDs7Ozs7OztBQU9BOzs7Ozs7Ozs7OztBQXNCQTs7OztzQkFJSSxTLEVBQVc7QUFDZCxPQUFJLENBQUo7QUFDQSxPQUFJLEVBQUcscUJBQXFCLFNBQXhCLENBQUosRUFBd0M7QUFDdkMsUUFBSSxJQUFJLFNBQUosQ0FBYyxTQUFkLENBQUo7QUFDQSxJQUZELE1BRU87QUFDTixRQUFJLFNBQUo7QUFDQTtBQUNELFFBQUssVUFBTCxDQUFnQixFQUFFLEVBQWxCLElBQXdCLENBQXhCO0FBQ0EsUUFBSyxpQkFBTCxDQUF1QixLQUF2QixFQUE4QixFQUFFLEVBQWhDO0FBQ0E7O0FBRUQ7Ozs7Ozs7eUJBSU8sRSxFQUFJO0FBQ1YsVUFBTyxLQUFLLFVBQUwsQ0FBZ0IsRUFBaEIsQ0FBUDtBQUNBLFFBQUssaUJBQUwsQ0FBdUIsUUFBdkIsRUFBaUMsRUFBakM7QUFDQTs7QUFFRDs7Ozs7Ozs7O3lCQU1PLEUsRUFBSSxDLEVBQUcsQyxFQUFHO0FBQ2hCLE9BQUksS0FBSyxLQUFLLFVBQUwsQ0FBZ0IsRUFBaEIsQ0FBVDtBQUNBLE9BQUksRUFBSixFQUFRO0FBQ1AsUUFBSSxNQUFNLEdBQUcsR0FBSCxDQUFPLENBQVAsQ0FBVjtBQUNBLE9BQUcsR0FBSCxDQUFPLENBQVAsRUFBVSxDQUFWO0FBQ0EsU0FBSyxpQkFBTCxDQUF1QixRQUF2QixFQUFpQyxFQUFqQyxFQUFxQyxDQUFyQyxFQUF3QyxDQUF4QyxFQUEyQyxHQUEzQztBQUNBO0FBQ0Q7OztzQkFFRyxFLEVBQUk7QUFBRSxVQUFPLEtBQUssVUFBTCxDQUFnQixFQUFoQixDQUFQO0FBQTZCOzs7MkJBRTlCO0FBQUUsVUFBTyxPQUFPLElBQVAsQ0FBWSxLQUFLLFVBQWpCLENBQVA7QUFBc0M7OzsyQkFFeEMsUyxFQUFXO0FBQ25CLFFBQUssVUFBTCxDQUFnQixJQUFoQixDQUFxQixTQUFyQjtBQUNBOzs7b0NBRWlCLEksRUFBTSxFLEVBQVU7QUFDakMsT0FBSSxNQUFNLEVBQUUsTUFBTSxJQUFSLEVBQWMsSUFBSSxFQUFsQixFQUFWO0FBQ0EsT0FBSSxRQUFRLFFBQVosRUFBc0I7QUFDckIsUUFBSSxJQUFKO0FBQ0EsUUFBSSxNQUFKO0FBQ0EsUUFBSSxNQUFKO0FBQ0E7QUFDRCxRQUFLLFVBQUwsQ0FBZ0IsT0FBaEIsQ0FBd0IsVUFBQyxDQUFEO0FBQUEsV0FBTyxFQUFFLE1BQUYsQ0FBVSxHQUFWLENBQVA7QUFBQSxJQUF4QjtBQUNBOzs7Z0NBeEVvQixHLEVBQUssUSxFQUFVO0FBQ25DLHVCQUFLLEtBQUwsQ0FBVyxHQUFYLEVBQWdCO0FBQ2YsY0FBVSxJQURLO0FBRWYsWUFBUSxJQUZPO0FBR2YsbUJBQWUsSUFIQTtBQUlmLGNBQVUsa0JBQVMsT0FBVCxFQUFrQjtBQUMzQixTQUFJLEtBQUssSUFBSSxPQUFKLEVBQVQ7QUFDQSxVQUFLLElBQUksQ0FBVCxJQUFjLFFBQVEsSUFBdEIsRUFBNEI7QUFDM0IsVUFBSSxLQUFLLFFBQVEsSUFBUixDQUFhLENBQWIsQ0FBVDtBQUNBLFNBQUcsR0FBSCxHQUFTLENBQVQ7QUFDQSxTQUFHLEdBQUgsQ0FBTyxFQUFQO0FBQ0E7QUFDRCxjQUFTLEVBQVQ7QUFDQTtBQVpjLElBQWhCO0FBY0E7Ozs7OztBQTRERjs7Ozs7SUFHYSxnQixXQUFBLGdCOzs7QUFDWiwyQkFBWSxHQUFaLEVBQStCO0FBQUEsTUFBZCxPQUFjLHVFQUFKLEVBQUk7O0FBQUE7O0FBQzlCLFlBQVUsNEJBQU8sRUFBQyxXQUFXLG1CQUFDLENBQUQ7QUFBQSxXQUFPLENBQVA7QUFBQSxJQUFaLEVBQXNCLE1BQU0sY0FBQyxDQUFELEVBQU8sQ0FBRSxDQUFyQyxFQUFQLEVBQStDLE9BQS9DLENBQVY7O0FBRDhCOztBQUc5QixRQUFLLE9BQUwsR0FBZSxPQUFmO0FBQ0EsUUFBSyxNQUFMLEdBQWMsSUFBSSxTQUFKLENBQWMsR0FBZCxDQUFkO0FBQ0EsUUFBSyxNQUFMLENBQVksTUFBWixHQUFxQjtBQUFBLFVBQU0sTUFBSyxPQUFMLENBQWEsSUFBYixDQUFrQixNQUFLLE1BQXZCLENBQU47QUFBQSxHQUFyQjtBQUNBLFFBQUssTUFBTCxDQUFZLFNBQVosR0FBd0IsVUFBUyxDQUFULEVBQVk7QUFDbkMsT0FBSSxJQUFJLEtBQUssT0FBTCxDQUFhLFNBQWIsQ0FBdUIsS0FBSyxLQUFMLENBQVcsRUFBRSxJQUFiLENBQXZCLENBQVI7QUFDQSxRQUFLLEdBQUwsQ0FBUyxDQUFUO0FBQ0EsR0FIdUIsQ0FHdEIsSUFIc0IsT0FBeEI7QUFOOEI7QUFVOUI7OztFQVhvQyxPOztJQWN6QixTLFdBQUEsUztBQUNaLG9CQUFZLE1BQVosRUFBdUM7QUFBQSxNQUFuQixXQUFtQix1RUFBUCxLQUFPOztBQUFBOztBQUN0QyxPQUFLLE1BQUwsR0FBYyxNQUFkO0FBQ0EsT0FBSyxXQUFMLEdBQW1CLFdBQW5CO0FBQ0E7Ozs7c0JBTUcsQyxFQUFHO0FBQUUsVUFBTyxLQUFLLE1BQUwsQ0FBWSxDQUFaLENBQVA7QUFBd0I7OztzQkFFN0IsQyxFQUFHLEMsRUFBRztBQUNULFFBQUssTUFBTCxDQUFZLENBQVosSUFBaUIsQ0FBakI7QUFDQTs7O3NCQVJRO0FBQ1IsVUFBTyxLQUFLLE1BQUwsQ0FBWSxLQUFLLFdBQWpCLENBQVA7QUFDQTs7Ozs7OztBQ2hJRjs7QUFFQTs7Ozs7UUE2RGdCLFUsR0FBQSxVO0FBM0RULElBQU0sd0NBQWdCO0FBQzVCLFVBQVMsaUJBRG1CO0FBRTVCLFNBQVEsZ0JBRm9CO0FBRzVCLEtBQUk7QUFId0IsQ0FBdEI7O0FBTUEsSUFBTSxvQ0FBYztBQUMxQixXQUFVLGdCQURnQjtBQUUxQixRQUFPLGFBRm1CO0FBRzFCLFVBQVMsZUFIaUI7QUFJMUIsVUFBUyxlQUppQjtBQUsxQixVQUFTO0FBTGlCLENBQXBCOztBQVFQO0FBQ0EsU0FBUyxRQUFULEdBQW9CO0FBQ2xCLEtBQUksUUFBUSxLQUFaO0FBQ0EsRUFBQyxVQUFTLENBQVQsRUFBVztBQUFDLE1BQUcsMlRBQTJULElBQTNULENBQWdVLENBQWhVLEtBQW9VLDBrREFBMGtELElBQTFrRCxDQUEra0QsRUFBRSxNQUFGLENBQVMsQ0FBVCxFQUFXLENBQVgsQ0FBL2tELENBQXZVLEVBQXE2RCxRQUFRLElBQVI7QUFBYSxFQUEvN0QsRUFBaThELFVBQVUsU0FBVixJQUFxQixVQUFVLE1BQS9CLElBQXVDLE9BQU8sS0FBLytEO0FBQ0EsUUFBTyxLQUFQO0FBQ0Q7O0FBRUQsU0FBUyxhQUFULEdBQXlCO0FBQ3hCLEtBQUksVUFBVSxhQUFkLEVBQTZCO0FBQzVCLFNBQU8sY0FBYyxFQUFyQjtBQUNBLEVBRkQsTUFFTztBQUNOLE1BQUksVUFBSixFQUNDLE9BQU8sY0FBYyxNQUFyQixDQURELEtBR0MsT0FBTyxjQUFjLE9BQXJCO0FBQ0Q7QUFDRDs7QUFFRCxTQUFTLFdBQVQsQ0FBcUIsV0FBckIsRUFBa0M7QUFDakMsS0FBSSxVQUFVLFNBQWQ7QUFDQSxLQUFJLFVBQVUsV0FBZCxFQUEyQjtBQUMxQixNQUFJLFdBQVcsVUFBVSxXQUFWLEVBQWY7QUFEMEI7QUFBQTtBQUFBOztBQUFBO0FBRTFCLHdCQUFvQixRQUFwQiw4SEFBOEI7QUFBQSxRQUFyQixRQUFxQjs7QUFDN0IsUUFBSSxZQUFXLFNBQVEsSUFBdkIsRUFBNkI7QUFDNUIsU0FBSSxTQUFRLElBQVIsQ0FBYSxXQUFqQixFQUNDLE9BQU8sWUFBWSxPQUFuQixDQURELEtBRUssSUFBSSxTQUFRLElBQVIsQ0FBYSxjQUFqQixFQUNKLE9BQU8sWUFBWSxPQUFuQjtBQUNEO0FBQ0Q7QUFUeUI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQVUxQjs7QUFFRDtBQUNBLEtBQUksVUFBSixFQUFnQjtBQUNmLE1BQUksZUFBZSxjQUFjLEVBQWpDLEVBQ0MsT0FBTyxZQUFZLE9BQW5CLENBREQsS0FHQyxPQUFPLFlBQVksS0FBbkI7QUFDRCxFQUxELE1BS087QUFDTixTQUFPLFlBQVksUUFBbkI7QUFDQTs7QUFFRCxRQUFPLFlBQVksS0FBbkI7QUFDQTs7QUFFTSxTQUFTLFVBQVQsR0FBc0I7QUFDNUIsS0FBTSxjQUFjLGVBQXBCO0FBQ0EsS0FBTSxZQUFZLFlBQVksV0FBWixDQUFsQjtBQUNBLFFBQU8sRUFBRSx3QkFBRixFQUFlLG9CQUFmLEVBQVA7QUFDQTs7Ozs7Ozs7Ozs7Ozs7QUNuRUQ7Ozs7QUFDQTs7Ozs7Ozs7Ozs7O0FBRUE7OztJQUdhLFMsV0FBQSxTO0FBQ1o7Ozs7Ozs7Ozs7Ozs7Ozs7QUFnQkEsb0JBQVksS0FBWixFQUFtQixPQUFuQixFQUEwQztBQUFBLE1BQWQsT0FBYyx1RUFBSixFQUFJOztBQUFBOztBQUN6QyxPQUFLLE9BQUwsR0FBZSxPQUFmO0FBQ0EsTUFBSSxPQUFKLEVBQWEsUUFBUSxRQUFSLENBQWlCLElBQWpCO0FBQ2IsT0FBSyxLQUFMLEdBQWEsSUFBSSxNQUFNLFFBQVYsRUFBYjtBQUNBLFFBQU0sR0FBTixDQUFVLEtBQUssS0FBZjtBQUNBLE9BQUssV0FBTCxHQUFtQixLQUFuQjtBQUNBLE9BQUssTUFBTCxHQUFjLEVBQWQ7O0FBRUE7QUFDQSxZQUFVLDRCQUFPLEVBQUUsR0FBRyxDQUFMLEVBQVEsR0FBRyxDQUFYLEVBQWMsR0FBRyxDQUFqQixFQUFQLEVBQTZCLE9BQTdCLENBQVY7QUFDQSxZQUFVLDRCQUFPLEVBQUUsSUFBRyxDQUFMLEVBQVEsSUFBRyxDQUFYLEVBQWMsSUFBRyxDQUFqQixFQUFQLEVBQTZCLE9BQTdCLENBQVY7QUFDQSxZQUFVLDRCQUFPLEVBQUUsSUFBRyxDQUFMLEVBQVEsSUFBRyxDQUFYLEVBQWMsSUFBRyxDQUFqQixFQUFQLEVBQTZCLE9BQTdCLENBQVY7QUFDQSxZQUFVLDRCQUFPLEVBQUUsU0FBUyxFQUFYLEVBQVAsRUFBd0IsT0FBeEIsQ0FBVjtBQUNBLE9BQUssT0FBTCxHQUFlLE9BQWY7QUFDQSxPQUFLLEtBQUwsQ0FBVyxRQUFYLENBQW9CLEdBQXBCLENBQXdCLFFBQVEsQ0FBaEMsRUFBbUMsUUFBUSxDQUEzQyxFQUE4QyxRQUFRLENBQXREO0FBQ0EsT0FBSyxLQUFMLENBQVcsUUFBWCxDQUFvQixHQUFwQixDQUF3QixRQUFRLEVBQWhDLEVBQW9DLFFBQVEsRUFBNUMsRUFBZ0QsUUFBUSxFQUF4RDtBQUNBLE9BQUssS0FBTCxDQUFXLEtBQVgsQ0FBaUIsR0FBakIsQ0FBcUIsUUFBUSxFQUE3QixFQUFpQyxRQUFRLEVBQXpDLEVBQTZDLFFBQVEsRUFBckQ7QUFDQTtBQUNBLE9BQUssT0FBTCxHQUFlLEtBQUssT0FBTCxDQUFhLE9BQTVCO0FBQ0E7O0FBRUQ7Ozs7Ozs7O3VCQUlLLEUsRUFBSSxHLEVBQUs7QUFDYixPQUFJLE1BQU0sS0FBSyxPQUFMLENBQWEsR0FBYixDQUFWO0FBQ0EsVUFBTyxNQUFNLEdBQUcsR0FBSCxDQUFPLEdBQVAsQ0FBTixHQUFvQixHQUFHLEdBQUgsQ0FBTyxHQUFQLENBQTNCO0FBQ0E7O0FBRUQ7Ozs7Ozs7MkJBSVMsRyxFQUFLO0FBQ2IsT0FBSSxNQUFNLEtBQUssT0FBTCxDQUFhLEdBQWIsQ0FBVjtBQUNBLFVBQU8sTUFBTSxHQUFOLEdBQVksR0FBbkI7QUFDQTs7QUFFRDs7Ozs7OzswQkFJUTtBQUNQO0FBQ0E7Ozt5QkFFTSxLLEVBQU87QUFDYixRQUFLLE1BQUwsQ0FBWSxJQUFaLENBQWlCLEtBQWpCO0FBQ0E7Ozt5QkFFTSxDLEVBQWM7QUFBQSxPQUFYLEVBQVcsdUVBQU4sSUFBTTs7QUFDcEIsT0FBSSxJQUFJLEtBQUssT0FBTCxDQUFhLENBQWIsQ0FBUjtBQUNBLE9BQUksT0FBTyxDQUFQLElBQWEsVUFBakIsRUFBNkIsT0FBTyxFQUFFLEVBQUYsQ0FBUCxDQUE3QixLQUNLLE9BQU8sQ0FBUDtBQUNMOzs7Ozs7QUFHRjs7Ozs7SUFHYSxhLFdBQUEsYTs7O0FBQ1osd0JBQVksS0FBWixFQUFtQixPQUFuQixFQUF3QztBQUFBLE1BQVosT0FBWSx1RUFBSixFQUFJOztBQUFBOztBQUN2QyxZQUFVLDRCQUNUO0FBQ0MsYUFBVSxJQUFJLE1BQU0sb0JBQVYsQ0FBZ0M7QUFDekMsV0FBTyxRQURrQztBQUV6QyxjQUFVLFFBRitCO0FBR3pDLFVBQU0sTUFBTSxVQUg2QjtBQUl6QyxhQUFTLE1BQU07QUFKMEIsSUFBaEM7QUFEWCxHQURTLEVBUU4sT0FSTSxDQUFWO0FBRHVDLHVIQVVqQyxLQVZpQyxFQVUxQixPQVYwQixFQVVqQixPQVZpQjtBQVd2Qzs7QUFHRDs7Ozs7Ozt5Q0FHdUIsRSxFQUFJO0FBQzFCLE9BQUksTUFBTSxJQUFJLE1BQU0sV0FBVixDQUNULEtBQUssTUFBTCxDQUFZLFdBQVosRUFBeUIsRUFBekIsQ0FEUyxFQUNxQixLQUFLLE1BQUwsQ0FBWSxXQUFaLEVBQXlCLEVBQXpCLENBRHJCLEVBQ21ELEtBQUssTUFBTCxDQUFZLFdBQVosRUFBeUIsRUFBekIsQ0FEbkQsQ0FBVjtBQUVBLE9BQUksTUFBTSxLQUFLLE1BQUwsQ0FBWSxVQUFaLEVBQXdCLEtBQXhCLEVBQVY7QUFDQSxVQUFPLElBQUksTUFBTSxJQUFWLENBQWUsR0FBZixFQUFvQixHQUFwQixDQUFQO0FBQ0E7Ozs7RUF2QmlDLFM7O0FBMEJuQzs7Ozs7SUFHYSxlLFdBQUEsZTs7O0FBQ1osMEJBQVksS0FBWixFQUFtQixPQUFuQixFQUF3QztBQUFBLE1BQVosT0FBWSx1RUFBSixFQUFJOztBQUFBOztBQUN2QyxZQUFVLDRCQUNUO0FBQ0MsY0FBVyxNQURaO0FBRUMsY0FBVyxHQUZaO0FBR0MsZUFBWTtBQUhiLEdBRFMsRUFLTixPQUxNLENBQVY7O0FBUUE7QUFUdUMsaUlBT2pDLEtBUGlDLEVBTzFCLE9BUDBCLEVBT2pCLE9BUGlCOztBQVV2QyxNQUFJLFNBQVMsSUFBSSxNQUFNLGFBQVYsR0FBMEIsSUFBMUIsQ0FDWix3RUFEWSxDQUFiO0FBRUEsTUFBSSxnQkFBZ0I7QUFDbkIsU0FBTSxPQUFLLE1BQUwsQ0FBWSxXQUFaLENBRGE7QUFFbkIsb0JBQWlCLElBRkU7QUFHbkIsUUFBSyxNQUhjO0FBSW5CLFVBQU8sT0FBSyxNQUFMLENBQVksWUFBWixDQUpZO0FBS25CLGNBQVcsR0FMUTtBQU1uQixnQkFBYTtBQU5NLEdBQXBCO0FBUUEsU0FBSyxNQUFMLEdBQWMsSUFBSSxNQUFNLE1BQVYsQ0FDYixJQUFJLE1BQU0sUUFBVixFQURhLEVBQ1MsSUFBSSxNQUFNLGNBQVYsQ0FBeUIsYUFBekIsQ0FEVCxDQUFkO0FBRUEsU0FBSyxNQUFMLENBQVksUUFBWixDQUFxQixRQUFyQixDQUE4QixJQUE5QixDQUFtQyxJQUFJLE1BQU0sT0FBVixDQUFrQixDQUFsQixFQUFvQixDQUFwQixFQUFzQixDQUF0QixDQUFuQztBQUNBLFNBQUssS0FBTCxDQUFXLEdBQVgsQ0FBZSxPQUFLLE1BQXBCO0FBdkJ1QztBQXdCdkM7OztFQXpCbUMsUzs7QUE0QnJDOzs7OztJQUdhLGdCLFdBQUEsZ0I7OztBQUNaLDJCQUFZLEtBQVosRUFBbUIsT0FBbkIsRUFBd0M7QUFBQSxNQUFaLE9BQVksdUVBQUosRUFBSTs7QUFBQTs7QUFDdkMsWUFBVSw0QkFDVDtBQUNDLGVBQVksSUFEYjtBQUVDLGNBQVcsQ0FGWjtBQUdDLGNBQVcsS0FIWjtBQUlDLG1CQUFnQjtBQUpqQixHQURTLEVBTU4sT0FOTSxDQUFWOztBQVNBO0FBVnVDLG1JQVFqQyxLQVJpQyxFQVExQixPQVIwQixFQVFqQixPQVJpQjs7QUFXdkMsU0FBSyxLQUFMLEdBQWEsRUFBYjs7QUFFQTtBQUNBLFNBQUssWUFBTCxHQUFvQixFQUFwQjs7QUFFQTtBQUNBLE9BQUssSUFBSSxJQUFJLENBQWIsRUFBZ0IsSUFBSSxPQUFLLE1BQUwsQ0FBWSxZQUFaLENBQXBCLEVBQStDLEdBQS9DLEVBQW9EO0FBQ25ELFVBQUssTUFBTCxDQUFZLFFBQVosQ0FBcUIsUUFBckIsQ0FBOEIsSUFBOUIsQ0FDQyxJQUFJLE1BQU0sT0FBVixDQUFrQixDQUFDLE9BQW5CLEVBQTRCLENBQUMsT0FBN0IsRUFBc0MsQ0FBQyxPQUF2QyxDQUREO0FBRUEsVUFBSyxZQUFMLENBQWtCLElBQWxCLENBQXVCLENBQXZCO0FBQ0E7O0FBRUQ7QUFDQSxNQUFJLE9BQUssTUFBTCxDQUFZLFdBQVosQ0FBSixFQUE4QjtBQUM3QixVQUFLLGNBQUwsQ0FBb0IsT0FBSyxNQUFMLENBQVksZ0JBQVosQ0FBcEI7QUFDQSxXQUFRLEdBQVIsQ0FBWSxPQUFLLE9BQWpCO0FBQ0EsR0FIRCxNQUdPLElBQUksT0FBSyxNQUFMLENBQVksU0FBWixDQUFKLEVBQTRCO0FBQ2xDO0FBQ0EsR0FGTSxNQUVBO0FBQ04sVUFBSyxPQUFMLEdBQWUsSUFBSSxTQUFKLEVBQWY7QUFDQTs7QUFFRCxTQUFLLE1BQUwsR0FBYyxFQUFkO0FBakN1QztBQWtDdkM7Ozs7aUNBRWMsSyxFQUFPO0FBQUE7O0FBQ3JCLE9BQUksTUFBTSxLQUFLLE9BQUwsQ0FBYSxNQUFiLEdBQXNCLEdBQXRCLENBQTBCLFVBQUMsRUFBRDtBQUFBLFdBQVEsT0FBSyxPQUFMLENBQWEsR0FBYixDQUFpQixFQUFqQixDQUFSO0FBQUEsSUFBMUIsQ0FBVjtBQUNBLE9BQUksT0FBTyxLQUFLLEdBQUwsQ0FBUyxLQUFULENBQWUsSUFBZixFQUFxQixJQUFJLEdBQUosQ0FBUSxVQUFDLEVBQUQ7QUFBQSxXQUFRLEdBQUcsR0FBSCxDQUFPLE9BQUssUUFBTCxDQUFjLEdBQWQsQ0FBUCxDQUFSO0FBQUEsSUFBUixDQUFyQixDQUFYO0FBQ0EsT0FBSSxPQUFPLEtBQUssR0FBTCxDQUFTLEtBQVQsQ0FBZSxJQUFmLEVBQXFCLElBQUksR0FBSixDQUFRLFVBQUMsRUFBRDtBQUFBLFdBQVEsR0FBRyxHQUFILENBQU8sT0FBSyxRQUFMLENBQWMsR0FBZCxDQUFQLENBQVI7QUFBQSxJQUFSLENBQXJCLENBQVg7QUFDQSxPQUFJLE9BQU8sS0FBSyxHQUFMLENBQVMsS0FBVCxDQUFlLElBQWYsRUFBcUIsSUFBSSxHQUFKLENBQVEsVUFBQyxFQUFEO0FBQUEsV0FBUSxHQUFHLEdBQUgsQ0FBTyxPQUFLLFFBQUwsQ0FBYyxHQUFkLENBQVAsQ0FBUjtBQUFBLElBQVIsQ0FBckIsQ0FBWDtBQUNBLE9BQUksT0FBTyxLQUFLLEdBQUwsQ0FBUyxLQUFULENBQWUsSUFBZixFQUFxQixJQUFJLEdBQUosQ0FBUSxVQUFDLEVBQUQ7QUFBQSxXQUFRLEdBQUcsR0FBSCxDQUFPLE9BQUssUUFBTCxDQUFjLEdBQWQsQ0FBUCxDQUFSO0FBQUEsSUFBUixDQUFyQixDQUFYO0FBQ0EsT0FBSSxPQUFPLEtBQUssR0FBTCxDQUFTLEtBQVQsQ0FBZSxJQUFmLEVBQXFCLElBQUksR0FBSixDQUFRLFVBQUMsRUFBRDtBQUFBLFdBQVEsR0FBRyxHQUFILENBQU8sT0FBSyxRQUFMLENBQWMsR0FBZCxDQUFQLENBQVI7QUFBQSxJQUFSLENBQXJCLENBQVg7QUFDQSxPQUFJLE9BQU8sS0FBSyxHQUFMLENBQVMsS0FBVCxDQUFlLElBQWYsRUFBcUIsSUFBSSxHQUFKLENBQVEsVUFBQyxFQUFEO0FBQUEsV0FBUSxHQUFHLEdBQUgsQ0FBTyxPQUFLLFFBQUwsQ0FBYyxHQUFkLENBQVAsQ0FBUjtBQUFBLElBQVIsQ0FBckIsQ0FBWDtBQUNBLFFBQUssT0FBTCxHQUFlLElBQUksU0FBSixDQUNkLEVBQUcsT0FBTyxJQUFWLElBQWtCLENBREosRUFFZCxFQUFHLE9BQU8sSUFBVixJQUFrQixDQUZKLEVBR2QsRUFBRyxPQUFPLElBQVYsSUFBa0IsQ0FISixFQUlkLFNBQVMsT0FBTyxJQUFoQixDQUpjLEVBS2QsU0FBUyxPQUFPLElBQWhCLENBTGMsRUFNZCxTQUFTLE9BQU8sSUFBaEIsQ0FOYyxDQUFmO0FBUUE7OzswQkFFTztBQUNQLE9BQUksQ0FBRSxLQUFLLFdBQVgsRUFBd0I7QUFDdkI7QUFDQSxTQUFLLElBQUksRUFBVCxJQUFlLEtBQUssT0FBTCxDQUFhLFVBQTVCLEVBQXdDO0FBQ3ZDLFVBQUssZUFBTCxDQUFxQixFQUFyQjtBQUNBO0FBQ0QsU0FBSyxNQUFMLENBQVksUUFBWixDQUFxQixrQkFBckIsR0FBMEMsSUFBMUM7QUFDQSxTQUFLLFdBQUwsR0FBbUIsSUFBbkI7QUFDQSxJQVBELE1BT087QUFDTjtBQUNBLFFBQUksS0FBSyxNQUFMLENBQVksTUFBWixHQUFxQixDQUF6QixFQUE0QjtBQUMzQixVQUFLLElBQUksQ0FBVCxJQUFjLEtBQUssTUFBbkIsRUFBMkI7QUFDMUIsVUFBSSxJQUFJLEtBQUssTUFBTCxDQUFZLENBQVosQ0FBUjtBQUNBLFVBQVMsRUFBRSxJQUFGLElBQVUsS0FBbkIsRUFBNkIsS0FBSyxlQUFMLENBQXFCLEVBQUUsRUFBdkIsRUFBN0IsS0FDSyxJQUFJLEVBQUUsSUFBRixJQUFVLFFBQWQsRUFBd0IsS0FBSyxnQkFBTCxDQUFzQixFQUFFLEVBQXhCLEVBQXhCLEtBQ0EsSUFBSSxFQUFFLElBQUYsSUFBVSxRQUFkLEVBQXdCLEtBQUssZ0JBQUwsQ0FBc0IsRUFBRSxFQUF4QixFQUE0QixDQUE1QjtBQUM3QjtBQUNEO0FBQ0EsVUFBSyxNQUFMLENBQVksUUFBWixDQUFxQixrQkFBckIsR0FBMEMsSUFBMUM7QUFDQTtBQUNELFNBQUssTUFBTCxHQUFjLEVBQWQ7QUFDQTtBQUNEOzs7a0NBRWUsRSxFQUFJO0FBQ25CLE9BQUksS0FBSyxLQUFLLFlBQUwsQ0FBa0IsR0FBbEIsRUFBVDtBQUNBLE9BQUksTUFBTSxTQUFWLEVBQXFCO0FBQ3BCLFFBQUksS0FBTSxLQUFLLE9BQUwsQ0FBYSxVQUFiLENBQXdCLEVBQXhCLENBQVY7QUFDQSxRQUFJLENBQUUsRUFBTixFQUFVO0FBQ1YsU0FBSyxNQUFMLENBQVksUUFBWixDQUFxQixRQUFyQixDQUE4QixFQUE5QixFQUFrQyxHQUFsQyxDQUNDLEtBQUssT0FBTCxDQUFhLE1BQWIsQ0FBb0IsS0FBSyxJQUFMLENBQVUsRUFBVixFQUFjLEdBQWQsQ0FBcEIsQ0FERCxFQUVDLEtBQUssT0FBTCxDQUFhLE1BQWIsQ0FBb0IsS0FBSyxJQUFMLENBQVUsRUFBVixFQUFjLEdBQWQsQ0FBcEIsQ0FGRCxFQUdDLEtBQUssT0FBTCxDQUFhLE1BQWIsQ0FBb0IsS0FBSyxJQUFMLENBQVUsRUFBVixFQUFjLEdBQWQsQ0FBcEIsQ0FIRDtBQUlBLFNBQUssS0FBTCxDQUFXLEVBQVgsSUFBaUIsRUFBakI7QUFDQSxJQVJELE1BUU87QUFDTixZQUFRLElBQVIsQ0FBYSw2QkFBYjtBQUNBO0FBQ0Q7OzttQ0FFZ0IsRSxFQUFJO0FBQ3BCLE9BQUksS0FBSyxLQUFLLEtBQUwsQ0FBVyxFQUFYLENBQVQ7QUFDQSxPQUFJLE1BQU0sU0FBVixFQUFxQjtBQUNwQixTQUFLLE1BQUwsQ0FBWSxRQUFaLENBQXFCLFFBQXJCLENBQThCLEVBQTlCLEVBQWtDLEdBQWxDLENBQXNDLENBQUMsT0FBdkMsRUFBZ0QsQ0FBQyxPQUFqRCxFQUEwRCxDQUFDLE9BQTNEO0FBQ0EsV0FBTyxLQUFLLEtBQUwsQ0FBVyxFQUFYLENBQVA7QUFDQSxTQUFLLFlBQUwsQ0FBa0IsSUFBbEIsQ0FBdUIsRUFBdkI7QUFDQTtBQUNEOzs7bUNBRWdCLEUsRUFBSSxLLEVBQU87QUFBQTs7QUFDM0IsT0FBSSxLQUFLLEtBQUssS0FBTCxDQUFXLEVBQVgsQ0FBVDtBQUNBLE9BQUksTUFBTSxTQUFWLEVBQXFCO0FBQUEsUUFpQmhCLEdBakJnQjtBQUFBLFFBa0JoQixHQWxCZ0I7O0FBQUE7QUFDcEIsU0FBSSxLQUFNLE9BQUssT0FBTCxDQUFhLFVBQWIsQ0FBd0IsRUFBeEIsQ0FBVjtBQUNBLFNBQUksQ0FBRSxFQUFOLEVBQVU7QUFBQTtBQUFBO0FBQ1Y7QUFDQSxTQUFJLElBQUksT0FBSyxNQUFMLENBQVksUUFBWixDQUFxQixRQUFyQixDQUE4QixFQUE5QixDQUFSOztBQUVBLFNBQUksUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFQLEVBQVUsR0FBRyxFQUFFLENBQWYsRUFBa0IsR0FBRyxFQUFFLENBQXZCLEVBQVo7QUFDQSxTQUFJLE1BQU07QUFDVCxTQUFHLE9BQUssT0FBTCxDQUFhLE1BQWIsQ0FBb0IsT0FBSyxJQUFMLENBQVUsRUFBVixFQUFjLEdBQWQsQ0FBcEIsQ0FETTtBQUVULFNBQUcsT0FBSyxPQUFMLENBQWEsTUFBYixDQUFvQixPQUFLLElBQUwsQ0FBVSxFQUFWLEVBQWMsR0FBZCxDQUFwQixDQUZNO0FBR1QsU0FBRyxPQUFLLE9BQUwsQ0FBYSxNQUFiLENBQW9CLE9BQUssSUFBTCxDQUFVLEVBQVYsRUFBYyxHQUFkLENBQXBCO0FBSE0sTUFBVjtBQUtBLFNBQUksSUFBSyxJQUFJLE1BQU0sT0FBVixDQUFrQixNQUFNLENBQXhCLEVBQTJCLE1BQU0sQ0FBakMsRUFBb0MsTUFBTSxDQUExQyxDQUFELENBQ04sR0FETSxDQUNGLElBQUksTUFBTSxPQUFWLENBQWtCLElBQUksQ0FBdEIsRUFBeUIsSUFBSSxDQUE3QixFQUFnQyxJQUFJLENBQXBDLENBREUsRUFFTixNQUZNLEVBQVI7QUFHQSxTQUFJLElBQUksT0FBTyxDQUFQLEdBQVcsT0FBSyxNQUFMLENBQVksV0FBWixFQUF5QixFQUF6QixDQUFuQjs7QUFFSSxXQUFNLE9BQUssTUFBTCxDQUFZLFFBakJGO0FBa0JoQixpQkFsQmdCOztBQW1CcEIsU0FBSSxPQUFLLE1BQUwsQ0FBWSxFQUFaLENBQUosRUFBcUI7QUFDcEIsYUFBSyxNQUFMLENBQVksRUFBWixFQUFnQixJQUFoQjtBQUNBLGFBQU8sT0FBSyxNQUFMLENBQVksRUFBWixDQUFQO0FBQ0E7O0FBRUQsU0FBSSxRQUFRLElBQUksZ0JBQU0sS0FBVixDQUFnQixLQUFoQixFQUNWLEVBRFUsQ0FDUCxHQURPLEVBQ0YsQ0FERSxFQUVWLFFBRlUsQ0FFRCxZQUFXO0FBQ3BCLFFBQUUsR0FBRixDQUFNLEtBQUssQ0FBWCxFQUFjLEtBQUssQ0FBbkIsRUFBc0IsS0FBSyxDQUEzQjtBQUNBLFVBQUksa0JBQUosR0FBeUIsSUFBekI7QUFDQSxNQUxVLEVBTVYsVUFOVSxDQU1DO0FBQUEsYUFBTSxPQUFPLElBQUksTUFBSixDQUFXLEVBQVgsQ0FBYjtBQUFBLE1BTkQsRUFPVixNQVBVLENBT0g7QUFBQSxhQUFNLE9BQU8sSUFBSSxNQUFKLENBQVcsRUFBWCxDQUFiO0FBQUEsTUFQRyxFQVFWLE1BUlUsQ0FRSCxnQkFBTSxNQUFOLENBQWEsV0FBYixDQUF5QixLQVJ0QixFQVNWLEtBVFUsRUFBWjtBQVVBLFlBQUssTUFBTCxDQUFZLEVBQVosSUFBa0IsS0FBbEI7QUFsQ29COztBQUFBO0FBbUNwQjtBQUNEOzs7O0VBN0lvQyxlOztBQWdKdEM7Ozs7OztJQUlhLGEsV0FBQSxhOzs7QUFDWix3QkFBWSxLQUFaLEVBQW1CLE9BQW5CLEVBQTRCLFNBQTVCLEVBQXVDLE9BQXZDLEVBQWdEO0FBQUE7O0FBQy9DLFlBQVUsNEJBQU87QUFDaEIsY0FBVyxFQURLO0FBRWhCLGNBQVcsRUFGSztBQUdoQixjQUFXLEVBSEs7QUFJaEIsZUFBWSxDQUpJO0FBS2hCLGVBQVksQ0FMSTtBQU1oQixlQUFZLENBTkk7QUFPaEIsZ0JBQWEsRUFQRztBQVFoQixnQkFBYSxJQVJHO0FBU2hCLGFBQVU7QUFUTSxHQUFQLEVBVVAsT0FWTyxDQUFWOztBQUQrQyw2SEFZekMsS0FaeUMsRUFZbEMsT0Faa0MsRUFZekIsT0FaeUI7O0FBYS9DLFNBQUssU0FBTCxHQUFpQixVQUFVLEdBQVYsQ0FBYyxVQUFDLENBQUQ7QUFBQSxVQUFPLElBQUksTUFBTSxPQUFWLENBQWtCLEVBQUUsQ0FBRixDQUFsQixFQUF3QixFQUFFLENBQUYsQ0FBeEIsRUFBOEIsRUFBRSxDQUFGLENBQTlCLENBQVA7QUFBQSxHQUFkLENBQWpCOztBQUVBO0FBQ0EsU0FBSyxLQUFMLEdBQWEsRUFBYjtBQUNBLFNBQUssV0FBTCxHQUFtQixFQUFuQjtBQUNBLFNBQUssTUFBTCxHQUFjLEVBQWQ7QUFsQitDO0FBbUIvQzs7OzswQkFFTztBQUNQOztBQUVBO0FBQ0EsT0FBSSxLQUFLLE1BQUwsQ0FBWSxNQUFaLEdBQXFCLENBQXpCLEVBQTRCO0FBQzNCLFNBQUssSUFBSSxDQUFULElBQWMsS0FBSyxNQUFuQixFQUEyQjtBQUMxQixTQUFJLElBQUksS0FBSyxNQUFMLENBQVksQ0FBWixDQUFSO0FBQ0EsU0FBUyxFQUFFLElBQUYsSUFBVSxLQUFuQixFQUE2QixLQUFLLGVBQUwsQ0FBcUIsRUFBRSxFQUF2QixFQUE3QixLQUNLLElBQUksRUFBRSxJQUFGLElBQVUsUUFBZCxFQUF3QixLQUFLLGdCQUFMLENBQXNCLEVBQUUsRUFBeEIsRUFBeEIsS0FDQSxJQUFJLEVBQUUsSUFBRixJQUFVLFFBQWQsRUFBd0IsS0FBSyxnQkFBTCxDQUFzQixFQUFFLEVBQXhCLEVBQTRCLENBQTVCO0FBQzdCO0FBQ0Q7QUFDRCxRQUFLLE1BQUwsR0FBYyxFQUFkO0FBQ0E7OztvQ0FFaUIsRSxFQUFJO0FBQ3JCLE9BQUksTUFBTSxLQUFLLE1BQUwsQ0FBWSxZQUFaLENBQVY7QUFDQSxPQUFJLE1BQU0sS0FBSyxNQUFMLENBQVksWUFBWixDQUFWO0FBQ0EsT0FBSSxNQUFNLEtBQUssTUFBTCxDQUFZLFlBQVosQ0FBVjtBQUNBLE9BQUksS0FBSyxNQUFNLEtBQUssTUFBTCxFQUFOLEdBQXNCLE1BQU0sQ0FBckM7QUFDQSxPQUFJLEtBQUssTUFBTSxLQUFLLE1BQUwsRUFBTixHQUFzQixNQUFNLENBQXJDO0FBQ0EsT0FBSSxLQUFLLE1BQU0sS0FBSyxNQUFMLEVBQU4sR0FBc0IsTUFBTSxDQUFyQztBQUNBLFFBQUssV0FBTCxDQUFpQixFQUFqQixJQUF1QixJQUFJLE1BQU0sT0FBVixDQUFrQixFQUFsQixFQUFzQixFQUF0QixFQUEwQixFQUExQixDQUF2QjtBQUNBOzs7a0NBRWUsRSxFQUFJO0FBQ25CLE9BQUksS0FBTSxLQUFLLE9BQUwsQ0FBYSxVQUFiLENBQXdCLEVBQXhCLENBQVY7QUFDQSxPQUFJLE9BQU8sS0FBSyxzQkFBTCxDQUE0QixFQUE1QixDQUFYO0FBQ0EsUUFBSyxpQkFBTCxDQUF1QixFQUF2QjtBQUNBLFFBQUssUUFBTCxDQUFjLFdBQWQsR0FBNEIsS0FBSyxNQUFMLENBQVksYUFBWixFQUEyQixFQUEzQixDQUE1QjtBQUNBLFFBQUssS0FBTCxDQUFXLEVBQVgsSUFBaUIsSUFBakI7QUFDQSxRQUFLLEtBQUwsQ0FBVyxHQUFYLENBQWUsSUFBZjtBQUNBLFNBQU0sS0FBTixDQUFZLEdBQVosQ0FBZ0IsSUFBaEI7O0FBRUE7QUFDQSxPQUFJLFFBQVEsRUFBRSxHQUFHLEtBQUssU0FBTCxDQUFlLENBQWYsRUFBa0IsQ0FBdkIsRUFBMEIsR0FBRyxLQUFLLFNBQUwsQ0FBZSxDQUFmLEVBQWtCLENBQS9DLEVBQWtELEdBQUcsS0FBSyxTQUFMLENBQWUsQ0FBZixFQUFrQixDQUF2RSxFQUFaO0FBQ0EsT0FBSSxNQUFNO0FBQ1QsT0FBRyxLQUFLLFNBQUwsQ0FBZSxLQUFmLENBQXFCLENBQXJCLEVBQXdCLEdBQXhCLENBQTRCLFVBQUMsQ0FBRDtBQUFBLFlBQU8sRUFBRSxDQUFUO0FBQUEsS0FBNUIsQ0FETTtBQUVULE9BQUcsS0FBSyxTQUFMLENBQWUsS0FBZixDQUFxQixDQUFyQixFQUF3QixHQUF4QixDQUE0QixVQUFDLENBQUQ7QUFBQSxZQUFPLEVBQUUsQ0FBVDtBQUFBLEtBQTVCLENBRk07QUFHVCxPQUFHLEtBQUssU0FBTCxDQUFlLEtBQWYsQ0FBcUIsQ0FBckIsRUFBd0IsR0FBeEIsQ0FBNEIsVUFBQyxDQUFEO0FBQUEsWUFBTyxFQUFFLENBQVQ7QUFBQSxLQUE1QjtBQUhNLElBQVY7QUFLQSxPQUFJLElBQUksS0FBSyxNQUFMLENBQVksVUFBWixDQUFSO0FBQ0EsT0FBSSxNQUFNLElBQVY7QUFDQSxPQUFJLFFBQVEsSUFBSSxnQkFBTSxLQUFWLENBQWdCLEtBQWhCLEVBQ1YsRUFEVSxDQUNQLEdBRE8sRUFDRixDQURFLEVBRVYsYUFGVSxDQUVLLGdCQUFNLGFBQU4sQ0FBb0IsVUFGekIsRUFHVixRQUhVLENBR0QsWUFBVztBQUNwQjtBQUNBLFFBQUksU0FBUyxLQUFLLFFBQUwsQ0FBYyxLQUFkLEVBQWI7QUFDQSxRQUFJLFNBQVMsSUFBSSxNQUFNLE9BQVYsQ0FBa0IsS0FBSyxDQUF2QixFQUEwQixLQUFLLENBQS9CLEVBQWtDLEtBQUssQ0FBdkMsQ0FBYjtBQUNBLFFBQUksTUFBTSxPQUFPLEdBQVAsQ0FBVyxNQUFYLEVBQW1CLFNBQW5CLEVBQVY7QUFDQSxRQUFJLE9BQU8sSUFBSSxNQUFNLE9BQVYsQ0FBa0IsQ0FBbEIsRUFBcUIsQ0FBckIsRUFBd0IsQ0FBeEIsQ0FBWDtBQUNBLFFBQUksU0FBUyxJQUFJLFdBQUosQ0FBZ0IsRUFBaEIsQ0FBYjtBQUNBLFNBQUssUUFBTCxDQUFjLEdBQWQsQ0FBa0IsS0FBSyxDQUFMLEdBQVMsT0FBTyxDQUFsQyxFQUFxQyxLQUFLLENBQUwsR0FBUyxPQUFPLENBQXJELEVBQXdELEtBQUssQ0FBTCxHQUFTLE9BQU8sQ0FBeEU7QUFDQTtBQUNBLFNBQUssVUFBTCxDQUFnQixrQkFBaEIsQ0FBbUMsSUFBbkMsRUFBeUMsR0FBekM7QUFDQSxJQWJVLEVBY1YsVUFkVSxDQWNDLFlBQVc7QUFDdEIsV0FBTyxJQUFJLE1BQUosQ0FBVyxFQUFYLENBQVA7QUFDQSxRQUFJLElBQUksTUFBSixDQUFXLGFBQVgsQ0FBSixFQUErQixJQUFJLEtBQUosQ0FBVSxNQUFWLENBQWlCLElBQWpCO0FBQy9CLElBakJVLEVBa0JWLE1BbEJVLENBa0JIO0FBQUEsV0FBTSxPQUFPLElBQUksTUFBSixDQUFXLEVBQVgsQ0FBYjtBQUFBLElBbEJHLEVBbUJWLEtBbkJVLEVBQVo7QUFvQkEsUUFBSyxNQUFMLENBQVksRUFBWixJQUFrQixLQUFsQjtBQUNBOzs7bUNBRWdCLEUsRUFBSTtBQUNwQixPQUFJLEtBQUssTUFBTCxDQUFZLEVBQVosQ0FBSixFQUFxQixLQUFLLE1BQUwsQ0FBWSxFQUFaLEVBQWdCLElBQWhCO0FBQ3JCLE9BQUksT0FBTyxLQUFLLEtBQUwsQ0FBVyxFQUFYLENBQVg7QUFDQSxPQUFJLElBQUosRUFBVSxLQUFLLEtBQUwsQ0FBVyxNQUFYLENBQWtCLElBQWxCO0FBQ1Y7OzttQ0FFZ0IsRSxFQUFJLEssRUFBTztBQUMzQjtBQUNBOzs7O0VBaEdpQyxhOztJQW1HdEIsZ0IsV0FBQSxnQjs7O0FBQ1osMkJBQVksS0FBWixFQUFtQixPQUFuQixFQUF3QztBQUFBLE1BQVosT0FBWSx1RUFBSixFQUFJOztBQUFBOztBQUN2QyxZQUFVLDRCQUFPO0FBQ2hCLFNBQU0saUJBRFU7QUFFaEIsY0FBVztBQUZLLEdBQVAsRUFHUCxPQUhPLENBQVY7O0FBRHVDLG1JQUtqQyxLQUxpQyxFQUsxQixPQUwwQixFQUtqQixPQUxpQjs7QUFNdkMsU0FBSyxNQUFMLEdBQWMsU0FBUyxhQUFULENBQXVCLFFBQXZCLENBQWQ7QUFDQSxTQUFLLE1BQUwsQ0FBWSxLQUFaLEdBQW9CLEdBQXBCO0FBQ0EsU0FBSyxNQUFMLENBQVksTUFBWixHQUFxQixHQUFyQjtBQUNBLFNBQUssT0FBTCxHQUFlLE9BQUssTUFBTCxDQUFZLFVBQVosQ0FBdUIsSUFBdkIsQ0FBZjtBQUNBLFNBQUssT0FBTCxDQUFhLElBQWIsR0FBb0IsT0FBSyxNQUFMLENBQVksTUFBWixDQUFwQjtBQUNBLFNBQUssT0FBTCxDQUFhLFNBQWIsR0FBeUIsT0FBSyxNQUFMLENBQVksV0FBWixDQUF6QjtBQUNBLFNBQUssSUFBTCxHQUFZLFNBQVo7QUFadUM7QUFhdkM7Ozs7MEJBRU8sSSxFQUFNO0FBQ2IsT0FBSSxLQUFLLElBQVQsRUFDQyxLQUFLLEtBQUwsQ0FBVyxNQUFYLENBQWtCLEtBQUssSUFBdkI7O0FBRUQsUUFBSyxPQUFMLENBQWEsU0FBYixDQUF1QixDQUF2QixFQUEwQixDQUExQixFQUE2QixLQUFLLE1BQUwsQ0FBWSxLQUF6QyxFQUFnRCxLQUFLLE1BQUwsQ0FBWSxNQUE1RDtBQUNBLFFBQUssT0FBTCxDQUFhLFFBQWIsQ0FBc0IsSUFBdEIsRUFBNEIsQ0FBNUIsRUFBK0IsRUFBL0I7QUFDQSxPQUFJLFVBQVUsSUFBSSxNQUFNLE9BQVYsQ0FBa0IsS0FBSyxNQUF2QixDQUFkO0FBQ0EsV0FBUSxXQUFSLEdBQXNCLElBQXRCO0FBQ0EsT0FBSSxXQUFXLElBQUksTUFBTSxpQkFBVixDQUE0QixFQUFFLEtBQUssT0FBUCxFQUFnQixNQUFNLE1BQU0sVUFBNUIsRUFBNUIsQ0FBZjtBQUNBLFlBQVMsV0FBVCxHQUF1QixJQUF2QjtBQUNBLFFBQUssSUFBTCxHQUFZLElBQUksTUFBTSxJQUFWLENBQ1gsSUFBSSxNQUFNLGFBQVYsQ0FBd0IsS0FBSyxNQUFMLENBQVksS0FBWixHQUFvQixFQUE1QyxFQUFnRCxLQUFLLE1BQUwsQ0FBWSxNQUFaLEdBQXFCLEVBQXJFLENBRFcsRUFFWCxRQUZXLENBQVo7QUFJQSxRQUFLLElBQUwsQ0FBVSxRQUFWLENBQW1CLEdBQW5CLENBQXVCLEtBQUssTUFBTCxDQUFZLEdBQVosQ0FBdkIsRUFBeUMsS0FBSyxNQUFMLENBQVksR0FBWixDQUF6QyxFQUEyRCxLQUFLLE1BQUwsQ0FBWSxHQUFaLENBQTNEO0FBQ0EsUUFBSyxLQUFMLENBQVcsR0FBWCxDQUFlLEtBQUssSUFBcEI7QUFDQTs7OztFQWhDb0MsUzs7SUFtQ3pCLGtCLFdBQUEsa0I7Ozs7Ozs7Ozs7RUFBMkIsUzs7SUFJbEMsUztBQUNMLHNCQUFnRDtBQUFBLE1BQXBDLEVBQW9DLHVFQUFqQyxDQUFpQztBQUFBLE1BQTlCLEVBQThCLHVFQUEzQixDQUEyQjtBQUFBLE1BQXhCLEVBQXdCLHVFQUFyQixDQUFxQjtBQUFBLE1BQWxCLEVBQWtCLHVFQUFmLENBQWU7QUFBQSxNQUFaLEVBQVksdUVBQVQsQ0FBUztBQUFBLE1BQU4sRUFBTSx1RUFBSCxDQUFHOztBQUFBOztBQUMvQyxNQUFJLE9BQU8sRUFBUCxJQUFjLFFBQWxCLEVBQTRCO0FBQzNCLFFBQUssRUFBTCxHQUFVLEVBQVY7QUFDQSxRQUFLLEVBQUwsR0FBVSxFQUFWO0FBQ0EsUUFBSyxFQUFMLEdBQVUsRUFBVjtBQUNBLFFBQUssRUFBTCxHQUFVLEVBQVY7QUFDQSxRQUFLLEVBQUwsR0FBVSxFQUFWO0FBQ0EsUUFBSyxFQUFMLEdBQVUsRUFBVjtBQUNBO0FBQ0Q7Ozs7eUJBRU0sQyxFQUFHO0FBQ1QsVUFBTyxLQUFLLEVBQUwsSUFBUyxJQUFJLEtBQUssRUFBbEIsQ0FBUDtBQUNBOzs7eUJBRU0sQyxFQUFHO0FBQ1QsVUFBTyxLQUFLLEVBQUwsSUFBUyxJQUFJLEtBQUssRUFBbEIsQ0FBUDtBQUNBOzs7eUJBRU0sQyxFQUFHO0FBQ1QsVUFBTyxLQUFLLEVBQUwsSUFBUyxJQUFJLEtBQUssRUFBbEIsQ0FBUDtBQUNBOzs7Ozs7O0FDcGNGOztBQUVBOzs7Ozs7O1FBa0NnQixTLEdBQUEsUztRQTRDQSxjLEdBQUEsYztRQWVBLE8sR0FBQSxPO1FBb0JBLFEsR0FBQSxROztBQTdHaEI7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7O0FBSUE7O0FBUUE7O0FBQ0E7Ozs7QUFNQSxJQUFJLGFBQWEsRUFBakI7QUFDQSxJQUFJLGFBQWEsQ0FBakI7QUFDQSxJQUFJLFNBQUo7O0FBRUE7Ozs7QUFJTyxTQUFTLFNBQVQsR0FBcUI7QUFDM0IsS0FBTSxRQUFRLElBQUksTUFBTSxLQUFWLEVBQWQ7QUFDQSxLQUFNLFNBQVMsSUFBSSxNQUFNLGlCQUFWLENBQTZCLEVBQTdCLEVBQWlDLE9BQU8sVUFBUCxHQUFvQixPQUFPLFdBQTVELEVBQXlFLENBQXpFLEVBQTRFLEtBQTVFLENBQWY7QUFDQSxRQUFPLFFBQVAsQ0FBZ0IsQ0FBaEIsR0FBb0IsRUFBcEI7O0FBRUE7QUFDQTtBQUNBLEtBQU0saUJBQWlCLElBQUksTUFBTSxVQUFWLENBQXFCLE1BQXJCLENBQXZCO0FBQ0EsZ0JBQWUsUUFBZixHQUEwQixJQUExQjs7QUFFQTtBQUNBO0FBQ0EsS0FBTSxXQUFXLElBQUksTUFBTSxhQUFWLEVBQWpCO0FBQ0EsVUFBUyxPQUFULENBQWtCLE9BQU8sVUFBekIsRUFBcUMsT0FBTyxXQUE1QztBQUNBLFVBQVMsYUFBVCxDQUF1QixPQUFPLGdCQUE5QjtBQUNHLFVBQVMsSUFBVCxDQUFjLFdBQWQsQ0FBMkIsU0FBUyxVQUFwQzs7QUFFQTtBQUNBO0FBQ0EsS0FBTSxTQUFTLElBQUksTUFBTSxRQUFWLENBQW1CLFFBQW5CLENBQWY7QUFDSCxRQUFPLE9BQVAsQ0FBZ0IsT0FBTyxVQUF2QixFQUFtQyxPQUFPLFdBQTFDOztBQUVBO0FBQ0E7QUFDQSxLQUFNLFVBQVUsSUFBSSxZQUFKLENBQWlCLFFBQWpCLEVBQTJCLE1BQTNCLENBQWhCOztBQUVBLEtBQUksV0FBVyxTQUFYLFFBQVcsQ0FBUyxDQUFULEVBQVk7QUFDekIsU0FBTyxPQUFQLENBQWUsT0FBTyxVQUF0QixFQUFrQyxPQUFPLFdBQXpDO0FBQ0EsU0FBTyxNQUFQLEdBQWdCLE9BQU8sVUFBUCxHQUFvQixPQUFPLFdBQTNDO0FBQ0EsU0FBTyxzQkFBUDtBQUNELEVBSkQ7O0FBTUEsUUFBTyxnQkFBUCxDQUF3QixRQUF4QixFQUFrQyxRQUFsQyxFQUE0QyxJQUE1QztBQUNBLFFBQU8sZ0JBQVAsQ0FBd0Isd0JBQXhCLEVBQWtELFFBQWxELEVBQTRELElBQTVEOztBQUVHO0FBQ0E7QUFDSCxPQUFNLEtBQU4sR0FBYyx1QkFBYSxNQUFiLEVBQXFCLFNBQVMsVUFBOUIsQ0FBZDtBQUNBLE9BQU0sS0FBTixDQUFZLE9BQVosQ0FBb0IsU0FBUyxPQUFULEVBQXBCO0FBQ0EsT0FBTSxHQUFOLENBQVUsTUFBTSxLQUFOLENBQVksT0FBWixFQUFWOztBQUVHLFFBQU8sRUFBRSxZQUFGLEVBQVMsY0FBVCxFQUFpQixnQkFBakIsRUFBMEIsY0FBMUIsRUFBa0MsOEJBQWxDLEVBQVA7QUFDSDs7QUFFTSxTQUFTLGNBQVQsR0FBMEI7QUFDaEM7QUFDQSxXQUFVLGFBQVYsR0FBMEIsSUFBMUIsQ0FBK0IsVUFBUyxRQUFULEVBQW1CO0FBQzlDLE1BQUksU0FBUyxNQUFULEdBQWtCLENBQXRCLEVBQXlCO0FBQ3RCLGVBQVksU0FBUyxDQUFULENBQVo7QUFDQSxhQUFVLHFCQUFWLENBQWdDLE9BQWhDO0FBQ0Y7QUFDSixFQUxEO0FBTUE7O0FBRUQ7Ozs7O0FBS08sU0FBUyxPQUFULENBQWlCLFNBQWpCLEVBQTRCO0FBQ2xDLEtBQUksQ0FBRSxTQUFOLEVBQWlCLFlBQVksS0FBSyxHQUFMLEVBQVo7QUFDakIsS0FBSSxRQUFRLEtBQUssR0FBTCxDQUFTLFlBQVksVUFBckIsRUFBaUMsR0FBakMsQ0FBWjtBQUNFLGNBQWEsU0FBYjs7QUFIZ0M7QUFBQTtBQUFBOztBQUFBO0FBS2hDLHVCQUFjLFVBQWQsOEhBQTBCO0FBQUEsT0FBakIsQ0FBaUI7O0FBQzNCLEtBQUUsS0FBRjtBQUNFO0FBUCtCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7O0FBUWhDLGlCQUFNLE1BQU47QUFDRixPQUFNLEtBQU4sQ0FBWSxNQUFaO0FBQ0csZ0JBQWUsTUFBZjtBQUNBLFNBQVEsTUFBUixDQUFnQixLQUFoQixFQUF1QixNQUF2QixFQUErQixTQUEvQjs7QUFFQSxXQUFVLHFCQUFWLENBQWlDLE9BQWpDO0FBQ0g7O0FBRUQ7Ozs7QUFJTyxTQUFTLFFBQVQsQ0FBa0IsU0FBbEIsRUFBNkI7QUFDbkMsWUFBVyxJQUFYLENBQWdCLFNBQWhCO0FBQ0E7O0FBRUQsT0FBTyxPQUFQLEdBQWlCO0FBQ2hCLDBCQURnQjtBQUVoQiw0Q0FGZ0I7QUFHaEIsZ0NBSGdCO0FBSWhCLHdDQUpnQjtBQUtoQiw0Q0FMZ0I7QUFNaEIsOENBTmdCO0FBT2hCLHdDQVBnQjtBQVFoQiw4Q0FSZ0I7QUFTaEIsWUFBVyxTQVRLO0FBVWhCLFVBQVMsT0FWTztBQVdoQixtQ0FYZ0I7QUFZaEIsdUNBWmdCO0FBYWhCLFdBQVUsUUFiTTtBQWNoQiwrQkFkZ0I7QUFlaEIsUUFBTztBQUNOLDJCQURNO0FBRU4sK0NBRk07QUFHTjtBQUhNO0FBZlMsQ0FBakI7OztBQ3ZIQTs7Ozs7UUFLZ0IsVSxHQUFBLFU7UUFvQkEsTSxHQUFBLE07UUFpQ0EsUSxHQUFBLFE7UUFJQSxrQixHQUFBLGtCO1FBU0EsZ0IsR0FBQSxnQjs7QUFyRWhCOzs7Ozs7QUFFQTtBQUNPLFNBQVMsVUFBVCxDQUFvQixPQUFwQixFQUE2Qjs7QUFFbEMsTUFBSSxxQkFBcUIsQ0FBekI7O0FBRUEsS0FBRzs7QUFFRCxRQUFJLE1BQU0sS0FBSyxLQUFMLENBQVcsT0FBTztBQUMxQixZQUFNLFFBQVEsSUFEWTtBQUUxQixXQUFLLFFBQVE7QUFGYSxLQUFQLENBQVgsQ0FBVjs7QUFLQSxRQUFJLE1BQU0sUUFBUSxJQUFSLENBQWEsTUFBbkIsSUFBNkIsT0FBTyxDQUF4QyxFQUEyQztBQUN6QyxhQUFPLFFBQVEsSUFBUixDQUFhLEdBQWIsQ0FBUDtBQUNELEtBRkQsTUFFTztBQUNMO0FBQ0Q7QUFFRixHQWJELFFBYVMscUJBQXFCLEdBYjlCO0FBY0Q7O0FBRU0sU0FBUyxNQUFULENBQWdCLE9BQWhCLEVBQXlCOztBQUU5QixZQUFVLDRCQUFPLEVBQUUsTUFBTSxDQUFSLEVBQVcsS0FBSyxDQUFoQixFQUFtQixNQUFNLEVBQXpCLEVBQVAsRUFBc0MsT0FBdEMsQ0FBVjs7QUFFQTtBQUNBO0FBQ0EsTUFBSSxNQUFNLE9BQU4sQ0FBYyxRQUFRLElBQXRCLEtBQStCLFFBQVEsSUFBUixDQUFhLE1BQWIsR0FBc0IsQ0FBekQsRUFBNEQ7QUFDMUQsV0FBTyxXQUFXLE9BQVgsQ0FBUDtBQUNEOztBQUVEO0FBQ0EsTUFBSSxDQUFKO0FBQ0EsTUFBSSxDQUFKO0FBQ0EsTUFBSSxDQUFKO0FBQ0EsTUFBSSxJQUFKO0FBQ0EsTUFBSSxPQUFPLFFBQVEsSUFBbkI7QUFDQSxNQUFJLE1BQU8sUUFBUSxHQUFuQjs7QUFFQSxLQUFHO0FBQ0Q7QUFDQSxRQUFJLEtBQUssTUFBTCxLQUFnQixDQUFoQixHQUFvQixDQUF4QjtBQUNBLFFBQUksS0FBSyxNQUFMLEtBQWdCLENBQWhCLEdBQW9CLENBQXhCOztBQUVBLFFBQUksSUFBSSxDQUFKLEdBQVEsSUFBSSxDQUFoQjtBQUNELEdBTkQsUUFNUyxLQUFLLENBTmQ7O0FBUUE7QUFDQSxTQUFPLElBQUksS0FBSyxJQUFMLENBQVUsQ0FBQyxDQUFELEdBQUssS0FBSyxHQUFMLENBQVMsQ0FBVCxDQUFMLEdBQW1CLENBQTdCLENBQVg7O0FBRUE7QUFDQSxTQUFPLE1BQU0sSUFBTixHQUFhLElBQXBCO0FBQ0Q7O0FBRU0sU0FBUyxRQUFULENBQWtCLEdBQWxCLEVBQXVCO0FBQzVCLFNBQU8sTUFBTSxLQUFLLEVBQVgsR0FBZ0IsR0FBdkI7QUFDRDs7QUFFTSxTQUFTLGtCQUFULENBQTRCLEdBQTVCLEVBQWlDLElBQWpDLEVBQTBEO0FBQUEsTUFBbkIsQ0FBbUIsdUVBQWpCLENBQWlCO0FBQUEsTUFBZCxPQUFjLHVFQUFOLElBQU07O0FBQy9ELE1BQUksU0FBUyxTQUFTLEdBQVQsQ0FBYjtBQUNBLE1BQUksVUFBVSxVQUFVLFNBQVMsQ0FBQyxJQUFWLENBQVYsR0FBNEIsU0FBUyxJQUFULENBQTFDO0FBQ0EsTUFBSSxJQUFJLElBQUksS0FBSyxHQUFMLENBQVMsTUFBVCxDQUFKLEdBQXVCLEtBQUssR0FBTCxDQUFTLE9BQVQsQ0FBL0I7QUFDQSxNQUFJLElBQUksSUFBSSxLQUFLLEdBQUwsQ0FBUyxNQUFULENBQUosR0FBdUIsS0FBSyxHQUFMLENBQVMsT0FBVCxDQUEvQjtBQUNBLE1BQUksSUFBSSxJQUFJLEtBQUssR0FBTCxDQUFTLE1BQVQsQ0FBWjtBQUNBLFNBQU8sRUFBQyxJQUFELEVBQUksSUFBSixFQUFPLElBQVAsRUFBUDtBQUNEOztBQUVNLFNBQVMsZ0JBQVQsQ0FBMEIsR0FBMUIsRUFBK0IsRUFBL0IsRUFBbUM7QUFDeEMsTUFBSSxNQUFNLElBQUksY0FBSixFQUFWO0FBQ0EsTUFBSSxJQUFKLENBQVMsS0FBVCxFQUFnQixHQUFoQjtBQUNBLE1BQUksSUFBSixDQUFTLElBQVQ7QUFDQSxNQUFJLGtCQUFKLEdBQXlCLFlBQVc7QUFDbEMsUUFBSSxJQUFJLFVBQUosS0FBbUIsQ0FBbkIsSUFBd0IsSUFBSSxNQUFKLEtBQWUsR0FBM0MsRUFBZ0Q7QUFDOUMsU0FBRyxLQUFLLEtBQUwsQ0FBVyxJQUFJLFlBQWYsQ0FBSDtBQUNEO0FBQ0YsR0FKRDtBQUtEIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBpcyBub3QgZGVmaW5lZCcpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGlzIG5vdCBkZWZpbmVkJyk7XG4gICAgICAgIH1cbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICB9XG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgfVxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGhhcyA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbi8vXG4vLyBXZSBzdG9yZSBvdXIgRUUgb2JqZWN0cyBpbiBhIHBsYWluIG9iamVjdCB3aG9zZSBwcm9wZXJ0aWVzIGFyZSBldmVudCBuYW1lcy5cbi8vIElmIGBPYmplY3QuY3JlYXRlKG51bGwpYCBpcyBub3Qgc3VwcG9ydGVkIHdlIHByZWZpeCB0aGUgZXZlbnQgbmFtZXMgd2l0aCBhXG4vLyBgfmAgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIGJ1aWx0LWluIG9iamVjdCBwcm9wZXJ0aWVzIGFyZSBub3Qgb3ZlcnJpZGRlbiBvclxuLy8gdXNlZCBhcyBhbiBhdHRhY2sgdmVjdG9yLlxuLy8gV2UgYWxzbyBhc3N1bWUgdGhhdCBgT2JqZWN0LmNyZWF0ZShudWxsKWAgaXMgYXZhaWxhYmxlIHdoZW4gdGhlIGV2ZW50IG5hbWVcbi8vIGlzIGFuIEVTNiBTeW1ib2wuXG4vL1xudmFyIHByZWZpeCA9IHR5cGVvZiBPYmplY3QuY3JlYXRlICE9PSAnZnVuY3Rpb24nID8gJ34nIDogZmFsc2U7XG5cbi8qKlxuICogUmVwcmVzZW50YXRpb24gb2YgYSBzaW5nbGUgRXZlbnRFbWl0dGVyIGZ1bmN0aW9uLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIEV2ZW50IGhhbmRsZXIgdG8gYmUgY2FsbGVkLlxuICogQHBhcmFtIHtNaXhlZH0gY29udGV4dCBDb250ZXh0IGZvciBmdW5jdGlvbiBleGVjdXRpb24uXG4gKiBAcGFyYW0ge0Jvb2xlYW59IFtvbmNlPWZhbHNlXSBPbmx5IGVtaXQgb25jZVxuICogQGFwaSBwcml2YXRlXG4gKi9cbmZ1bmN0aW9uIEVFKGZuLCBjb250ZXh0LCBvbmNlKSB7XG4gIHRoaXMuZm4gPSBmbjtcbiAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcbiAgdGhpcy5vbmNlID0gb25jZSB8fCBmYWxzZTtcbn1cblxuLyoqXG4gKiBNaW5pbWFsIEV2ZW50RW1pdHRlciBpbnRlcmZhY2UgdGhhdCBpcyBtb2xkZWQgYWdhaW5zdCB0aGUgTm9kZS5qc1xuICogRXZlbnRFbWl0dGVyIGludGVyZmFjZS5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBhcGkgcHVibGljXG4gKi9cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHsgLyogTm90aGluZyB0byBzZXQgKi8gfVxuXG4vKipcbiAqIEhvbGQgdGhlIGFzc2lnbmVkIEV2ZW50RW1pdHRlcnMgYnkgbmFtZS5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICogQHByaXZhdGVcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuXG4vKipcbiAqIFJldHVybiBhbiBhcnJheSBsaXN0aW5nIHRoZSBldmVudHMgZm9yIHdoaWNoIHRoZSBlbWl0dGVyIGhhcyByZWdpc3RlcmVkXG4gKiBsaXN0ZW5lcnMuXG4gKlxuICogQHJldHVybnMge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5ldmVudE5hbWVzID0gZnVuY3Rpb24gZXZlbnROYW1lcygpIHtcbiAgdmFyIGV2ZW50cyA9IHRoaXMuX2V2ZW50c1xuICAgICwgbmFtZXMgPSBbXVxuICAgICwgbmFtZTtcblxuICBpZiAoIWV2ZW50cykgcmV0dXJuIG5hbWVzO1xuXG4gIGZvciAobmFtZSBpbiBldmVudHMpIHtcbiAgICBpZiAoaGFzLmNhbGwoZXZlbnRzLCBuYW1lKSkgbmFtZXMucHVzaChwcmVmaXggPyBuYW1lLnNsaWNlKDEpIDogbmFtZSk7XG4gIH1cblxuICBpZiAoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scykge1xuICAgIHJldHVybiBuYW1lcy5jb25jYXQoT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyhldmVudHMpKTtcbiAgfVxuXG4gIHJldHVybiBuYW1lcztcbn07XG5cbi8qKlxuICogUmV0dXJuIGEgbGlzdCBvZiBhc3NpZ25lZCBldmVudCBsaXN0ZW5lcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBldmVudHMgdGhhdCBzaG91bGQgYmUgbGlzdGVkLlxuICogQHBhcmFtIHtCb29sZWFufSBleGlzdHMgV2Ugb25seSBuZWVkIHRvIGtub3cgaWYgdGhlcmUgYXJlIGxpc3RlbmVycy5cbiAqIEByZXR1cm5zIHtBcnJheXxCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbiBsaXN0ZW5lcnMoZXZlbnQsIGV4aXN0cykge1xuICB2YXIgZXZ0ID0gcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudFxuICAgICwgYXZhaWxhYmxlID0gdGhpcy5fZXZlbnRzICYmIHRoaXMuX2V2ZW50c1tldnRdO1xuXG4gIGlmIChleGlzdHMpIHJldHVybiAhIWF2YWlsYWJsZTtcbiAgaWYgKCFhdmFpbGFibGUpIHJldHVybiBbXTtcbiAgaWYgKGF2YWlsYWJsZS5mbikgcmV0dXJuIFthdmFpbGFibGUuZm5dO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gYXZhaWxhYmxlLmxlbmd0aCwgZWUgPSBuZXcgQXJyYXkobCk7IGkgPCBsOyBpKyspIHtcbiAgICBlZVtpXSA9IGF2YWlsYWJsZVtpXS5mbjtcbiAgfVxuXG4gIHJldHVybiBlZTtcbn07XG5cbi8qKlxuICogRW1pdCBhbiBldmVudCB0byBhbGwgcmVnaXN0ZXJlZCBldmVudCBsaXN0ZW5lcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBuYW1lIG9mIHRoZSBldmVudC5cbiAqIEByZXR1cm5zIHtCb29sZWFufSBJbmRpY2F0aW9uIGlmIHdlJ3ZlIGVtaXR0ZWQgYW4gZXZlbnQuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiBlbWl0KGV2ZW50LCBhMSwgYTIsIGEzLCBhNCwgYTUpIHtcbiAgdmFyIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnQ7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1tldnRdKSByZXR1cm4gZmFsc2U7XG5cbiAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1tldnRdXG4gICAgLCBsZW4gPSBhcmd1bWVudHMubGVuZ3RoXG4gICAgLCBhcmdzXG4gICAgLCBpO1xuXG4gIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgbGlzdGVuZXJzLmZuKSB7XG4gICAgaWYgKGxpc3RlbmVycy5vbmNlKSB0aGlzLnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcnMuZm4sIHVuZGVmaW5lZCwgdHJ1ZSk7XG5cbiAgICBzd2l0Y2ggKGxlbikge1xuICAgICAgY2FzZSAxOiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQpLCB0cnVlO1xuICAgICAgY2FzZSAyOiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExKSwgdHJ1ZTtcbiAgICAgIGNhc2UgMzogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSwgYTIpLCB0cnVlO1xuICAgICAgY2FzZSA0OiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiwgYTMpLCB0cnVlO1xuICAgICAgY2FzZSA1OiByZXR1cm4gbGlzdGVuZXJzLmZuLmNhbGwobGlzdGVuZXJzLmNvbnRleHQsIGExLCBhMiwgYTMsIGE0KSwgdHJ1ZTtcbiAgICAgIGNhc2UgNjogcmV0dXJuIGxpc3RlbmVycy5mbi5jYWxsKGxpc3RlbmVycy5jb250ZXh0LCBhMSwgYTIsIGEzLCBhNCwgYTUpLCB0cnVlO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDEsIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0xKTsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICB9XG5cbiAgICBsaXN0ZW5lcnMuZm4uYXBwbHkobGlzdGVuZXJzLmNvbnRleHQsIGFyZ3MpO1xuICB9IGVsc2Uge1xuICAgIHZhciBsZW5ndGggPSBsaXN0ZW5lcnMubGVuZ3RoXG4gICAgICAsIGo7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChsaXN0ZW5lcnNbaV0ub25jZSkgdGhpcy5yZW1vdmVMaXN0ZW5lcihldmVudCwgbGlzdGVuZXJzW2ldLmZuLCB1bmRlZmluZWQsIHRydWUpO1xuXG4gICAgICBzd2l0Y2ggKGxlbikge1xuICAgICAgICBjYXNlIDE6IGxpc3RlbmVyc1tpXS5mbi5jYWxsKGxpc3RlbmVyc1tpXS5jb250ZXh0KTsgYnJlYWs7XG4gICAgICAgIGNhc2UgMjogbGlzdGVuZXJzW2ldLmZuLmNhbGwobGlzdGVuZXJzW2ldLmNvbnRleHQsIGExKTsgYnJlYWs7XG4gICAgICAgIGNhc2UgMzogbGlzdGVuZXJzW2ldLmZuLmNhbGwobGlzdGVuZXJzW2ldLmNvbnRleHQsIGExLCBhMik7IGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGlmICghYXJncykgZm9yIChqID0gMSwgYXJncyA9IG5ldyBBcnJheShsZW4gLTEpOyBqIDwgbGVuOyBqKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaiAtIDFdID0gYXJndW1lbnRzW2pdO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGxpc3RlbmVyc1tpXS5mbi5hcHBseShsaXN0ZW5lcnNbaV0uY29udGV4dCwgYXJncyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIFJlZ2lzdGVyIGEgbmV3IEV2ZW50TGlzdGVuZXIgZm9yIHRoZSBnaXZlbiBldmVudC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnQgTmFtZSBvZiB0aGUgZXZlbnQuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBDYWxsYmFjayBmdW5jdGlvbi5cbiAqIEBwYXJhbSB7TWl4ZWR9IFtjb250ZXh0PXRoaXNdIFRoZSBjb250ZXh0IG9mIHRoZSBmdW5jdGlvbi5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBmdW5jdGlvbiBvbihldmVudCwgZm4sIGNvbnRleHQpIHtcbiAgdmFyIGxpc3RlbmVyID0gbmV3IEVFKGZuLCBjb250ZXh0IHx8IHRoaXMpXG4gICAgLCBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50O1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKSB0aGlzLl9ldmVudHMgPSBwcmVmaXggPyB7fSA6IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIGlmICghdGhpcy5fZXZlbnRzW2V2dF0pIHRoaXMuX2V2ZW50c1tldnRdID0gbGlzdGVuZXI7XG4gIGVsc2Uge1xuICAgIGlmICghdGhpcy5fZXZlbnRzW2V2dF0uZm4pIHRoaXMuX2V2ZW50c1tldnRdLnB1c2gobGlzdGVuZXIpO1xuICAgIGVsc2UgdGhpcy5fZXZlbnRzW2V2dF0gPSBbXG4gICAgICB0aGlzLl9ldmVudHNbZXZ0XSwgbGlzdGVuZXJcbiAgICBdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZCBhbiBFdmVudExpc3RlbmVyIHRoYXQncyBvbmx5IGNhbGxlZCBvbmNlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBOYW1lIG9mIHRoZSBldmVudC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIENhbGxiYWNrIGZ1bmN0aW9uLlxuICogQHBhcmFtIHtNaXhlZH0gW2NvbnRleHQ9dGhpc10gVGhlIGNvbnRleHQgb2YgdGhlIGZ1bmN0aW9uLlxuICogQGFwaSBwdWJsaWNcbiAqL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24gb25jZShldmVudCwgZm4sIGNvbnRleHQpIHtcbiAgdmFyIGxpc3RlbmVyID0gbmV3IEVFKGZuLCBjb250ZXh0IHx8IHRoaXMsIHRydWUpXG4gICAgLCBldnQgPSBwcmVmaXggPyBwcmVmaXggKyBldmVudCA6IGV2ZW50O1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKSB0aGlzLl9ldmVudHMgPSBwcmVmaXggPyB7fSA6IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIGlmICghdGhpcy5fZXZlbnRzW2V2dF0pIHRoaXMuX2V2ZW50c1tldnRdID0gbGlzdGVuZXI7XG4gIGVsc2Uge1xuICAgIGlmICghdGhpcy5fZXZlbnRzW2V2dF0uZm4pIHRoaXMuX2V2ZW50c1tldnRdLnB1c2gobGlzdGVuZXIpO1xuICAgIGVsc2UgdGhpcy5fZXZlbnRzW2V2dF0gPSBbXG4gICAgICB0aGlzLl9ldmVudHNbZXZ0XSwgbGlzdGVuZXJcbiAgICBdO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBldmVudCBsaXN0ZW5lcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBldmVudCB3ZSB3YW50IHRvIHJlbW92ZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIFRoZSBsaXN0ZW5lciB0aGF0IHdlIG5lZWQgdG8gZmluZC5cbiAqIEBwYXJhbSB7TWl4ZWR9IGNvbnRleHQgT25seSByZW1vdmUgbGlzdGVuZXJzIG1hdGNoaW5nIHRoaXMgY29udGV4dC5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gb25jZSBPbmx5IHJlbW92ZSBvbmNlIGxpc3RlbmVycy5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiByZW1vdmVMaXN0ZW5lcihldmVudCwgZm4sIGNvbnRleHQsIG9uY2UpIHtcbiAgdmFyIGV2dCA9IHByZWZpeCA/IHByZWZpeCArIGV2ZW50IDogZXZlbnQ7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1tldnRdKSByZXR1cm4gdGhpcztcblxuICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW2V2dF1cbiAgICAsIGV2ZW50cyA9IFtdO1xuXG4gIGlmIChmbikge1xuICAgIGlmIChsaXN0ZW5lcnMuZm4pIHtcbiAgICAgIGlmIChcbiAgICAgICAgICAgbGlzdGVuZXJzLmZuICE9PSBmblxuICAgICAgICB8fCAob25jZSAmJiAhbGlzdGVuZXJzLm9uY2UpXG4gICAgICAgIHx8IChjb250ZXh0ICYmIGxpc3RlbmVycy5jb250ZXh0ICE9PSBjb250ZXh0KVxuICAgICAgKSB7XG4gICAgICAgIGV2ZW50cy5wdXNoKGxpc3RlbmVycyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBsaXN0ZW5lcnMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgICAgIGxpc3RlbmVyc1tpXS5mbiAhPT0gZm5cbiAgICAgICAgICB8fCAob25jZSAmJiAhbGlzdGVuZXJzW2ldLm9uY2UpXG4gICAgICAgICAgfHwgKGNvbnRleHQgJiYgbGlzdGVuZXJzW2ldLmNvbnRleHQgIT09IGNvbnRleHQpXG4gICAgICAgICkge1xuICAgICAgICAgIGV2ZW50cy5wdXNoKGxpc3RlbmVyc1tpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvL1xuICAvLyBSZXNldCB0aGUgYXJyYXksIG9yIHJlbW92ZSBpdCBjb21wbGV0ZWx5IGlmIHdlIGhhdmUgbm8gbW9yZSBsaXN0ZW5lcnMuXG4gIC8vXG4gIGlmIChldmVudHMubGVuZ3RoKSB7XG4gICAgdGhpcy5fZXZlbnRzW2V2dF0gPSBldmVudHMubGVuZ3RoID09PSAxID8gZXZlbnRzWzBdIDogZXZlbnRzO1xuICB9IGVsc2Uge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbZXZ0XTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYWxsIGxpc3RlbmVycyBvciBvbmx5IHRoZSBsaXN0ZW5lcnMgZm9yIHRoZSBzcGVjaWZpZWQgZXZlbnQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IFRoZSBldmVudCB3YW50IHRvIHJlbW92ZSBhbGwgbGlzdGVuZXJzIGZvci5cbiAqIEBhcGkgcHVibGljXG4gKi9cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24gcmVtb3ZlQWxsTGlzdGVuZXJzKGV2ZW50KSB7XG4gIGlmICghdGhpcy5fZXZlbnRzKSByZXR1cm4gdGhpcztcblxuICBpZiAoZXZlbnQpIGRlbGV0ZSB0aGlzLl9ldmVudHNbcHJlZml4ID8gcHJlZml4ICsgZXZlbnQgOiBldmVudF07XG4gIGVsc2UgdGhpcy5fZXZlbnRzID0gcHJlZml4ID8ge30gOiBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy9cbi8vIEFsaWFzIG1ldGhvZHMgbmFtZXMgYmVjYXVzZSBwZW9wbGUgcm9sbCBsaWtlIHRoYXQuXG4vL1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUub247XG5cbi8vXG4vLyBUaGlzIGZ1bmN0aW9uIGRvZXNuJ3QgYXBwbHkgYW55bW9yZS5cbi8vXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uIHNldE1heExpc3RlbmVycygpIHtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vL1xuLy8gRXhwb3NlIHRoZSBwcmVmaXguXG4vL1xuRXZlbnRFbWl0dGVyLnByZWZpeGVkID0gcHJlZml4O1xuXG4vL1xuLy8gRXhwb3NlIHRoZSBtb2R1bGUuXG4vL1xuaWYgKCd1bmRlZmluZWQnICE9PSB0eXBlb2YgbW9kdWxlKSB7XG4gIG1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuLyogZXNsaW50LWRpc2FibGUgbm8tdW51c2VkLXZhcnMgKi9cbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgcHJvcElzRW51bWVyYWJsZSA9IE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGU7XG5cbmZ1bmN0aW9uIHRvT2JqZWN0KHZhbCkge1xuXHRpZiAodmFsID09PSBudWxsIHx8IHZhbCA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignT2JqZWN0LmFzc2lnbiBjYW5ub3QgYmUgY2FsbGVkIHdpdGggbnVsbCBvciB1bmRlZmluZWQnKTtcblx0fVxuXG5cdHJldHVybiBPYmplY3QodmFsKTtcbn1cblxuZnVuY3Rpb24gc2hvdWxkVXNlTmF0aXZlKCkge1xuXHR0cnkge1xuXHRcdGlmICghT2JqZWN0LmFzc2lnbikge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vIERldGVjdCBidWdneSBwcm9wZXJ0eSBlbnVtZXJhdGlvbiBvcmRlciBpbiBvbGRlciBWOCB2ZXJzaW9ucy5cblxuXHRcdC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTQxMThcblx0XHR2YXIgdGVzdDEgPSBuZXcgU3RyaW5nKCdhYmMnKTsgIC8vIGVzbGludC1kaXNhYmxlLWxpbmVcblx0XHR0ZXN0MVs1XSA9ICdkZSc7XG5cdFx0aWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRlc3QxKVswXSA9PT0gJzUnKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Ly8gaHR0cHM6Ly9idWdzLmNocm9taXVtLm9yZy9wL3Y4L2lzc3Vlcy9kZXRhaWw/aWQ9MzA1NlxuXHRcdHZhciB0ZXN0MiA9IHt9O1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgMTA7IGkrKykge1xuXHRcdFx0dGVzdDJbJ18nICsgU3RyaW5nLmZyb21DaGFyQ29kZShpKV0gPSBpO1xuXHRcdH1cblx0XHR2YXIgb3JkZXIyID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGVzdDIpLm1hcChmdW5jdGlvbiAobikge1xuXHRcdFx0cmV0dXJuIHRlc3QyW25dO1xuXHRcdH0pO1xuXHRcdGlmIChvcmRlcjIuam9pbignJykgIT09ICcwMTIzNDU2Nzg5Jykge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdC8vIGh0dHBzOi8vYnVncy5jaHJvbWl1bS5vcmcvcC92OC9pc3N1ZXMvZGV0YWlsP2lkPTMwNTZcblx0XHR2YXIgdGVzdDMgPSB7fTtcblx0XHQnYWJjZGVmZ2hpamtsbW5vcHFyc3QnLnNwbGl0KCcnKS5mb3JFYWNoKGZ1bmN0aW9uIChsZXR0ZXIpIHtcblx0XHRcdHRlc3QzW2xldHRlcl0gPSBsZXR0ZXI7XG5cdFx0fSk7XG5cdFx0aWYgKE9iamVjdC5rZXlzKE9iamVjdC5hc3NpZ24oe30sIHRlc3QzKSkuam9pbignJykgIT09XG5cdFx0XHRcdCdhYmNkZWZnaGlqa2xtbm9wcXJzdCcpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdC8vIFdlIGRvbid0IGV4cGVjdCBhbnkgb2YgdGhlIGFib3ZlIHRvIHRocm93LCBidXQgYmV0dGVyIHRvIGJlIHNhZmUuXG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2hvdWxkVXNlTmF0aXZlKCkgPyBPYmplY3QuYXNzaWduIDogZnVuY3Rpb24gKHRhcmdldCwgc291cmNlKSB7XG5cdHZhciBmcm9tO1xuXHR2YXIgdG8gPSB0b09iamVjdCh0YXJnZXQpO1xuXHR2YXIgc3ltYm9scztcblxuXHRmb3IgKHZhciBzID0gMTsgcyA8IGFyZ3VtZW50cy5sZW5ndGg7IHMrKykge1xuXHRcdGZyb20gPSBPYmplY3QoYXJndW1lbnRzW3NdKTtcblxuXHRcdGZvciAodmFyIGtleSBpbiBmcm9tKSB7XG5cdFx0XHRpZiAoaGFzT3duUHJvcGVydHkuY2FsbChmcm9tLCBrZXkpKSB7XG5cdFx0XHRcdHRvW2tleV0gPSBmcm9tW2tleV07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMpIHtcblx0XHRcdHN5bWJvbHMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKGZyb20pO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBzeW1ib2xzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGlmIChwcm9wSXNFbnVtZXJhYmxlLmNhbGwoZnJvbSwgc3ltYm9sc1tpXSkpIHtcblx0XHRcdFx0XHR0b1tzeW1ib2xzW2ldXSA9IGZyb21bc3ltYm9sc1tpXV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gdG87XG59O1xuIiwiLyohXG5cdFBhcGEgUGFyc2Vcblx0djQuMS4yXG5cdGh0dHBzOi8vZ2l0aHViLmNvbS9taG9sdC9QYXBhUGFyc2VcbiovXG4oZnVuY3Rpb24oZ2xvYmFsKVxue1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHR2YXIgSVNfV09SS0VSID0gIWdsb2JhbC5kb2N1bWVudCAmJiAhIWdsb2JhbC5wb3N0TWVzc2FnZSxcblx0XHRJU19QQVBBX1dPUktFUiA9IElTX1dPUktFUiAmJiAvKFxcP3wmKXBhcGF3b3JrZXIoPXwmfCQpLy50ZXN0KGdsb2JhbC5sb2NhdGlvbi5zZWFyY2gpLFxuXHRcdExPQURFRF9TWU5DID0gZmFsc2UsIEFVVE9fU0NSSVBUX1BBVEg7XG5cdHZhciB3b3JrZXJzID0ge30sIHdvcmtlcklkQ291bnRlciA9IDA7XG5cblx0dmFyIFBhcGEgPSB7fTtcblxuXHRQYXBhLnBhcnNlID0gQ3N2VG9Kc29uO1xuXHRQYXBhLnVucGFyc2UgPSBKc29uVG9Dc3Y7XG5cblx0UGFwYS5SRUNPUkRfU0VQID0gU3RyaW5nLmZyb21DaGFyQ29kZSgzMCk7XG5cdFBhcGEuVU5JVF9TRVAgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKDMxKTtcblx0UGFwYS5CWVRFX09SREVSX01BUksgPSBcIlxcdWZlZmZcIjtcblx0UGFwYS5CQURfREVMSU1JVEVSUyA9IFtcIlxcclwiLCBcIlxcblwiLCBcIlxcXCJcIiwgUGFwYS5CWVRFX09SREVSX01BUktdO1xuXHRQYXBhLldPUktFUlNfU1VQUE9SVEVEID0gIUlTX1dPUktFUiAmJiAhIWdsb2JhbC5Xb3JrZXI7XG5cdFBhcGEuU0NSSVBUX1BBVEggPSBudWxsO1x0Ly8gTXVzdCBiZSBzZXQgYnkgeW91ciBjb2RlIGlmIHlvdSB1c2Ugd29ya2VycyBhbmQgdGhpcyBsaWIgaXMgbG9hZGVkIGFzeW5jaHJvbm91c2x5XG5cblx0Ly8gQ29uZmlndXJhYmxlIGNodW5rIHNpemVzIGZvciBsb2NhbCBhbmQgcmVtb3RlIGZpbGVzLCByZXNwZWN0aXZlbHlcblx0UGFwYS5Mb2NhbENodW5rU2l6ZSA9IDEwMjQgKiAxMDI0ICogMTA7XHQvLyAxMCBNQlxuXHRQYXBhLlJlbW90ZUNodW5rU2l6ZSA9IDEwMjQgKiAxMDI0ICogNTtcdC8vIDUgTUJcblx0UGFwYS5EZWZhdWx0RGVsaW1pdGVyID0gXCIsXCI7XHRcdFx0Ly8gVXNlZCBpZiBub3Qgc3BlY2lmaWVkIGFuZCBkZXRlY3Rpb24gZmFpbHNcblxuXHQvLyBFeHBvc2VkIGZvciB0ZXN0aW5nIGFuZCBkZXZlbG9wbWVudCBvbmx5XG5cdFBhcGEuUGFyc2VyID0gUGFyc2VyO1xuXHRQYXBhLlBhcnNlckhhbmRsZSA9IFBhcnNlckhhbmRsZTtcblx0UGFwYS5OZXR3b3JrU3RyZWFtZXIgPSBOZXR3b3JrU3RyZWFtZXI7XG5cdFBhcGEuRmlsZVN0cmVhbWVyID0gRmlsZVN0cmVhbWVyO1xuXHRQYXBhLlN0cmluZ1N0cmVhbWVyID0gU3RyaW5nU3RyZWFtZXI7XG5cblx0aWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKVxuXHR7XG5cdFx0Ly8gRXhwb3J0IHRvIE5vZGUuLi5cblx0XHRtb2R1bGUuZXhwb3J0cyA9IFBhcGE7XG5cdH1cblx0ZWxzZSBpZiAoaXNGdW5jdGlvbihnbG9iYWwuZGVmaW5lKSAmJiBnbG9iYWwuZGVmaW5lLmFtZClcblx0e1xuXHRcdC8vIFdpcmV1cCB3aXRoIFJlcXVpcmVKU1xuXHRcdGRlZmluZShmdW5jdGlvbigpIHsgcmV0dXJuIFBhcGE7IH0pO1xuXHR9XG5cdGVsc2Vcblx0e1xuXHRcdC8vIC4uLm9yIGFzIGJyb3dzZXIgZ2xvYmFsXG5cdFx0Z2xvYmFsLlBhcGEgPSBQYXBhO1xuXHR9XG5cblx0aWYgKGdsb2JhbC5qUXVlcnkpXG5cdHtcblx0XHR2YXIgJCA9IGdsb2JhbC5qUXVlcnk7XG5cdFx0JC5mbi5wYXJzZSA9IGZ1bmN0aW9uKG9wdGlvbnMpXG5cdFx0e1xuXHRcdFx0dmFyIGNvbmZpZyA9IG9wdGlvbnMuY29uZmlnIHx8IHt9O1xuXHRcdFx0dmFyIHF1ZXVlID0gW107XG5cblx0XHRcdHRoaXMuZWFjaChmdW5jdGlvbihpZHgpXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBzdXBwb3J0ZWQgPSAkKHRoaXMpLnByb3AoJ3RhZ05hbWUnKS50b1VwcGVyQ2FzZSgpID09IFwiSU5QVVRcIlxuXHRcdFx0XHRcdFx0XHRcdCYmICQodGhpcykuYXR0cigndHlwZScpLnRvTG93ZXJDYXNlKCkgPT0gXCJmaWxlXCJcblx0XHRcdFx0XHRcdFx0XHQmJiBnbG9iYWwuRmlsZVJlYWRlcjtcblxuXHRcdFx0XHRpZiAoIXN1cHBvcnRlZCB8fCAhdGhpcy5maWxlcyB8fCB0aGlzLmZpbGVzLmxlbmd0aCA9PSAwKVxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1x0Ly8gY29udGludWUgdG8gbmV4dCBpbnB1dCBlbGVtZW50XG5cblx0XHRcdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmZpbGVzLmxlbmd0aDsgaSsrKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cXVldWUucHVzaCh7XG5cdFx0XHRcdFx0XHRmaWxlOiB0aGlzLmZpbGVzW2ldLFxuXHRcdFx0XHRcdFx0aW5wdXRFbGVtOiB0aGlzLFxuXHRcdFx0XHRcdFx0aW5zdGFuY2VDb25maWc6ICQuZXh0ZW5kKHt9LCBjb25maWcpXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRwYXJzZU5leHRGaWxlKCk7XHQvLyBiZWdpbiBwYXJzaW5nXG5cdFx0XHRyZXR1cm4gdGhpcztcdFx0Ly8gbWFpbnRhaW5zIGNoYWluYWJpbGl0eVxuXG5cblx0XHRcdGZ1bmN0aW9uIHBhcnNlTmV4dEZpbGUoKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAocXVldWUubGVuZ3RoID09IDApXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoaXNGdW5jdGlvbihvcHRpb25zLmNvbXBsZXRlKSlcblx0XHRcdFx0XHRcdG9wdGlvbnMuY29tcGxldGUoKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR2YXIgZiA9IHF1ZXVlWzBdO1xuXG5cdFx0XHRcdGlmIChpc0Z1bmN0aW9uKG9wdGlvbnMuYmVmb3JlKSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciByZXR1cm5lZCA9IG9wdGlvbnMuYmVmb3JlKGYuZmlsZSwgZi5pbnB1dEVsZW0pO1xuXG5cdFx0XHRcdFx0aWYgKHR5cGVvZiByZXR1cm5lZCA9PT0gJ29iamVjdCcpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0aWYgKHJldHVybmVkLmFjdGlvbiA9PSBcImFib3J0XCIpXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGVycm9yKFwiQWJvcnRFcnJvclwiLCBmLmZpbGUsIGYuaW5wdXRFbGVtLCByZXR1cm5lZC5yZWFzb24pO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm47XHQvLyBBYm9ydHMgYWxsIHF1ZXVlZCBmaWxlcyBpbW1lZGlhdGVseVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSBpZiAocmV0dXJuZWQuYWN0aW9uID09IFwic2tpcFwiKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRmaWxlQ29tcGxldGUoKTtcdC8vIHBhcnNlIHRoZSBuZXh0IGZpbGUgaW4gdGhlIHF1ZXVlLCBpZiBhbnlcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0ZWxzZSBpZiAodHlwZW9mIHJldHVybmVkLmNvbmZpZyA9PT0gJ29iamVjdCcpXG5cdFx0XHRcdFx0XHRcdGYuaW5zdGFuY2VDb25maWcgPSAkLmV4dGVuZChmLmluc3RhbmNlQ29uZmlnLCByZXR1cm5lZC5jb25maWcpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmIChyZXR1cm5lZCA9PSBcInNraXBcIilcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRmaWxlQ29tcGxldGUoKTtcdC8vIHBhcnNlIHRoZSBuZXh0IGZpbGUgaW4gdGhlIHF1ZXVlLCBpZiBhbnlcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBXcmFwIHVwIHRoZSB1c2VyJ3MgY29tcGxldGUgY2FsbGJhY2ssIGlmIGFueSwgc28gdGhhdCBvdXJzIGFsc28gZ2V0cyBleGVjdXRlZFxuXHRcdFx0XHR2YXIgdXNlckNvbXBsZXRlRnVuYyA9IGYuaW5zdGFuY2VDb25maWcuY29tcGxldGU7XG5cdFx0XHRcdGYuaW5zdGFuY2VDb25maWcuY29tcGxldGUgPSBmdW5jdGlvbihyZXN1bHRzKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKGlzRnVuY3Rpb24odXNlckNvbXBsZXRlRnVuYykpXG5cdFx0XHRcdFx0XHR1c2VyQ29tcGxldGVGdW5jKHJlc3VsdHMsIGYuZmlsZSwgZi5pbnB1dEVsZW0pO1xuXHRcdFx0XHRcdGZpbGVDb21wbGV0ZSgpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdFBhcGEucGFyc2UoZi5maWxlLCBmLmluc3RhbmNlQ29uZmlnKTtcblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gZXJyb3IobmFtZSwgZmlsZSwgZWxlbSwgcmVhc29uKVxuXHRcdFx0e1xuXHRcdFx0XHRpZiAoaXNGdW5jdGlvbihvcHRpb25zLmVycm9yKSlcblx0XHRcdFx0XHRvcHRpb25zLmVycm9yKHtuYW1lOiBuYW1lfSwgZmlsZSwgZWxlbSwgcmVhc29uKTtcblx0XHRcdH1cblxuXHRcdFx0ZnVuY3Rpb24gZmlsZUNvbXBsZXRlKClcblx0XHRcdHtcblx0XHRcdFx0cXVldWUuc3BsaWNlKDAsIDEpO1xuXHRcdFx0XHRwYXJzZU5leHRGaWxlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblxuXHRpZiAoSVNfUEFQQV9XT1JLRVIpXG5cdHtcblx0XHRnbG9iYWwub25tZXNzYWdlID0gd29ya2VyVGhyZWFkUmVjZWl2ZWRNZXNzYWdlO1xuXHR9XG5cdGVsc2UgaWYgKFBhcGEuV09SS0VSU19TVVBQT1JURUQpXG5cdHtcblx0XHRBVVRPX1NDUklQVF9QQVRIID0gZ2V0U2NyaXB0UGF0aCgpO1xuXG5cdFx0Ly8gQ2hlY2sgaWYgdGhlIHNjcmlwdCB3YXMgbG9hZGVkIHN5bmNocm9ub3VzbHlcblx0XHRpZiAoIWRvY3VtZW50LmJvZHkpXG5cdFx0e1xuXHRcdFx0Ly8gQm9keSBkb2Vzbid0IGV4aXN0IHlldCwgbXVzdCBiZSBzeW5jaHJvbm91c1xuXHRcdFx0TE9BREVEX1NZTkMgPSB0cnVlO1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0TE9BREVEX1NZTkMgPSB0cnVlO1xuXHRcdFx0fSwgdHJ1ZSk7XG5cdFx0fVxuXHR9XG5cblxuXG5cblx0ZnVuY3Rpb24gQ3N2VG9Kc29uKF9pbnB1dCwgX2NvbmZpZylcblx0e1xuXHRcdF9jb25maWcgPSBfY29uZmlnIHx8IHt9O1xuXG5cdFx0aWYgKF9jb25maWcud29ya2VyICYmIFBhcGEuV09SS0VSU19TVVBQT1JURUQpXG5cdFx0e1xuXHRcdFx0dmFyIHcgPSBuZXdXb3JrZXIoKTtcblxuXHRcdFx0dy51c2VyU3RlcCA9IF9jb25maWcuc3RlcDtcblx0XHRcdHcudXNlckNodW5rID0gX2NvbmZpZy5jaHVuaztcblx0XHRcdHcudXNlckNvbXBsZXRlID0gX2NvbmZpZy5jb21wbGV0ZTtcblx0XHRcdHcudXNlckVycm9yID0gX2NvbmZpZy5lcnJvcjtcblxuXHRcdFx0X2NvbmZpZy5zdGVwID0gaXNGdW5jdGlvbihfY29uZmlnLnN0ZXApO1xuXHRcdFx0X2NvbmZpZy5jaHVuayA9IGlzRnVuY3Rpb24oX2NvbmZpZy5jaHVuayk7XG5cdFx0XHRfY29uZmlnLmNvbXBsZXRlID0gaXNGdW5jdGlvbihfY29uZmlnLmNvbXBsZXRlKTtcblx0XHRcdF9jb25maWcuZXJyb3IgPSBpc0Z1bmN0aW9uKF9jb25maWcuZXJyb3IpO1xuXHRcdFx0ZGVsZXRlIF9jb25maWcud29ya2VyO1x0Ly8gcHJldmVudCBpbmZpbml0ZSBsb29wXG5cblx0XHRcdHcucG9zdE1lc3NhZ2Uoe1xuXHRcdFx0XHRpbnB1dDogX2lucHV0LFxuXHRcdFx0XHRjb25maWc6IF9jb25maWcsXG5cdFx0XHRcdHdvcmtlcklkOiB3LmlkXG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciBzdHJlYW1lciA9IG51bGw7XG5cdFx0aWYgKHR5cGVvZiBfaW5wdXQgPT09ICdzdHJpbmcnKVxuXHRcdHtcblx0XHRcdGlmIChfY29uZmlnLmRvd25sb2FkKVxuXHRcdFx0XHRzdHJlYW1lciA9IG5ldyBOZXR3b3JrU3RyZWFtZXIoX2NvbmZpZyk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHN0cmVhbWVyID0gbmV3IFN0cmluZ1N0cmVhbWVyKF9jb25maWcpO1xuXHRcdH1cblx0XHRlbHNlIGlmICgoZ2xvYmFsLkZpbGUgJiYgX2lucHV0IGluc3RhbmNlb2YgRmlsZSkgfHwgX2lucHV0IGluc3RhbmNlb2YgT2JqZWN0KVx0Ly8gLi4uU2FmYXJpLiAoc2VlIGlzc3VlICMxMDYpXG5cdFx0XHRzdHJlYW1lciA9IG5ldyBGaWxlU3RyZWFtZXIoX2NvbmZpZyk7XG5cblx0XHRyZXR1cm4gc3RyZWFtZXIuc3RyZWFtKF9pbnB1dCk7XG5cdH1cblxuXG5cblxuXG5cblx0ZnVuY3Rpb24gSnNvblRvQ3N2KF9pbnB1dCwgX2NvbmZpZylcblx0e1xuXHRcdHZhciBfb3V0cHV0ID0gXCJcIjtcblx0XHR2YXIgX2ZpZWxkcyA9IFtdO1xuXG5cdFx0Ly8gRGVmYXVsdCBjb25maWd1cmF0aW9uXG5cblx0XHQvKiogd2hldGhlciB0byBzdXJyb3VuZCBldmVyeSBkYXR1bSB3aXRoIHF1b3RlcyAqL1xuXHRcdHZhciBfcXVvdGVzID0gZmFsc2U7XG5cblx0XHQvKiogZGVsaW1pdGluZyBjaGFyYWN0ZXIgKi9cblx0XHR2YXIgX2RlbGltaXRlciA9IFwiLFwiO1xuXG5cdFx0LyoqIG5ld2xpbmUgY2hhcmFjdGVyKHMpICovXG5cdFx0dmFyIF9uZXdsaW5lID0gXCJcXHJcXG5cIjtcblxuXHRcdHVucGFja0NvbmZpZygpO1xuXG5cdFx0aWYgKHR5cGVvZiBfaW5wdXQgPT09ICdzdHJpbmcnKVxuXHRcdFx0X2lucHV0ID0gSlNPTi5wYXJzZShfaW5wdXQpO1xuXG5cdFx0aWYgKF9pbnB1dCBpbnN0YW5jZW9mIEFycmF5KVxuXHRcdHtcblx0XHRcdGlmICghX2lucHV0Lmxlbmd0aCB8fCBfaW5wdXRbMF0gaW5zdGFuY2VvZiBBcnJheSlcblx0XHRcdFx0cmV0dXJuIHNlcmlhbGl6ZShudWxsLCBfaW5wdXQpO1xuXHRcdFx0ZWxzZSBpZiAodHlwZW9mIF9pbnB1dFswXSA9PT0gJ29iamVjdCcpXG5cdFx0XHRcdHJldHVybiBzZXJpYWxpemUob2JqZWN0S2V5cyhfaW5wdXRbMF0pLCBfaW5wdXQpO1xuXHRcdH1cblx0XHRlbHNlIGlmICh0eXBlb2YgX2lucHV0ID09PSAnb2JqZWN0Jylcblx0XHR7XG5cdFx0XHRpZiAodHlwZW9mIF9pbnB1dC5kYXRhID09PSAnc3RyaW5nJylcblx0XHRcdFx0X2lucHV0LmRhdGEgPSBKU09OLnBhcnNlKF9pbnB1dC5kYXRhKTtcblxuXHRcdFx0aWYgKF9pbnB1dC5kYXRhIGluc3RhbmNlb2YgQXJyYXkpXG5cdFx0XHR7XG5cdFx0XHRcdGlmICghX2lucHV0LmZpZWxkcylcblx0XHRcdFx0XHRfaW5wdXQuZmllbGRzID0gX2lucHV0LmRhdGFbMF0gaW5zdGFuY2VvZiBBcnJheVxuXHRcdFx0XHRcdFx0XHRcdFx0PyBfaW5wdXQuZmllbGRzXG5cdFx0XHRcdFx0XHRcdFx0XHQ6IG9iamVjdEtleXMoX2lucHV0LmRhdGFbMF0pO1xuXG5cdFx0XHRcdGlmICghKF9pbnB1dC5kYXRhWzBdIGluc3RhbmNlb2YgQXJyYXkpICYmIHR5cGVvZiBfaW5wdXQuZGF0YVswXSAhPT0gJ29iamVjdCcpXG5cdFx0XHRcdFx0X2lucHV0LmRhdGEgPSBbX2lucHV0LmRhdGFdO1x0Ly8gaGFuZGxlcyBpbnB1dCBsaWtlIFsxLDIsM10gb3IgW1wiYXNkZlwiXVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gc2VyaWFsaXplKF9pbnB1dC5maWVsZHMgfHwgW10sIF9pbnB1dC5kYXRhIHx8IFtdKTtcblx0XHR9XG5cblx0XHQvLyBEZWZhdWx0IChhbnkgdmFsaWQgcGF0aHMgc2hvdWxkIHJldHVybiBiZWZvcmUgdGhpcylcblx0XHR0aHJvdyBcImV4Y2VwdGlvbjogVW5hYmxlIHRvIHNlcmlhbGl6ZSB1bnJlY29nbml6ZWQgaW5wdXRcIjtcblxuXG5cdFx0ZnVuY3Rpb24gdW5wYWNrQ29uZmlnKClcblx0XHR7XG5cdFx0XHRpZiAodHlwZW9mIF9jb25maWcgIT09ICdvYmplY3QnKVxuXHRcdFx0XHRyZXR1cm47XG5cblx0XHRcdGlmICh0eXBlb2YgX2NvbmZpZy5kZWxpbWl0ZXIgPT09ICdzdHJpbmcnXG5cdFx0XHRcdCYmIF9jb25maWcuZGVsaW1pdGVyLmxlbmd0aCA9PSAxXG5cdFx0XHRcdCYmIFBhcGEuQkFEX0RFTElNSVRFUlMuaW5kZXhPZihfY29uZmlnLmRlbGltaXRlcikgPT0gLTEpXG5cdFx0XHR7XG5cdFx0XHRcdF9kZWxpbWl0ZXIgPSBfY29uZmlnLmRlbGltaXRlcjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHR5cGVvZiBfY29uZmlnLnF1b3RlcyA9PT0gJ2Jvb2xlYW4nXG5cdFx0XHRcdHx8IF9jb25maWcucXVvdGVzIGluc3RhbmNlb2YgQXJyYXkpXG5cdFx0XHRcdF9xdW90ZXMgPSBfY29uZmlnLnF1b3RlcztcblxuXHRcdFx0aWYgKHR5cGVvZiBfY29uZmlnLm5ld2xpbmUgPT09ICdzdHJpbmcnKVxuXHRcdFx0XHRfbmV3bGluZSA9IF9jb25maWcubmV3bGluZTtcblx0XHR9XG5cblxuXHRcdC8qKiBUdXJucyBhbiBvYmplY3QncyBrZXlzIGludG8gYW4gYXJyYXkgKi9cblx0XHRmdW5jdGlvbiBvYmplY3RLZXlzKG9iailcblx0XHR7XG5cdFx0XHRpZiAodHlwZW9mIG9iaiAhPT0gJ29iamVjdCcpXG5cdFx0XHRcdHJldHVybiBbXTtcblx0XHRcdHZhciBrZXlzID0gW107XG5cdFx0XHRmb3IgKHZhciBrZXkgaW4gb2JqKVxuXHRcdFx0XHRrZXlzLnB1c2goa2V5KTtcblx0XHRcdHJldHVybiBrZXlzO1xuXHRcdH1cblxuXHRcdC8qKiBUaGUgZG91YmxlIGZvciBsb29wIHRoYXQgaXRlcmF0ZXMgdGhlIGRhdGEgYW5kIHdyaXRlcyBvdXQgYSBDU1Ygc3RyaW5nIGluY2x1ZGluZyBoZWFkZXIgcm93ICovXG5cdFx0ZnVuY3Rpb24gc2VyaWFsaXplKGZpZWxkcywgZGF0YSlcblx0XHR7XG5cdFx0XHR2YXIgY3N2ID0gXCJcIjtcblxuXHRcdFx0aWYgKHR5cGVvZiBmaWVsZHMgPT09ICdzdHJpbmcnKVxuXHRcdFx0XHRmaWVsZHMgPSBKU09OLnBhcnNlKGZpZWxkcyk7XG5cdFx0XHRpZiAodHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnKVxuXHRcdFx0XHRkYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcblxuXHRcdFx0dmFyIGhhc0hlYWRlciA9IGZpZWxkcyBpbnN0YW5jZW9mIEFycmF5ICYmIGZpZWxkcy5sZW5ndGggPiAwO1xuXHRcdFx0dmFyIGRhdGFLZXllZEJ5RmllbGQgPSAhKGRhdGFbMF0gaW5zdGFuY2VvZiBBcnJheSk7XG5cblx0XHRcdC8vIElmIHRoZXJlIGEgaGVhZGVyIHJvdywgd3JpdGUgaXQgZmlyc3Rcblx0XHRcdGlmIChoYXNIZWFkZXIpXG5cdFx0XHR7XG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgZmllbGRzLmxlbmd0aDsgaSsrKVxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0aWYgKGkgPiAwKVxuXHRcdFx0XHRcdFx0Y3N2ICs9IF9kZWxpbWl0ZXI7XG5cdFx0XHRcdFx0Y3N2ICs9IHNhZmUoZmllbGRzW2ldLCBpKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoZGF0YS5sZW5ndGggPiAwKVxuXHRcdFx0XHRcdGNzdiArPSBfbmV3bGluZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gVGhlbiB3cml0ZSBvdXQgdGhlIGRhdGFcblx0XHRcdGZvciAodmFyIHJvdyA9IDA7IHJvdyA8IGRhdGEubGVuZ3RoOyByb3crKylcblx0XHRcdHtcblx0XHRcdFx0dmFyIG1heENvbCA9IGhhc0hlYWRlciA/IGZpZWxkcy5sZW5ndGggOiBkYXRhW3Jvd10ubGVuZ3RoO1xuXG5cdFx0XHRcdGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IG1heENvbDsgY29sKyspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRpZiAoY29sID4gMClcblx0XHRcdFx0XHRcdGNzdiArPSBfZGVsaW1pdGVyO1xuXHRcdFx0XHRcdHZhciBjb2xJZHggPSBoYXNIZWFkZXIgJiYgZGF0YUtleWVkQnlGaWVsZCA/IGZpZWxkc1tjb2xdIDogY29sO1xuXHRcdFx0XHRcdGNzdiArPSBzYWZlKGRhdGFbcm93XVtjb2xJZHhdLCBjb2wpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKHJvdyA8IGRhdGEubGVuZ3RoIC0gMSlcblx0XHRcdFx0XHRjc3YgKz0gX25ld2xpbmU7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBjc3Y7XG5cdFx0fVxuXG5cdFx0LyoqIEVuY2xvc2VzIGEgdmFsdWUgYXJvdW5kIHF1b3RlcyBpZiBuZWVkZWQgKG1ha2VzIGEgdmFsdWUgc2FmZSBmb3IgQ1NWIGluc2VydGlvbikgKi9cblx0XHRmdW5jdGlvbiBzYWZlKHN0ciwgY29sKVxuXHRcdHtcblx0XHRcdGlmICh0eXBlb2Ygc3RyID09PSBcInVuZGVmaW5lZFwiIHx8IHN0ciA9PT0gbnVsbClcblx0XHRcdFx0cmV0dXJuIFwiXCI7XG5cblx0XHRcdHN0ciA9IHN0ci50b1N0cmluZygpLnJlcGxhY2UoL1wiL2csICdcIlwiJyk7XG5cblx0XHRcdHZhciBuZWVkc1F1b3RlcyA9ICh0eXBlb2YgX3F1b3RlcyA9PT0gJ2Jvb2xlYW4nICYmIF9xdW90ZXMpXG5cdFx0XHRcdFx0XHRcdHx8IChfcXVvdGVzIGluc3RhbmNlb2YgQXJyYXkgJiYgX3F1b3Rlc1tjb2xdKVxuXHRcdFx0XHRcdFx0XHR8fCBoYXNBbnkoc3RyLCBQYXBhLkJBRF9ERUxJTUlURVJTKVxuXHRcdFx0XHRcdFx0XHR8fCBzdHIuaW5kZXhPZihfZGVsaW1pdGVyKSA+IC0xXG5cdFx0XHRcdFx0XHRcdHx8IHN0ci5jaGFyQXQoMCkgPT0gJyAnXG5cdFx0XHRcdFx0XHRcdHx8IHN0ci5jaGFyQXQoc3RyLmxlbmd0aCAtIDEpID09ICcgJztcblxuXHRcdFx0cmV0dXJuIG5lZWRzUXVvdGVzID8gJ1wiJyArIHN0ciArICdcIicgOiBzdHI7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaGFzQW55KHN0ciwgc3Vic3RyaW5ncylcblx0XHR7XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IHN1YnN0cmluZ3MubGVuZ3RoOyBpKyspXG5cdFx0XHRcdGlmIChzdHIuaW5kZXhPZihzdWJzdHJpbmdzW2ldKSA+IC0xKVxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fVxuXG5cdC8qKiBDaHVua1N0cmVhbWVyIGlzIHRoZSBiYXNlIHByb3RvdHlwZSBmb3IgdmFyaW91cyBzdHJlYW1lciBpbXBsZW1lbnRhdGlvbnMuICovXG5cdGZ1bmN0aW9uIENodW5rU3RyZWFtZXIoY29uZmlnKVxuXHR7XG5cdFx0dGhpcy5faGFuZGxlID0gbnVsbDtcblx0XHR0aGlzLl9wYXVzZWQgPSBmYWxzZTtcblx0XHR0aGlzLl9maW5pc2hlZCA9IGZhbHNlO1xuXHRcdHRoaXMuX2lucHV0ID0gbnVsbDtcblx0XHR0aGlzLl9iYXNlSW5kZXggPSAwO1xuXHRcdHRoaXMuX3BhcnRpYWxMaW5lID0gXCJcIjtcblx0XHR0aGlzLl9yb3dDb3VudCA9IDA7XG5cdFx0dGhpcy5fc3RhcnQgPSAwO1xuXHRcdHRoaXMuX25leHRDaHVuayA9IG51bGw7XG5cdFx0dGhpcy5pc0ZpcnN0Q2h1bmsgPSB0cnVlO1xuXHRcdHRoaXMuX2NvbXBsZXRlUmVzdWx0cyA9IHtcblx0XHRcdGRhdGE6IFtdLFxuXHRcdFx0ZXJyb3JzOiBbXSxcblx0XHRcdG1ldGE6IHt9XG5cdFx0fTtcblx0XHRyZXBsYWNlQ29uZmlnLmNhbGwodGhpcywgY29uZmlnKTtcblxuXHRcdHRoaXMucGFyc2VDaHVuayA9IGZ1bmN0aW9uKGNodW5rKVxuXHRcdHtcblx0XHRcdC8vIEZpcnN0IGNodW5rIHByZS1wcm9jZXNzaW5nXG5cdFx0XHRpZiAodGhpcy5pc0ZpcnN0Q2h1bmsgJiYgaXNGdW5jdGlvbih0aGlzLl9jb25maWcuYmVmb3JlRmlyc3RDaHVuaykpXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBtb2RpZmllZENodW5rID0gdGhpcy5fY29uZmlnLmJlZm9yZUZpcnN0Q2h1bmsoY2h1bmspO1xuXHRcdFx0XHRpZiAobW9kaWZpZWRDaHVuayAhPT0gdW5kZWZpbmVkKVxuXHRcdFx0XHRcdGNodW5rID0gbW9kaWZpZWRDaHVuaztcblx0XHRcdH1cblx0XHRcdHRoaXMuaXNGaXJzdENodW5rID0gZmFsc2U7XG5cblx0XHRcdC8vIFJlam9pbiB0aGUgbGluZSB3ZSBsaWtlbHkganVzdCBzcGxpdCBpbiB0d28gYnkgY2h1bmtpbmcgdGhlIGZpbGVcblx0XHRcdHZhciBhZ2dyZWdhdGUgPSB0aGlzLl9wYXJ0aWFsTGluZSArIGNodW5rO1xuXHRcdFx0dGhpcy5fcGFydGlhbExpbmUgPSBcIlwiO1xuXG5cdFx0XHR2YXIgcmVzdWx0cyA9IHRoaXMuX2hhbmRsZS5wYXJzZShhZ2dyZWdhdGUsIHRoaXMuX2Jhc2VJbmRleCwgIXRoaXMuX2ZpbmlzaGVkKTtcblx0XHRcdFxuXHRcdFx0aWYgKHRoaXMuX2hhbmRsZS5wYXVzZWQoKSB8fCB0aGlzLl9oYW5kbGUuYWJvcnRlZCgpKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcblx0XHRcdHZhciBsYXN0SW5kZXggPSByZXN1bHRzLm1ldGEuY3Vyc29yO1xuXHRcdFx0XG5cdFx0XHRpZiAoIXRoaXMuX2ZpbmlzaGVkKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9wYXJ0aWFsTGluZSA9IGFnZ3JlZ2F0ZS5zdWJzdHJpbmcobGFzdEluZGV4IC0gdGhpcy5fYmFzZUluZGV4KTtcblx0XHRcdFx0dGhpcy5fYmFzZUluZGV4ID0gbGFzdEluZGV4O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAocmVzdWx0cyAmJiByZXN1bHRzLmRhdGEpXG5cdFx0XHRcdHRoaXMuX3Jvd0NvdW50ICs9IHJlc3VsdHMuZGF0YS5sZW5ndGg7XG5cblx0XHRcdHZhciBmaW5pc2hlZEluY2x1ZGluZ1ByZXZpZXcgPSB0aGlzLl9maW5pc2hlZCB8fCAodGhpcy5fY29uZmlnLnByZXZpZXcgJiYgdGhpcy5fcm93Q291bnQgPj0gdGhpcy5fY29uZmlnLnByZXZpZXcpO1xuXG5cdFx0XHRpZiAoSVNfUEFQQV9XT1JLRVIpXG5cdFx0XHR7XG5cdFx0XHRcdGdsb2JhbC5wb3N0TWVzc2FnZSh7XG5cdFx0XHRcdFx0cmVzdWx0czogcmVzdWx0cyxcblx0XHRcdFx0XHR3b3JrZXJJZDogUGFwYS5XT1JLRVJfSUQsXG5cdFx0XHRcdFx0ZmluaXNoZWQ6IGZpbmlzaGVkSW5jbHVkaW5nUHJldmlld1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fY29uZmlnLmNodW5rKSlcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fY29uZmlnLmNodW5rKHJlc3VsdHMsIHRoaXMuX2hhbmRsZSk7XG5cdFx0XHRcdGlmICh0aGlzLl9wYXVzZWQpXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRyZXN1bHRzID0gdW5kZWZpbmVkO1xuXHRcdFx0XHR0aGlzLl9jb21wbGV0ZVJlc3VsdHMgPSB1bmRlZmluZWQ7XG5cdFx0XHR9XG5cblx0XHRcdGlmICghdGhpcy5fY29uZmlnLnN0ZXAgJiYgIXRoaXMuX2NvbmZpZy5jaHVuaykge1xuXHRcdFx0XHR0aGlzLl9jb21wbGV0ZVJlc3VsdHMuZGF0YSA9IHRoaXMuX2NvbXBsZXRlUmVzdWx0cy5kYXRhLmNvbmNhdChyZXN1bHRzLmRhdGEpO1xuXHRcdFx0XHR0aGlzLl9jb21wbGV0ZVJlc3VsdHMuZXJyb3JzID0gdGhpcy5fY29tcGxldGVSZXN1bHRzLmVycm9ycy5jb25jYXQocmVzdWx0cy5lcnJvcnMpO1xuXHRcdFx0XHR0aGlzLl9jb21wbGV0ZVJlc3VsdHMubWV0YSA9IHJlc3VsdHMubWV0YTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGZpbmlzaGVkSW5jbHVkaW5nUHJldmlldyAmJiBpc0Z1bmN0aW9uKHRoaXMuX2NvbmZpZy5jb21wbGV0ZSkgJiYgKCFyZXN1bHRzIHx8ICFyZXN1bHRzLm1ldGEuYWJvcnRlZCkpXG5cdFx0XHRcdHRoaXMuX2NvbmZpZy5jb21wbGV0ZSh0aGlzLl9jb21wbGV0ZVJlc3VsdHMpO1xuXG5cdFx0XHRpZiAoIWZpbmlzaGVkSW5jbHVkaW5nUHJldmlldyAmJiAoIXJlc3VsdHMgfHwgIXJlc3VsdHMubWV0YS5wYXVzZWQpKVxuXHRcdFx0XHR0aGlzLl9uZXh0Q2h1bmsoKTtcblxuXHRcdFx0cmV0dXJuIHJlc3VsdHM7XG5cdFx0fTtcblxuXHRcdHRoaXMuX3NlbmRFcnJvciA9IGZ1bmN0aW9uKGVycm9yKVxuXHRcdHtcblx0XHRcdGlmIChpc0Z1bmN0aW9uKHRoaXMuX2NvbmZpZy5lcnJvcikpXG5cdFx0XHRcdHRoaXMuX2NvbmZpZy5lcnJvcihlcnJvcik7XG5cdFx0XHRlbHNlIGlmIChJU19QQVBBX1dPUktFUiAmJiB0aGlzLl9jb25maWcuZXJyb3IpXG5cdFx0XHR7XG5cdFx0XHRcdGdsb2JhbC5wb3N0TWVzc2FnZSh7XG5cdFx0XHRcdFx0d29ya2VySWQ6IFBhcGEuV09SS0VSX0lELFxuXHRcdFx0XHRcdGVycm9yOiBlcnJvcixcblx0XHRcdFx0XHRmaW5pc2hlZDogZmFsc2Vcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdGZ1bmN0aW9uIHJlcGxhY2VDb25maWcoY29uZmlnKVxuXHRcdHtcblx0XHRcdC8vIERlZXAtY29weSB0aGUgY29uZmlnIHNvIHdlIGNhbiBlZGl0IGl0XG5cdFx0XHR2YXIgY29uZmlnQ29weSA9IGNvcHkoY29uZmlnKTtcblx0XHRcdGNvbmZpZ0NvcHkuY2h1bmtTaXplID0gcGFyc2VJbnQoY29uZmlnQ29weS5jaHVua1NpemUpO1x0Ly8gcGFyc2VJbnQgVkVSWSBpbXBvcnRhbnQgc28gd2UgZG9uJ3QgY29uY2F0ZW5hdGUgc3RyaW5ncyFcblx0XHRcdGlmICghY29uZmlnLnN0ZXAgJiYgIWNvbmZpZy5jaHVuaylcblx0XHRcdFx0Y29uZmlnQ29weS5jaHVua1NpemUgPSBudWxsOyAgLy8gZGlzYWJsZSBSYW5nZSBoZWFkZXIgaWYgbm90IHN0cmVhbWluZzsgYmFkIHZhbHVlcyBicmVhayBJSVMgLSBzZWUgaXNzdWUgIzE5NlxuXHRcdFx0dGhpcy5faGFuZGxlID0gbmV3IFBhcnNlckhhbmRsZShjb25maWdDb3B5KTtcblx0XHRcdHRoaXMuX2hhbmRsZS5zdHJlYW1lciA9IHRoaXM7XG5cdFx0XHR0aGlzLl9jb25maWcgPSBjb25maWdDb3B5O1x0Ly8gcGVyc2lzdCB0aGUgY29weSB0byB0aGUgY2FsbGVyXG5cdFx0fVxuXHR9XG5cblxuXHRmdW5jdGlvbiBOZXR3b3JrU3RyZWFtZXIoY29uZmlnKVxuXHR7XG5cdFx0Y29uZmlnID0gY29uZmlnIHx8IHt9O1xuXHRcdGlmICghY29uZmlnLmNodW5rU2l6ZSlcblx0XHRcdGNvbmZpZy5jaHVua1NpemUgPSBQYXBhLlJlbW90ZUNodW5rU2l6ZTtcblx0XHRDaHVua1N0cmVhbWVyLmNhbGwodGhpcywgY29uZmlnKTtcblxuXHRcdHZhciB4aHI7XG5cblx0XHRpZiAoSVNfV09SS0VSKVxuXHRcdHtcblx0XHRcdHRoaXMuX25leHRDaHVuayA9IGZ1bmN0aW9uKClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fcmVhZENodW5rKCk7XG5cdFx0XHRcdHRoaXMuX2NodW5rTG9hZGVkKCk7XG5cdFx0XHR9O1xuXHRcdH1cblx0XHRlbHNlXG5cdFx0e1xuXHRcdFx0dGhpcy5fbmV4dENodW5rID0gZnVuY3Rpb24oKVxuXHRcdFx0e1xuXHRcdFx0XHR0aGlzLl9yZWFkQ2h1bmsoKTtcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0dGhpcy5zdHJlYW0gPSBmdW5jdGlvbih1cmwpXG5cdFx0e1xuXHRcdFx0dGhpcy5faW5wdXQgPSB1cmw7XG5cdFx0XHR0aGlzLl9uZXh0Q2h1bmsoKTtcdC8vIFN0YXJ0cyBzdHJlYW1pbmdcblx0XHR9O1xuXG5cdFx0dGhpcy5fcmVhZENodW5rID0gZnVuY3Rpb24oKVxuXHRcdHtcblx0XHRcdGlmICh0aGlzLl9maW5pc2hlZClcblx0XHRcdHtcblx0XHRcdFx0dGhpcy5fY2h1bmtMb2FkZWQoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHRcdFxuXHRcdFx0aWYgKCFJU19XT1JLRVIpXG5cdFx0XHR7XG5cdFx0XHRcdHhoci5vbmxvYWQgPSBiaW5kRnVuY3Rpb24odGhpcy5fY2h1bmtMb2FkZWQsIHRoaXMpO1xuXHRcdFx0XHR4aHIub25lcnJvciA9IGJpbmRGdW5jdGlvbih0aGlzLl9jaHVua0Vycm9yLCB0aGlzKTtcblx0XHRcdH1cblxuXHRcdFx0eGhyLm9wZW4oXCJHRVRcIiwgdGhpcy5faW5wdXQsICFJU19XT1JLRVIpO1xuXHRcdFx0XG5cdFx0XHRpZiAodGhpcy5fY29uZmlnLmNodW5rU2l6ZSlcblx0XHRcdHtcblx0XHRcdFx0dmFyIGVuZCA9IHRoaXMuX3N0YXJ0ICsgdGhpcy5fY29uZmlnLmNodW5rU2l6ZSAtIDE7XHQvLyBtaW51cyBvbmUgYmVjYXVzZSBieXRlIHJhbmdlIGlzIGluY2x1c2l2ZVxuXHRcdFx0XHR4aHIuc2V0UmVxdWVzdEhlYWRlcihcIlJhbmdlXCIsIFwiYnl0ZXM9XCIrdGhpcy5fc3RhcnQrXCItXCIrZW5kKTtcblx0XHRcdFx0eGhyLnNldFJlcXVlc3RIZWFkZXIoXCJJZi1Ob25lLU1hdGNoXCIsIFwid2Via2l0LW5vLWNhY2hlXCIpOyAvLyBodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9ODI2NzJcblx0XHRcdH1cblxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0eGhyLnNlbmQoKTtcblx0XHRcdH1cblx0XHRcdGNhdGNoIChlcnIpIHtcblx0XHRcdFx0dGhpcy5fY2h1bmtFcnJvcihlcnIubWVzc2FnZSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChJU19XT1JLRVIgJiYgeGhyLnN0YXR1cyA9PSAwKVxuXHRcdFx0XHR0aGlzLl9jaHVua0Vycm9yKCk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHRoaXMuX3N0YXJ0ICs9IHRoaXMuX2NvbmZpZy5jaHVua1NpemU7XG5cdFx0fVxuXG5cdFx0dGhpcy5fY2h1bmtMb2FkZWQgPSBmdW5jdGlvbigpXG5cdFx0e1xuXHRcdFx0aWYgKHhoci5yZWFkeVN0YXRlICE9IDQpXG5cdFx0XHRcdHJldHVybjtcblxuXHRcdFx0aWYgKHhoci5zdGF0dXMgPCAyMDAgfHwgeGhyLnN0YXR1cyA+PSA0MDApXG5cdFx0XHR7XG5cdFx0XHRcdHRoaXMuX2NodW5rRXJyb3IoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLl9maW5pc2hlZCA9ICF0aGlzLl9jb25maWcuY2h1bmtTaXplIHx8IHRoaXMuX3N0YXJ0ID4gZ2V0RmlsZVNpemUoeGhyKTtcblx0XHRcdHRoaXMucGFyc2VDaHVuayh4aHIucmVzcG9uc2VUZXh0KTtcblx0XHR9XG5cblx0XHR0aGlzLl9jaHVua0Vycm9yID0gZnVuY3Rpb24oZXJyb3JNZXNzYWdlKVxuXHRcdHtcblx0XHRcdHZhciBlcnJvclRleHQgPSB4aHIuc3RhdHVzVGV4dCB8fCBlcnJvck1lc3NhZ2U7XG5cdFx0XHR0aGlzLl9zZW5kRXJyb3IoZXJyb3JUZXh0KTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBnZXRGaWxlU2l6ZSh4aHIpXG5cdFx0e1xuXHRcdFx0dmFyIGNvbnRlbnRSYW5nZSA9IHhoci5nZXRSZXNwb25zZUhlYWRlcihcIkNvbnRlbnQtUmFuZ2VcIik7XG5cdFx0XHRyZXR1cm4gcGFyc2VJbnQoY29udGVudFJhbmdlLnN1YnN0cihjb250ZW50UmFuZ2UubGFzdEluZGV4T2YoXCIvXCIpICsgMSkpO1xuXHRcdH1cblx0fVxuXHROZXR3b3JrU3RyZWFtZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShDaHVua1N0cmVhbWVyLnByb3RvdHlwZSk7XG5cdE5ldHdvcmtTdHJlYW1lci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBOZXR3b3JrU3RyZWFtZXI7XG5cblxuXHRmdW5jdGlvbiBGaWxlU3RyZWFtZXIoY29uZmlnKVxuXHR7XG5cdFx0Y29uZmlnID0gY29uZmlnIHx8IHt9O1xuXHRcdGlmICghY29uZmlnLmNodW5rU2l6ZSlcblx0XHRcdGNvbmZpZy5jaHVua1NpemUgPSBQYXBhLkxvY2FsQ2h1bmtTaXplO1xuXHRcdENodW5rU3RyZWFtZXIuY2FsbCh0aGlzLCBjb25maWcpO1xuXG5cdFx0dmFyIHJlYWRlciwgc2xpY2U7XG5cblx0XHQvLyBGaWxlUmVhZGVyIGlzIGJldHRlciB0aGFuIEZpbGVSZWFkZXJTeW5jIChldmVuIGluIHdvcmtlcikgLSBzZWUgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3EvMjQ3MDg2NDkvMTA0ODg2MlxuXHRcdC8vIEJ1dCBGaXJlZm94IGlzIGEgcGlsbCwgdG9vIC0gc2VlIGlzc3VlICM3NjogaHR0cHM6Ly9naXRodWIuY29tL21ob2x0L1BhcGFQYXJzZS9pc3N1ZXMvNzZcblx0XHR2YXIgdXNpbmdBc3luY1JlYWRlciA9IHR5cGVvZiBGaWxlUmVhZGVyICE9PSAndW5kZWZpbmVkJztcdC8vIFNhZmFyaSBkb2Vzbid0IGNvbnNpZGVyIGl0IGEgZnVuY3Rpb24gLSBzZWUgaXNzdWUgIzEwNVxuXG5cdFx0dGhpcy5zdHJlYW0gPSBmdW5jdGlvbihmaWxlKVxuXHRcdHtcblx0XHRcdHRoaXMuX2lucHV0ID0gZmlsZTtcblx0XHRcdHNsaWNlID0gZmlsZS5zbGljZSB8fCBmaWxlLndlYmtpdFNsaWNlIHx8IGZpbGUubW96U2xpY2U7XG5cblx0XHRcdGlmICh1c2luZ0FzeW5jUmVhZGVyKVxuXHRcdFx0e1xuXHRcdFx0XHRyZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1x0XHQvLyBQcmVmZXJyZWQgbWV0aG9kIG9mIHJlYWRpbmcgZmlsZXMsIGV2ZW4gaW4gd29ya2Vyc1xuXHRcdFx0XHRyZWFkZXIub25sb2FkID0gYmluZEZ1bmN0aW9uKHRoaXMuX2NodW5rTG9hZGVkLCB0aGlzKTtcblx0XHRcdFx0cmVhZGVyLm9uZXJyb3IgPSBiaW5kRnVuY3Rpb24odGhpcy5fY2h1bmtFcnJvciwgdGhpcyk7XG5cdFx0XHR9XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyU3luYygpO1x0Ly8gSGFjayBmb3IgcnVubmluZyBpbiBhIHdlYiB3b3JrZXIgaW4gRmlyZWZveFxuXG5cdFx0XHR0aGlzLl9uZXh0Q2h1bmsoKTtcdC8vIFN0YXJ0cyBzdHJlYW1pbmdcblx0XHR9O1xuXG5cdFx0dGhpcy5fbmV4dENodW5rID0gZnVuY3Rpb24oKVxuXHRcdHtcblx0XHRcdGlmICghdGhpcy5fZmluaXNoZWQgJiYgKCF0aGlzLl9jb25maWcucHJldmlldyB8fCB0aGlzLl9yb3dDb3VudCA8IHRoaXMuX2NvbmZpZy5wcmV2aWV3KSlcblx0XHRcdFx0dGhpcy5fcmVhZENodW5rKCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5fcmVhZENodW5rID0gZnVuY3Rpb24oKVxuXHRcdHtcblx0XHRcdHZhciBpbnB1dCA9IHRoaXMuX2lucHV0O1xuXHRcdFx0aWYgKHRoaXMuX2NvbmZpZy5jaHVua1NpemUpXG5cdFx0XHR7XG5cdFx0XHRcdHZhciBlbmQgPSBNYXRoLm1pbih0aGlzLl9zdGFydCArIHRoaXMuX2NvbmZpZy5jaHVua1NpemUsIHRoaXMuX2lucHV0LnNpemUpO1xuXHRcdFx0XHRpbnB1dCA9IHNsaWNlLmNhbGwoaW5wdXQsIHRoaXMuX3N0YXJ0LCBlbmQpO1xuXHRcdFx0fVxuXHRcdFx0dmFyIHR4dCA9IHJlYWRlci5yZWFkQXNUZXh0KGlucHV0LCB0aGlzLl9jb25maWcuZW5jb2RpbmcpO1xuXHRcdFx0aWYgKCF1c2luZ0FzeW5jUmVhZGVyKVxuXHRcdFx0XHR0aGlzLl9jaHVua0xvYWRlZCh7IHRhcmdldDogeyByZXN1bHQ6IHR4dCB9IH0pO1x0Ly8gbWltaWMgdGhlIGFzeW5jIHNpZ25hdHVyZVxuXHRcdH1cblxuXHRcdHRoaXMuX2NodW5rTG9hZGVkID0gZnVuY3Rpb24oZXZlbnQpXG5cdFx0e1xuXHRcdFx0Ly8gVmVyeSBpbXBvcnRhbnQgdG8gaW5jcmVtZW50IHN0YXJ0IGVhY2ggdGltZSBiZWZvcmUgaGFuZGxpbmcgcmVzdWx0c1xuXHRcdFx0dGhpcy5fc3RhcnQgKz0gdGhpcy5fY29uZmlnLmNodW5rU2l6ZTtcblx0XHRcdHRoaXMuX2ZpbmlzaGVkID0gIXRoaXMuX2NvbmZpZy5jaHVua1NpemUgfHwgdGhpcy5fc3RhcnQgPj0gdGhpcy5faW5wdXQuc2l6ZTtcblx0XHRcdHRoaXMucGFyc2VDaHVuayhldmVudC50YXJnZXQucmVzdWx0KTtcblx0XHR9XG5cblx0XHR0aGlzLl9jaHVua0Vycm9yID0gZnVuY3Rpb24oKVxuXHRcdHtcblx0XHRcdHRoaXMuX3NlbmRFcnJvcihyZWFkZXIuZXJyb3IpO1xuXHRcdH1cblxuXHR9XG5cdEZpbGVTdHJlYW1lci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKENodW5rU3RyZWFtZXIucHJvdG90eXBlKTtcblx0RmlsZVN0cmVhbWVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IEZpbGVTdHJlYW1lcjtcblxuXG5cdGZ1bmN0aW9uIFN0cmluZ1N0cmVhbWVyKGNvbmZpZylcblx0e1xuXHRcdGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcblx0XHRDaHVua1N0cmVhbWVyLmNhbGwodGhpcywgY29uZmlnKTtcblxuXHRcdHZhciBzdHJpbmc7XG5cdFx0dmFyIHJlbWFpbmluZztcblx0XHR0aGlzLnN0cmVhbSA9IGZ1bmN0aW9uKHMpXG5cdFx0e1xuXHRcdFx0c3RyaW5nID0gcztcblx0XHRcdHJlbWFpbmluZyA9IHM7XG5cdFx0XHRyZXR1cm4gdGhpcy5fbmV4dENodW5rKCk7XG5cdFx0fVxuXHRcdHRoaXMuX25leHRDaHVuayA9IGZ1bmN0aW9uKClcblx0XHR7XG5cdFx0XHRpZiAodGhpcy5fZmluaXNoZWQpIHJldHVybjtcblx0XHRcdHZhciBzaXplID0gdGhpcy5fY29uZmlnLmNodW5rU2l6ZTtcblx0XHRcdHZhciBjaHVuayA9IHNpemUgPyByZW1haW5pbmcuc3Vic3RyKDAsIHNpemUpIDogcmVtYWluaW5nO1xuXHRcdFx0cmVtYWluaW5nID0gc2l6ZSA/IHJlbWFpbmluZy5zdWJzdHIoc2l6ZSkgOiAnJztcblx0XHRcdHRoaXMuX2ZpbmlzaGVkID0gIXJlbWFpbmluZztcblx0XHRcdHJldHVybiB0aGlzLnBhcnNlQ2h1bmsoY2h1bmspO1xuXHRcdH1cblx0fVxuXHRTdHJpbmdTdHJlYW1lci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFN0cmluZ1N0cmVhbWVyLnByb3RvdHlwZSk7XG5cdFN0cmluZ1N0cmVhbWVyLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IFN0cmluZ1N0cmVhbWVyO1xuXG5cblxuXHQvLyBVc2Ugb25lIFBhcnNlckhhbmRsZSBwZXIgZW50aXJlIENTViBmaWxlIG9yIHN0cmluZ1xuXHRmdW5jdGlvbiBQYXJzZXJIYW5kbGUoX2NvbmZpZylcblx0e1xuXHRcdC8vIE9uZSBnb2FsIGlzIHRvIG1pbmltaXplIHRoZSB1c2Ugb2YgcmVndWxhciBleHByZXNzaW9ucy4uLlxuXHRcdHZhciBGTE9BVCA9IC9eXFxzKi0/KFxcZCpcXC4/XFxkK3xcXGQrXFwuP1xcZCopKGVbLStdP1xcZCspP1xccyokL2k7XG5cblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dmFyIF9zdGVwQ291bnRlciA9IDA7XHQvLyBOdW1iZXIgb2YgdGltZXMgc3RlcCB3YXMgY2FsbGVkIChudW1iZXIgb2Ygcm93cyBwYXJzZWQpXG5cdFx0dmFyIF9pbnB1dDtcdFx0XHRcdC8vIFRoZSBpbnB1dCBiZWluZyBwYXJzZWRcblx0XHR2YXIgX3BhcnNlcjtcdFx0XHQvLyBUaGUgY29yZSBwYXJzZXIgYmVpbmcgdXNlZFxuXHRcdHZhciBfcGF1c2VkID0gZmFsc2U7XHQvLyBXaGV0aGVyIHdlIGFyZSBwYXVzZWQgb3Igbm90XG5cdFx0dmFyIF9hYm9ydGVkID0gZmFsc2U7ICAgLy8gV2hldGhlciB0aGUgcGFyc2VyIGhhcyBhYm9ydGVkIG9yIG5vdFxuXHRcdHZhciBfZGVsaW1pdGVyRXJyb3I7XHQvLyBUZW1wb3Jhcnkgc3RhdGUgYmV0d2VlbiBkZWxpbWl0ZXIgZGV0ZWN0aW9uIGFuZCBwcm9jZXNzaW5nIHJlc3VsdHNcblx0XHR2YXIgX2ZpZWxkcyA9IFtdO1x0XHQvLyBGaWVsZHMgYXJlIGZyb20gdGhlIGhlYWRlciByb3cgb2YgdGhlIGlucHV0LCBpZiB0aGVyZSBpcyBvbmVcblx0XHR2YXIgX3Jlc3VsdHMgPSB7XHRcdC8vIFRoZSBsYXN0IHJlc3VsdHMgcmV0dXJuZWQgZnJvbSB0aGUgcGFyc2VyXG5cdFx0XHRkYXRhOiBbXSxcblx0XHRcdGVycm9yczogW10sXG5cdFx0XHRtZXRhOiB7fVxuXHRcdH07XG5cblx0XHRpZiAoaXNGdW5jdGlvbihfY29uZmlnLnN0ZXApKVxuXHRcdHtcblx0XHRcdHZhciB1c2VyU3RlcCA9IF9jb25maWcuc3RlcDtcblx0XHRcdF9jb25maWcuc3RlcCA9IGZ1bmN0aW9uKHJlc3VsdHMpXG5cdFx0XHR7XG5cdFx0XHRcdF9yZXN1bHRzID0gcmVzdWx0cztcblxuXHRcdFx0XHRpZiAobmVlZHNIZWFkZXJSb3coKSlcblx0XHRcdFx0XHRwcm9jZXNzUmVzdWx0cygpO1xuXHRcdFx0XHRlbHNlXHQvLyBvbmx5IGNhbGwgdXNlcidzIHN0ZXAgZnVuY3Rpb24gYWZ0ZXIgaGVhZGVyIHJvd1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0cHJvY2Vzc1Jlc3VsdHMoKTtcblxuXHRcdFx0XHRcdC8vIEl0J3MgcG9zc2JpbGUgdGhhdCB0aGlzIGxpbmUgd2FzIGVtcHR5IGFuZCB0aGVyZSdzIG5vIHJvdyBoZXJlIGFmdGVyIGFsbFxuXHRcdFx0XHRcdGlmIChfcmVzdWx0cy5kYXRhLmxlbmd0aCA9PSAwKVxuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXG5cdFx0XHRcdFx0X3N0ZXBDb3VudGVyICs9IHJlc3VsdHMuZGF0YS5sZW5ndGg7XG5cdFx0XHRcdFx0aWYgKF9jb25maWcucHJldmlldyAmJiBfc3RlcENvdW50ZXIgPiBfY29uZmlnLnByZXZpZXcpXG5cdFx0XHRcdFx0XHRfcGFyc2VyLmFib3J0KCk7XG5cdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0dXNlclN0ZXAoX3Jlc3VsdHMsIHNlbGYpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIFBhcnNlcyBpbnB1dC4gTW9zdCB1c2VycyB3b24ndCBuZWVkLCBhbmQgc2hvdWxkbid0IG1lc3Mgd2l0aCwgdGhlIGJhc2VJbmRleFxuXHRcdCAqIGFuZCBpZ25vcmVMYXN0Um93IHBhcmFtZXRlcnMuIFRoZXkgYXJlIHVzZWQgYnkgc3RyZWFtZXJzICh3cmFwcGVyIGZ1bmN0aW9ucylcblx0XHQgKiB3aGVuIGFuIGlucHV0IGNvbWVzIGluIG11bHRpcGxlIGNodW5rcywgbGlrZSBmcm9tIGEgZmlsZS5cblx0XHQgKi9cblx0XHR0aGlzLnBhcnNlID0gZnVuY3Rpb24oaW5wdXQsIGJhc2VJbmRleCwgaWdub3JlTGFzdFJvdylcblx0XHR7XG5cdFx0XHRpZiAoIV9jb25maWcubmV3bGluZSlcblx0XHRcdFx0X2NvbmZpZy5uZXdsaW5lID0gZ3Vlc3NMaW5lRW5kaW5ncyhpbnB1dCk7XG5cblx0XHRcdF9kZWxpbWl0ZXJFcnJvciA9IGZhbHNlO1xuXHRcdFx0aWYgKCFfY29uZmlnLmRlbGltaXRlcilcblx0XHRcdHtcblx0XHRcdFx0dmFyIGRlbGltR3Vlc3MgPSBndWVzc0RlbGltaXRlcihpbnB1dCk7XG5cdFx0XHRcdGlmIChkZWxpbUd1ZXNzLnN1Y2Nlc3NmdWwpXG5cdFx0XHRcdFx0X2NvbmZpZy5kZWxpbWl0ZXIgPSBkZWxpbUd1ZXNzLmJlc3REZWxpbWl0ZXI7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0e1xuXHRcdFx0XHRcdF9kZWxpbWl0ZXJFcnJvciA9IHRydWU7XHQvLyBhZGQgZXJyb3IgYWZ0ZXIgcGFyc2luZyAob3RoZXJ3aXNlIGl0IHdvdWxkIGJlIG92ZXJ3cml0dGVuKVxuXHRcdFx0XHRcdF9jb25maWcuZGVsaW1pdGVyID0gUGFwYS5EZWZhdWx0RGVsaW1pdGVyO1xuXHRcdFx0XHR9XG5cdFx0XHRcdF9yZXN1bHRzLm1ldGEuZGVsaW1pdGVyID0gX2NvbmZpZy5kZWxpbWl0ZXI7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBwYXJzZXJDb25maWcgPSBjb3B5KF9jb25maWcpO1xuXHRcdFx0aWYgKF9jb25maWcucHJldmlldyAmJiBfY29uZmlnLmhlYWRlcilcblx0XHRcdFx0cGFyc2VyQ29uZmlnLnByZXZpZXcrKztcdC8vIHRvIGNvbXBlbnNhdGUgZm9yIGhlYWRlciByb3dcblxuXHRcdFx0X2lucHV0ID0gaW5wdXQ7XG5cdFx0XHRfcGFyc2VyID0gbmV3IFBhcnNlcihwYXJzZXJDb25maWcpO1xuXHRcdFx0X3Jlc3VsdHMgPSBfcGFyc2VyLnBhcnNlKF9pbnB1dCwgYmFzZUluZGV4LCBpZ25vcmVMYXN0Um93KTtcblx0XHRcdHByb2Nlc3NSZXN1bHRzKCk7XG5cdFx0XHRyZXR1cm4gX3BhdXNlZCA/IHsgbWV0YTogeyBwYXVzZWQ6IHRydWUgfSB9IDogKF9yZXN1bHRzIHx8IHsgbWV0YTogeyBwYXVzZWQ6IGZhbHNlIH0gfSk7XG5cdFx0fTtcblxuXHRcdHRoaXMucGF1c2VkID0gZnVuY3Rpb24oKVxuXHRcdHtcblx0XHRcdHJldHVybiBfcGF1c2VkO1xuXHRcdH07XG5cblx0XHR0aGlzLnBhdXNlID0gZnVuY3Rpb24oKVxuXHRcdHtcblx0XHRcdF9wYXVzZWQgPSB0cnVlO1xuXHRcdFx0X3BhcnNlci5hYm9ydCgpO1xuXHRcdFx0X2lucHV0ID0gX2lucHV0LnN1YnN0cihfcGFyc2VyLmdldENoYXJJbmRleCgpKTtcblx0XHR9O1xuXG5cdFx0dGhpcy5yZXN1bWUgPSBmdW5jdGlvbigpXG5cdFx0e1xuXHRcdFx0X3BhdXNlZCA9IGZhbHNlO1xuXHRcdFx0c2VsZi5zdHJlYW1lci5wYXJzZUNodW5rKF9pbnB1dCk7XG5cdFx0fTtcblxuXHRcdHRoaXMuYWJvcnRlZCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdHJldHVybiBfYWJvcnRlZDtcblx0XHR9XG5cblx0XHR0aGlzLmFib3J0ID0gZnVuY3Rpb24oKVxuXHRcdHtcblx0XHRcdF9hYm9ydGVkID0gdHJ1ZTtcblx0XHRcdF9wYXJzZXIuYWJvcnQoKTtcblx0XHRcdF9yZXN1bHRzLm1ldGEuYWJvcnRlZCA9IHRydWU7XG5cdFx0XHRpZiAoaXNGdW5jdGlvbihfY29uZmlnLmNvbXBsZXRlKSlcblx0XHRcdFx0X2NvbmZpZy5jb21wbGV0ZShfcmVzdWx0cyk7XG5cdFx0XHRfaW5wdXQgPSBcIlwiO1xuXHRcdH07XG5cblx0XHRmdW5jdGlvbiBwcm9jZXNzUmVzdWx0cygpXG5cdFx0e1xuXHRcdFx0aWYgKF9yZXN1bHRzICYmIF9kZWxpbWl0ZXJFcnJvcilcblx0XHRcdHtcblx0XHRcdFx0YWRkRXJyb3IoXCJEZWxpbWl0ZXJcIiwgXCJVbmRldGVjdGFibGVEZWxpbWl0ZXJcIiwgXCJVbmFibGUgdG8gYXV0by1kZXRlY3QgZGVsaW1pdGluZyBjaGFyYWN0ZXI7IGRlZmF1bHRlZCB0byAnXCIrUGFwYS5EZWZhdWx0RGVsaW1pdGVyK1wiJ1wiKTtcblx0XHRcdFx0X2RlbGltaXRlckVycm9yID0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChfY29uZmlnLnNraXBFbXB0eUxpbmVzKVxuXHRcdFx0e1xuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IF9yZXN1bHRzLmRhdGEubGVuZ3RoOyBpKyspXG5cdFx0XHRcdFx0aWYgKF9yZXN1bHRzLmRhdGFbaV0ubGVuZ3RoID09IDEgJiYgX3Jlc3VsdHMuZGF0YVtpXVswXSA9PSBcIlwiKVxuXHRcdFx0XHRcdFx0X3Jlc3VsdHMuZGF0YS5zcGxpY2UoaS0tLCAxKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKG5lZWRzSGVhZGVyUm93KCkpXG5cdFx0XHRcdGZpbGxIZWFkZXJGaWVsZHMoKTtcblxuXHRcdFx0cmV0dXJuIGFwcGx5SGVhZGVyQW5kRHluYW1pY1R5cGluZygpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIG5lZWRzSGVhZGVyUm93KClcblx0XHR7XG5cdFx0XHRyZXR1cm4gX2NvbmZpZy5oZWFkZXIgJiYgX2ZpZWxkcy5sZW5ndGggPT0gMDtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBmaWxsSGVhZGVyRmllbGRzKClcblx0XHR7XG5cdFx0XHRpZiAoIV9yZXN1bHRzKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRmb3IgKHZhciBpID0gMDsgbmVlZHNIZWFkZXJSb3coKSAmJiBpIDwgX3Jlc3VsdHMuZGF0YS5sZW5ndGg7IGkrKylcblx0XHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBfcmVzdWx0cy5kYXRhW2ldLmxlbmd0aDsgaisrKVxuXHRcdFx0XHRcdF9maWVsZHMucHVzaChfcmVzdWx0cy5kYXRhW2ldW2pdKTtcblx0XHRcdF9yZXN1bHRzLmRhdGEuc3BsaWNlKDAsIDEpO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGFwcGx5SGVhZGVyQW5kRHluYW1pY1R5cGluZygpXG5cdFx0e1xuXHRcdFx0aWYgKCFfcmVzdWx0cyB8fCAoIV9jb25maWcuaGVhZGVyICYmICFfY29uZmlnLmR5bmFtaWNUeXBpbmcpKVxuXHRcdFx0XHRyZXR1cm4gX3Jlc3VsdHM7XG5cblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgX3Jlc3VsdHMuZGF0YS5sZW5ndGg7IGkrKylcblx0XHRcdHtcblx0XHRcdFx0dmFyIHJvdyA9IHt9O1xuXG5cdFx0XHRcdGZvciAodmFyIGogPSAwOyBqIDwgX3Jlc3VsdHMuZGF0YVtpXS5sZW5ndGg7IGorKylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChfY29uZmlnLmR5bmFtaWNUeXBpbmcpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0dmFyIHZhbHVlID0gX3Jlc3VsdHMuZGF0YVtpXVtqXTtcblx0XHRcdFx0XHRcdGlmICh2YWx1ZSA9PSBcInRydWVcIiB8fCB2YWx1ZSA9PSBcIlRSVUVcIilcblx0XHRcdFx0XHRcdFx0X3Jlc3VsdHMuZGF0YVtpXVtqXSA9IHRydWU7XG5cdFx0XHRcdFx0XHRlbHNlIGlmICh2YWx1ZSA9PSBcImZhbHNlXCIgfHwgdmFsdWUgPT0gXCJGQUxTRVwiKVxuXHRcdFx0XHRcdFx0XHRfcmVzdWx0cy5kYXRhW2ldW2pdID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRcdF9yZXN1bHRzLmRhdGFbaV1bal0gPSB0cnlQYXJzZUZsb2F0KHZhbHVlKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoX2NvbmZpZy5oZWFkZXIpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0aWYgKGogPj0gX2ZpZWxkcy5sZW5ndGgpXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGlmICghcm93W1wiX19wYXJzZWRfZXh0cmFcIl0pXG5cdFx0XHRcdFx0XHRcdFx0cm93W1wiX19wYXJzZWRfZXh0cmFcIl0gPSBbXTtcblx0XHRcdFx0XHRcdFx0cm93W1wiX19wYXJzZWRfZXh0cmFcIl0ucHVzaChfcmVzdWx0cy5kYXRhW2ldW2pdKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0cm93W19maWVsZHNbal1dID0gX3Jlc3VsdHMuZGF0YVtpXVtqXTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoX2NvbmZpZy5oZWFkZXIpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRfcmVzdWx0cy5kYXRhW2ldID0gcm93O1xuXHRcdFx0XHRcdGlmIChqID4gX2ZpZWxkcy5sZW5ndGgpXG5cdFx0XHRcdFx0XHRhZGRFcnJvcihcIkZpZWxkTWlzbWF0Y2hcIiwgXCJUb29NYW55RmllbGRzXCIsIFwiVG9vIG1hbnkgZmllbGRzOiBleHBlY3RlZCBcIiArIF9maWVsZHMubGVuZ3RoICsgXCIgZmllbGRzIGJ1dCBwYXJzZWQgXCIgKyBqLCBpKTtcblx0XHRcdFx0XHRlbHNlIGlmIChqIDwgX2ZpZWxkcy5sZW5ndGgpXG5cdFx0XHRcdFx0XHRhZGRFcnJvcihcIkZpZWxkTWlzbWF0Y2hcIiwgXCJUb29GZXdGaWVsZHNcIiwgXCJUb28gZmV3IGZpZWxkczogZXhwZWN0ZWQgXCIgKyBfZmllbGRzLmxlbmd0aCArIFwiIGZpZWxkcyBidXQgcGFyc2VkIFwiICsgaiwgaSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKF9jb25maWcuaGVhZGVyICYmIF9yZXN1bHRzLm1ldGEpXG5cdFx0XHRcdF9yZXN1bHRzLm1ldGEuZmllbGRzID0gX2ZpZWxkcztcblx0XHRcdHJldHVybiBfcmVzdWx0cztcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBndWVzc0RlbGltaXRlcihpbnB1dClcblx0XHR7XG5cdFx0XHR2YXIgZGVsaW1DaG9pY2VzID0gW1wiLFwiLCBcIlxcdFwiLCBcInxcIiwgXCI7XCIsIFBhcGEuUkVDT1JEX1NFUCwgUGFwYS5VTklUX1NFUF07XG5cdFx0XHR2YXIgYmVzdERlbGltLCBiZXN0RGVsdGEsIGZpZWxkQ291bnRQcmV2Um93O1xuXG5cdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGRlbGltQ2hvaWNlcy5sZW5ndGg7IGkrKylcblx0XHRcdHtcblx0XHRcdFx0dmFyIGRlbGltID0gZGVsaW1DaG9pY2VzW2ldO1xuXHRcdFx0XHR2YXIgZGVsdGEgPSAwLCBhdmdGaWVsZENvdW50ID0gMDtcblx0XHRcdFx0ZmllbGRDb3VudFByZXZSb3cgPSB1bmRlZmluZWQ7XG5cblx0XHRcdFx0dmFyIHByZXZpZXcgPSBuZXcgUGFyc2VyKHtcblx0XHRcdFx0XHRkZWxpbWl0ZXI6IGRlbGltLFxuXHRcdFx0XHRcdHByZXZpZXc6IDEwXG5cdFx0XHRcdH0pLnBhcnNlKGlucHV0KTtcblxuXHRcdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHByZXZpZXcuZGF0YS5sZW5ndGg7IGorKylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciBmaWVsZENvdW50ID0gcHJldmlldy5kYXRhW2pdLmxlbmd0aDtcblx0XHRcdFx0XHRhdmdGaWVsZENvdW50ICs9IGZpZWxkQ291bnQ7XG5cblx0XHRcdFx0XHRpZiAodHlwZW9mIGZpZWxkQ291bnRQcmV2Um93ID09PSAndW5kZWZpbmVkJylcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRmaWVsZENvdW50UHJldlJvdyA9IGZpZWxkQ291bnQ7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZWxzZSBpZiAoZmllbGRDb3VudCA+IDEpXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0ZGVsdGEgKz0gTWF0aC5hYnMoZmllbGRDb3VudCAtIGZpZWxkQ291bnRQcmV2Um93KTtcblx0XHRcdFx0XHRcdGZpZWxkQ291bnRQcmV2Um93ID0gZmllbGRDb3VudDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAocHJldmlldy5kYXRhLmxlbmd0aCA+IDApXG5cdFx0XHRcdFx0YXZnRmllbGRDb3VudCAvPSBwcmV2aWV3LmRhdGEubGVuZ3RoO1xuXG5cdFx0XHRcdGlmICgodHlwZW9mIGJlc3REZWx0YSA9PT0gJ3VuZGVmaW5lZCcgfHwgZGVsdGEgPCBiZXN0RGVsdGEpXG5cdFx0XHRcdFx0JiYgYXZnRmllbGRDb3VudCA+IDEuOTkpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRiZXN0RGVsdGEgPSBkZWx0YTtcblx0XHRcdFx0XHRiZXN0RGVsaW0gPSBkZWxpbTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRfY29uZmlnLmRlbGltaXRlciA9IGJlc3REZWxpbTtcblxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0c3VjY2Vzc2Z1bDogISFiZXN0RGVsaW0sXG5cdFx0XHRcdGJlc3REZWxpbWl0ZXI6IGJlc3REZWxpbVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGd1ZXNzTGluZUVuZGluZ3MoaW5wdXQpXG5cdFx0e1xuXHRcdFx0aW5wdXQgPSBpbnB1dC5zdWJzdHIoMCwgMTAyNCoxMDI0KTtcdC8vIG1heCBsZW5ndGggMSBNQlxuXG5cdFx0XHR2YXIgciA9IGlucHV0LnNwbGl0KCdcXHInKTtcblxuXHRcdFx0aWYgKHIubGVuZ3RoID09IDEpXG5cdFx0XHRcdHJldHVybiAnXFxuJztcblxuXHRcdFx0dmFyIG51bVdpdGhOID0gMDtcblx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgci5sZW5ndGg7IGkrKylcblx0XHRcdHtcblx0XHRcdFx0aWYgKHJbaV1bMF0gPT0gJ1xcbicpXG5cdFx0XHRcdFx0bnVtV2l0aE4rKztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIG51bVdpdGhOID49IHIubGVuZ3RoIC8gMiA/ICdcXHJcXG4nIDogJ1xccic7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gdHJ5UGFyc2VGbG9hdCh2YWwpXG5cdFx0e1xuXHRcdFx0dmFyIGlzTnVtYmVyID0gRkxPQVQudGVzdCh2YWwpO1xuXHRcdFx0cmV0dXJuIGlzTnVtYmVyID8gcGFyc2VGbG9hdCh2YWwpIDogdmFsO1xuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIGFkZEVycm9yKHR5cGUsIGNvZGUsIG1zZywgcm93KVxuXHRcdHtcblx0XHRcdF9yZXN1bHRzLmVycm9ycy5wdXNoKHtcblx0XHRcdFx0dHlwZTogdHlwZSxcblx0XHRcdFx0Y29kZTogY29kZSxcblx0XHRcdFx0bWVzc2FnZTogbXNnLFxuXHRcdFx0XHRyb3c6IHJvd1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cblxuXG5cblxuXHQvKiogVGhlIGNvcmUgcGFyc2VyIGltcGxlbWVudHMgc3BlZWR5IGFuZCBjb3JyZWN0IENTViBwYXJzaW5nICovXG5cdGZ1bmN0aW9uIFBhcnNlcihjb25maWcpXG5cdHtcblx0XHQvLyBVbnBhY2sgdGhlIGNvbmZpZyBvYmplY3Rcblx0XHRjb25maWcgPSBjb25maWcgfHwge307XG5cdFx0dmFyIGRlbGltID0gY29uZmlnLmRlbGltaXRlcjtcblx0XHR2YXIgbmV3bGluZSA9IGNvbmZpZy5uZXdsaW5lO1xuXHRcdHZhciBjb21tZW50cyA9IGNvbmZpZy5jb21tZW50cztcblx0XHR2YXIgc3RlcCA9IGNvbmZpZy5zdGVwO1xuXHRcdHZhciBwcmV2aWV3ID0gY29uZmlnLnByZXZpZXc7XG5cdFx0dmFyIGZhc3RNb2RlID0gY29uZmlnLmZhc3RNb2RlO1xuXG5cdFx0Ly8gRGVsaW1pdGVyIG11c3QgYmUgdmFsaWRcblx0XHRpZiAodHlwZW9mIGRlbGltICE9PSAnc3RyaW5nJ1xuXHRcdFx0fHwgUGFwYS5CQURfREVMSU1JVEVSUy5pbmRleE9mKGRlbGltKSA+IC0xKVxuXHRcdFx0ZGVsaW0gPSBcIixcIjtcblxuXHRcdC8vIENvbW1lbnQgY2hhcmFjdGVyIG11c3QgYmUgdmFsaWRcblx0XHRpZiAoY29tbWVudHMgPT09IGRlbGltKVxuXHRcdFx0dGhyb3cgXCJDb21tZW50IGNoYXJhY3RlciBzYW1lIGFzIGRlbGltaXRlclwiO1xuXHRcdGVsc2UgaWYgKGNvbW1lbnRzID09PSB0cnVlKVxuXHRcdFx0Y29tbWVudHMgPSBcIiNcIjtcblx0XHRlbHNlIGlmICh0eXBlb2YgY29tbWVudHMgIT09ICdzdHJpbmcnXG5cdFx0XHR8fCBQYXBhLkJBRF9ERUxJTUlURVJTLmluZGV4T2YoY29tbWVudHMpID4gLTEpXG5cdFx0XHRjb21tZW50cyA9IGZhbHNlO1xuXG5cdFx0Ly8gTmV3bGluZSBtdXN0IGJlIHZhbGlkOiBcXHIsIFxcbiwgb3IgXFxyXFxuXG5cdFx0aWYgKG5ld2xpbmUgIT0gJ1xcbicgJiYgbmV3bGluZSAhPSAnXFxyJyAmJiBuZXdsaW5lICE9ICdcXHJcXG4nKVxuXHRcdFx0bmV3bGluZSA9ICdcXG4nO1xuXG5cdFx0Ly8gV2UncmUgZ29ubmEgbmVlZCB0aGVzZSBhdCB0aGUgUGFyc2VyIHNjb3BlXG5cdFx0dmFyIGN1cnNvciA9IDA7XG5cdFx0dmFyIGFib3J0ZWQgPSBmYWxzZTtcblxuXHRcdHRoaXMucGFyc2UgPSBmdW5jdGlvbihpbnB1dCwgYmFzZUluZGV4LCBpZ25vcmVMYXN0Um93KVxuXHRcdHtcblx0XHRcdC8vIEZvciBzb21lIHJlYXNvbiwgaW4gQ2hyb21lLCB0aGlzIHNwZWVkcyB0aGluZ3MgdXAgKCE/KVxuXHRcdFx0aWYgKHR5cGVvZiBpbnB1dCAhPT0gJ3N0cmluZycpXG5cdFx0XHRcdHRocm93IFwiSW5wdXQgbXVzdCBiZSBhIHN0cmluZ1wiO1xuXG5cdFx0XHQvLyBXZSBkb24ndCBuZWVkIHRvIGNvbXB1dGUgc29tZSBvZiB0aGVzZSBldmVyeSB0aW1lIHBhcnNlKCkgaXMgY2FsbGVkLFxuXHRcdFx0Ly8gYnV0IGhhdmluZyB0aGVtIGluIGEgbW9yZSBsb2NhbCBzY29wZSBzZWVtcyB0byBwZXJmb3JtIGJldHRlclxuXHRcdFx0dmFyIGlucHV0TGVuID0gaW5wdXQubGVuZ3RoLFxuXHRcdFx0XHRkZWxpbUxlbiA9IGRlbGltLmxlbmd0aCxcblx0XHRcdFx0bmV3bGluZUxlbiA9IG5ld2xpbmUubGVuZ3RoLFxuXHRcdFx0XHRjb21tZW50c0xlbiA9IGNvbW1lbnRzLmxlbmd0aDtcblx0XHRcdHZhciBzdGVwSXNGdW5jdGlvbiA9IHR5cGVvZiBzdGVwID09PSAnZnVuY3Rpb24nO1xuXG5cdFx0XHQvLyBFc3RhYmxpc2ggc3RhcnRpbmcgc3RhdGVcblx0XHRcdGN1cnNvciA9IDA7XG5cdFx0XHR2YXIgZGF0YSA9IFtdLCBlcnJvcnMgPSBbXSwgcm93ID0gW10sIGxhc3RDdXJzb3IgPSAwO1xuXG5cdFx0XHRpZiAoIWlucHV0KVxuXHRcdFx0XHRyZXR1cm4gcmV0dXJuYWJsZSgpO1xuXG5cdFx0XHRpZiAoZmFzdE1vZGUgfHwgKGZhc3RNb2RlICE9PSBmYWxzZSAmJiBpbnB1dC5pbmRleE9mKCdcIicpID09PSAtMSkpXG5cdFx0XHR7XG5cdFx0XHRcdHZhciByb3dzID0gaW5wdXQuc3BsaXQobmV3bGluZSk7XG5cdFx0XHRcdGZvciAodmFyIGkgPSAwOyBpIDwgcm93cy5sZW5ndGg7IGkrKylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHZhciByb3cgPSByb3dzW2ldO1xuXHRcdFx0XHRcdGN1cnNvciArPSByb3cubGVuZ3RoO1xuXHRcdFx0XHRcdGlmIChpICE9PSByb3dzLmxlbmd0aCAtIDEpXG5cdFx0XHRcdFx0XHRjdXJzb3IgKz0gbmV3bGluZS5sZW5ndGg7XG5cdFx0XHRcdFx0ZWxzZSBpZiAoaWdub3JlTGFzdFJvdylcblx0XHRcdFx0XHRcdHJldHVybiByZXR1cm5hYmxlKCk7XG5cdFx0XHRcdFx0aWYgKGNvbW1lbnRzICYmIHJvdy5zdWJzdHIoMCwgY29tbWVudHNMZW4pID09IGNvbW1lbnRzKVxuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0aWYgKHN0ZXBJc0Z1bmN0aW9uKVxuXHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdGRhdGEgPSBbXTtcblx0XHRcdFx0XHRcdHB1c2hSb3cocm93LnNwbGl0KGRlbGltKSk7XG5cdFx0XHRcdFx0XHRkb1N0ZXAoKTtcblx0XHRcdFx0XHRcdGlmIChhYm9ydGVkKVxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gcmV0dXJuYWJsZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRwdXNoUm93KHJvdy5zcGxpdChkZWxpbSkpO1xuXHRcdFx0XHRcdGlmIChwcmV2aWV3ICYmIGkgPj0gcHJldmlldylcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRkYXRhID0gZGF0YS5zbGljZSgwLCBwcmV2aWV3KTtcblx0XHRcdFx0XHRcdHJldHVybiByZXR1cm5hYmxlKHRydWUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4gcmV0dXJuYWJsZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgbmV4dERlbGltID0gaW5wdXQuaW5kZXhPZihkZWxpbSwgY3Vyc29yKTtcblx0XHRcdHZhciBuZXh0TmV3bGluZSA9IGlucHV0LmluZGV4T2YobmV3bGluZSwgY3Vyc29yKTtcblxuXHRcdFx0Ly8gUGFyc2VyIGxvb3Bcblx0XHRcdGZvciAoOzspXG5cdFx0XHR7XG5cdFx0XHRcdC8vIEZpZWxkIGhhcyBvcGVuaW5nIHF1b3RlXG5cdFx0XHRcdGlmIChpbnB1dFtjdXJzb3JdID09ICdcIicpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHQvLyBTdGFydCBvdXIgc2VhcmNoIGZvciB0aGUgY2xvc2luZyBxdW90ZSB3aGVyZSB0aGUgY3Vyc29yIGlzXG5cdFx0XHRcdFx0dmFyIHF1b3RlU2VhcmNoID0gY3Vyc29yO1xuXG5cdFx0XHRcdFx0Ly8gU2tpcCB0aGUgb3BlbmluZyBxdW90ZVxuXHRcdFx0XHRcdGN1cnNvcisrO1xuXG5cdFx0XHRcdFx0Zm9yICg7Oylcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHQvLyBGaW5kIGNsb3NpbmcgcXVvdGVcblx0XHRcdFx0XHRcdHZhciBxdW90ZVNlYXJjaCA9IGlucHV0LmluZGV4T2YoJ1wiJywgcXVvdGVTZWFyY2grMSk7XG5cblx0XHRcdFx0XHRcdGlmIChxdW90ZVNlYXJjaCA9PT0gLTEpXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdGlmICghaWdub3JlTGFzdFJvdykge1xuXHRcdFx0XHRcdFx0XHRcdC8vIE5vIGNsb3NpbmcgcXVvdGUuLi4gd2hhdCBhIHBpdHlcblx0XHRcdFx0XHRcdFx0XHRlcnJvcnMucHVzaCh7XG5cdFx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcIlF1b3Rlc1wiLFxuXHRcdFx0XHRcdFx0XHRcdFx0Y29kZTogXCJNaXNzaW5nUXVvdGVzXCIsXG5cdFx0XHRcdFx0XHRcdFx0XHRtZXNzYWdlOiBcIlF1b3RlZCBmaWVsZCB1bnRlcm1pbmF0ZWRcIixcblx0XHRcdFx0XHRcdFx0XHRcdHJvdzogZGF0YS5sZW5ndGgsXHQvLyByb3cgaGFzIHlldCB0byBiZSBpbnNlcnRlZFxuXHRcdFx0XHRcdFx0XHRcdFx0aW5kZXg6IGN1cnNvclxuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdHJldHVybiBmaW5pc2goKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0aWYgKHF1b3RlU2VhcmNoID09PSBpbnB1dExlbi0xKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHQvLyBDbG9zaW5nIHF1b3RlIGF0IEVPRlxuXHRcdFx0XHRcdFx0XHR2YXIgdmFsdWUgPSBpbnB1dC5zdWJzdHJpbmcoY3Vyc29yLCBxdW90ZVNlYXJjaCkucmVwbGFjZSgvXCJcIi9nLCAnXCInKTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIGZpbmlzaCh2YWx1ZSk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdC8vIElmIHRoaXMgcXVvdGUgaXMgZXNjYXBlZCwgaXQncyBwYXJ0IG9mIHRoZSBkYXRhOyBza2lwIGl0XG5cdFx0XHRcdFx0XHRpZiAoaW5wdXRbcXVvdGVTZWFyY2grMV0gPT0gJ1wiJylcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0cXVvdGVTZWFyY2grKztcblx0XHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGlmIChpbnB1dFtxdW90ZVNlYXJjaCsxXSA9PSBkZWxpbSlcblx0XHRcdFx0XHRcdHtcblx0XHRcdFx0XHRcdFx0Ly8gQ2xvc2luZyBxdW90ZSBmb2xsb3dlZCBieSBkZWxpbWl0ZXJcblx0XHRcdFx0XHRcdFx0cm93LnB1c2goaW5wdXQuc3Vic3RyaW5nKGN1cnNvciwgcXVvdGVTZWFyY2gpLnJlcGxhY2UoL1wiXCIvZywgJ1wiJykpO1xuXHRcdFx0XHRcdFx0XHRjdXJzb3IgPSBxdW90ZVNlYXJjaCArIDEgKyBkZWxpbUxlbjtcblx0XHRcdFx0XHRcdFx0bmV4dERlbGltID0gaW5wdXQuaW5kZXhPZihkZWxpbSwgY3Vyc29yKTtcblx0XHRcdFx0XHRcdFx0bmV4dE5ld2xpbmUgPSBpbnB1dC5pbmRleE9mKG5ld2xpbmUsIGN1cnNvcik7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAoaW5wdXQuc3Vic3RyKHF1b3RlU2VhcmNoKzEsIG5ld2xpbmVMZW4pID09PSBuZXdsaW5lKVxuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHQvLyBDbG9zaW5nIHF1b3RlIGZvbGxvd2VkIGJ5IG5ld2xpbmVcblx0XHRcdFx0XHRcdFx0cm93LnB1c2goaW5wdXQuc3Vic3RyaW5nKGN1cnNvciwgcXVvdGVTZWFyY2gpLnJlcGxhY2UoL1wiXCIvZywgJ1wiJykpO1xuXHRcdFx0XHRcdFx0XHRzYXZlUm93KHF1b3RlU2VhcmNoICsgMSArIG5ld2xpbmVMZW4pO1xuXHRcdFx0XHRcdFx0XHRuZXh0RGVsaW0gPSBpbnB1dC5pbmRleE9mKGRlbGltLCBjdXJzb3IpO1x0Ly8gYmVjYXVzZSB3ZSBtYXkgaGF2ZSBza2lwcGVkIHRoZSBuZXh0RGVsaW0gaW4gdGhlIHF1b3RlZCBmaWVsZFxuXG5cdFx0XHRcdFx0XHRcdGlmIChzdGVwSXNGdW5jdGlvbilcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdGRvU3RlcCgpO1xuXHRcdFx0XHRcdFx0XHRcdGlmIChhYm9ydGVkKVxuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHJldHVybmFibGUoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdFx0aWYgKHByZXZpZXcgJiYgZGF0YS5sZW5ndGggPj0gcHJldmlldylcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gcmV0dXJuYWJsZSh0cnVlKTtcblxuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIENvbW1lbnQgZm91bmQgYXQgc3RhcnQgb2YgbmV3IGxpbmVcblx0XHRcdFx0aWYgKGNvbW1lbnRzICYmIHJvdy5sZW5ndGggPT09IDAgJiYgaW5wdXQuc3Vic3RyKGN1cnNvciwgY29tbWVudHNMZW4pID09PSBjb21tZW50cylcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGlmIChuZXh0TmV3bGluZSA9PSAtMSlcdC8vIENvbW1lbnQgZW5kcyBhdCBFT0Zcblx0XHRcdFx0XHRcdHJldHVybiByZXR1cm5hYmxlKCk7XG5cdFx0XHRcdFx0Y3Vyc29yID0gbmV4dE5ld2xpbmUgKyBuZXdsaW5lTGVuO1xuXHRcdFx0XHRcdG5leHROZXdsaW5lID0gaW5wdXQuaW5kZXhPZihuZXdsaW5lLCBjdXJzb3IpO1xuXHRcdFx0XHRcdG5leHREZWxpbSA9IGlucHV0LmluZGV4T2YoZGVsaW0sIGN1cnNvcik7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBOZXh0IGRlbGltaXRlciBjb21lcyBiZWZvcmUgbmV4dCBuZXdsaW5lLCBzbyB3ZSd2ZSByZWFjaGVkIGVuZCBvZiBmaWVsZFxuXHRcdFx0XHRpZiAobmV4dERlbGltICE9PSAtMSAmJiAobmV4dERlbGltIDwgbmV4dE5ld2xpbmUgfHwgbmV4dE5ld2xpbmUgPT09IC0xKSlcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHJvdy5wdXNoKGlucHV0LnN1YnN0cmluZyhjdXJzb3IsIG5leHREZWxpbSkpO1xuXHRcdFx0XHRcdGN1cnNvciA9IG5leHREZWxpbSArIGRlbGltTGVuO1xuXHRcdFx0XHRcdG5leHREZWxpbSA9IGlucHV0LmluZGV4T2YoZGVsaW0sIGN1cnNvcik7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBFbmQgb2Ygcm93XG5cdFx0XHRcdGlmIChuZXh0TmV3bGluZSAhPT0gLTEpXG5cdFx0XHRcdHtcblx0XHRcdFx0XHRyb3cucHVzaChpbnB1dC5zdWJzdHJpbmcoY3Vyc29yLCBuZXh0TmV3bGluZSkpO1xuXHRcdFx0XHRcdHNhdmVSb3cobmV4dE5ld2xpbmUgKyBuZXdsaW5lTGVuKTtcblxuXHRcdFx0XHRcdGlmIChzdGVwSXNGdW5jdGlvbilcblx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRkb1N0ZXAoKTtcblx0XHRcdFx0XHRcdGlmIChhYm9ydGVkKVxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gcmV0dXJuYWJsZSgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChwcmV2aWV3ICYmIGRhdGEubGVuZ3RoID49IHByZXZpZXcpXG5cdFx0XHRcdFx0XHRyZXR1cm4gcmV0dXJuYWJsZSh0cnVlKTtcblxuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cblxuXHRcdFx0cmV0dXJuIGZpbmlzaCgpO1xuXG5cblx0XHRcdGZ1bmN0aW9uIHB1c2hSb3cocm93KVxuXHRcdFx0e1xuXHRcdFx0XHRkYXRhLnB1c2gocm93KTtcblx0XHRcdFx0bGFzdEN1cnNvciA9IGN1cnNvcjtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBBcHBlbmRzIHRoZSByZW1haW5pbmcgaW5wdXQgZnJvbSBjdXJzb3IgdG8gdGhlIGVuZCBpbnRvXG5cdFx0XHQgKiByb3csIHNhdmVzIHRoZSByb3csIGNhbGxzIHN0ZXAsIGFuZCByZXR1cm5zIHRoZSByZXN1bHRzLlxuXHRcdFx0ICovXG5cdFx0XHRmdW5jdGlvbiBmaW5pc2godmFsdWUpXG5cdFx0XHR7XG5cdFx0XHRcdGlmIChpZ25vcmVMYXN0Um93KVxuXHRcdFx0XHRcdHJldHVybiByZXR1cm5hYmxlKCk7XG5cdFx0XHRcdGlmICh0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnKVxuXHRcdFx0XHRcdHZhbHVlID0gaW5wdXQuc3Vic3RyKGN1cnNvcik7XG5cdFx0XHRcdHJvdy5wdXNoKHZhbHVlKTtcblx0XHRcdFx0Y3Vyc29yID0gaW5wdXRMZW47XHQvLyBpbXBvcnRhbnQgaW4gY2FzZSBwYXJzaW5nIGlzIHBhdXNlZFxuXHRcdFx0XHRwdXNoUm93KHJvdyk7XG5cdFx0XHRcdGlmIChzdGVwSXNGdW5jdGlvbilcblx0XHRcdFx0XHRkb1N0ZXAoKTtcblx0XHRcdFx0cmV0dXJuIHJldHVybmFibGUoKTtcblx0XHRcdH1cblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBBcHBlbmRzIHRoZSBjdXJyZW50IHJvdyB0byB0aGUgcmVzdWx0cy4gSXQgc2V0cyB0aGUgY3Vyc29yXG5cdFx0XHQgKiB0byBuZXdDdXJzb3IgYW5kIGZpbmRzIHRoZSBuZXh0TmV3bGluZS4gVGhlIGNhbGxlciBzaG91bGRcblx0XHRcdCAqIHRha2UgY2FyZSB0byBleGVjdXRlIHVzZXIncyBzdGVwIGZ1bmN0aW9uIGFuZCBjaGVjayBmb3Jcblx0XHRcdCAqIHByZXZpZXcgYW5kIGVuZCBwYXJzaW5nIGlmIG5lY2Vzc2FyeS5cblx0XHRcdCAqL1xuXHRcdFx0ZnVuY3Rpb24gc2F2ZVJvdyhuZXdDdXJzb3IpXG5cdFx0XHR7XG5cdFx0XHRcdGN1cnNvciA9IG5ld0N1cnNvcjtcblx0XHRcdFx0cHVzaFJvdyhyb3cpO1xuXHRcdFx0XHRyb3cgPSBbXTtcblx0XHRcdFx0bmV4dE5ld2xpbmUgPSBpbnB1dC5pbmRleE9mKG5ld2xpbmUsIGN1cnNvcik7XG5cdFx0XHR9XG5cblx0XHRcdC8qKiBSZXR1cm5zIGFuIG9iamVjdCB3aXRoIHRoZSByZXN1bHRzLCBlcnJvcnMsIGFuZCBtZXRhLiAqL1xuXHRcdFx0ZnVuY3Rpb24gcmV0dXJuYWJsZShzdG9wcGVkKVxuXHRcdFx0e1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGRhdGE6IGRhdGEsXG5cdFx0XHRcdFx0ZXJyb3JzOiBlcnJvcnMsXG5cdFx0XHRcdFx0bWV0YToge1xuXHRcdFx0XHRcdFx0ZGVsaW1pdGVyOiBkZWxpbSxcblx0XHRcdFx0XHRcdGxpbmVicmVhazogbmV3bGluZSxcblx0XHRcdFx0XHRcdGFib3J0ZWQ6IGFib3J0ZWQsXG5cdFx0XHRcdFx0XHR0cnVuY2F0ZWQ6ICEhc3RvcHBlZCxcblx0XHRcdFx0XHRcdGN1cnNvcjogbGFzdEN1cnNvciArIChiYXNlSW5kZXggfHwgMClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cblx0XHRcdC8qKiBFeGVjdXRlcyB0aGUgdXNlcidzIHN0ZXAgZnVuY3Rpb24gYW5kIHJlc2V0cyBkYXRhICYgZXJyb3JzLiAqL1xuXHRcdFx0ZnVuY3Rpb24gZG9TdGVwKClcblx0XHRcdHtcblx0XHRcdFx0c3RlcChyZXR1cm5hYmxlKCkpO1xuXHRcdFx0XHRkYXRhID0gW10sIGVycm9ycyA9IFtdO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQvKiogU2V0cyB0aGUgYWJvcnQgZmxhZyAqL1xuXHRcdHRoaXMuYWJvcnQgPSBmdW5jdGlvbigpXG5cdFx0e1xuXHRcdFx0YWJvcnRlZCA9IHRydWU7XG5cdFx0fTtcblxuXHRcdC8qKiBHZXRzIHRoZSBjdXJzb3IgcG9zaXRpb24gKi9cblx0XHR0aGlzLmdldENoYXJJbmRleCA9IGZ1bmN0aW9uKClcblx0XHR7XG5cdFx0XHRyZXR1cm4gY3Vyc29yO1xuXHRcdH07XG5cdH1cblxuXG5cdC8vIElmIHlvdSBuZWVkIHRvIGxvYWQgUGFwYSBQYXJzZSBhc3luY2hyb25vdXNseSBhbmQgeW91IGFsc28gbmVlZCB3b3JrZXIgdGhyZWFkcywgaGFyZC1jb2RlXG5cdC8vIHRoZSBzY3JpcHQgcGF0aCBoZXJlLiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9taG9sdC9QYXBhUGFyc2UvaXNzdWVzLzg3I2lzc3VlY29tbWVudC01Nzg4NTM1OFxuXHRmdW5jdGlvbiBnZXRTY3JpcHRQYXRoKClcblx0e1xuXHRcdHZhciBzY3JpcHRzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpO1xuXHRcdHJldHVybiBzY3JpcHRzLmxlbmd0aCA/IHNjcmlwdHNbc2NyaXB0cy5sZW5ndGggLSAxXS5zcmMgOiAnJztcblx0fVxuXG5cdGZ1bmN0aW9uIG5ld1dvcmtlcigpXG5cdHtcblx0XHRpZiAoIVBhcGEuV09SS0VSU19TVVBQT1JURUQpXG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0aWYgKCFMT0FERURfU1lOQyAmJiBQYXBhLlNDUklQVF9QQVRIID09PSBudWxsKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKFxuXHRcdFx0XHQnU2NyaXB0IHBhdGggY2Fubm90IGJlIGRldGVybWluZWQgYXV0b21hdGljYWxseSB3aGVuIFBhcGEgUGFyc2UgaXMgbG9hZGVkIGFzeW5jaHJvbm91c2x5LiAnICtcblx0XHRcdFx0J1lvdSBuZWVkIHRvIHNldCBQYXBhLlNDUklQVF9QQVRIIG1hbnVhbGx5Lidcblx0XHRcdCk7XG5cdFx0dmFyIHdvcmtlclVybCA9IFBhcGEuU0NSSVBUX1BBVEggfHwgQVVUT19TQ1JJUFRfUEFUSDtcblx0XHQvLyBBcHBlbmQgXCJwYXBhd29ya2VyXCIgdG8gdGhlIHNlYXJjaCBzdHJpbmcgdG8gdGVsbCBwYXBhcGFyc2UgdGhhdCB0aGlzIGlzIG91ciB3b3JrZXIuXG5cdFx0d29ya2VyVXJsICs9ICh3b3JrZXJVcmwuaW5kZXhPZignPycpICE9PSAtMSA/ICcmJyA6ICc/JykgKyAncGFwYXdvcmtlcic7XG5cdFx0dmFyIHcgPSBuZXcgZ2xvYmFsLldvcmtlcih3b3JrZXJVcmwpO1xuXHRcdHcub25tZXNzYWdlID0gbWFpblRocmVhZFJlY2VpdmVkTWVzc2FnZTtcblx0XHR3LmlkID0gd29ya2VySWRDb3VudGVyKys7XG5cdFx0d29ya2Vyc1t3LmlkXSA9IHc7XG5cdFx0cmV0dXJuIHc7XG5cdH1cblxuXHQvKiogQ2FsbGJhY2sgd2hlbiBtYWluIHRocmVhZCByZWNlaXZlcyBhIG1lc3NhZ2UgKi9cblx0ZnVuY3Rpb24gbWFpblRocmVhZFJlY2VpdmVkTWVzc2FnZShlKVxuXHR7XG5cdFx0dmFyIG1zZyA9IGUuZGF0YTtcblx0XHR2YXIgd29ya2VyID0gd29ya2Vyc1ttc2cud29ya2VySWRdO1xuXHRcdHZhciBhYm9ydGVkID0gZmFsc2U7XG5cblx0XHRpZiAobXNnLmVycm9yKVxuXHRcdFx0d29ya2VyLnVzZXJFcnJvcihtc2cuZXJyb3IsIG1zZy5maWxlKTtcblx0XHRlbHNlIGlmIChtc2cucmVzdWx0cyAmJiBtc2cucmVzdWx0cy5kYXRhKVxuXHRcdHtcblx0XHRcdHZhciBhYm9ydCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRhYm9ydGVkID0gdHJ1ZTtcblx0XHRcdFx0Y29tcGxldGVXb3JrZXIobXNnLndvcmtlcklkLCB7IGRhdGE6IFtdLCBlcnJvcnM6IFtdLCBtZXRhOiB7IGFib3J0ZWQ6IHRydWUgfSB9KTtcblx0XHRcdH07XG5cblx0XHRcdHZhciBoYW5kbGUgPSB7XG5cdFx0XHRcdGFib3J0OiBhYm9ydCxcblx0XHRcdFx0cGF1c2U6IG5vdEltcGxlbWVudGVkLFxuXHRcdFx0XHRyZXN1bWU6IG5vdEltcGxlbWVudGVkXG5cdFx0XHR9O1xuXG5cdFx0XHRpZiAoaXNGdW5jdGlvbih3b3JrZXIudXNlclN0ZXApKVxuXHRcdFx0e1xuXHRcdFx0XHRmb3IgKHZhciBpID0gMDsgaSA8IG1zZy5yZXN1bHRzLmRhdGEubGVuZ3RoOyBpKyspXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR3b3JrZXIudXNlclN0ZXAoe1xuXHRcdFx0XHRcdFx0ZGF0YTogW21zZy5yZXN1bHRzLmRhdGFbaV1dLFxuXHRcdFx0XHRcdFx0ZXJyb3JzOiBtc2cucmVzdWx0cy5lcnJvcnMsXG5cdFx0XHRcdFx0XHRtZXRhOiBtc2cucmVzdWx0cy5tZXRhXG5cdFx0XHRcdFx0fSwgaGFuZGxlKTtcblx0XHRcdFx0XHRpZiAoYWJvcnRlZClcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGRlbGV0ZSBtc2cucmVzdWx0cztcdC8vIGZyZWUgbWVtb3J5IEFTQVBcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKGlzRnVuY3Rpb24od29ya2VyLnVzZXJDaHVuaykpXG5cdFx0XHR7XG5cdFx0XHRcdHdvcmtlci51c2VyQ2h1bmsobXNnLnJlc3VsdHMsIGhhbmRsZSwgbXNnLmZpbGUpO1xuXHRcdFx0XHRkZWxldGUgbXNnLnJlc3VsdHM7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKG1zZy5maW5pc2hlZCAmJiAhYWJvcnRlZClcblx0XHRcdGNvbXBsZXRlV29ya2VyKG1zZy53b3JrZXJJZCwgbXNnLnJlc3VsdHMpO1xuXHR9XG5cblx0ZnVuY3Rpb24gY29tcGxldGVXb3JrZXIod29ya2VySWQsIHJlc3VsdHMpIHtcblx0XHR2YXIgd29ya2VyID0gd29ya2Vyc1t3b3JrZXJJZF07XG5cdFx0aWYgKGlzRnVuY3Rpb24od29ya2VyLnVzZXJDb21wbGV0ZSkpXG5cdFx0XHR3b3JrZXIudXNlckNvbXBsZXRlKHJlc3VsdHMpO1xuXHRcdHdvcmtlci50ZXJtaW5hdGUoKTtcblx0XHRkZWxldGUgd29ya2Vyc1t3b3JrZXJJZF07XG5cdH1cblxuXHRmdW5jdGlvbiBub3RJbXBsZW1lbnRlZCgpIHtcblx0XHR0aHJvdyBcIk5vdCBpbXBsZW1lbnRlZC5cIjtcblx0fVxuXG5cdC8qKiBDYWxsYmFjayB3aGVuIHdvcmtlciB0aHJlYWQgcmVjZWl2ZXMgYSBtZXNzYWdlICovXG5cdGZ1bmN0aW9uIHdvcmtlclRocmVhZFJlY2VpdmVkTWVzc2FnZShlKVxuXHR7XG5cdFx0dmFyIG1zZyA9IGUuZGF0YTtcblxuXHRcdGlmICh0eXBlb2YgUGFwYS5XT1JLRVJfSUQgPT09ICd1bmRlZmluZWQnICYmIG1zZylcblx0XHRcdFBhcGEuV09SS0VSX0lEID0gbXNnLndvcmtlcklkO1xuXG5cdFx0aWYgKHR5cGVvZiBtc2cuaW5wdXQgPT09ICdzdHJpbmcnKVxuXHRcdHtcblx0XHRcdGdsb2JhbC5wb3N0TWVzc2FnZSh7XG5cdFx0XHRcdHdvcmtlcklkOiBQYXBhLldPUktFUl9JRCxcblx0XHRcdFx0cmVzdWx0czogUGFwYS5wYXJzZShtc2cuaW5wdXQsIG1zZy5jb25maWcpLFxuXHRcdFx0XHRmaW5pc2hlZDogdHJ1ZVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGVsc2UgaWYgKChnbG9iYWwuRmlsZSAmJiBtc2cuaW5wdXQgaW5zdGFuY2VvZiBGaWxlKSB8fCBtc2cuaW5wdXQgaW5zdGFuY2VvZiBPYmplY3QpXHQvLyB0aGFuayB5b3UsIFNhZmFyaSAoc2VlIGlzc3VlICMxMDYpXG5cdFx0e1xuXHRcdFx0dmFyIHJlc3VsdHMgPSBQYXBhLnBhcnNlKG1zZy5pbnB1dCwgbXNnLmNvbmZpZyk7XG5cdFx0XHRpZiAocmVzdWx0cylcblx0XHRcdFx0Z2xvYmFsLnBvc3RNZXNzYWdlKHtcblx0XHRcdFx0XHR3b3JrZXJJZDogUGFwYS5XT1JLRVJfSUQsXG5cdFx0XHRcdFx0cmVzdWx0czogcmVzdWx0cyxcblx0XHRcdFx0XHRmaW5pc2hlZDogdHJ1ZVxuXHRcdFx0XHR9KTtcblx0XHR9XG5cdH1cblxuXHQvKiogTWFrZXMgYSBkZWVwIGNvcHkgb2YgYW4gYXJyYXkgb3Igb2JqZWN0IChtb3N0bHkpICovXG5cdGZ1bmN0aW9uIGNvcHkob2JqKVxuXHR7XG5cdFx0aWYgKHR5cGVvZiBvYmogIT09ICdvYmplY3QnKVxuXHRcdFx0cmV0dXJuIG9iajtcblx0XHR2YXIgY3B5ID0gb2JqIGluc3RhbmNlb2YgQXJyYXkgPyBbXSA6IHt9O1xuXHRcdGZvciAodmFyIGtleSBpbiBvYmopXG5cdFx0XHRjcHlba2V5XSA9IGNvcHkob2JqW2tleV0pO1xuXHRcdHJldHVybiBjcHk7XG5cdH1cblxuXHRmdW5jdGlvbiBiaW5kRnVuY3Rpb24oZiwgc2VsZilcblx0e1xuXHRcdHJldHVybiBmdW5jdGlvbigpIHsgZi5hcHBseShzZWxmLCBhcmd1bWVudHMpOyB9O1xuXHR9XG5cblx0ZnVuY3Rpb24gaXNGdW5jdGlvbihmdW5jKVxuXHR7XG5cdFx0cmV0dXJuIHR5cGVvZiBmdW5jID09PSAnZnVuY3Rpb24nO1xuXHR9XG59KSh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHRoaXMpO1xuIiwiJ3VzZSBzdHJpY3QnO1xudmFyIHN0cmljdFVyaUVuY29kZSA9IHJlcXVpcmUoJ3N0cmljdC11cmktZW5jb2RlJyk7XG52YXIgb2JqZWN0QXNzaWduID0gcmVxdWlyZSgnb2JqZWN0LWFzc2lnbicpO1xuXG5mdW5jdGlvbiBlbmNvZGUodmFsdWUsIG9wdHMpIHtcblx0aWYgKG9wdHMuZW5jb2RlKSB7XG5cdFx0cmV0dXJuIG9wdHMuc3RyaWN0ID8gc3RyaWN0VXJpRW5jb2RlKHZhbHVlKSA6IGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG5cdH1cblxuXHRyZXR1cm4gdmFsdWU7XG59XG5cbmV4cG9ydHMuZXh0cmFjdCA9IGZ1bmN0aW9uIChzdHIpIHtcblx0cmV0dXJuIHN0ci5zcGxpdCgnPycpWzFdIHx8ICcnO1xufTtcblxuZXhwb3J0cy5wYXJzZSA9IGZ1bmN0aW9uIChzdHIpIHtcblx0Ly8gQ3JlYXRlIGFuIG9iamVjdCB3aXRoIG5vIHByb3RvdHlwZVxuXHQvLyBodHRwczovL2dpdGh1Yi5jb20vc2luZHJlc29yaHVzL3F1ZXJ5LXN0cmluZy9pc3N1ZXMvNDdcblx0dmFyIHJldCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cblx0aWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSB7XG5cdFx0cmV0dXJuIHJldDtcblx0fVxuXG5cdHN0ciA9IHN0ci50cmltKCkucmVwbGFjZSgvXihcXD98I3wmKS8sICcnKTtcblxuXHRpZiAoIXN0cikge1xuXHRcdHJldHVybiByZXQ7XG5cdH1cblxuXHRzdHIuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uIChwYXJhbSkge1xuXHRcdHZhciBwYXJ0cyA9IHBhcmFtLnJlcGxhY2UoL1xcKy9nLCAnICcpLnNwbGl0KCc9Jyk7XG5cdFx0Ly8gRmlyZWZveCAocHJlIDQwKSBkZWNvZGVzIGAlM0RgIHRvIGA9YFxuXHRcdC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9zaW5kcmVzb3JodXMvcXVlcnktc3RyaW5nL3B1bGwvMzdcblx0XHR2YXIga2V5ID0gcGFydHMuc2hpZnQoKTtcblx0XHR2YXIgdmFsID0gcGFydHMubGVuZ3RoID4gMCA/IHBhcnRzLmpvaW4oJz0nKSA6IHVuZGVmaW5lZDtcblxuXHRcdGtleSA9IGRlY29kZVVSSUNvbXBvbmVudChrZXkpO1xuXG5cdFx0Ly8gbWlzc2luZyBgPWAgc2hvdWxkIGJlIGBudWxsYDpcblx0XHQvLyBodHRwOi8vdzMub3JnL1RSLzIwMTIvV0QtdXJsLTIwMTIwNTI0LyNjb2xsZWN0LXVybC1wYXJhbWV0ZXJzXG5cdFx0dmFsID0gdmFsID09PSB1bmRlZmluZWQgPyBudWxsIDogZGVjb2RlVVJJQ29tcG9uZW50KHZhbCk7XG5cblx0XHRpZiAocmV0W2tleV0gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0cmV0W2tleV0gPSB2YWw7XG5cdFx0fSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHJldFtrZXldKSkge1xuXHRcdFx0cmV0W2tleV0ucHVzaCh2YWwpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXRba2V5XSA9IFtyZXRba2V5XSwgdmFsXTtcblx0XHR9XG5cdH0pO1xuXG5cdHJldHVybiByZXQ7XG59O1xuXG5leHBvcnRzLnN0cmluZ2lmeSA9IGZ1bmN0aW9uIChvYmosIG9wdHMpIHtcblx0dmFyIGRlZmF1bHRzID0ge1xuXHRcdGVuY29kZTogdHJ1ZSxcblx0XHRzdHJpY3Q6IHRydWVcblx0fTtcblxuXHRvcHRzID0gb2JqZWN0QXNzaWduKGRlZmF1bHRzLCBvcHRzKTtcblxuXHRyZXR1cm4gb2JqID8gT2JqZWN0LmtleXMob2JqKS5zb3J0KCkubWFwKGZ1bmN0aW9uIChrZXkpIHtcblx0XHR2YXIgdmFsID0gb2JqW2tleV07XG5cblx0XHRpZiAodmFsID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHJldHVybiAnJztcblx0XHR9XG5cblx0XHRpZiAodmFsID09PSBudWxsKSB7XG5cdFx0XHRyZXR1cm4gZW5jb2RlKGtleSwgb3B0cyk7XG5cdFx0fVxuXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkodmFsKSkge1xuXHRcdFx0dmFyIHJlc3VsdCA9IFtdO1xuXG5cdFx0XHR2YWwuc2xpY2UoKS5mb3JFYWNoKGZ1bmN0aW9uICh2YWwyKSB7XG5cdFx0XHRcdGlmICh2YWwyID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAodmFsMiA9PT0gbnVsbCkge1xuXHRcdFx0XHRcdHJlc3VsdC5wdXNoKGVuY29kZShrZXksIG9wdHMpKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXN1bHQucHVzaChlbmNvZGUoa2V5LCBvcHRzKSArICc9JyArIGVuY29kZSh2YWwyLCBvcHRzKSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gcmVzdWx0LmpvaW4oJyYnKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gZW5jb2RlKGtleSwgb3B0cykgKyAnPScgKyBlbmNvZGUodmFsLCBvcHRzKTtcblx0fSkuZmlsdGVyKGZ1bmN0aW9uICh4KSB7XG5cdFx0cmV0dXJuIHgubGVuZ3RoID4gMDtcblx0fSkuam9pbignJicpIDogJyc7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoc3RyKSB7XG5cdHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoc3RyKS5yZXBsYWNlKC9bIScoKSpdL2csIGZ1bmN0aW9uIChjKSB7XG5cdFx0cmV0dXJuICclJyArIGMuY2hhckNvZGVBdCgwKS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKTtcblx0fSk7XG59O1xuIiwiLypcbiAqIENvcHlyaWdodCAyMDE2IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuY29uc3QgSEVBRF9FTEJPV19PRkZTRVQgPSBuZXcgVEhSRUUuVmVjdG9yMygwLjE1NSwgLTAuNDY1LCAtMC4xNSk7XG5jb25zdCBFTEJPV19XUklTVF9PRkZTRVQgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAtMC4yNSk7XG5jb25zdCBXUklTVF9DT05UUk9MTEVSX09GRlNFVCA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIDAuMDUpO1xuY29uc3QgQVJNX0VYVEVOU0lPTl9PRkZTRVQgPSBuZXcgVEhSRUUuVmVjdG9yMygtMC4wOCwgMC4xNCwgMC4wOCk7XG5cbmNvbnN0IEVMQk9XX0JFTkRfUkFUSU8gPSAwLjQ7IC8vIDQwJSBlbGJvdywgNjAlIHdyaXN0LlxuY29uc3QgRVhURU5TSU9OX1JBVElPX1dFSUdIVCA9IDAuNDtcblxuY29uc3QgTUlOX0FOR1VMQVJfU1BFRUQgPSAwLjYxOyAvLyAzNSBkZWdyZWVzIHBlciBzZWNvbmQgKGluIHJhZGlhbnMpLlxuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIGFybSBtb2RlbCBmb3IgdGhlIERheWRyZWFtIGNvbnRyb2xsZXIuIEZlZWQgaXQgYSBjYW1lcmEgYW5kXG4gKiB0aGUgY29udHJvbGxlci4gVXBkYXRlIGl0IG9uIGEgUkFGLlxuICpcbiAqIEdldCB0aGUgbW9kZWwncyBwb3NlIHVzaW5nIGdldFBvc2UoKS5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgT3JpZW50YXRpb25Bcm1Nb2RlbCB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuaXNMZWZ0SGFuZGVkID0gZmFsc2U7XG5cbiAgICAvLyBDdXJyZW50IGFuZCBwcmV2aW91cyBjb250cm9sbGVyIG9yaWVudGF0aW9ucy5cbiAgICB0aGlzLmNvbnRyb2xsZXJRID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcbiAgICB0aGlzLmxhc3RDb250cm9sbGVyUSA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG5cbiAgICAvLyBDdXJyZW50IGFuZCBwcmV2aW91cyBoZWFkIG9yaWVudGF0aW9ucy5cbiAgICB0aGlzLmhlYWRRID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcblxuICAgIC8vIEN1cnJlbnQgaGVhZCBwb3NpdGlvbi5cbiAgICB0aGlzLmhlYWRQb3MgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuXG4gICAgLy8gUG9zaXRpb25zIG9mIG90aGVyIGpvaW50cyAobW9zdGx5IGZvciBkZWJ1Z2dpbmcpLlxuICAgIHRoaXMuZWxib3dQb3MgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICAgIHRoaXMud3Jpc3RQb3MgPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuXG4gICAgLy8gQ3VycmVudCBhbmQgcHJldmlvdXMgdGltZXMgdGhlIG1vZGVsIHdhcyB1cGRhdGVkLlxuICAgIHRoaXMudGltZSA9IG51bGw7XG4gICAgdGhpcy5sYXN0VGltZSA9IG51bGw7XG5cbiAgICAvLyBSb290IHJvdGF0aW9uLlxuICAgIHRoaXMucm9vdFEgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuXG4gICAgLy8gQ3VycmVudCBwb3NlIHRoYXQgdGhpcyBhcm0gbW9kZWwgY2FsY3VsYXRlcy5cbiAgICB0aGlzLnBvc2UgPSB7XG4gICAgICBvcmllbnRhdGlvbjogbmV3IFRIUkVFLlF1YXRlcm5pb24oKSxcbiAgICAgIHBvc2l0aW9uOiBuZXcgVEhSRUUuVmVjdG9yMygpXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBNZXRob2RzIHRvIHNldCBjb250cm9sbGVyIGFuZCBoZWFkIHBvc2UgKGluIHdvcmxkIGNvb3JkaW5hdGVzKS5cbiAgICovXG4gIHNldENvbnRyb2xsZXJPcmllbnRhdGlvbihxdWF0ZXJuaW9uKSB7XG4gICAgdGhpcy5sYXN0Q29udHJvbGxlclEuY29weSh0aGlzLmNvbnRyb2xsZXJRKTtcbiAgICB0aGlzLmNvbnRyb2xsZXJRLmNvcHkocXVhdGVybmlvbik7XG4gIH1cblxuICBzZXRIZWFkT3JpZW50YXRpb24ocXVhdGVybmlvbikge1xuICAgIHRoaXMuaGVhZFEuY29weShxdWF0ZXJuaW9uKTtcbiAgfVxuXG4gIHNldEhlYWRQb3NpdGlvbihwb3NpdGlvbikge1xuICAgIHRoaXMuaGVhZFBvcy5jb3B5KHBvc2l0aW9uKTtcbiAgfVxuXG4gIHNldExlZnRIYW5kZWQoaXNMZWZ0SGFuZGVkKSB7XG4gICAgLy8gVE9ETyhzbXVzKTogSW1wbGVtZW50IG1lIVxuICAgIHRoaXMuaXNMZWZ0SGFuZGVkID0gaXNMZWZ0SGFuZGVkO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbGxlZCBvbiBhIFJBRi5cbiAgICovXG4gIHVwZGF0ZSgpIHtcbiAgICB0aGlzLnRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcblxuICAgIC8vIElmIHRoZSBjb250cm9sbGVyJ3MgYW5ndWxhciB2ZWxvY2l0eSBpcyBhYm92ZSBhIGNlcnRhaW4gYW1vdW50LCB3ZSBjYW5cbiAgICAvLyBhc3N1bWUgdG9yc28gcm90YXRpb24gYW5kIG1vdmUgdGhlIGVsYm93IGpvaW50IHJlbGF0aXZlIHRvIHRoZVxuICAgIC8vIGNhbWVyYSBvcmllbnRhdGlvbi5cbiAgICBsZXQgaGVhZFlhd1EgPSB0aGlzLmdldEhlYWRZYXdPcmllbnRhdGlvbl8oKTtcbiAgICBsZXQgdGltZURlbHRhID0gKHRoaXMudGltZSAtIHRoaXMubGFzdFRpbWUpIC8gMTAwMDtcbiAgICBsZXQgYW5nbGVEZWx0YSA9IHRoaXMucXVhdEFuZ2xlXyh0aGlzLmxhc3RDb250cm9sbGVyUSwgdGhpcy5jb250cm9sbGVyUSk7XG4gICAgbGV0IGNvbnRyb2xsZXJBbmd1bGFyU3BlZWQgPSBhbmdsZURlbHRhIC8gdGltZURlbHRhO1xuICAgIGlmIChjb250cm9sbGVyQW5ndWxhclNwZWVkID4gTUlOX0FOR1VMQVJfU1BFRUQpIHtcbiAgICAgIC8vIEF0dGVudWF0ZSB0aGUgUm9vdCByb3RhdGlvbiBzbGlnaHRseS5cbiAgICAgIHRoaXMucm9vdFEuc2xlcnAoaGVhZFlhd1EsIGFuZ2xlRGVsdGEgLyAxMClcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yb290US5jb3B5KGhlYWRZYXdRKTtcbiAgICB9XG5cbiAgICAvLyBXZSB3YW50IHRvIG1vdmUgdGhlIGVsYm93IHVwIGFuZCB0byB0aGUgY2VudGVyIGFzIHRoZSB1c2VyIHBvaW50cyB0aGVcbiAgICAvLyBjb250cm9sbGVyIHVwd2FyZHMsIHNvIHRoYXQgdGhleSBjYW4gZWFzaWx5IHNlZSB0aGUgY29udHJvbGxlciBhbmQgaXRzXG4gICAgLy8gdG9vbCB0aXBzLlxuICAgIGxldCBjb250cm9sbGVyRXVsZXIgPSBuZXcgVEhSRUUuRXVsZXIoKS5zZXRGcm9tUXVhdGVybmlvbih0aGlzLmNvbnRyb2xsZXJRLCAnWVhaJyk7XG4gICAgbGV0IGNvbnRyb2xsZXJYRGVnID0gVEhSRUUuTWF0aC5yYWRUb0RlZyhjb250cm9sbGVyRXVsZXIueCk7XG4gICAgbGV0IGV4dGVuc2lvblJhdGlvID0gdGhpcy5jbGFtcF8oKGNvbnRyb2xsZXJYRGVnIC0gMTEpIC8gKDUwIC0gMTEpLCAwLCAxKTtcblxuICAgIC8vIENvbnRyb2xsZXIgb3JpZW50YXRpb24gaW4gY2FtZXJhIHNwYWNlLlxuICAgIGxldCBjb250cm9sbGVyQ2FtZXJhUSA9IHRoaXMucm9vdFEuY2xvbmUoKS5pbnZlcnNlKCk7XG4gICAgY29udHJvbGxlckNhbWVyYVEubXVsdGlwbHkodGhpcy5jb250cm9sbGVyUSk7XG5cbiAgICAvLyBDYWxjdWxhdGUgZWxib3cgcG9zaXRpb24uXG4gICAgbGV0IGVsYm93UG9zID0gdGhpcy5lbGJvd1BvcztcbiAgICBlbGJvd1Bvcy5jb3B5KHRoaXMuaGVhZFBvcykuYWRkKEhFQURfRUxCT1dfT0ZGU0VUKTtcbiAgICBsZXQgZWxib3dPZmZzZXQgPSBuZXcgVEhSRUUuVmVjdG9yMygpLmNvcHkoQVJNX0VYVEVOU0lPTl9PRkZTRVQpO1xuICAgIGVsYm93T2Zmc2V0Lm11bHRpcGx5U2NhbGFyKGV4dGVuc2lvblJhdGlvKTtcbiAgICBlbGJvd1Bvcy5hZGQoZWxib3dPZmZzZXQpO1xuXG4gICAgLy8gQ2FsY3VsYXRlIGpvaW50IGFuZ2xlcy4gR2VuZXJhbGx5IDQwJSBvZiByb3RhdGlvbiBhcHBsaWVkIHRvIGVsYm93LCA2MCVcbiAgICAvLyB0byB3cmlzdCwgYnV0IGlmIGNvbnRyb2xsZXIgaXMgcmFpc2VkIGhpZ2hlciwgbW9yZSByb3RhdGlvbiBjb21lcyBmcm9tXG4gICAgLy8gdGhlIHdyaXN0LlxuICAgIGxldCB0b3RhbEFuZ2xlID0gdGhpcy5xdWF0QW5nbGVfKGNvbnRyb2xsZXJDYW1lcmFRLCBuZXcgVEhSRUUuUXVhdGVybmlvbigpKTtcbiAgICBsZXQgdG90YWxBbmdsZURlZyA9IFRIUkVFLk1hdGgucmFkVG9EZWcodG90YWxBbmdsZSk7XG4gICAgbGV0IGxlcnBTdXBwcmVzc2lvbiA9IDEgLSBNYXRoLnBvdyh0b3RhbEFuZ2xlRGVnIC8gMTgwLCA0KTsgLy8gVE9ETyhzbXVzKTogPz8/XG5cbiAgICBsZXQgZWxib3dSYXRpbyA9IEVMQk9XX0JFTkRfUkFUSU87XG4gICAgbGV0IHdyaXN0UmF0aW8gPSAxIC0gRUxCT1dfQkVORF9SQVRJTztcbiAgICBsZXQgbGVycFZhbHVlID0gbGVycFN1cHByZXNzaW9uICpcbiAgICAgICAgKGVsYm93UmF0aW8gKyB3cmlzdFJhdGlvICogZXh0ZW5zaW9uUmF0aW8gKiBFWFRFTlNJT05fUkFUSU9fV0VJR0hUKTtcblxuICAgIGxldCB3cmlzdFEgPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpLnNsZXJwKGNvbnRyb2xsZXJDYW1lcmFRLCBsZXJwVmFsdWUpO1xuICAgIGxldCBpbnZXcmlzdFEgPSB3cmlzdFEuaW52ZXJzZSgpO1xuICAgIGxldCBlbGJvd1EgPSBjb250cm9sbGVyQ2FtZXJhUS5jbG9uZSgpLm11bHRpcGx5KGludldyaXN0USk7XG5cbiAgICAvLyBDYWxjdWxhdGUgb3VyIGZpbmFsIGNvbnRyb2xsZXIgcG9zaXRpb24gYmFzZWQgb24gYWxsIG91ciBqb2ludCByb3RhdGlvbnNcbiAgICAvLyBhbmQgbGVuZ3Rocy5cbiAgICAvKlxuICAgIHBvc2l0aW9uXyA9XG4gICAgICByb290X3JvdF8gKiAoXG4gICAgICAgIGNvbnRyb2xsZXJfcm9vdF9vZmZzZXRfICtcbjI6ICAgICAgKGFybV9leHRlbnNpb25fICogYW10X2V4dGVuc2lvbikgK1xuMTogICAgICBlbGJvd19yb3QgKiAoa0NvbnRyb2xsZXJGb3JlYXJtICsgKHdyaXN0X3JvdCAqIGtDb250cm9sbGVyUG9zaXRpb24pKVxuICAgICAgKTtcbiAgICAqL1xuICAgIGxldCB3cmlzdFBvcyA9IHRoaXMud3Jpc3RQb3M7XG4gICAgd3Jpc3RQb3MuY29weShXUklTVF9DT05UUk9MTEVSX09GRlNFVCk7XG4gICAgd3Jpc3RQb3MuYXBwbHlRdWF0ZXJuaW9uKHdyaXN0USk7XG4gICAgd3Jpc3RQb3MuYWRkKEVMQk9XX1dSSVNUX09GRlNFVCk7XG4gICAgd3Jpc3RQb3MuYXBwbHlRdWF0ZXJuaW9uKGVsYm93USk7XG4gICAgd3Jpc3RQb3MuYWRkKHRoaXMuZWxib3dQb3MpO1xuXG4gICAgbGV0IG9mZnNldCA9IG5ldyBUSFJFRS5WZWN0b3IzKCkuY29weShBUk1fRVhURU5TSU9OX09GRlNFVCk7XG4gICAgb2Zmc2V0Lm11bHRpcGx5U2NhbGFyKGV4dGVuc2lvblJhdGlvKTtcblxuICAgIGxldCBwb3NpdGlvbiA9IG5ldyBUSFJFRS5WZWN0b3IzKCkuY29weSh0aGlzLndyaXN0UG9zKTtcbiAgICBwb3NpdGlvbi5hZGQob2Zmc2V0KTtcbiAgICBwb3NpdGlvbi5hcHBseVF1YXRlcm5pb24odGhpcy5yb290USk7XG5cbiAgICBsZXQgb3JpZW50YXRpb24gPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpLmNvcHkodGhpcy5jb250cm9sbGVyUSk7XG5cbiAgICAvLyBTZXQgdGhlIHJlc3VsdGluZyBwb3NlIG9yaWVudGF0aW9uIGFuZCBwb3NpdGlvbi5cbiAgICB0aGlzLnBvc2Uub3JpZW50YXRpb24uY29weShvcmllbnRhdGlvbik7XG4gICAgdGhpcy5wb3NlLnBvc2l0aW9uLmNvcHkocG9zaXRpb24pO1xuXG4gICAgdGhpcy5sYXN0VGltZSA9IHRoaXMudGltZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRoZSBwb3NlIGNhbGN1bGF0ZWQgYnkgdGhlIG1vZGVsLlxuICAgKi9cbiAgZ2V0UG9zZSgpIHtcbiAgICByZXR1cm4gdGhpcy5wb3NlO1xuICB9XG5cbiAgLyoqXG4gICAqIERlYnVnIG1ldGhvZHMgZm9yIHJlbmRlcmluZyB0aGUgYXJtIG1vZGVsLlxuICAgKi9cbiAgZ2V0Rm9yZWFybUxlbmd0aCgpIHtcbiAgICByZXR1cm4gRUxCT1dfV1JJU1RfT0ZGU0VULmxlbmd0aCgpO1xuICB9XG5cbiAgZ2V0RWxib3dQb3NpdGlvbigpIHtcbiAgICBsZXQgb3V0ID0gdGhpcy5lbGJvd1Bvcy5jbG9uZSgpO1xuICAgIHJldHVybiBvdXQuYXBwbHlRdWF0ZXJuaW9uKHRoaXMucm9vdFEpO1xuICB9XG5cbiAgZ2V0V3Jpc3RQb3NpdGlvbigpIHtcbiAgICBsZXQgb3V0ID0gdGhpcy53cmlzdFBvcy5jbG9uZSgpO1xuICAgIHJldHVybiBvdXQuYXBwbHlRdWF0ZXJuaW9uKHRoaXMucm9vdFEpO1xuICB9XG5cbiAgZ2V0SGVhZFlhd09yaWVudGF0aW9uXygpIHtcbiAgICBsZXQgaGVhZEV1bGVyID0gbmV3IFRIUkVFLkV1bGVyKCkuc2V0RnJvbVF1YXRlcm5pb24odGhpcy5oZWFkUSwgJ1lYWicpO1xuICAgIGhlYWRFdWxlci54ID0gMDtcbiAgICBoZWFkRXVsZXIueiA9IDA7XG4gICAgbGV0IGRlc3RpbmF0aW9uUSA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCkuc2V0RnJvbUV1bGVyKGhlYWRFdWxlcik7XG4gICAgcmV0dXJuIGRlc3RpbmF0aW9uUTtcbiAgfVxuXG4gIGNsYW1wXyh2YWx1ZSwgbWluLCBtYXgpIHtcbiAgICByZXR1cm4gTWF0aC5taW4oTWF0aC5tYXgodmFsdWUsIG1pbiksIG1heCk7XG4gIH1cblxuICBxdWF0QW5nbGVfKHExLCBxMikge1xuICAgIGxldCB2ZWMxID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgLTEpO1xuICAgIGxldCB2ZWMyID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgLTEpO1xuICAgIHZlYzEuYXBwbHlRdWF0ZXJuaW9uKHExKTtcbiAgICB2ZWMyLmFwcGx5UXVhdGVybmlvbihxMik7XG4gICAgcmV0dXJuIHZlYzEuYW5nbGVUbyh2ZWMyKTtcbiAgfVxufVxuIiwiLypcbiAqIENvcHlyaWdodCAyMDE2IEdvb2dsZSBJbmMuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICdldmVudGVtaXR0ZXIzJ1xuaW1wb3J0IEludGVyYWN0aW9uTW9kZXMgZnJvbSAnLi9yYXktaW50ZXJhY3Rpb24tbW9kZXMnXG5pbXBvcnQge2lzTW9iaWxlfSBmcm9tICcuL3V0aWwnXG5cbmNvbnN0IERSQUdfRElTVEFOQ0VfUFggPSAxMDtcblxuLyoqXG4gKiBFbnVtZXJhdGVzIGFsbCBwb3NzaWJsZSBpbnRlcmFjdGlvbiBtb2Rlcy4gU2V0cyB1cCBhbGwgZXZlbnQgaGFuZGxlcnMgKG1vdXNlLFxuICogdG91Y2gsIGV0YyksIGludGVyZmFjZXMgd2l0aCBnYW1lcGFkIEFQSS5cbiAqXG4gKiBFbWl0cyBldmVudHM6XG4gKiAgICBhY3Rpb246IElucHV0IGlzIGFjdGl2YXRlZCAobW91c2Vkb3duLCB0b3VjaHN0YXJ0LCBkYXlkcmVhbSBjbGljaywgdml2ZVxuICogICAgdHJpZ2dlcikuXG4gKiAgICByZWxlYXNlOiBJbnB1dCBpcyBkZWFjdGl2YXRlZCAobW91c2V1cCwgdG91Y2hlbmQsIGRheWRyZWFtIHJlbGVhc2UsIHZpdmVcbiAqICAgIHJlbGVhc2UpLlxuICogICAgY2FuY2VsOiBJbnB1dCBpcyBjYW5jZWxlZCAoZWcuIHdlIHNjcm9sbGVkIGluc3RlYWQgb2YgdGFwcGluZyBvblxuICogICAgbW9iaWxlL2Rlc2t0b3ApLlxuICogICAgcG9pbnRlcm1vdmUoMkQgcG9zaXRpb24pOiBUaGUgcG9pbnRlciBpcyBtb3ZlZCAobW91c2Ugb3IgdG91Y2gpLlxuICovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBSYXlDb250cm9sbGVyIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3IocmVuZGVyZXIpIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMucmVuZGVyZXIgPSByZW5kZXJlcjtcblxuICAgIHRoaXMuYXZhaWxhYmxlSW50ZXJhY3Rpb25zID0ge307XG5cbiAgICAvLyBIYW5kbGUgaW50ZXJhY3Rpb25zLlxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCB0aGlzLm9uTW91c2VEb3duXy5iaW5kKHRoaXMpKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgdGhpcy5vbk1vdXNlTW92ZV8uYmluZCh0aGlzKSk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCB0aGlzLm9uTW91c2VVcF8uYmluZCh0aGlzKSk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB0aGlzLm9uVG91Y2hTdGFydF8uYmluZCh0aGlzKSk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIHRoaXMub25Ub3VjaE1vdmVfLmJpbmQodGhpcykpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIHRoaXMub25Ub3VjaEVuZF8uYmluZCh0aGlzKSk7XG5cbiAgICAvLyBUaGUgcG9zaXRpb24gb2YgdGhlIHBvaW50ZXIuXG4gICAgdGhpcy5wb2ludGVyID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcbiAgICAvLyBUaGUgcHJldmlvdXMgcG9zaXRpb24gb2YgdGhlIHBvaW50ZXIuXG4gICAgdGhpcy5sYXN0UG9pbnRlciA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG4gICAgLy8gUG9zaXRpb24gb2YgcG9pbnRlciBpbiBOb3JtYWxpemVkIERldmljZSBDb29yZGluYXRlcyAoTkRDKS5cbiAgICB0aGlzLnBvaW50ZXJOZGMgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuICAgIC8vIEhvdyBtdWNoIHdlIGhhdmUgZHJhZ2dlZCAoaWYgd2UgYXJlIGRyYWdnaW5nKS5cbiAgICB0aGlzLmRyYWdEaXN0YW5jZSA9IDA7XG4gICAgLy8gQXJlIHdlIGRyYWdnaW5nIG9yIG5vdC5cbiAgICB0aGlzLmlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgICAvLyBJcyBwb2ludGVyIGFjdGl2ZSBvciBub3QuXG4gICAgdGhpcy5pc1RvdWNoQWN0aXZlID0gZmFsc2U7XG5cbiAgICAvLyBHYW1lcGFkIGV2ZW50cy5cbiAgICB0aGlzLmdhbWVwYWQgPSBudWxsO1xuXG4gICAgLy8gVlIgRXZlbnRzLlxuICAgIGlmICghbmF2aWdhdG9yLmdldFZSRGlzcGxheXMpIHtcbiAgICAgIGNvbnNvbGUud2FybignV2ViVlIgQVBJIG5vdCBhdmFpbGFibGUhIENvbnNpZGVyIHVzaW5nIHRoZSB3ZWJ2ci1wb2x5ZmlsbC4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmF2aWdhdG9yLmdldFZSRGlzcGxheXMoKS50aGVuKChkaXNwbGF5cykgPT4ge1xuICAgICAgICB0aGlzLnZyRGlzcGxheSA9IGRpc3BsYXlzWzBdO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgZ2V0SW50ZXJhY3Rpb25Nb2RlKCkge1xuICAgIC8vIFRPRE86IERlYnVnZ2luZyBvbmx5LlxuICAgIC8vcmV0dXJuIEludGVyYWN0aW9uTW9kZXMuREFZRFJFQU07XG5cbiAgICB2YXIgZ2FtZXBhZCA9IHRoaXMuZ2V0VlJHYW1lcGFkXygpO1xuXG4gICAgaWYgKGdhbWVwYWQpIHtcbiAgICAgIGxldCBwb3NlID0gZ2FtZXBhZC5wb3NlO1xuICAgICAgLy8gSWYgdGhlcmUncyBhIGdhbWVwYWQgY29ubmVjdGVkLCBkZXRlcm1pbmUgaWYgaXQncyBEYXlkcmVhbSBvciBhIFZpdmUuXG4gICAgICBpZiAocG9zZS5oYXNQb3NpdGlvbikge1xuICAgICAgICByZXR1cm4gSW50ZXJhY3Rpb25Nb2Rlcy5WUl82RE9GO1xuICAgICAgfVxuXG4gICAgICBpZiAocG9zZS5oYXNPcmllbnRhdGlvbikge1xuICAgICAgICByZXR1cm4gSW50ZXJhY3Rpb25Nb2Rlcy5WUl8zRE9GO1xuICAgICAgfVxuXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIHRoZXJlJ3Mgbm8gZ2FtZXBhZCwgaXQgbWlnaHQgYmUgQ2FyZGJvYXJkLCBtYWdpYyB3aW5kb3cgb3IgZGVza3RvcC5cbiAgICAgIGlmIChpc01vYmlsZSgpKSB7XG4gICAgICAgIC8vIEVpdGhlciBDYXJkYm9hcmQgb3IgbWFnaWMgd2luZG93LCBkZXBlbmRpbmcgb24gd2hldGhlciB3ZSBhcmVcbiAgICAgICAgLy8gcHJlc2VudGluZy5cbiAgICAgICAgaWYgKHRoaXMudnJEaXNwbGF5ICYmIHRoaXMudnJEaXNwbGF5LmlzUHJlc2VudGluZykge1xuICAgICAgICAgIHJldHVybiBJbnRlcmFjdGlvbk1vZGVzLlZSXzBET0Y7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIEludGVyYWN0aW9uTW9kZXMuVE9VQ0g7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFdlIG11c3QgYmUgb24gZGVza3RvcC5cbiAgICAgICAgcmV0dXJuIEludGVyYWN0aW9uTW9kZXMuTU9VU0U7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIEJ5IGRlZmF1bHQsIHVzZSBUT1VDSC5cbiAgICByZXR1cm4gSW50ZXJhY3Rpb25Nb2Rlcy5UT1VDSDtcbiAgfVxuXG4gIGdldEdhbWVwYWRQb3NlKCkge1xuICAgIHZhciBnYW1lcGFkID0gdGhpcy5nZXRWUkdhbWVwYWRfKCk7XG4gICAgcmV0dXJuIGdhbWVwYWQucG9zZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgaWYgdGhlcmUgaXMgYW4gYWN0aXZlIHRvdWNoIGV2ZW50IGdvaW5nIG9uLlxuICAgKiBPbmx5IHJlbGV2YW50IG9uIHRvdWNoIGRldmljZXNcbiAgICovXG4gIGdldElzVG91Y2hBY3RpdmUoKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNUb3VjaEFjdGl2ZTtcbiAgfVxuXG4gIHNldFNpemUoc2l6ZSkge1xuICAgIHRoaXMuc2l6ZSA9IHNpemU7XG4gIH1cblxuICB1cGRhdGUoKSB7XG4gICAgbGV0IG1vZGUgPSB0aGlzLmdldEludGVyYWN0aW9uTW9kZSgpO1xuICAgIGlmIChtb2RlID09IEludGVyYWN0aW9uTW9kZXMuVlJfM0RPRiB8fCBtb2RlID09IEludGVyYWN0aW9uTW9kZXMuVlJfNkRPRikge1xuICAgICAgLy8gSWYgd2UncmUgZGVhbGluZyB3aXRoIGEgZ2FtZXBhZCwgY2hlY2sgZXZlcnkgYW5pbWF0aW9uIGZyYW1lIGZvciBhXG4gICAgICAvLyBwcmVzc2VkIGFjdGlvbi5cbiAgICAgIGxldCBpc0dhbWVwYWRQcmVzc2VkID0gdGhpcy5nZXRHYW1lcGFkQnV0dG9uUHJlc3NlZF8oKTtcbiAgICAgIGlmIChpc0dhbWVwYWRQcmVzc2VkICYmICF0aGlzLndhc0dhbWVwYWRQcmVzc2VkKSB7XG4gICAgICAgIHRoaXMuZW1pdCgncmF5ZG93bicpO1xuICAgICAgfVxuICAgICAgaWYgKCFpc0dhbWVwYWRQcmVzc2VkICYmIHRoaXMud2FzR2FtZXBhZFByZXNzZWQpIHtcbiAgICAgICAgdGhpcy5lbWl0KCdyYXl1cCcpO1xuICAgICAgfVxuICAgICAgdGhpcy53YXNHYW1lcGFkUHJlc3NlZCA9IGlzR2FtZXBhZFByZXNzZWQ7XG4gICAgfVxuICB9XG5cbiAgZ2V0R2FtZXBhZEJ1dHRvblByZXNzZWRfKCkge1xuICAgIHZhciBnYW1lcGFkID0gdGhpcy5nZXRWUkdhbWVwYWRfKCk7XG4gICAgaWYgKCFnYW1lcGFkKSB7XG4gICAgICAvLyBJZiB0aGVyZSdzIG5vIGdhbWVwYWQsIHRoZSBidXR0b24gd2FzIG5vdCBwcmVzc2VkLlxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBDaGVjayBmb3IgY2xpY2tzLlxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgZ2FtZXBhZC5idXR0b25zLmxlbmd0aDsgKytqKSB7XG4gICAgICBpZiAoZ2FtZXBhZC5idXR0b25zW2pdLnByZXNzZWQpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIG9uTW91c2VEb3duXyhlKSB7XG4gICAgdGhpcy5zdGFydERyYWdnaW5nXyhlKTtcbiAgICB0aGlzLmVtaXQoJ3JheWRvd24nKTtcbiAgfVxuXG4gIG9uTW91c2VNb3ZlXyhlKSB7XG4gICAgdGhpcy51cGRhdGVQb2ludGVyXyhlKTtcbiAgICB0aGlzLnVwZGF0ZURyYWdEaXN0YW5jZV8oKTtcbiAgICB0aGlzLmVtaXQoJ3BvaW50ZXJtb3ZlJywgdGhpcy5wb2ludGVyTmRjKTtcbiAgfVxuXG4gIG9uTW91c2VVcF8oZSkge1xuICAgIHRoaXMuZW5kRHJhZ2dpbmdfKCk7XG4gIH1cblxuICBvblRvdWNoU3RhcnRfKGUpIHtcbiAgICB0aGlzLmlzVG91Y2hBY3RpdmUgPSB0cnVlO1xuICAgIHZhciB0ID0gZS50b3VjaGVzWzBdO1xuICAgIHRoaXMuc3RhcnREcmFnZ2luZ18odCk7XG4gICAgdGhpcy51cGRhdGVUb3VjaFBvaW50ZXJfKGUpO1xuXG4gICAgdGhpcy5lbWl0KCdwb2ludGVybW92ZScsIHRoaXMucG9pbnRlck5kYyk7XG4gICAgdGhpcy5lbWl0KCdyYXlkb3duJyk7XG5cbiAgICAvLyBQcmV2ZW50IHN5bnRoZXRpYyBtb3VzZSBldmVudCBmcm9tIGJlaW5nIGNyZWF0ZWQuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICB9XG5cbiAgb25Ub3VjaE1vdmVfKGUpIHtcbiAgICB0aGlzLnVwZGF0ZVRvdWNoUG9pbnRlcl8oZSk7XG4gICAgdGhpcy51cGRhdGVEcmFnRGlzdGFuY2VfKCk7XG5cbiAgICAvLyBQcmV2ZW50IHN5bnRoZXRpYyBtb3VzZSBldmVudCBmcm9tIGJlaW5nIGNyZWF0ZWQuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICB9XG5cbiAgb25Ub3VjaEVuZF8oZSkge1xuICAgIHRoaXMuZW5kRHJhZ2dpbmdfKCk7XG5cbiAgICAvLyBQcmV2ZW50IHN5bnRoZXRpYyBtb3VzZSBldmVudCBmcm9tIGJlaW5nIGNyZWF0ZWQuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHRoaXMuaXNUb3VjaEFjdGl2ZSA9IGZhbHNlO1xuICB9XG5cbiAgdXBkYXRlVG91Y2hQb2ludGVyXyhlKSB7XG4gICAgLy8gSWYgdGhlcmUncyBubyB0b3VjaGVzIGFycmF5LCBpZ25vcmUuXG4gICAgaWYgKGUudG91Y2hlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnNvbGUud2FybignUmVjZWl2ZWQgdG91Y2ggZXZlbnQgd2l0aCBubyB0b3VjaGVzLicpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdCA9IGUudG91Y2hlc1swXTtcbiAgICB0aGlzLnVwZGF0ZVBvaW50ZXJfKHQpO1xuICB9XG5cbiAgdXBkYXRlUG9pbnRlcl8oZSkge1xuICAgIC8vIEhvdyBtdWNoIHRoZSBwb2ludGVyIG1vdmVkLlxuICAgIHRoaXMucG9pbnRlci5zZXQoZS5jbGllbnRYLCBlLmNsaWVudFkpO1xuICAgIHRoaXMucG9pbnRlck5kYy54ID0gKGUuY2xpZW50WCAvIHRoaXMuc2l6ZS53aWR0aCkgKiAyIC0gMTtcbiAgICB0aGlzLnBvaW50ZXJOZGMueSA9IC0gKGUuY2xpZW50WSAvIHRoaXMuc2l6ZS5oZWlnaHQpICogMiArIDE7XG4gIH1cblxuICB1cGRhdGVEcmFnRGlzdGFuY2VfKCkge1xuICAgIGlmICh0aGlzLmlzRHJhZ2dpbmcpIHtcbiAgICAgIHZhciBkaXN0YW5jZSA9IHRoaXMubGFzdFBvaW50ZXIuc3ViKHRoaXMucG9pbnRlcikubGVuZ3RoKCk7XG4gICAgICB0aGlzLmRyYWdEaXN0YW5jZSArPSBkaXN0YW5jZTtcbiAgICAgIHRoaXMubGFzdFBvaW50ZXIuY29weSh0aGlzLnBvaW50ZXIpO1xuXG5cbiAgICAgIC8vY29uc29sZS5sb2coJ2RyYWdEaXN0YW5jZScsIHRoaXMuZHJhZ0Rpc3RhbmNlKTtcbiAgICAgIGlmICh0aGlzLmRyYWdEaXN0YW5jZSA+IERSQUdfRElTVEFOQ0VfUFgpIHtcbiAgICAgICAgdGhpcy5lbWl0KCdyYXljYW5jZWwnKTtcbiAgICAgICAgdGhpcy5pc0RyYWdnaW5nID0gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc3RhcnREcmFnZ2luZ18oZSkge1xuICAgIHRoaXMuaXNEcmFnZ2luZyA9IHRydWU7XG4gICAgdGhpcy5sYXN0UG9pbnRlci5zZXQoZS5jbGllbnRYLCBlLmNsaWVudFkpO1xuICB9XG5cbiAgZW5kRHJhZ2dpbmdfKCkge1xuICAgIGlmICh0aGlzLmRyYWdEaXN0YW5jZSA8IERSQUdfRElTVEFOQ0VfUFgpIHtcbiAgICAgIHRoaXMuZW1pdCgncmF5dXAnKTtcbiAgICB9XG4gICAgdGhpcy5kcmFnRGlzdGFuY2UgPSAwO1xuICAgIHRoaXMuaXNEcmFnZ2luZyA9IGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGZpcnN0IFZSLWVuYWJsZWQgZ2FtZXBhZC5cbiAgICovXG4gIGdldFZSR2FtZXBhZF8oKSB7XG4gICAgLy8gSWYgdGhlcmUncyBubyBnYW1lcGFkIEFQSSwgdGhlcmUncyBubyBnYW1lcGFkLlxuICAgIGlmICghbmF2aWdhdG9yLmdldEdhbWVwYWRzKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIgZ2FtZXBhZHMgPSBuYXZpZ2F0b3IuZ2V0R2FtZXBhZHMoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGdhbWVwYWRzLmxlbmd0aDsgKytpKSB7XG4gICAgICB2YXIgZ2FtZXBhZCA9IGdhbWVwYWRzW2ldO1xuXG4gICAgICAvLyBUaGUgYXJyYXkgbWF5IGNvbnRhaW4gdW5kZWZpbmVkIGdhbWVwYWRzLCBzbyBjaGVjayBmb3IgdGhhdCBhcyB3ZWxsIGFzXG4gICAgICAvLyBhIG5vbi1udWxsIHBvc2UuXG4gICAgICBpZiAoZ2FtZXBhZCAmJiBnYW1lcGFkLnBvc2UpIHtcbiAgICAgICAgcmV0dXJuIGdhbWVwYWQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG59XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTYgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5pbXBvcnQgT3JpZW50YXRpb25Bcm1Nb2RlbCBmcm9tICcuL29yaWVudGF0aW9uLWFybS1tb2RlbCdcbmltcG9ydCBFdmVudEVtaXR0ZXIgZnJvbSAnZXZlbnRlbWl0dGVyMydcbmltcG9ydCBSYXlSZW5kZXJlciBmcm9tICcuL3JheS1yZW5kZXJlcidcbmltcG9ydCBSYXlDb250cm9sbGVyIGZyb20gJy4vcmF5LWNvbnRyb2xsZXInXG5pbXBvcnQgSW50ZXJhY3Rpb25Nb2RlcyBmcm9tICcuL3JheS1pbnRlcmFjdGlvbi1tb2RlcydcblxuLyoqXG4gKiBBUEkgd3JhcHBlciBmb3IgdGhlIGlucHV0IGxpYnJhcnkuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJheUlucHV0IGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3IoY2FtZXJhKSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMuY2FtZXJhID0gY2FtZXJhO1xuICAgIHRoaXMucmVuZGVyZXIgPSBuZXcgUmF5UmVuZGVyZXIoY2FtZXJhKTtcbiAgICB0aGlzLmNvbnRyb2xsZXIgPSBuZXcgUmF5Q29udHJvbGxlcigpO1xuXG4gICAgLy8gQXJtIG1vZGVsIG5lZWRlZCB0byB0cmFuc2Zvcm0gY29udHJvbGxlciBvcmllbnRhdGlvbiBpbnRvIHByb3BlciBwb3NlLlxuICAgIHRoaXMuYXJtTW9kZWwgPSBuZXcgT3JpZW50YXRpb25Bcm1Nb2RlbCgpO1xuXG4gICAgdGhpcy5jb250cm9sbGVyLm9uKCdyYXlkb3duJywgdGhpcy5vblJheURvd25fLmJpbmQodGhpcykpO1xuICAgIHRoaXMuY29udHJvbGxlci5vbigncmF5dXAnLCB0aGlzLm9uUmF5VXBfLmJpbmQodGhpcykpO1xuICAgIHRoaXMuY29udHJvbGxlci5vbigncmF5Y2FuY2VsJywgdGhpcy5vblJheUNhbmNlbF8uYmluZCh0aGlzKSk7XG4gICAgdGhpcy5jb250cm9sbGVyLm9uKCdwb2ludGVybW92ZScsIHRoaXMub25Qb2ludGVyTW92ZV8uYmluZCh0aGlzKSk7XG4gICAgdGhpcy5yZW5kZXJlci5vbigncmF5b3ZlcicsIChtZXNoKSA9PiB7IHRoaXMuZW1pdCgncmF5b3ZlcicsIG1lc2gpIH0pO1xuICAgIHRoaXMucmVuZGVyZXIub24oJ3JheW91dCcsIChtZXNoKSA9PiB7IHRoaXMuZW1pdCgncmF5b3V0JywgbWVzaCkgfSk7XG5cbiAgICAvLyBCeSBkZWZhdWx0LCBwdXQgdGhlIHBvaW50ZXIgb2Zmc2NyZWVuLlxuICAgIHRoaXMucG9pbnRlck5kYyA9IG5ldyBUSFJFRS5WZWN0b3IyKDEsIDEpO1xuXG4gICAgLy8gRXZlbnQgaGFuZGxlcnMuXG4gICAgdGhpcy5oYW5kbGVycyA9IHt9O1xuICB9XG5cbiAgYWRkKG9iamVjdCwgaGFuZGxlcnMpIHtcbiAgICB0aGlzLnJlbmRlcmVyLmFkZChvYmplY3QsIGhhbmRsZXJzKTtcbiAgICB0aGlzLmhhbmRsZXJzW29iamVjdC5pZF0gPSBoYW5kbGVycztcbiAgfVxuXG4gIHJlbW92ZShvYmplY3QpIHtcbiAgICB0aGlzLnJlbmRlcmVyLnJlbW92ZShvYmplY3QpO1xuICAgIGRlbGV0ZSB0aGlzLmhhbmRsZXJzW29iamVjdC5pZF1cbiAgfVxuXG4gIHVwZGF0ZSgpIHtcbiAgICBsZXQgbG9va0F0ID0gbmV3IFRIUkVFLlZlY3RvcjMoMCwgMCwgLTEpO1xuICAgIGxvb2tBdC5hcHBseVF1YXRlcm5pb24odGhpcy5jYW1lcmEucXVhdGVybmlvbik7XG5cbiAgICBsZXQgbW9kZSA9IHRoaXMuY29udHJvbGxlci5nZXRJbnRlcmFjdGlvbk1vZGUoKTtcbiAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgIGNhc2UgSW50ZXJhY3Rpb25Nb2Rlcy5NT1VTRTpcbiAgICAgICAgLy8gRGVza3RvcCBtb3VzZSBtb2RlLCBtb3VzZSBjb29yZGluYXRlcyBhcmUgd2hhdCBtYXR0ZXJzLlxuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFBvaW50ZXIodGhpcy5wb2ludGVyTmRjKTtcbiAgICAgICAgLy8gSGlkZSB0aGUgcmF5IGFuZCByZXRpY2xlLlxuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFJheVZpc2liaWxpdHkoZmFsc2UpO1xuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFJldGljbGVWaXNpYmlsaXR5KGZhbHNlKTtcblxuICAgICAgICAvLyBJbiBtb3VzZSBtb2RlIHJheSByZW5kZXJlciBpcyBhbHdheXMgYWN0aXZlLlxuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldEFjdGl2ZSh0cnVlKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgSW50ZXJhY3Rpb25Nb2Rlcy5UT1VDSDpcbiAgICAgICAgLy8gTW9iaWxlIG1hZ2ljIHdpbmRvdyBtb2RlLiBUb3VjaCBjb29yZGluYXRlcyBtYXR0ZXIsIGJ1dCB3ZSB3YW50IHRvXG4gICAgICAgIC8vIGhpZGUgdGhlIHJldGljbGUuXG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0UG9pbnRlcih0aGlzLnBvaW50ZXJOZGMpO1xuXG4gICAgICAgIC8vIEhpZGUgdGhlIHJheSBhbmQgdGhlIHJldGljbGUuXG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0UmF5VmlzaWJpbGl0eShmYWxzZSk7XG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0UmV0aWNsZVZpc2liaWxpdHkoZmFsc2UpO1xuXG4gICAgICAgIC8vIEluIHRvdWNoIG1vZGUgdGhlIHJheSByZW5kZXJlciBpcyBvbmx5IGFjdGl2ZSBvbiB0b3VjaC5cbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRBY3RpdmUodGhpcy5jb250cm9sbGVyLmdldElzVG91Y2hBY3RpdmUoKSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIEludGVyYWN0aW9uTW9kZXMuVlJfMERPRjpcbiAgICAgICAgLy8gQ2FyZGJvYXJkIG1vZGUsIHdlJ3JlIGRlYWxpbmcgd2l0aCBhIGdhemUgcmV0aWNsZS5cbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRQb3NpdGlvbih0aGlzLmNhbWVyYS5wb3NpdGlvbik7XG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0T3JpZW50YXRpb24odGhpcy5jYW1lcmEucXVhdGVybmlvbik7XG5cbiAgICAgICAgLy8gUmV0aWNsZSBvbmx5LlxuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFJheVZpc2liaWxpdHkoZmFsc2UpO1xuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFJldGljbGVWaXNpYmlsaXR5KHRydWUpO1xuXG4gICAgICAgIC8vIFJheSByZW5kZXJlciBhbHdheXMgYWN0aXZlLlxuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldEFjdGl2ZSh0cnVlKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgSW50ZXJhY3Rpb25Nb2Rlcy5WUl8zRE9GOlxuICAgICAgICAvLyBEYXlkcmVhbSwgb3VyIG9yaWdpbiBpcyBzbGlnaHRseSBvZmYgKGRlcGVuZGluZyBvbiBoYW5kZWRuZXNzKS5cbiAgICAgICAgLy8gQnV0IHdlIHNob3VsZCBiZSB1c2luZyB0aGUgb3JpZW50YXRpb24gZnJvbSB0aGUgZ2FtZXBhZC5cbiAgICAgICAgLy8gVE9ETyhzbXVzKTogSW1wbGVtZW50IHRoZSByZWFsIGFybSBtb2RlbC5cbiAgICAgICAgdmFyIHBvc2UgPSB0aGlzLmNvbnRyb2xsZXIuZ2V0R2FtZXBhZFBvc2UoKTtcblxuICAgICAgICAvLyBEZWJ1ZyBvbmx5OiB1c2UgY2FtZXJhIGFzIGlucHV0IGNvbnRyb2xsZXIuXG4gICAgICAgIC8vbGV0IGNvbnRyb2xsZXJPcmllbnRhdGlvbiA9IHRoaXMuY2FtZXJhLnF1YXRlcm5pb247XG4gICAgICAgIGxldCBjb250cm9sbGVyT3JpZW50YXRpb24gPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpLmZyb21BcnJheShwb3NlLm9yaWVudGF0aW9uKTtcblxuICAgICAgICAvLyBUcmFuc2Zvcm0gdGhlIGNvbnRyb2xsZXIgaW50byB0aGUgY2FtZXJhIGNvb3JkaW5hdGUgc3lzdGVtLlxuICAgICAgICAvKlxuICAgICAgICBjb250cm9sbGVyT3JpZW50YXRpb24ubXVsdGlwbHkoXG4gICAgICAgICAgICBuZXcgVEhSRUUuUXVhdGVybmlvbigpLnNldEZyb21BeGlzQW5nbGUobmV3IFRIUkVFLlZlY3RvcjMoMCwgMSwgMCksIE1hdGguUEkpKTtcbiAgICAgICAgY29udHJvbGxlck9yaWVudGF0aW9uLnggKj0gLTE7XG4gICAgICAgIGNvbnRyb2xsZXJPcmllbnRhdGlvbi56ICo9IC0xO1xuICAgICAgICAqL1xuXG4gICAgICAgIC8vIEZlZWQgY2FtZXJhIGFuZCBjb250cm9sbGVyIGludG8gdGhlIGFybSBtb2RlbC5cbiAgICAgICAgdGhpcy5hcm1Nb2RlbC5zZXRIZWFkT3JpZW50YXRpb24odGhpcy5jYW1lcmEucXVhdGVybmlvbik7XG4gICAgICAgIHRoaXMuYXJtTW9kZWwuc2V0SGVhZFBvc2l0aW9uKHRoaXMuY2FtZXJhLnBvc2l0aW9uKTtcbiAgICAgICAgdGhpcy5hcm1Nb2RlbC5zZXRDb250cm9sbGVyT3JpZW50YXRpb24oY29udHJvbGxlck9yaWVudGF0aW9uKTtcbiAgICAgICAgdGhpcy5hcm1Nb2RlbC51cGRhdGUoKTtcblxuICAgICAgICAvLyBHZXQgcmVzdWx0aW5nIHBvc2UgYW5kIGNvbmZpZ3VyZSB0aGUgcmVuZGVyZXIuXG4gICAgICAgIGxldCBtb2RlbFBvc2UgPSB0aGlzLmFybU1vZGVsLmdldFBvc2UoKTtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRQb3NpdGlvbihtb2RlbFBvc2UucG9zaXRpb24pO1xuICAgICAgICAvL3RoaXMucmVuZGVyZXIuc2V0UG9zaXRpb24obmV3IFRIUkVFLlZlY3RvcjMoKSk7XG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0T3JpZW50YXRpb24obW9kZWxQb3NlLm9yaWVudGF0aW9uKTtcbiAgICAgICAgLy90aGlzLnJlbmRlcmVyLnNldE9yaWVudGF0aW9uKGNvbnRyb2xsZXJPcmllbnRhdGlvbik7XG5cbiAgICAgICAgLy8gU2hvdyByYXkgYW5kIHJldGljbGUuXG4gICAgICAgIHRoaXMucmVuZGVyZXIuc2V0UmF5VmlzaWJpbGl0eSh0cnVlKTtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRSZXRpY2xlVmlzaWJpbGl0eSh0cnVlKTtcblxuICAgICAgICAvLyBSYXkgcmVuZGVyZXIgYWx3YXlzIGFjdGl2ZS5cbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRBY3RpdmUodHJ1ZSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIEludGVyYWN0aW9uTW9kZXMuVlJfNkRPRjpcbiAgICAgICAgLy8gVml2ZSwgb3JpZ2luIGRlcGVuZHMgb24gdGhlIHBvc2l0aW9uIG9mIHRoZSBjb250cm9sbGVyLlxuICAgICAgICAvLyBUT0RPKHNtdXMpLi4uXG4gICAgICAgIHZhciBwb3NlID0gdGhpcy5jb250cm9sbGVyLmdldEdhbWVwYWRQb3NlKCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgdGhhdCB0aGUgcG9zZSBpcyB2YWxpZC5cbiAgICAgICAgaWYgKCFwb3NlLm9yaWVudGF0aW9uIHx8ICFwb3NlLnBvc2l0aW9uKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKCdJbnZhbGlkIGdhbWVwYWQgcG9zZS4gQ2FuXFwndCB1cGRhdGUgcmF5LicpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGxldCBvcmllbnRhdGlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCkuZnJvbUFycmF5KHBvc2Uub3JpZW50YXRpb24pO1xuICAgICAgICBsZXQgcG9zaXRpb24gPSBuZXcgVEhSRUUuVmVjdG9yMygpLmZyb21BcnJheShwb3NlLnBvc2l0aW9uKTtcbiAgICAgICAgXG4gICAgICAgIGxldCBjb21wb3NlZCA9IG5ldyBUSFJFRS5NYXRyaXg0KCk7XG4gICAgICAgIGxldCBzdGFuZGluZ09yaWVudGF0aW9uID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKTtcbiAgICAgICAgbGV0IHN0YW5kaW5nUG9zaXRpb24gPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICAgICAgICBsZXQgc3RhbmRpbmdTY2FsZSA9IG5ldyBUSFJFRS5WZWN0b3IoKTtcbiAgICAgICAgY29tcG9zZWQubWFrZVJvdGF0aW9uRnJvbVF1YXRlcm5pb24ob3JpZW50YXRpb24pO1xuICAgICAgICBjb21wb3NlZC5zZXRQb3NpdGlvbihwb3NpdGlvbik7XG4gICAgICAgIGNvbXBvc2VkLnByZW11bHRpcGx5KHZyRGlzcGxheS5zdGFnZVBhcmFtZXRlcnMuc2l0dGluZ1RvU3RhbmRpbmdUcmFuc2Zvcm0pO1xuICAgICAgICBjb21wb3NlZC5kZWNvbXBvc2Uoc3RhbmRpbmdQb3NpdGlvbiwgc3RhbmRpbmdPcmllbnRhdGlvbiwgc3RhbmRpbmdTY2FsZSk7XG5cbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRPcmllbnRhdGlvbihzdGFuZGluZ09yaWVudGF0aW9uKTtcbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRQb3NpdGlvbihzdGFuZGluZ1Bvc2l0aW9uKTtcblxuICAgICAgICAvLyBTaG93IHJheSBhbmQgcmV0aWNsZS5cbiAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRSYXlWaXNpYmlsaXR5KHRydWUpO1xuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFJldGljbGVWaXNpYmlsaXR5KHRydWUpO1xuXG4gICAgICAgIC8vIFJheSByZW5kZXJlciBhbHdheXMgYWN0aXZlLlxuICAgICAgICB0aGlzLnJlbmRlcmVyLnNldEFjdGl2ZSh0cnVlKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1Vua25vd24gaW50ZXJhY3Rpb24gbW9kZS4nKTtcbiAgICB9XG4gICAgdGhpcy5yZW5kZXJlci51cGRhdGUoKTtcbiAgICB0aGlzLmNvbnRyb2xsZXIudXBkYXRlKCk7XG4gIH1cblxuICBzZXRTaXplKHNpemUpIHtcbiAgICB0aGlzLmNvbnRyb2xsZXIuc2V0U2l6ZShzaXplKTtcbiAgfVxuXG4gIGdldE1lc2goKSB7XG4gICAgcmV0dXJuIHRoaXMucmVuZGVyZXIuZ2V0UmV0aWNsZVJheU1lc2goKTtcbiAgfVxuXG4gIGdldE9yaWdpbigpIHtcbiAgICByZXR1cm4gdGhpcy5yZW5kZXJlci5nZXRPcmlnaW4oKTtcbiAgfVxuXG4gIGdldERpcmVjdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5yZW5kZXJlci5nZXREaXJlY3Rpb24oKTtcbiAgfVxuXG4gIGdldFJpZ2h0RGlyZWN0aW9uKCkge1xuICAgIGxldCBsb29rQXQgPSBuZXcgVEhSRUUuVmVjdG9yMygwLCAwLCAtMSk7XG4gICAgbG9va0F0LmFwcGx5UXVhdGVybmlvbih0aGlzLmNhbWVyYS5xdWF0ZXJuaW9uKTtcbiAgICByZXR1cm4gbmV3IFRIUkVFLlZlY3RvcjMoKS5jcm9zc1ZlY3RvcnMobG9va0F0LCB0aGlzLmNhbWVyYS51cCk7XG4gIH1cblxuICBvblJheURvd25fKGUpIHtcbiAgICAvL2NvbnNvbGUubG9nKCdvblJheURvd25fJyk7XG5cbiAgICAvLyBGb3JjZSB0aGUgcmVuZGVyZXIgdG8gcmF5Y2FzdC5cbiAgICB0aGlzLnJlbmRlcmVyLnVwZGF0ZSgpO1xuICAgIGxldCBtZXNoID0gdGhpcy5yZW5kZXJlci5nZXRTZWxlY3RlZE1lc2goKTtcbiAgICB0aGlzLmVtaXQoJ3JheWRvd24nLCBtZXNoKTtcblxuICAgIHRoaXMucmVuZGVyZXIuc2V0QWN0aXZlKHRydWUpO1xuICB9XG5cbiAgb25SYXlVcF8oZSkge1xuICAgIC8vY29uc29sZS5sb2coJ29uUmF5VXBfJyk7XG4gICAgbGV0IG1lc2ggPSB0aGlzLnJlbmRlcmVyLmdldFNlbGVjdGVkTWVzaCgpO1xuICAgIHRoaXMuZW1pdCgncmF5dXAnLCBtZXNoKTtcblxuICAgIHRoaXMucmVuZGVyZXIuc2V0QWN0aXZlKGZhbHNlKTtcbiAgfVxuXG4gIG9uUmF5Q2FuY2VsXyhlKSB7XG4gICAgLy9jb25zb2xlLmxvZygnb25SYXlDYW5jZWxfJyk7XG4gICAgbGV0IG1lc2ggPSB0aGlzLnJlbmRlcmVyLmdldFNlbGVjdGVkTWVzaCgpO1xuICAgIHRoaXMuZW1pdCgncmF5Y2FuY2VsJywgbWVzaCk7XG4gIH1cblxuICBvblBvaW50ZXJNb3ZlXyhuZGMpIHtcbiAgICB0aGlzLnBvaW50ZXJOZGMuY29weShuZGMpO1xuICB9XG59XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTYgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG52YXIgSW50ZXJhY3Rpb25Nb2RlcyA9IHtcbiAgTU9VU0U6IDEsXG4gIFRPVUNIOiAyLFxuICBWUl8wRE9GOiAzLFxuICBWUl8zRE9GOiA0LFxuICBWUl82RE9GOiA1XG59O1xuXG5leHBvcnQgeyBJbnRlcmFjdGlvbk1vZGVzIGFzIGRlZmF1bHQgfTtcbiIsIi8qXG4gKiBDb3B5cmlnaHQgMjAxNiBHb29nbGUgSW5jLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbmltcG9ydCB7YmFzZTY0fSBmcm9tICcuL3V0aWwnXG5pbXBvcnQgRXZlbnRFbWl0dGVyIGZyb20gJ2V2ZW50ZW1pdHRlcjMnXG5cbmNvbnN0IFJFVElDTEVfRElTVEFOQ0UgPSAzO1xuY29uc3QgSU5ORVJfUkFESVVTID0gMC4wMjtcbmNvbnN0IE9VVEVSX1JBRElVUyA9IDAuMDQ7XG5jb25zdCBSQVlfUkFESVVTID0gMC4wMjtcbmNvbnN0IEdSQURJRU5UX0lNQUdFID0gYmFzZTY0KCdpbWFnZS9wbmcnLCAnaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUlBQUFBQ0FDQVlBQUFERFBtSExBQUFCZGtsRVFWUjRuTzNXd1hIRVFBd0RRY2luL0ZPV3crQmp1aVBZQjJxNEcyblA5MzNQOVNPNDgyNHpnREFEaURPQXVIZmIzL1VqdUtNQWNRWVFad0J4L2dCeENoQ25BSEVLRUtjQWNRb1Fwd0J4Q2hDbkFIRUdFR2NBY2Y0QWNRb1Fad0J4QmhCbkFIRUdFR2NBY1FZUVp3QnhCaEJuQUhFR0VHY0FjUVlRWndCeEJoQm5BSEh2dHQvMUk3aWpBSEVHRUdjQWNmNEFjUW9RWndCeFRrQ2NBc1FaUUp3VEVLY0FjUW9RcHdCeEJoRG5CTVFwUUp3Q3hDbEFuQUxFS1VDY0FzUXBRSndDeENsQW5BTEVLVUNjQXNRcFFKd0J4RGtCY1FvUXB3QnhDaENuQUhFS0VLY0FjUW9RcHdCeENoQ25BSEVLRUdjQWNVNUFuQUxFS1VDY0FzUVpRSndURUtjQWNRWVE1d1RFS1VDY0FjUVpRSncvUUp3Q3hCbEFuQUhFR1VDY0FjUVpRSndCeEJsQW5BSEVHVUNjQWNRWlFKd0J4QmxBbkFIRUdVRGN1KzI1ZmdSM0ZDRE9BT0lNSU00ZklFNEI0aFFnVGdIaUZDQk9BZUlVSUU0QjRoUWd6Z0RpRENET0h5Qk9BZUlNSU00QTR2NEIvNUlGOWVENlF4Z0FBQUFBU1VWT1JLNUNZSUk9Jyk7XG5cbi8qKlxuICogSGFuZGxlcyByYXkgaW5wdXQgc2VsZWN0aW9uIGZyb20gZnJhbWUgb2YgcmVmZXJlbmNlIG9mIGFuIGFyYml0cmFyeSBvYmplY3QuXG4gKlxuICogVGhlIHNvdXJjZSBvZiB0aGUgcmF5IGlzIGZyb20gdmFyaW91cyBsb2NhdGlvbnM6XG4gKlxuICogRGVza3RvcDogbW91c2UuXG4gKiBNYWdpYyB3aW5kb3c6IHRvdWNoLlxuICogQ2FyZGJvYXJkOiBjYW1lcmEuXG4gKiBEYXlkcmVhbTogM0RPRiBjb250cm9sbGVyIHZpYSBnYW1lcGFkIChhbmQgc2hvdyByYXkpLlxuICogVml2ZTogNkRPRiBjb250cm9sbGVyIHZpYSBnYW1lcGFkIChhbmQgc2hvdyByYXkpLlxuICpcbiAqIEVtaXRzIHNlbGVjdGlvbiBldmVudHM6XG4gKiAgICAgcmF5b3ZlcihtZXNoKTogVGhpcyBtZXNoIHdhcyBzZWxlY3RlZC5cbiAqICAgICByYXlvdXQobWVzaCk6IFRoaXMgbWVzaCB3YXMgdW5zZWxlY3RlZC5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgUmF5UmVuZGVyZXIgZXh0ZW5kcyBFdmVudEVtaXR0ZXIge1xuICBjb25zdHJ1Y3RvcihjYW1lcmEsIG9wdF9wYXJhbXMpIHtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5jYW1lcmEgPSBjYW1lcmE7XG5cbiAgICB2YXIgcGFyYW1zID0gb3B0X3BhcmFtcyB8fCB7fTtcblxuICAgIC8vIFdoaWNoIG9iamVjdHMgYXJlIGludGVyYWN0aXZlIChrZXllZCBvbiBpZCkuXG4gICAgdGhpcy5tZXNoZXMgPSB7fTtcblxuICAgIC8vIFdoaWNoIG9iamVjdHMgYXJlIGN1cnJlbnRseSBzZWxlY3RlZCAoa2V5ZWQgb24gaWQpLlxuICAgIHRoaXMuc2VsZWN0ZWQgPSB7fTtcblxuICAgIC8vIFRoZSByYXljYXN0ZXIuXG4gICAgdGhpcy5yYXljYXN0ZXIgPSBuZXcgVEhSRUUuUmF5Y2FzdGVyKCk7XG5cbiAgICAvLyBQb3NpdGlvbiBhbmQgb3JpZW50YXRpb24sIGluIGFkZGl0aW9uLlxuICAgIHRoaXMucG9zaXRpb24gPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuICAgIHRoaXMub3JpZW50YXRpb24gPSBuZXcgVEhSRUUuUXVhdGVybmlvbigpO1xuXG4gICAgdGhpcy5yb290ID0gbmV3IFRIUkVFLk9iamVjdDNEKCk7XG5cbiAgICAvLyBBZGQgdGhlIHJldGljbGUgbWVzaCB0byB0aGUgcm9vdCBvZiB0aGUgb2JqZWN0LlxuICAgIHRoaXMucmV0aWNsZSA9IHRoaXMuY3JlYXRlUmV0aWNsZV8oKTtcbiAgICB0aGlzLnJvb3QuYWRkKHRoaXMucmV0aWNsZSk7XG5cbiAgICAvLyBBZGQgdGhlIHJheSB0byB0aGUgcm9vdCBvZiB0aGUgb2JqZWN0LlxuICAgIHRoaXMucmF5ID0gdGhpcy5jcmVhdGVSYXlfKCk7XG4gICAgdGhpcy5yb290LmFkZCh0aGlzLnJheSk7XG5cbiAgICAvLyBIb3cgZmFyIHRoZSByZXRpY2xlIGlzIGN1cnJlbnRseSBmcm9tIHRoZSByZXRpY2xlIG9yaWdpbi5cbiAgICB0aGlzLnJldGljbGVEaXN0YW5jZSA9IFJFVElDTEVfRElTVEFOQ0U7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXIgYW4gb2JqZWN0IHNvIHRoYXQgaXQgY2FuIGJlIGludGVyYWN0ZWQgd2l0aC5cbiAgICovXG4gIGFkZChvYmplY3QpIHtcbiAgICB0aGlzLm1lc2hlc1tvYmplY3QuaWRdID0gb2JqZWN0O1xuICB9XG5cbiAgLyoqXG4gICAqIFByZXZlbnQgYW4gb2JqZWN0IGZyb20gYmVpbmcgaW50ZXJhY3RlZCB3aXRoLlxuICAgKi9cbiAgcmVtb3ZlKG9iamVjdCkge1xuICAgIHZhciBpZCA9IG9iamVjdC5pZDtcbiAgICBpZiAoIXRoaXMubWVzaGVzW2lkXSkge1xuICAgICAgLy8gSWYgdGhlcmUncyBubyBleGlzdGluZyBtZXNoLCB3ZSBjYW4ndCByZW1vdmUgaXQuXG4gICAgICBkZWxldGUgdGhpcy5tZXNoZXNbaWRdO1xuICAgIH1cbiAgICAvLyBJZiB0aGUgb2JqZWN0IGlzIGN1cnJlbnRseSBzZWxlY3RlZCwgcmVtb3ZlIGl0LlxuICAgIGlmICh0aGlzLnNlbGVjdGVkW2lkXSkge1xuICAgICAgZGVsZXRlIHRoaXMuc2VsZWN0ZWRbb2JqZWN0LmlkXTtcbiAgICB9XG4gIH1cblxuICB1cGRhdGUoKSB7XG4gICAgLy8gRG8gdGhlIHJheWNhc3RpbmcgYW5kIGlzc3VlIHZhcmlvdXMgZXZlbnRzIGFzIG5lZWRlZC5cbiAgICBmb3IgKGxldCBpZCBpbiB0aGlzLm1lc2hlcykge1xuICAgICAgbGV0IG1lc2ggPSB0aGlzLm1lc2hlc1tpZF07XG4gICAgICBsZXQgaW50ZXJzZWN0cyA9IHRoaXMucmF5Y2FzdGVyLmludGVyc2VjdE9iamVjdChtZXNoLCB0cnVlKTtcbiAgICAgIGlmIChpbnRlcnNlY3RzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdVbmV4cGVjdGVkOiBtdWx0aXBsZSBtZXNoZXMgaW50ZXJzZWN0ZWQuJyk7XG4gICAgICB9XG4gICAgICBsZXQgaXNJbnRlcnNlY3RlZCA9IChpbnRlcnNlY3RzLmxlbmd0aCA+IDApO1xuICAgICAgbGV0IGlzU2VsZWN0ZWQgPSB0aGlzLnNlbGVjdGVkW2lkXTtcblxuICAgICAgLy8gSWYgaXQncyBuZXdseSBzZWxlY3RlZCwgc2VuZCByYXlvdmVyLlxuICAgICAgaWYgKGlzSW50ZXJzZWN0ZWQgJiYgIWlzU2VsZWN0ZWQpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RlZFtpZF0gPSB0cnVlO1xuICAgICAgICBpZiAodGhpcy5pc0FjdGl2ZSkge1xuICAgICAgICAgIHRoaXMuZW1pdCgncmF5b3ZlcicsIG1lc2gpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIElmIGl0J3Mgbm8gbG9uZ2VyIGludGVyc2VjdGVkLCBzZW5kIHJheW91dC5cbiAgICAgIGlmICghaXNJbnRlcnNlY3RlZCAmJiBpc1NlbGVjdGVkKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnNlbGVjdGVkW2lkXTtcbiAgICAgICAgdGhpcy5tb3ZlUmV0aWNsZV8obnVsbCk7XG4gICAgICAgIGlmICh0aGlzLmlzQWN0aXZlKSB7XG4gICAgICAgICAgdGhpcy5lbWl0KCdyYXlvdXQnLCBtZXNoKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoaXNJbnRlcnNlY3RlZCkge1xuICAgICAgICB0aGlzLm1vdmVSZXRpY2xlXyhpbnRlcnNlY3RzKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgb3JpZ2luIG9mIHRoZSByYXkuXG4gICAqIEBwYXJhbSB7VmVjdG9yfSB2ZWN0b3IgUG9zaXRpb24gb2YgdGhlIG9yaWdpbiBvZiB0aGUgcGlja2luZyByYXkuXG4gICAqL1xuICBzZXRQb3NpdGlvbih2ZWN0b3IpIHtcbiAgICB0aGlzLnBvc2l0aW9uLmNvcHkodmVjdG9yKTtcbiAgICB0aGlzLnJheWNhc3Rlci5yYXkub3JpZ2luLmNvcHkodmVjdG9yKTtcbiAgICB0aGlzLnVwZGF0ZVJheWNhc3Rlcl8oKTtcbiAgfVxuXG4gIGdldE9yaWdpbigpIHtcbiAgICByZXR1cm4gdGhpcy5yYXljYXN0ZXIucmF5Lm9yaWdpbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBkaXJlY3Rpb24gb2YgdGhlIHJheS5cbiAgICogQHBhcmFtIHtWZWN0b3J9IHZlY3RvciBVbml0IHZlY3RvciBjb3JyZXNwb25kaW5nIHRvIGRpcmVjdGlvbi5cbiAgICovXG4gIHNldE9yaWVudGF0aW9uKHF1YXRlcm5pb24pIHtcbiAgICB0aGlzLm9yaWVudGF0aW9uLmNvcHkocXVhdGVybmlvbik7XG5cbiAgICB2YXIgcG9pbnRBdCA9IG5ldyBUSFJFRS5WZWN0b3IzKDAsIDAsIC0xKS5hcHBseVF1YXRlcm5pb24ocXVhdGVybmlvbik7XG4gICAgdGhpcy5yYXljYXN0ZXIucmF5LmRpcmVjdGlvbi5jb3B5KHBvaW50QXQpXG4gICAgdGhpcy51cGRhdGVSYXljYXN0ZXJfKCk7XG4gIH1cblxuICBnZXREaXJlY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMucmF5Y2FzdGVyLnJheS5kaXJlY3Rpb247XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgcG9pbnRlciBvbiB0aGUgc2NyZWVuIGZvciBjYW1lcmEgKyBwb2ludGVyIGJhc2VkIHBpY2tpbmcuIFRoaXNcbiAgICogc3VwZXJzY2VkZXMgb3JpZ2luIGFuZCBkaXJlY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7VmVjdG9yMn0gdmVjdG9yIFRoZSBwb3NpdGlvbiBvZiB0aGUgcG9pbnRlciAoc2NyZWVuIGNvb3JkcykuXG4gICAqL1xuICBzZXRQb2ludGVyKHZlY3Rvcikge1xuICAgIHRoaXMucmF5Y2FzdGVyLnNldEZyb21DYW1lcmEodmVjdG9yLCB0aGlzLmNhbWVyYSk7XG4gICAgdGhpcy51cGRhdGVSYXljYXN0ZXJfKCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgbWVzaCwgd2hpY2ggaW5jbHVkZXMgcmV0aWNsZSBhbmQvb3IgcmF5LiBUaGlzIG1lc2ggaXMgdGhlbiBhZGRlZFxuICAgKiB0byB0aGUgc2NlbmUuXG4gICAqL1xuICBnZXRSZXRpY2xlUmF5TWVzaCgpIHtcbiAgICByZXR1cm4gdGhpcy5yb290O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGN1cnJlbnRseSBzZWxlY3RlZCBvYmplY3QgaW4gdGhlIHNjZW5lLlxuICAgKi9cbiAgZ2V0U2VsZWN0ZWRNZXNoKCkge1xuICAgIGxldCBjb3VudCA9IDA7XG4gICAgbGV0IG1lc2ggPSBudWxsO1xuICAgIGZvciAodmFyIGlkIGluIHRoaXMuc2VsZWN0ZWQpIHtcbiAgICAgIGNvdW50ICs9IDE7XG4gICAgICBtZXNoID0gdGhpcy5tZXNoZXNbaWRdO1xuICAgIH1cbiAgICBpZiAoY291bnQgPiAxKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ01vcmUgdGhhbiBvbmUgbWVzaCBzZWxlY3RlZC4nKTtcbiAgICB9XG4gICAgcmV0dXJuIG1lc2g7XG4gIH1cblxuICAvKipcbiAgICogSGlkZXMgYW5kIHNob3dzIHRoZSByZXRpY2xlLlxuICAgKi9cbiAgc2V0UmV0aWNsZVZpc2liaWxpdHkoaXNWaXNpYmxlKSB7XG4gICAgdGhpcy5yZXRpY2xlLnZpc2libGUgPSBpc1Zpc2libGU7XG4gIH1cblxuICAvKipcbiAgICogRW5hYmxlcyBvciBkaXNhYmxlcyB0aGUgcmF5Y2FzdGluZyByYXkgd2hpY2ggZ3JhZHVhbGx5IGZhZGVzIG91dCBmcm9tXG4gICAqIHRoZSBvcmlnaW4uXG4gICAqL1xuICBzZXRSYXlWaXNpYmlsaXR5KGlzVmlzaWJsZSkge1xuICAgIHRoaXMucmF5LnZpc2libGUgPSBpc1Zpc2libGU7XG4gIH1cblxuICAvKipcbiAgICogRW5hYmxlcyBhbmQgZGlzYWJsZXMgdGhlIHJheWNhc3Rlci4gRm9yIHRvdWNoLCB3aGVyZSBmaW5nZXIgdXAgbWVhbnMgd2VcbiAgICogc2hvdWxkbid0IGJlIHJheWNhc3RpbmcuXG4gICAqL1xuICBzZXRBY3RpdmUoaXNBY3RpdmUpIHtcbiAgICAvLyBJZiBub3RoaW5nIGNoYW5nZWQsIGRvIG5vdGhpbmcuXG4gICAgaWYgKHRoaXMuaXNBY3RpdmUgPT0gaXNBY3RpdmUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8gVE9ETyhzbXVzKTogU2hvdyB0aGUgcmF5IG9yIHJldGljbGUgYWRqdXN0IGluIHJlc3BvbnNlLlxuICAgIHRoaXMuaXNBY3RpdmUgPSBpc0FjdGl2ZTtcblxuICAgIGlmICghaXNBY3RpdmUpIHtcbiAgICAgIHRoaXMubW92ZVJldGljbGVfKG51bGwpO1xuICAgICAgZm9yIChsZXQgaWQgaW4gdGhpcy5zZWxlY3RlZCkge1xuICAgICAgICBsZXQgbWVzaCA9IHRoaXMubWVzaGVzW2lkXTtcbiAgICAgICAgZGVsZXRlIHRoaXMuc2VsZWN0ZWRbaWRdO1xuICAgICAgICB0aGlzLmVtaXQoJ3JheW91dCcsIG1lc2gpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZVJheWNhc3Rlcl8oKSB7XG4gICAgdmFyIHJheSA9IHRoaXMucmF5Y2FzdGVyLnJheTtcblxuICAgIC8vIFBvc2l0aW9uIHRoZSByZXRpY2xlIGF0IGEgZGlzdGFuY2UsIGFzIGNhbGN1bGF0ZWQgZnJvbSB0aGUgb3JpZ2luIGFuZFxuICAgIC8vIGRpcmVjdGlvbi5cbiAgICB2YXIgcG9zaXRpb24gPSB0aGlzLnJldGljbGUucG9zaXRpb247XG4gICAgcG9zaXRpb24uY29weShyYXkuZGlyZWN0aW9uKTtcbiAgICBwb3NpdGlvbi5tdWx0aXBseVNjYWxhcih0aGlzLnJldGljbGVEaXN0YW5jZSk7XG4gICAgcG9zaXRpb24uYWRkKHJheS5vcmlnaW4pO1xuXG4gICAgLy8gU2V0IHBvc2l0aW9uIGFuZCBvcmllbnRhdGlvbiBvZiB0aGUgcmF5IHNvIHRoYXQgaXQgZ29lcyBmcm9tIG9yaWdpbiB0b1xuICAgIC8vIHJldGljbGUuXG4gICAgdmFyIGRlbHRhID0gbmV3IFRIUkVFLlZlY3RvcjMoKS5jb3B5KHJheS5kaXJlY3Rpb24pO1xuICAgIGRlbHRhLm11bHRpcGx5U2NhbGFyKHRoaXMucmV0aWNsZURpc3RhbmNlKTtcbiAgICB0aGlzLnJheS5zY2FsZS55ID0gZGVsdGEubGVuZ3RoKCk7XG4gICAgdmFyIGFycm93ID0gbmV3IFRIUkVFLkFycm93SGVscGVyKHJheS5kaXJlY3Rpb24sIHJheS5vcmlnaW4pO1xuICAgIHRoaXMucmF5LnJvdGF0aW9uLmNvcHkoYXJyb3cucm90YXRpb24pO1xuICAgIHRoaXMucmF5LnBvc2l0aW9uLmFkZFZlY3RvcnMocmF5Lm9yaWdpbiwgZGVsdGEubXVsdGlwbHlTY2FsYXIoMC41KSk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyB0aGUgZ2VvbWV0cnkgb2YgdGhlIHJldGljbGUuXG4gICAqL1xuICBjcmVhdGVSZXRpY2xlXygpIHtcbiAgICAvLyBDcmVhdGUgYSBzcGhlcmljYWwgcmV0aWNsZS5cbiAgICBsZXQgaW5uZXJHZW9tZXRyeSA9IG5ldyBUSFJFRS5TcGhlcmVHZW9tZXRyeShJTk5FUl9SQURJVVMsIDMyLCAzMik7XG4gICAgbGV0IGlubmVyTWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoe1xuICAgICAgY29sb3I6IDB4ZmZmZmZmLFxuICAgICAgdHJhbnNwYXJlbnQ6IHRydWUsXG4gICAgICBvcGFjaXR5OiAwLjlcbiAgICB9KTtcbiAgICBsZXQgaW5uZXIgPSBuZXcgVEhSRUUuTWVzaChpbm5lckdlb21ldHJ5LCBpbm5lck1hdGVyaWFsKTtcblxuICAgIGxldCBvdXRlckdlb21ldHJ5ID0gbmV3IFRIUkVFLlNwaGVyZUdlb21ldHJ5KE9VVEVSX1JBRElVUywgMzIsIDMyKTtcbiAgICBsZXQgb3V0ZXJNYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG4gICAgICBjb2xvcjogMHgzMzMzMzMsXG4gICAgICB0cmFuc3BhcmVudDogdHJ1ZSxcbiAgICAgIG9wYWNpdHk6IDAuM1xuICAgIH0pO1xuICAgIGxldCBvdXRlciA9IG5ldyBUSFJFRS5NZXNoKG91dGVyR2VvbWV0cnksIG91dGVyTWF0ZXJpYWwpO1xuXG4gICAgbGV0IHJldGljbGUgPSBuZXcgVEhSRUUuR3JvdXAoKTtcbiAgICByZXRpY2xlLmFkZChpbm5lcik7XG4gICAgcmV0aWNsZS5hZGQob3V0ZXIpO1xuICAgIHJldHVybiByZXRpY2xlO1xuICB9XG5cbiAgLyoqXG4gICAqIE1vdmVzIHRoZSByZXRpY2xlIHRvIGEgcG9zaXRpb24gc28gdGhhdCBpdCdzIGp1c3QgaW4gZnJvbnQgb2YgdGhlIG1lc2ggdGhhdFxuICAgKiBpdCBpbnRlcnNlY3RlZCB3aXRoLlxuICAgKi9cbiAgbW92ZVJldGljbGVfKGludGVyc2VjdGlvbnMpIHtcbiAgICAvLyBJZiBubyBpbnRlcnNlY3Rpb24sIHJldHVybiB0aGUgcmV0aWNsZSB0byB0aGUgZGVmYXVsdCBwb3NpdGlvbi5cbiAgICBsZXQgZGlzdGFuY2UgPSBSRVRJQ0xFX0RJU1RBTkNFO1xuICAgIGlmIChpbnRlcnNlY3Rpb25zKSB7XG4gICAgICAvLyBPdGhlcndpc2UsIGRldGVybWluZSB0aGUgY29ycmVjdCBkaXN0YW5jZS5cbiAgICAgIGxldCBpbnRlciA9IGludGVyc2VjdGlvbnNbMF07XG4gICAgICBkaXN0YW5jZSA9IGludGVyLmRpc3RhbmNlO1xuICAgIH1cblxuICAgIHRoaXMucmV0aWNsZURpc3RhbmNlID0gZGlzdGFuY2U7XG4gICAgdGhpcy51cGRhdGVSYXljYXN0ZXJfKCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY3JlYXRlUmF5XygpIHtcbiAgICAvLyBDcmVhdGUgYSBjeWxpbmRyaWNhbCByYXkuXG4gICAgdmFyIGdlb21ldHJ5ID0gbmV3IFRIUkVFLkN5bGluZGVyR2VvbWV0cnkoUkFZX1JBRElVUywgUkFZX1JBRElVUywgMSwgMzIpO1xuICAgIHZhciBtYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7XG4gICAgICBtYXA6IFRIUkVFLkltYWdlVXRpbHMubG9hZFRleHR1cmUoR1JBRElFTlRfSU1BR0UpLFxuICAgICAgLy9jb2xvcjogMHhmZmZmZmYsXG4gICAgICB0cmFuc3BhcmVudDogdHJ1ZSxcbiAgICAgIG9wYWNpdHk6IDAuM1xuICAgIH0pO1xuICAgIHZhciBtZXNoID0gbmV3IFRIUkVFLk1lc2goZ2VvbWV0cnksIG1hdGVyaWFsKTtcblxuICAgIHJldHVybiBtZXNoO1xuICB9XG59XG4iLCIvKlxuICogQ29weXJpZ2h0IDIwMTYgR29vZ2xlIEluYy4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5leHBvcnQgZnVuY3Rpb24gaXNNb2JpbGUoKSB7XG4gIHZhciBjaGVjayA9IGZhbHNlO1xuICAoZnVuY3Rpb24oYSl7aWYoLyhhbmRyb2lkfGJiXFxkK3xtZWVnbykuK21vYmlsZXxhdmFudGdvfGJhZGFcXC98YmxhY2tiZXJyeXxibGF6ZXJ8Y29tcGFsfGVsYWluZXxmZW5uZWN8aGlwdG9wfGllbW9iaWxlfGlwKGhvbmV8b2QpfGlyaXN8a2luZGxlfGxnZSB8bWFlbW98bWlkcHxtbXB8bW9iaWxlLitmaXJlZm94fG5ldGZyb250fG9wZXJhIG0ob2J8aW4paXxwYWxtKCBvcyk/fHBob25lfHAoaXhpfHJlKVxcL3xwbHVja2VyfHBvY2tldHxwc3B8c2VyaWVzKDR8NikwfHN5bWJpYW58dHJlb3x1cFxcLihicm93c2VyfGxpbmspfHZvZGFmb25lfHdhcHx3aW5kb3dzIGNlfHhkYXx4aWluby9pLnRlc3QoYSl8fC8xMjA3fDYzMTB8NjU5MHwzZ3NvfDR0aHB8NTBbMS02XWl8Nzcwc3w4MDJzfGEgd2F8YWJhY3xhYyhlcnxvb3xzXFwtKXxhaShrb3xybil8YWwoYXZ8Y2F8Y28pfGFtb2l8YW4oZXh8bnl8eXcpfGFwdHV8YXIoY2h8Z28pfGFzKHRlfHVzKXxhdHR3fGF1KGRpfFxcLW18ciB8cyApfGF2YW58YmUoY2t8bGx8bnEpfGJpKGxifHJkKXxibChhY3xheil8YnIoZXx2KXd8YnVtYnxid1xcLShufHUpfGM1NVxcL3xjYXBpfGNjd2F8Y2RtXFwtfGNlbGx8Y2h0bXxjbGRjfGNtZFxcLXxjbyhtcHxuZCl8Y3Jhd3xkYShpdHxsbHxuZyl8ZGJ0ZXxkY1xcLXN8ZGV2aXxkaWNhfGRtb2J8ZG8oY3xwKW98ZHMoMTJ8XFwtZCl8ZWwoNDl8YWkpfGVtKGwyfHVsKXxlcihpY3xrMCl8ZXNsOHxleihbNC03XTB8b3N8d2F8emUpfGZldGN8Zmx5KFxcLXxfKXxnMSB1fGc1NjB8Z2VuZXxnZlxcLTV8Z1xcLW1vfGdvKFxcLnd8b2QpfGdyKGFkfHVuKXxoYWllfGhjaXR8aGRcXC0obXxwfHQpfGhlaVxcLXxoaShwdHx0YSl8aHAoIGl8aXApfGhzXFwtY3xodChjKFxcLXwgfF98YXxnfHB8c3x0KXx0cCl8aHUoYXd8dGMpfGlcXC0oMjB8Z298bWEpfGkyMzB8aWFjKCB8XFwtfFxcLyl8aWJyb3xpZGVhfGlnMDF8aWtvbXxpbTFrfGlubm98aXBhcXxpcmlzfGphKHR8dilhfGpicm98amVtdXxqaWdzfGtkZGl8a2VqaXxrZ3QoIHxcXC8pfGtsb258a3B0IHxrd2NcXC18a3lvKGN8ayl8bGUobm98eGkpfGxnKCBnfFxcLyhrfGx8dSl8NTB8NTR8XFwtW2Etd10pfGxpYnd8bHlueHxtMVxcLXd8bTNnYXxtNTBcXC98bWEodGV8dWl8eG8pfG1jKDAxfDIxfGNhKXxtXFwtY3J8bWUocmN8cmkpfG1pKG84fG9hfHRzKXxtbWVmfG1vKDAxfDAyfGJpfGRlfGRvfHQoXFwtfCB8b3x2KXx6eil8bXQoNTB8cDF8diApfG13YnB8bXl3YXxuMTBbMC0yXXxuMjBbMi0zXXxuMzAoMHwyKXxuNTAoMHwyfDUpfG43KDAoMHwxKXwxMCl8bmUoKGN8bSlcXC18b258dGZ8d2Z8d2d8d3QpfG5vayg2fGkpfG56cGh8bzJpbXxvcCh0aXx3dil8b3Jhbnxvd2cxfHA4MDB8cGFuKGF8ZHx0KXxwZHhnfHBnKDEzfFxcLShbMS04XXxjKSl8cGhpbHxwaXJlfHBsKGF5fHVjKXxwblxcLTJ8cG8oY2t8cnR8c2UpfHByb3h8cHNpb3xwdFxcLWd8cWFcXC1hfHFjKDA3fDEyfDIxfDMyfDYwfFxcLVsyLTddfGlcXC0pfHF0ZWt8cjM4MHxyNjAwfHJha3N8cmltOXxybyh2ZXx6byl8czU1XFwvfHNhKGdlfG1hfG1tfG1zfG55fHZhKXxzYygwMXxoXFwtfG9vfHBcXC0pfHNka1xcL3xzZShjKFxcLXwwfDEpfDQ3fG1jfG5kfHJpKXxzZ2hcXC18c2hhcnxzaWUoXFwtfG0pfHNrXFwtMHxzbCg0NXxpZCl8c20oYWx8YXJ8YjN8aXR8dDUpfHNvKGZ0fG55KXxzcCgwMXxoXFwtfHZcXC18diApfHN5KDAxfG1iKXx0MigxOHw1MCl8dDYoMDB8MTB8MTgpfHRhKGd0fGxrKXx0Y2xcXC18dGRnXFwtfHRlbChpfG0pfHRpbVxcLXx0XFwtbW98dG8ocGx8c2gpfHRzKDcwfG1cXC18bTN8bTUpfHR4XFwtOXx1cChcXC5ifGcxfHNpKXx1dHN0fHY0MDB8djc1MHx2ZXJpfHZpKHJnfHRlKXx2ayg0MHw1WzAtM118XFwtdil8dm00MHx2b2RhfHZ1bGN8dngoNTJ8NTN8NjB8NjF8NzB8ODB8ODF8ODN8ODV8OTgpfHczYyhcXC18ICl8d2ViY3x3aGl0fHdpKGcgfG5jfG53KXx3bWxifHdvbnV8eDcwMHx5YXNcXC18eW91cnx6ZXRvfHp0ZVxcLS9pLnRlc3QoYS5zdWJzdHIoMCw0KSkpY2hlY2sgPSB0cnVlfSkobmF2aWdhdG9yLnVzZXJBZ2VudHx8bmF2aWdhdG9yLnZlbmRvcnx8d2luZG93Lm9wZXJhKTtcbiAgcmV0dXJuIGNoZWNrO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYmFzZTY0KG1pbWVUeXBlLCBiYXNlNjQpIHtcbiAgcmV0dXJuICdkYXRhOicgKyBtaW1lVHlwZSArICc7YmFzZTY0LCcgKyBiYXNlNjQ7XG59XG4iLCIvKipcbiAqIFR3ZWVuLmpzIC0gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlXG4gKiBodHRwczovL2dpdGh1Yi5jb20vdHdlZW5qcy90d2Vlbi5qc1xuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIFNlZSBodHRwczovL2dpdGh1Yi5jb20vdHdlZW5qcy90d2Vlbi5qcy9ncmFwaHMvY29udHJpYnV0b3JzIGZvciB0aGUgZnVsbCBsaXN0IG9mIGNvbnRyaWJ1dG9ycy5cbiAqIFRoYW5rIHlvdSBhbGwsIHlvdSdyZSBhd2Vzb21lIVxuICovXG5cbnZhciBUV0VFTiA9IFRXRUVOIHx8IChmdW5jdGlvbiAoKSB7XG5cblx0dmFyIF90d2VlbnMgPSBbXTtcblxuXHRyZXR1cm4ge1xuXG5cdFx0Z2V0QWxsOiBmdW5jdGlvbiAoKSB7XG5cblx0XHRcdHJldHVybiBfdHdlZW5zO1xuXG5cdFx0fSxcblxuXHRcdHJlbW92ZUFsbDogZnVuY3Rpb24gKCkge1xuXG5cdFx0XHRfdHdlZW5zID0gW107XG5cblx0XHR9LFxuXG5cdFx0YWRkOiBmdW5jdGlvbiAodHdlZW4pIHtcblxuXHRcdFx0X3R3ZWVucy5wdXNoKHR3ZWVuKTtcblxuXHRcdH0sXG5cblx0XHRyZW1vdmU6IGZ1bmN0aW9uICh0d2Vlbikge1xuXG5cdFx0XHR2YXIgaSA9IF90d2VlbnMuaW5kZXhPZih0d2Vlbik7XG5cblx0XHRcdGlmIChpICE9PSAtMSkge1xuXHRcdFx0XHRfdHdlZW5zLnNwbGljZShpLCAxKTtcblx0XHRcdH1cblxuXHRcdH0sXG5cblx0XHR1cGRhdGU6IGZ1bmN0aW9uICh0aW1lLCBwcmVzZXJ2ZSkge1xuXG5cdFx0XHRpZiAoX3R3ZWVucy5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgaSA9IDA7XG5cblx0XHRcdHRpbWUgPSB0aW1lICE9PSB1bmRlZmluZWQgPyB0aW1lIDogVFdFRU4ubm93KCk7XG5cblx0XHRcdHdoaWxlIChpIDwgX3R3ZWVucy5sZW5ndGgpIHtcblxuXHRcdFx0XHRpZiAoX3R3ZWVuc1tpXS51cGRhdGUodGltZSkgfHwgcHJlc2VydmUpIHtcblx0XHRcdFx0XHRpKys7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0X3R3ZWVucy5zcGxpY2UoaSwgMSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblxuXHRcdH1cblx0fTtcblxufSkoKTtcblxuXG4vLyBJbmNsdWRlIGEgcGVyZm9ybWFuY2Uubm93IHBvbHlmaWxsXG4oZnVuY3Rpb24gKCkge1xuXHQvLyBJbiBub2RlLmpzLCB1c2UgcHJvY2Vzcy5ocnRpbWUuXG5cdGlmICh0aGlzLndpbmRvdyA9PT0gdW5kZWZpbmVkICYmIHRoaXMucHJvY2VzcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0VFdFRU4ubm93ID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyIHRpbWUgPSBwcm9jZXNzLmhydGltZSgpO1xuXG5cdFx0XHQvLyBDb252ZXJ0IFtzZWNvbmRzLCBtaWNyb3NlY29uZHNdIHRvIG1pbGxpc2Vjb25kcy5cblx0XHRcdHJldHVybiB0aW1lWzBdICogMTAwMCArIHRpbWVbMV0gLyAxMDAwO1xuXHRcdH07XG5cdH1cblx0Ly8gSW4gYSBicm93c2VyLCB1c2Ugd2luZG93LnBlcmZvcm1hbmNlLm5vdyBpZiBpdCBpcyBhdmFpbGFibGUuXG5cdGVsc2UgaWYgKHRoaXMud2luZG93ICE9PSB1bmRlZmluZWQgJiZcblx0ICAgICAgICAgd2luZG93LnBlcmZvcm1hbmNlICE9PSB1bmRlZmluZWQgJiZcblx0XHQgd2luZG93LnBlcmZvcm1hbmNlLm5vdyAhPT0gdW5kZWZpbmVkKSB7XG5cblx0XHQvLyBUaGlzIG11c3QgYmUgYm91bmQsIGJlY2F1c2UgZGlyZWN0bHkgYXNzaWduaW5nIHRoaXMgZnVuY3Rpb25cblx0XHQvLyBsZWFkcyB0byBhbiBpbnZvY2F0aW9uIGV4Y2VwdGlvbiBpbiBDaHJvbWUuXG5cdFx0VFdFRU4ubm93ID0gd2luZG93LnBlcmZvcm1hbmNlLm5vdy5iaW5kKHdpbmRvdy5wZXJmb3JtYW5jZSk7XG5cdH1cblx0Ly8gVXNlIERhdGUubm93IGlmIGl0IGlzIGF2YWlsYWJsZS5cblx0ZWxzZSBpZiAoRGF0ZS5ub3cgIT09IHVuZGVmaW5lZCkge1xuXHRcdFRXRUVOLm5vdyA9IERhdGUubm93O1xuXHR9XG5cdC8vIE90aGVyd2lzZSwgdXNlICduZXcgRGF0ZSgpLmdldFRpbWUoKScuXG5cdGVsc2Uge1xuXHRcdFRXRUVOLm5vdyA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblx0XHR9O1xuXHR9XG59KSgpO1xuXG5cblRXRUVOLlR3ZWVuID0gZnVuY3Rpb24gKG9iamVjdCkge1xuXG5cdHZhciBfb2JqZWN0ID0gb2JqZWN0O1xuXHR2YXIgX3ZhbHVlc1N0YXJ0ID0ge307XG5cdHZhciBfdmFsdWVzRW5kID0ge307XG5cdHZhciBfdmFsdWVzU3RhcnRSZXBlYXQgPSB7fTtcblx0dmFyIF9kdXJhdGlvbiA9IDEwMDA7XG5cdHZhciBfcmVwZWF0ID0gMDtcblx0dmFyIF95b3lvID0gZmFsc2U7XG5cdHZhciBfaXNQbGF5aW5nID0gZmFsc2U7XG5cdHZhciBfcmV2ZXJzZWQgPSBmYWxzZTtcblx0dmFyIF9kZWxheVRpbWUgPSAwO1xuXHR2YXIgX3N0YXJ0VGltZSA9IG51bGw7XG5cdHZhciBfZWFzaW5nRnVuY3Rpb24gPSBUV0VFTi5FYXNpbmcuTGluZWFyLk5vbmU7XG5cdHZhciBfaW50ZXJwb2xhdGlvbkZ1bmN0aW9uID0gVFdFRU4uSW50ZXJwb2xhdGlvbi5MaW5lYXI7XG5cdHZhciBfY2hhaW5lZFR3ZWVucyA9IFtdO1xuXHR2YXIgX29uU3RhcnRDYWxsYmFjayA9IG51bGw7XG5cdHZhciBfb25TdGFydENhbGxiYWNrRmlyZWQgPSBmYWxzZTtcblx0dmFyIF9vblVwZGF0ZUNhbGxiYWNrID0gbnVsbDtcblx0dmFyIF9vbkNvbXBsZXRlQ2FsbGJhY2sgPSBudWxsO1xuXHR2YXIgX29uU3RvcENhbGxiYWNrID0gbnVsbDtcblxuXHQvLyBTZXQgYWxsIHN0YXJ0aW5nIHZhbHVlcyBwcmVzZW50IG9uIHRoZSB0YXJnZXQgb2JqZWN0XG5cdGZvciAodmFyIGZpZWxkIGluIG9iamVjdCkge1xuXHRcdF92YWx1ZXNTdGFydFtmaWVsZF0gPSBwYXJzZUZsb2F0KG9iamVjdFtmaWVsZF0sIDEwKTtcblx0fVxuXG5cdHRoaXMudG8gPSBmdW5jdGlvbiAocHJvcGVydGllcywgZHVyYXRpb24pIHtcblxuXHRcdGlmIChkdXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRfZHVyYXRpb24gPSBkdXJhdGlvbjtcblx0XHR9XG5cblx0XHRfdmFsdWVzRW5kID0gcHJvcGVydGllcztcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5zdGFydCA9IGZ1bmN0aW9uICh0aW1lKSB7XG5cblx0XHRUV0VFTi5hZGQodGhpcyk7XG5cblx0XHRfaXNQbGF5aW5nID0gdHJ1ZTtcblxuXHRcdF9vblN0YXJ0Q2FsbGJhY2tGaXJlZCA9IGZhbHNlO1xuXG5cdFx0X3N0YXJ0VGltZSA9IHRpbWUgIT09IHVuZGVmaW5lZCA/IHRpbWUgOiBUV0VFTi5ub3coKTtcblx0XHRfc3RhcnRUaW1lICs9IF9kZWxheVRpbWU7XG5cblx0XHRmb3IgKHZhciBwcm9wZXJ0eSBpbiBfdmFsdWVzRW5kKSB7XG5cblx0XHRcdC8vIENoZWNrIGlmIGFuIEFycmF5IHdhcyBwcm92aWRlZCBhcyBwcm9wZXJ0eSB2YWx1ZVxuXHRcdFx0aWYgKF92YWx1ZXNFbmRbcHJvcGVydHldIGluc3RhbmNlb2YgQXJyYXkpIHtcblxuXHRcdFx0XHRpZiAoX3ZhbHVlc0VuZFtwcm9wZXJ0eV0ubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBDcmVhdGUgYSBsb2NhbCBjb3B5IG9mIHRoZSBBcnJheSB3aXRoIHRoZSBzdGFydCB2YWx1ZSBhdCB0aGUgZnJvbnRcblx0XHRcdFx0X3ZhbHVlc0VuZFtwcm9wZXJ0eV0gPSBbX29iamVjdFtwcm9wZXJ0eV1dLmNvbmNhdChfdmFsdWVzRW5kW3Byb3BlcnR5XSk7XG5cblx0XHRcdH1cblxuXHRcdFx0Ly8gSWYgYHRvKClgIHNwZWNpZmllcyBhIHByb3BlcnR5IHRoYXQgZG9lc24ndCBleGlzdCBpbiB0aGUgc291cmNlIG9iamVjdCxcblx0XHRcdC8vIHdlIHNob3VsZCBub3Qgc2V0IHRoYXQgcHJvcGVydHkgaW4gdGhlIG9iamVjdFxuXHRcdFx0aWYgKF92YWx1ZXNTdGFydFtwcm9wZXJ0eV0gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0X3ZhbHVlc1N0YXJ0W3Byb3BlcnR5XSA9IF9vYmplY3RbcHJvcGVydHldO1xuXG5cdFx0XHRpZiAoKF92YWx1ZXNTdGFydFtwcm9wZXJ0eV0gaW5zdGFuY2VvZiBBcnJheSkgPT09IGZhbHNlKSB7XG5cdFx0XHRcdF92YWx1ZXNTdGFydFtwcm9wZXJ0eV0gKj0gMS4wOyAvLyBFbnN1cmVzIHdlJ3JlIHVzaW5nIG51bWJlcnMsIG5vdCBzdHJpbmdzXG5cdFx0XHR9XG5cblx0XHRcdF92YWx1ZXNTdGFydFJlcGVhdFtwcm9wZXJ0eV0gPSBfdmFsdWVzU3RhcnRbcHJvcGVydHldIHx8IDA7XG5cblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuc3RvcCA9IGZ1bmN0aW9uICgpIHtcblxuXHRcdGlmICghX2lzUGxheWluZykge1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXG5cdFx0VFdFRU4ucmVtb3ZlKHRoaXMpO1xuXHRcdF9pc1BsYXlpbmcgPSBmYWxzZTtcblxuXHRcdGlmIChfb25TdG9wQ2FsbGJhY2sgIT09IG51bGwpIHtcblx0XHRcdF9vblN0b3BDYWxsYmFjay5jYWxsKF9vYmplY3QpO1xuXHRcdH1cblxuXHRcdHRoaXMuc3RvcENoYWluZWRUd2VlbnMoKTtcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuc3RvcENoYWluZWRUd2VlbnMgPSBmdW5jdGlvbiAoKSB7XG5cblx0XHRmb3IgKHZhciBpID0gMCwgbnVtQ2hhaW5lZFR3ZWVucyA9IF9jaGFpbmVkVHdlZW5zLmxlbmd0aDsgaSA8IG51bUNoYWluZWRUd2VlbnM7IGkrKykge1xuXHRcdFx0X2NoYWluZWRUd2VlbnNbaV0uc3RvcCgpO1xuXHRcdH1cblxuXHR9O1xuXG5cdHRoaXMuZGVsYXkgPSBmdW5jdGlvbiAoYW1vdW50KSB7XG5cblx0XHRfZGVsYXlUaW1lID0gYW1vdW50O1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5yZXBlYXQgPSBmdW5jdGlvbiAodGltZXMpIHtcblxuXHRcdF9yZXBlYXQgPSB0aW1lcztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMueW95byA9IGZ1bmN0aW9uICh5b3lvKSB7XG5cblx0XHRfeW95byA9IHlveW87XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXG5cdHRoaXMuZWFzaW5nID0gZnVuY3Rpb24gKGVhc2luZykge1xuXG5cdFx0X2Vhc2luZ0Z1bmN0aW9uID0gZWFzaW5nO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5pbnRlcnBvbGF0aW9uID0gZnVuY3Rpb24gKGludGVycG9sYXRpb24pIHtcblxuXHRcdF9pbnRlcnBvbGF0aW9uRnVuY3Rpb24gPSBpbnRlcnBvbGF0aW9uO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5jaGFpbiA9IGZ1bmN0aW9uICgpIHtcblxuXHRcdF9jaGFpbmVkVHdlZW5zID0gYXJndW1lbnRzO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5vblN0YXJ0ID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cblx0XHRfb25TdGFydENhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLm9uVXBkYXRlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cblx0XHRfb25VcGRhdGVDYWxsYmFjayA9IGNhbGxiYWNrO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5vbkNvbXBsZXRlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG5cblx0XHRfb25Db21wbGV0ZUNhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLm9uU3RvcCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuXG5cdFx0X29uU3RvcENhbGxiYWNrID0gY2FsbGJhY2s7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnVwZGF0ZSA9IGZ1bmN0aW9uICh0aW1lKSB7XG5cblx0XHR2YXIgcHJvcGVydHk7XG5cdFx0dmFyIGVsYXBzZWQ7XG5cdFx0dmFyIHZhbHVlO1xuXG5cdFx0aWYgKHRpbWUgPCBfc3RhcnRUaW1lKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZiAoX29uU3RhcnRDYWxsYmFja0ZpcmVkID09PSBmYWxzZSkge1xuXG5cdFx0XHRpZiAoX29uU3RhcnRDYWxsYmFjayAhPT0gbnVsbCkge1xuXHRcdFx0XHRfb25TdGFydENhbGxiYWNrLmNhbGwoX29iamVjdCk7XG5cdFx0XHR9XG5cblx0XHRcdF9vblN0YXJ0Q2FsbGJhY2tGaXJlZCA9IHRydWU7XG5cblx0XHR9XG5cblx0XHRlbGFwc2VkID0gKHRpbWUgLSBfc3RhcnRUaW1lKSAvIF9kdXJhdGlvbjtcblx0XHRlbGFwc2VkID0gZWxhcHNlZCA+IDEgPyAxIDogZWxhcHNlZDtcblxuXHRcdHZhbHVlID0gX2Vhc2luZ0Z1bmN0aW9uKGVsYXBzZWQpO1xuXG5cdFx0Zm9yIChwcm9wZXJ0eSBpbiBfdmFsdWVzRW5kKSB7XG5cblx0XHRcdC8vIERvbid0IHVwZGF0ZSBwcm9wZXJ0aWVzIHRoYXQgZG8gbm90IGV4aXN0IGluIHRoZSBzb3VyY2Ugb2JqZWN0XG5cdFx0XHRpZiAoX3ZhbHVlc1N0YXJ0W3Byb3BlcnR5XSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgc3RhcnQgPSBfdmFsdWVzU3RhcnRbcHJvcGVydHldIHx8IDA7XG5cdFx0XHR2YXIgZW5kID0gX3ZhbHVlc0VuZFtwcm9wZXJ0eV07XG5cblx0XHRcdGlmIChlbmQgaW5zdGFuY2VvZiBBcnJheSkge1xuXG5cdFx0XHRcdF9vYmplY3RbcHJvcGVydHldID0gX2ludGVycG9sYXRpb25GdW5jdGlvbihlbmQsIHZhbHVlKTtcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHQvLyBQYXJzZXMgcmVsYXRpdmUgZW5kIHZhbHVlcyB3aXRoIHN0YXJ0IGFzIGJhc2UgKGUuZy46ICsxMCwgLTMpXG5cdFx0XHRcdGlmICh0eXBlb2YgKGVuZCkgPT09ICdzdHJpbmcnKSB7XG5cblx0XHRcdFx0XHRpZiAoZW5kLmNoYXJBdCgwKSA9PT0gJysnIHx8IGVuZC5jaGFyQXQoMCkgPT09ICctJykge1xuXHRcdFx0XHRcdFx0ZW5kID0gc3RhcnQgKyBwYXJzZUZsb2F0KGVuZCwgMTApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRlbmQgPSBwYXJzZUZsb2F0KGVuZCwgMTApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFByb3RlY3QgYWdhaW5zdCBub24gbnVtZXJpYyBwcm9wZXJ0aWVzLlxuXHRcdFx0XHRpZiAodHlwZW9mIChlbmQpID09PSAnbnVtYmVyJykge1xuXHRcdFx0XHRcdF9vYmplY3RbcHJvcGVydHldID0gc3RhcnQgKyAoZW5kIC0gc3RhcnQpICogdmFsdWU7XG5cdFx0XHRcdH1cblxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0aWYgKF9vblVwZGF0ZUNhbGxiYWNrICE9PSBudWxsKSB7XG5cdFx0XHRfb25VcGRhdGVDYWxsYmFjay5jYWxsKF9vYmplY3QsIHZhbHVlKTtcblx0XHR9XG5cblx0XHRpZiAoZWxhcHNlZCA9PT0gMSkge1xuXG5cdFx0XHRpZiAoX3JlcGVhdCA+IDApIHtcblxuXHRcdFx0XHRpZiAoaXNGaW5pdGUoX3JlcGVhdCkpIHtcblx0XHRcdFx0XHRfcmVwZWF0LS07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBSZWFzc2lnbiBzdGFydGluZyB2YWx1ZXMsIHJlc3RhcnQgYnkgbWFraW5nIHN0YXJ0VGltZSA9IG5vd1xuXHRcdFx0XHRmb3IgKHByb3BlcnR5IGluIF92YWx1ZXNTdGFydFJlcGVhdCkge1xuXG5cdFx0XHRcdFx0aWYgKHR5cGVvZiAoX3ZhbHVlc0VuZFtwcm9wZXJ0eV0pID09PSAnc3RyaW5nJykge1xuXHRcdFx0XHRcdFx0X3ZhbHVlc1N0YXJ0UmVwZWF0W3Byb3BlcnR5XSA9IF92YWx1ZXNTdGFydFJlcGVhdFtwcm9wZXJ0eV0gKyBwYXJzZUZsb2F0KF92YWx1ZXNFbmRbcHJvcGVydHldLCAxMCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKF95b3lvKSB7XG5cdFx0XHRcdFx0XHR2YXIgdG1wID0gX3ZhbHVlc1N0YXJ0UmVwZWF0W3Byb3BlcnR5XTtcblxuXHRcdFx0XHRcdFx0X3ZhbHVlc1N0YXJ0UmVwZWF0W3Byb3BlcnR5XSA9IF92YWx1ZXNFbmRbcHJvcGVydHldO1xuXHRcdFx0XHRcdFx0X3ZhbHVlc0VuZFtwcm9wZXJ0eV0gPSB0bXA7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0X3ZhbHVlc1N0YXJ0W3Byb3BlcnR5XSA9IF92YWx1ZXNTdGFydFJlcGVhdFtwcm9wZXJ0eV07XG5cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmIChfeW95bykge1xuXHRcdFx0XHRcdF9yZXZlcnNlZCA9ICFfcmV2ZXJzZWQ7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRfc3RhcnRUaW1lID0gdGltZSArIF9kZWxheVRpbWU7XG5cblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cblx0XHRcdH0gZWxzZSB7XG5cblx0XHRcdFx0aWYgKF9vbkNvbXBsZXRlQ2FsbGJhY2sgIT09IG51bGwpIHtcblx0XHRcdFx0XHRfb25Db21wbGV0ZUNhbGxiYWNrLmNhbGwoX29iamVjdCk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmb3IgKHZhciBpID0gMCwgbnVtQ2hhaW5lZFR3ZWVucyA9IF9jaGFpbmVkVHdlZW5zLmxlbmd0aDsgaSA8IG51bUNoYWluZWRUd2VlbnM7IGkrKykge1xuXHRcdFx0XHRcdC8vIE1ha2UgdGhlIGNoYWluZWQgdHdlZW5zIHN0YXJ0IGV4YWN0bHkgYXQgdGhlIHRpbWUgdGhleSBzaG91bGQsXG5cdFx0XHRcdFx0Ly8gZXZlbiBpZiB0aGUgYHVwZGF0ZSgpYCBtZXRob2Qgd2FzIGNhbGxlZCB3YXkgcGFzdCB0aGUgZHVyYXRpb24gb2YgdGhlIHR3ZWVuXG5cdFx0XHRcdFx0X2NoYWluZWRUd2VlbnNbaV0uc3RhcnQoX3N0YXJ0VGltZSArIF9kdXJhdGlvbik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cblx0XHRcdH1cblxuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXG5cdH07XG5cbn07XG5cblxuVFdFRU4uRWFzaW5nID0ge1xuXG5cdExpbmVhcjoge1xuXG5cdFx0Tm9uZTogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIGs7XG5cblx0XHR9XG5cblx0fSxcblxuXHRRdWFkcmF0aWM6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gayAqIGs7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gayAqICgyIC0gayk7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdGlmICgoayAqPSAyKSA8IDEpIHtcblx0XHRcdFx0cmV0dXJuIDAuNSAqIGsgKiBrO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gLSAwLjUgKiAoLS1rICogKGsgLSAyKSAtIDEpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0Q3ViaWM6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gayAqIGsgKiBrO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIC0tayAqIGsgKiBrICsgMTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0aWYgKChrICo9IDIpIDwgMSkge1xuXHRcdFx0XHRyZXR1cm4gMC41ICogayAqIGsgKiBrO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gMC41ICogKChrIC09IDIpICogayAqIGsgKyAyKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdFF1YXJ0aWM6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gayAqIGsgKiBrICogaztcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiAxIC0gKC0tayAqIGsgKiBrICogayk7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdGlmICgoayAqPSAyKSA8IDEpIHtcblx0XHRcdFx0cmV0dXJuIDAuNSAqIGsgKiBrICogayAqIGs7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAtIDAuNSAqICgoayAtPSAyKSAqIGsgKiBrICogayAtIDIpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0UXVpbnRpYzoge1xuXG5cdFx0SW46IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiBrICogayAqIGsgKiBrICogaztcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiAtLWsgKiBrICogayAqIGsgKiBrICsgMTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0aWYgKChrICo9IDIpIDwgMSkge1xuXHRcdFx0XHRyZXR1cm4gMC41ICogayAqIGsgKiBrICogayAqIGs7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAwLjUgKiAoKGsgLT0gMikgKiBrICogayAqIGsgKiBrICsgMik7XG5cblx0XHR9XG5cblx0fSxcblxuXHRTaW51c29pZGFsOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIDEgLSBNYXRoLmNvcyhrICogTWF0aC5QSSAvIDIpO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIE1hdGguc2luKGsgKiBNYXRoLlBJIC8gMik7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiAwLjUgKiAoMSAtIE1hdGguY29zKE1hdGguUEkgKiBrKSk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRFeHBvbmVudGlhbDoge1xuXG5cdFx0SW46IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiBrID09PSAwID8gMCA6IE1hdGgucG93KDEwMjQsIGsgLSAxKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiBrID09PSAxID8gMSA6IDEgLSBNYXRoLnBvdygyLCAtIDEwICogayk7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdGlmIChrID09PSAwKSB7XG5cdFx0XHRcdHJldHVybiAwO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoayA9PT0gMSkge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKChrICo9IDIpIDwgMSkge1xuXHRcdFx0XHRyZXR1cm4gMC41ICogTWF0aC5wb3coMTAyNCwgayAtIDEpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gMC41ICogKC0gTWF0aC5wb3coMiwgLSAxMCAqIChrIC0gMSkpICsgMik7XG5cblx0XHR9XG5cblx0fSxcblxuXHRDaXJjdWxhcjoge1xuXG5cdFx0SW46IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiAxIC0gTWF0aC5zcXJ0KDEgLSBrICogayk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gTWF0aC5zcXJ0KDEgLSAoLS1rICogaykpO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoKGsgKj0gMikgPCAxKSB7XG5cdFx0XHRcdHJldHVybiAtIDAuNSAqIChNYXRoLnNxcnQoMSAtIGsgKiBrKSAtIDEpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gMC41ICogKE1hdGguc3FydCgxIC0gKGsgLT0gMikgKiBrKSArIDEpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0RWxhc3RpYzoge1xuXG5cdFx0SW46IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdGlmIChrID09PSAwKSB7XG5cdFx0XHRcdHJldHVybiAwO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoayA9PT0gMSkge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIC1NYXRoLnBvdygyLCAxMCAqIChrIC0gMSkpICogTWF0aC5zaW4oKGsgLSAxLjEpICogNSAqIE1hdGguUEkpO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0aWYgKGsgPT09IDApIHtcblx0XHRcdFx0cmV0dXJuIDA7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChrID09PSAxKSB7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gTWF0aC5wb3coMiwgLTEwICogaykgKiBNYXRoLnNpbigoayAtIDAuMSkgKiA1ICogTWF0aC5QSSkgKyAxO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoayA9PT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gMDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGsgPT09IDEpIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cblx0XHRcdGsgKj0gMjtcblxuXHRcdFx0aWYgKGsgPCAxKSB7XG5cdFx0XHRcdHJldHVybiAtMC41ICogTWF0aC5wb3coMiwgMTAgKiAoayAtIDEpKSAqIE1hdGguc2luKChrIC0gMS4xKSAqIDUgKiBNYXRoLlBJKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIDAuNSAqIE1hdGgucG93KDIsIC0xMCAqIChrIC0gMSkpICogTWF0aC5zaW4oKGsgLSAxLjEpICogNSAqIE1hdGguUEkpICsgMTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdEJhY2s6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHR2YXIgcyA9IDEuNzAxNTg7XG5cblx0XHRcdHJldHVybiBrICogayAqICgocyArIDEpICogayAtIHMpO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0dmFyIHMgPSAxLjcwMTU4O1xuXG5cdFx0XHRyZXR1cm4gLS1rICogayAqICgocyArIDEpICogayArIHMpICsgMTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0dmFyIHMgPSAxLjcwMTU4ICogMS41MjU7XG5cblx0XHRcdGlmICgoayAqPSAyKSA8IDEpIHtcblx0XHRcdFx0cmV0dXJuIDAuNSAqIChrICogayAqICgocyArIDEpICogayAtIHMpKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIDAuNSAqICgoayAtPSAyKSAqIGsgKiAoKHMgKyAxKSAqIGsgKyBzKSArIDIpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0Qm91bmNlOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIDEgLSBUV0VFTi5FYXNpbmcuQm91bmNlLk91dCgxIC0gayk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoayA8ICgxIC8gMi43NSkpIHtcblx0XHRcdFx0cmV0dXJuIDcuNTYyNSAqIGsgKiBrO1xuXHRcdFx0fSBlbHNlIGlmIChrIDwgKDIgLyAyLjc1KSkge1xuXHRcdFx0XHRyZXR1cm4gNy41NjI1ICogKGsgLT0gKDEuNSAvIDIuNzUpKSAqIGsgKyAwLjc1O1xuXHRcdFx0fSBlbHNlIGlmIChrIDwgKDIuNSAvIDIuNzUpKSB7XG5cdFx0XHRcdHJldHVybiA3LjU2MjUgKiAoayAtPSAoMi4yNSAvIDIuNzUpKSAqIGsgKyAwLjkzNzU7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gNy41NjI1ICogKGsgLT0gKDIuNjI1IC8gMi43NSkpICogayArIDAuOTg0Mzc1O1xuXHRcdFx0fVxuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoayA8IDAuNSkge1xuXHRcdFx0XHRyZXR1cm4gVFdFRU4uRWFzaW5nLkJvdW5jZS5JbihrICogMikgKiAwLjU7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBUV0VFTi5FYXNpbmcuQm91bmNlLk91dChrICogMiAtIDEpICogMC41ICsgMC41O1xuXG5cdFx0fVxuXG5cdH1cblxufTtcblxuVFdFRU4uSW50ZXJwb2xhdGlvbiA9IHtcblxuXHRMaW5lYXI6IGZ1bmN0aW9uICh2LCBrKSB7XG5cblx0XHR2YXIgbSA9IHYubGVuZ3RoIC0gMTtcblx0XHR2YXIgZiA9IG0gKiBrO1xuXHRcdHZhciBpID0gTWF0aC5mbG9vcihmKTtcblx0XHR2YXIgZm4gPSBUV0VFTi5JbnRlcnBvbGF0aW9uLlV0aWxzLkxpbmVhcjtcblxuXHRcdGlmIChrIDwgMCkge1xuXHRcdFx0cmV0dXJuIGZuKHZbMF0sIHZbMV0sIGYpO1xuXHRcdH1cblxuXHRcdGlmIChrID4gMSkge1xuXHRcdFx0cmV0dXJuIGZuKHZbbV0sIHZbbSAtIDFdLCBtIC0gZik7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZuKHZbaV0sIHZbaSArIDEgPiBtID8gbSA6IGkgKyAxXSwgZiAtIGkpO1xuXG5cdH0sXG5cblx0QmV6aWVyOiBmdW5jdGlvbiAodiwgaykge1xuXG5cdFx0dmFyIGIgPSAwO1xuXHRcdHZhciBuID0gdi5sZW5ndGggLSAxO1xuXHRcdHZhciBwdyA9IE1hdGgucG93O1xuXHRcdHZhciBibiA9IFRXRUVOLkludGVycG9sYXRpb24uVXRpbHMuQmVybnN0ZWluO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPD0gbjsgaSsrKSB7XG5cdFx0XHRiICs9IHB3KDEgLSBrLCBuIC0gaSkgKiBwdyhrLCBpKSAqIHZbaV0gKiBibihuLCBpKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gYjtcblxuXHR9LFxuXG5cdENhdG11bGxSb206IGZ1bmN0aW9uICh2LCBrKSB7XG5cblx0XHR2YXIgbSA9IHYubGVuZ3RoIC0gMTtcblx0XHR2YXIgZiA9IG0gKiBrO1xuXHRcdHZhciBpID0gTWF0aC5mbG9vcihmKTtcblx0XHR2YXIgZm4gPSBUV0VFTi5JbnRlcnBvbGF0aW9uLlV0aWxzLkNhdG11bGxSb207XG5cblx0XHRpZiAodlswXSA9PT0gdlttXSkge1xuXG5cdFx0XHRpZiAoayA8IDApIHtcblx0XHRcdFx0aSA9IE1hdGguZmxvb3IoZiA9IG0gKiAoMSArIGspKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGZuKHZbKGkgLSAxICsgbSkgJSBtXSwgdltpXSwgdlsoaSArIDEpICUgbV0sIHZbKGkgKyAyKSAlIG1dLCBmIC0gaSk7XG5cblx0XHR9IGVsc2Uge1xuXG5cdFx0XHRpZiAoayA8IDApIHtcblx0XHRcdFx0cmV0dXJuIHZbMF0gLSAoZm4odlswXSwgdlswXSwgdlsxXSwgdlsxXSwgLWYpIC0gdlswXSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChrID4gMSkge1xuXHRcdFx0XHRyZXR1cm4gdlttXSAtIChmbih2W21dLCB2W21dLCB2W20gLSAxXSwgdlttIC0gMV0sIGYgLSBtKSAtIHZbbV0pO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZm4odltpID8gaSAtIDEgOiAwXSwgdltpXSwgdlttIDwgaSArIDEgPyBtIDogaSArIDFdLCB2W20gPCBpICsgMiA/IG0gOiBpICsgMl0sIGYgLSBpKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdFV0aWxzOiB7XG5cblx0XHRMaW5lYXI6IGZ1bmN0aW9uIChwMCwgcDEsIHQpIHtcblxuXHRcdFx0cmV0dXJuIChwMSAtIHAwKSAqIHQgKyBwMDtcblxuXHRcdH0sXG5cblx0XHRCZXJuc3RlaW46IGZ1bmN0aW9uIChuLCBpKSB7XG5cblx0XHRcdHZhciBmYyA9IFRXRUVOLkludGVycG9sYXRpb24uVXRpbHMuRmFjdG9yaWFsO1xuXG5cdFx0XHRyZXR1cm4gZmMobikgLyBmYyhpKSAvIGZjKG4gLSBpKTtcblxuXHRcdH0sXG5cblx0XHRGYWN0b3JpYWw6IChmdW5jdGlvbiAoKSB7XG5cblx0XHRcdHZhciBhID0gWzFdO1xuXG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKG4pIHtcblxuXHRcdFx0XHR2YXIgcyA9IDE7XG5cblx0XHRcdFx0aWYgKGFbbl0pIHtcblx0XHRcdFx0XHRyZXR1cm4gYVtuXTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZvciAodmFyIGkgPSBuOyBpID4gMTsgaS0tKSB7XG5cdFx0XHRcdFx0cyAqPSBpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YVtuXSA9IHM7XG5cdFx0XHRcdHJldHVybiBzO1xuXG5cdFx0XHR9O1xuXG5cdFx0fSkoKSxcblxuXHRcdENhdG11bGxSb206IGZ1bmN0aW9uIChwMCwgcDEsIHAyLCBwMywgdCkge1xuXG5cdFx0XHR2YXIgdjAgPSAocDIgLSBwMCkgKiAwLjU7XG5cdFx0XHR2YXIgdjEgPSAocDMgLSBwMSkgKiAwLjU7XG5cdFx0XHR2YXIgdDIgPSB0ICogdDtcblx0XHRcdHZhciB0MyA9IHQgKiB0MjtcblxuXHRcdFx0cmV0dXJuICgyICogcDEgLSAyICogcDIgKyB2MCArIHYxKSAqIHQzICsgKC0gMyAqIHAxICsgMyAqIHAyIC0gMiAqIHYwIC0gdjEpICogdDIgKyB2MCAqIHQgKyBwMTtcblxuXHRcdH1cblxuXHR9XG5cbn07XG5cbi8vIFVNRCAoVW5pdmVyc2FsIE1vZHVsZSBEZWZpbml0aW9uKVxuKGZ1bmN0aW9uIChyb290KSB7XG5cblx0aWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuXG5cdFx0Ly8gQU1EXG5cdFx0ZGVmaW5lKFtdLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4gVFdFRU47XG5cdFx0fSk7XG5cblx0fSBlbHNlIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcblxuXHRcdC8vIE5vZGUuanNcblx0XHRtb2R1bGUuZXhwb3J0cyA9IFRXRUVOO1xuXG5cdH0gZWxzZSBpZiAocm9vdCAhPT0gdW5kZWZpbmVkKSB7XG5cblx0XHQvLyBHbG9iYWwgdmFyaWFibGVcblx0XHRyb290LlRXRUVOID0gVFdFRU47XG5cblx0fVxuXG59KSh0aGlzKTtcbiIsImltcG9ydCBQYXBhIGZyb20gJ3BhcGFwYXJzZSc7XG5pbXBvcnQgYXNzaWduIGZyb20gJ29iamVjdC1hc3NpZ24nO1xuXG4vKipcbiAqIEJhc2UgRGF0YXNldCBjbGFzc1xuICovXG5leHBvcnQgY2xhc3MgRGF0YXNldCB7XG5cblx0LyoqXG5cdCAqXG5cdCAqL1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHR0aGlzLmRhdGFwb2ludHMgPSB7fTtcblx0XHR0aGlzLmVtYmVkZGluZ3MgPSBbXTtcblx0fVxuXG5cdC8qKlxuXHQgKiBBIGNhbGxiYWNrIHRoYXQgaXMgdHJpZ2dlcmVkIGFmdGVyIHRoZSBkYXRhc2V0IGlzIGxvYWRlZDsgdHlwaWNhbGx5IHVzZWQgdG8gY3JlYXRlXG5cdCAqIGFuIGVtYmVkZGluZyBiYXNlZCBvbiB0aGUgZGF0YXNldC5cblx0ICogQGNhbGxiYWNrIENTVkRhdGFzZXRDYWxsYmFja1xuXHQgKiBAcGFyYW0ge0RhdGFzZXR9IGRhdGFzZXQgLSBUaGUgRGF0YXNldCBsb2FkZWQgZnJvbSB0aGUgY3N2IGZpbGVcblx0ICovXG5cblx0LyoqXG5cdCAqIENyZWF0ZSBhIHtEYXRhc2V0fSBmcm9tIGEgY3N2IGZpbGUgdGhhdCBjYW4gYmUgZm91bmQgYXQgdGhlIGdpdmVuIHVybFxuXHQgKiBAcGFyYW0ge1N0cmluZ30gdXJsIC0gVGhlIHVybCB3aGVyZSB0aGUgY3N2IGZpbGUgY2FuIGJlIGZvdW5kXG5cdCAqIEBwYXJhbSB7Q1NWRGF0YXNldENhbGxiYWNrfSBjYWxsYmFja1xuXHQgKi9cblx0c3RhdGljIGNyZWF0ZUZyb21DU1YodXJsLCBjYWxsYmFjaykge1xuXHRcdFBhcGEucGFyc2UodXJsLCB7XG5cdFx0XHRkb3dubG9hZDogdHJ1ZSxcblx0XHRcdGhlYWRlcjogdHJ1ZSxcblx0XHRcdGR5bmFtaWNUeXBpbmc6IHRydWUsXG5cdFx0XHRjb21wbGV0ZTogZnVuY3Rpb24ocmVzdWx0cykge1xuXHRcdFx0XHR2YXIgZHMgPSBuZXcgRGF0YXNldCgpO1xuXHRcdFx0XHRmb3IgKGxldCBpIGluIHJlc3VsdHMuZGF0YSkge1xuXHRcdFx0XHRcdGxldCBkcCA9IHJlc3VsdHMuZGF0YVtpXTtcblx0XHRcdFx0XHRkcC5faWQgPSBpO1xuXHRcdFx0XHRcdGRzLmFkZChkcCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y2FsbGJhY2soZHMpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIEFkZCBhIGRhdGFwb2ludCB0byB0aGUgRGF0YXNldFxuXHQgKiBAcGFyYW0ge0RhdGFwb2ludH0gZGF0YXBvaW50XG5cdCAqL1xuXHRhZGQoZGF0YXBvaW50KSB7XG5cdFx0dmFyIGQ7XG5cdFx0aWYgKCEgKGRhdGFwb2ludCBpbnN0YW5jZW9mIERhdGFwb2ludCkpIHtcblx0XHRcdGQgPSBuZXcgRGF0YXBvaW50KGRhdGFwb2ludCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGQgPSBkYXRhcG9pbnQ7XG5cdFx0fVxuXHRcdHRoaXMuZGF0YXBvaW50c1tkLmlkXSA9IGQ7XG5cdFx0dGhpcy5zZW5kTm90aWZpY2F0aW9ucygnYWRkJywgZC5pZCk7XG5cdH1cblxuXHQvKipcblx0ICogUmVtb3ZlIGEgZGF0YXBvaW50IGZyb20gdGhlIERhdGFzZXRcblx0ICogQHBhcmFtIGlkIC0gVGhlIGlkIG9mIHRoZSBkYXRhcG9pbnQgdG8gcmVtb3ZlXG5cdCAqL1xuXHRyZW1vdmUoaWQpIHtcblx0XHRkZWxldGUgdGhpcy5kYXRhcG9pbnRzW2lkXTtcblx0XHR0aGlzLnNlbmROb3RpZmljYXRpb25zKCdyZW1vdmUnLCBpZClcblx0fVxuXG5cdC8qKlxuXHQgKiBNb2RpZnkgdGhlIHZhbHVlIG9mIGEgZGF0YXBvaW50IGF0dHJpYnV0ZVxuXHQgKiBAcGFyYW0gaWQgLSBUaGUgaWQgb2YgdGhlIGRhdGFwb2ludCB0byBtb2RpZnlcblx0ICogQHBhcmFtIGsgLSBUaGUga2V5IHdob3NlIHZhbHVlIHRvIG1vZGlmeVxuXHQgQCBAcGFyYW0gdiAtIFRoZSBuZXcgdmFsdWVcblx0ICovXG5cdHVwZGF0ZShpZCwgaywgdikge1xuXHRcdGxldCBkcCA9IHRoaXMuZGF0YXBvaW50c1tpZF07XG5cdFx0aWYgKGRwKSB7XG5cdFx0XHRsZXQgb2xkID0gZHAuZ2V0KGspO1xuXHRcdFx0ZHAuc2V0KGssIHYpO1xuXHRcdFx0dGhpcy5zZW5kTm90aWZpY2F0aW9ucygndXBkYXRlJywgaWQsIGssIHYsIG9sZClcblx0XHR9XG5cdH1cblxuXHRnZXQoaWQpIHsgcmV0dXJuIHRoaXMuZGF0YXBvaW50c1tpZF07IH1cblxuXHRnZXRJZHMoKSB7IHJldHVybiBPYmplY3Qua2V5cyh0aGlzLmRhdGFwb2ludHMpOyB9XG5cblx0cmVnaXN0ZXIoZW1iZWRkaW5nKSB7XG5cdFx0dGhpcy5lbWJlZGRpbmdzLnB1c2goZW1iZWRkaW5nKTtcblx0fVxuXG5cdHNlbmROb3RpZmljYXRpb25zKHR5cGUsIGlkLCAuLi54KSB7XG5cdFx0bGV0IG1zZyA9IHsgdHlwZTogdHlwZSwgaWQ6IGlkIH07XG5cdFx0aWYgKHR5cGUgPT0gJ3VwZGF0ZScpIHtcblx0XHRcdG1zZy5hdHRyID0geFswXTtcblx0XHRcdG1zZy5uZXdWYWwgPSB4WzFdO1xuXHRcdFx0bXNnLm9sZFZhbCA9IHhbMl07XG5cdFx0fVxuXHRcdHRoaXMuZW1iZWRkaW5ncy5mb3JFYWNoKChlKSA9PiBlLm5vdGlmeSggbXNnICkpO1xuXHR9XG59XG5cbi8qKlxuICogQSBEYXRhc2V0IHdob3NlIGRhdGFwb2ludHMgYXJlIHJlY2VpdmVkIGZyb20gYSB3ZWJzb2NrZXQuXG4gKi9cbmV4cG9ydCBjbGFzcyBXZWJTb2NrZXREYXRhc2V0IGV4dGVuZHMgRGF0YXNldCB7XG5cdGNvbnN0cnVjdG9yKHVybCwgb3B0aW9ucyA9IHt9KSB7XG5cdFx0b3B0aW9ucyA9IGFzc2lnbih7b25tZXNzYWdlOiAoeCkgPT4geCwgaW5pdDogKHMpID0+IHt9fSwgb3B0aW9ucylcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cdFx0dGhpcy5zb2NrZXQgPSBuZXcgV2ViU29ja2V0KHVybCk7XG5cdFx0dGhpcy5zb2NrZXQub25vcGVuID0gKCkgPT4gdGhpcy5vcHRpb25zLmluaXQodGhpcy5zb2NrZXQpO1xuXHRcdHRoaXMuc29ja2V0Lm9ubWVzc2FnZSA9IGZ1bmN0aW9uKG0pIHtcblx0XHRcdHZhciBkID0gdGhpcy5vcHRpb25zLm9ubWVzc2FnZShKU09OLnBhcnNlKG0uZGF0YSkpO1xuXHRcdFx0dGhpcy5hZGQoZCk7XG5cdFx0fS5iaW5kKHRoaXMpO1xuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBEYXRhcG9pbnQge1xuXHRjb25zdHJ1Y3Rvcih2YWx1ZXMsIGlkQXR0cmlidXRlPSdfaWQnKSB7XG5cdFx0dGhpcy52YWx1ZXMgPSB2YWx1ZXM7XG5cdFx0dGhpcy5pZEF0dHJpYnV0ZSA9IGlkQXR0cmlidXRlO1xuXHR9XG5cblx0Z2V0IGlkKCkge1xuXHRcdHJldHVybiB0aGlzLnZhbHVlc1t0aGlzLmlkQXR0cmlidXRlXTtcblx0fVxuXG5cdGdldChrKSB7IHJldHVybiB0aGlzLnZhbHVlc1trXTsgfVxuXG5cdHNldChrLCB2KSB7XG5cdFx0dGhpcy52YWx1ZXNba10gPSB2O1xuXHR9XG59XG4iLCIndXNlIHN0cmljdCdcblxuLy8gbG9naWMgaGVyZSBhZGFwdGVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2JvcmlzbXVzL3JheS1pbnB1dC9ibG9iL21hc3Rlci9zcmMvcmF5LWNvbnRyb2xsZXIuanNcblxuZXhwb3J0IGNvbnN0IERJU1BMQVlfVFlQRVMgPSB7XG5cdERFU0tUT1A6ICdERVNLVE9QX0RJU1BMQVknLFxuXHRNT0JJTEU6ICdNT0JJTEVfRFNJUExBWScsXG5cdFZSOiAnVlJfRElTUExBWSdcbn1cblxuZXhwb3J0IGNvbnN0IElOUFVUX1RZUEVTID0ge1xuXHRLQl9NT1VTRTogJ0tCX01PVVNFX0lOUFVUJyxcblx0VE9VQ0g6ICdUT1VDSF9JTlBVVCcsXG5cdFZSX0dBWkU6ICdWUl9HQVpFX0lOUFVUJyxcblx0VlJfM0RPRjogJ1ZSXzNET0ZfSU5QVVQnLFxuXHRWUl82RE9GOiAnVlJfNkRPRl9JTlBVVCdcbn1cblxuLy8gaHR0cHM6Ly9naXRodWIuY29tL2JvcmlzbXVzL3JheS1pbnB1dC9ibG9iL21hc3Rlci9zcmMvdXRpbC5qc1xuZnVuY3Rpb24gaXNNb2JpbGUoKSB7XG4gIHZhciBjaGVjayA9IGZhbHNlO1xuICAoZnVuY3Rpb24oYSl7aWYoLyhhbmRyb2lkfGJiXFxkK3xtZWVnbykuK21vYmlsZXxhdmFudGdvfGJhZGFcXC98YmxhY2tiZXJyeXxibGF6ZXJ8Y29tcGFsfGVsYWluZXxmZW5uZWN8aGlwdG9wfGllbW9iaWxlfGlwKGhvbmV8b2QpfGlyaXN8a2luZGxlfGxnZSB8bWFlbW98bWlkcHxtbXB8bW9iaWxlLitmaXJlZm94fG5ldGZyb250fG9wZXJhIG0ob2J8aW4paXxwYWxtKCBvcyk/fHBob25lfHAoaXhpfHJlKVxcL3xwbHVja2VyfHBvY2tldHxwc3B8c2VyaWVzKDR8NikwfHN5bWJpYW58dHJlb3x1cFxcLihicm93c2VyfGxpbmspfHZvZGFmb25lfHdhcHx3aW5kb3dzIGNlfHhkYXx4aWluby9pLnRlc3QoYSl8fC8xMjA3fDYzMTB8NjU5MHwzZ3NvfDR0aHB8NTBbMS02XWl8Nzcwc3w4MDJzfGEgd2F8YWJhY3xhYyhlcnxvb3xzXFwtKXxhaShrb3xybil8YWwoYXZ8Y2F8Y28pfGFtb2l8YW4oZXh8bnl8eXcpfGFwdHV8YXIoY2h8Z28pfGFzKHRlfHVzKXxhdHR3fGF1KGRpfFxcLW18ciB8cyApfGF2YW58YmUoY2t8bGx8bnEpfGJpKGxifHJkKXxibChhY3xheil8YnIoZXx2KXd8YnVtYnxid1xcLShufHUpfGM1NVxcL3xjYXBpfGNjd2F8Y2RtXFwtfGNlbGx8Y2h0bXxjbGRjfGNtZFxcLXxjbyhtcHxuZCl8Y3Jhd3xkYShpdHxsbHxuZyl8ZGJ0ZXxkY1xcLXN8ZGV2aXxkaWNhfGRtb2J8ZG8oY3xwKW98ZHMoMTJ8XFwtZCl8ZWwoNDl8YWkpfGVtKGwyfHVsKXxlcihpY3xrMCl8ZXNsOHxleihbNC03XTB8b3N8d2F8emUpfGZldGN8Zmx5KFxcLXxfKXxnMSB1fGc1NjB8Z2VuZXxnZlxcLTV8Z1xcLW1vfGdvKFxcLnd8b2QpfGdyKGFkfHVuKXxoYWllfGhjaXR8aGRcXC0obXxwfHQpfGhlaVxcLXxoaShwdHx0YSl8aHAoIGl8aXApfGhzXFwtY3xodChjKFxcLXwgfF98YXxnfHB8c3x0KXx0cCl8aHUoYXd8dGMpfGlcXC0oMjB8Z298bWEpfGkyMzB8aWFjKCB8XFwtfFxcLyl8aWJyb3xpZGVhfGlnMDF8aWtvbXxpbTFrfGlubm98aXBhcXxpcmlzfGphKHR8dilhfGpicm98amVtdXxqaWdzfGtkZGl8a2VqaXxrZ3QoIHxcXC8pfGtsb258a3B0IHxrd2NcXC18a3lvKGN8ayl8bGUobm98eGkpfGxnKCBnfFxcLyhrfGx8dSl8NTB8NTR8XFwtW2Etd10pfGxpYnd8bHlueHxtMVxcLXd8bTNnYXxtNTBcXC98bWEodGV8dWl8eG8pfG1jKDAxfDIxfGNhKXxtXFwtY3J8bWUocmN8cmkpfG1pKG84fG9hfHRzKXxtbWVmfG1vKDAxfDAyfGJpfGRlfGRvfHQoXFwtfCB8b3x2KXx6eil8bXQoNTB8cDF8diApfG13YnB8bXl3YXxuMTBbMC0yXXxuMjBbMi0zXXxuMzAoMHwyKXxuNTAoMHwyfDUpfG43KDAoMHwxKXwxMCl8bmUoKGN8bSlcXC18b258dGZ8d2Z8d2d8d3QpfG5vayg2fGkpfG56cGh8bzJpbXxvcCh0aXx3dil8b3Jhbnxvd2cxfHA4MDB8cGFuKGF8ZHx0KXxwZHhnfHBnKDEzfFxcLShbMS04XXxjKSl8cGhpbHxwaXJlfHBsKGF5fHVjKXxwblxcLTJ8cG8oY2t8cnR8c2UpfHByb3h8cHNpb3xwdFxcLWd8cWFcXC1hfHFjKDA3fDEyfDIxfDMyfDYwfFxcLVsyLTddfGlcXC0pfHF0ZWt8cjM4MHxyNjAwfHJha3N8cmltOXxybyh2ZXx6byl8czU1XFwvfHNhKGdlfG1hfG1tfG1zfG55fHZhKXxzYygwMXxoXFwtfG9vfHBcXC0pfHNka1xcL3xzZShjKFxcLXwwfDEpfDQ3fG1jfG5kfHJpKXxzZ2hcXC18c2hhcnxzaWUoXFwtfG0pfHNrXFwtMHxzbCg0NXxpZCl8c20oYWx8YXJ8YjN8aXR8dDUpfHNvKGZ0fG55KXxzcCgwMXxoXFwtfHZcXC18diApfHN5KDAxfG1iKXx0MigxOHw1MCl8dDYoMDB8MTB8MTgpfHRhKGd0fGxrKXx0Y2xcXC18dGRnXFwtfHRlbChpfG0pfHRpbVxcLXx0XFwtbW98dG8ocGx8c2gpfHRzKDcwfG1cXC18bTN8bTUpfHR4XFwtOXx1cChcXC5ifGcxfHNpKXx1dHN0fHY0MDB8djc1MHx2ZXJpfHZpKHJnfHRlKXx2ayg0MHw1WzAtM118XFwtdil8dm00MHx2b2RhfHZ1bGN8dngoNTJ8NTN8NjB8NjF8NzB8ODB8ODF8ODN8ODV8OTgpfHczYyhcXC18ICl8d2ViY3x3aGl0fHdpKGcgfG5jfG53KXx3bWxifHdvbnV8eDcwMHx5YXNcXC18eW91cnx6ZXRvfHp0ZVxcLS9pLnRlc3QoYS5zdWJzdHIoMCw0KSkpY2hlY2sgPSB0cnVlfSkobmF2aWdhdG9yLnVzZXJBZ2VudHx8bmF2aWdhdG9yLnZlbmRvcnx8d2luZG93Lm9wZXJhKTtcbiAgcmV0dXJuIGNoZWNrO1xufVxuXG5mdW5jdGlvbiBkZXRlY3REaXNwbGF5KCkge1xuXHRpZiAobmF2aWdhdG9yLmdldFZSRGlzcGxheXMpIHtcblx0XHRyZXR1cm4gRElTUExBWV9UWVBFUy5WUjtcdFxuXHR9IGVsc2Uge1xuXHRcdGlmIChpc01vYmlsZSgpKVxuXHRcdFx0cmV0dXJuIERJU1BMQVlfVFlQRVMuTU9CSUxFO1xuXHRcdGVsc2Vcblx0XHRcdHJldHVybiBESVNQTEFZX1RZUEVTLkRFU0tUT1A7XG5cdH1cbn1cblxuZnVuY3Rpb24gZGV0ZWN0SW5wdXQoZGlzcGxheU1vZGUpIHtcblx0dmFyIGdhbWVwYWQgPSB1bmRlZmluZWQ7XG5cdGlmIChuYXZpZ2F0b3IuZ2V0R2FtZXBhZHMpIHtcblx0XHRsZXQgZ2FtZXBhZHMgPSBuYXZpZ2F0b3IuZ2V0R2FtZXBhZHMoKTtcblx0XHRmb3IgKGxldCBnYW1lcGFkIG9mIGdhbWVwYWRzKSB7XG5cdFx0XHRpZiAoZ2FtZXBhZCAmJiBnYW1lcGFkLnBvc2UpIHtcblx0XHRcdFx0aWYgKGdhbWVwYWQucG9zZS5oYXNQb3NpdGlvbikgXG5cdFx0XHRcdFx0cmV0dXJuIElOUFVUX1RZUEVTLlZSXzZET0Y7XG5cdFx0XHRcdGVsc2UgaWYgKGdhbWVwYWQucG9zZS5oYXNPcmllbnRhdGlvbilcblx0XHRcdFx0XHRyZXR1cm4gSU5QVVRfVFlQRVMuVlJfM0RPRjtcblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHQvLyBnYW1lcGFkIEFQSSBub3QgZm91bmQgb3Igbm8gVlIgZ2FtZXBhZCBmb3VuZFxuXHRpZiAoaXNNb2JpbGUoKSkge1xuXHRcdGlmIChkaXNwbGF5TW9kZSA9PSBESVNQTEFZX1RZUEVTLlZSKVxuXHRcdFx0cmV0dXJuIElOUFVUX1RZUEVTLlZSX0dBWkU7XG5cdFx0ZWxzZSBcblx0XHRcdHJldHVybiBJTlBVVF9UWVBFUy5UT1VDSDtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gSU5QVVRfVFlQRVMuS0JfTU9VU0U7XG5cdH1cblxuXHRyZXR1cm4gSU5QVVRfVFlQRVMuVE9VQ0g7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXRlY3RNb2RlKCkge1xuXHRjb25zdCBkaXNwbGF5TW9kZSA9IGRldGVjdERpc3BsYXkoKTtcblx0Y29uc3QgaW5wdXRNb2RlID0gZGV0ZWN0SW5wdXQoZGlzcGxheU1vZGUpO1xuXHRyZXR1cm4geyBkaXNwbGF5TW9kZSwgaW5wdXRNb2RlIH07XG59IiwiaW1wb3J0IGFzc2lnbiBmcm9tICdvYmplY3QtYXNzaWduJztcbmltcG9ydCBUV0VFTiBmcm9tICd0d2Vlbi5qcyc7XG5cbi8qKlxuICogQmFzZSBjbGFzcyBmb3IgYWxsIGVtYmVkZGluZ3MuXG4gKi9cbmV4cG9ydCBjbGFzcyBFbWJlZGRpbmcge1xuXHQvKipcblx0ICogRW1iZWRkaW5nIGJhc2UgY29uc3RydWN0b3IuXG5cdCAqIEBjb25zdHJ1Y3RvclxuXHQgKiBAcGFyYW0gc2NlbmUgLSBUaGUgc2NlbmUgdG8gd2hpY2ggdGhlIGVtYmVkZGluZyBiZWxvbmdzXG5cdCAqIEBwYXJhbSB7RGF0YXNldH0gZGF0YXNldCAtIFRoZSBkYXRhc2V0IHRoYXQgYmFja3MgdGhlIGVtYmVkZGluZ1xuXHQgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnM9e31dIC0gT3B0aW9ucyBkZXNjcmliaW5nIHRoZSBlbWJlZGRpbmcncyBsb2NhdGlvbiBhbmQgc2NhbGVcblx0ICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLng9MF0gLSB4IHBvc2l0aW9uIG9mIHRoZSBlbWJlZGRpbmdcblx0ICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnk9MF0gLSB5IHBvc2l0aW9uIG9mIHRoZSBlbWJlZGRpbmdcblx0ICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLno9MF0gLSB6IHBvc2l0aW9uIG9mIHRoZSBlbWJlZGRpbmdcblx0ICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnJ4PTBdIC0geCByb3RhdGlvbiBvZiB0aGUgZW1iZWRkaW5nXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5yeT0wXSAtIHkgcm90YXRpb24gb2YgdGhlIGVtYmVkZGluZ1xuXHQgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMucno9MF0gLSB6IHJvdGF0aW9uIG9mIHRoZSBlbWJlZGRpbmdcblx0ICogQHBhcmFtIHtOdW1iZXJ9IFtvcHRpb25zLnN4PTFdIC0geCBzY2FsZSBvZiB0aGUgZW1iZWRkaW5nXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBbb3B0aW9ucy5zeT0xXSAtIHkgc2NhbGUgb2YgdGhlIGVtYmVkZGluZ1xuXHQgKiBAcGFyYW0ge051bWJlcn0gW29wdGlvbnMuc3o9MV0gLSB6IHNjYWxlIG9mIHRoZSBlbWJlZGRpbmdcblx0ICovXG5cdGNvbnN0cnVjdG9yKHNjZW5lLCBkYXRhc2V0LCBvcHRpb25zID0ge30pIHtcblx0XHR0aGlzLmRhdGFzZXQgPSBkYXRhc2V0O1xuXHRcdGlmIChkYXRhc2V0KSBkYXRhc2V0LnJlZ2lzdGVyKHRoaXMpO1xuXHRcdHRoaXMub2JqM0QgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblx0XHRzY2VuZS5hZGQodGhpcy5vYmozRCk7XG5cdFx0dGhpcy5pbml0aWFsaXplZCA9IGZhbHNlO1xuXHRcdHRoaXMuZXZlbnRzID0gW107XG5cblx0XHQvLyBzZXQgZGVmYXVsdCBwb3NpdGlvbiBhbmQgcm90YXRpb25cblx0XHRvcHRpb25zID0gYXNzaWduKHsgeDogMCwgeTogMCwgejogMCB9LCBvcHRpb25zKTtcblx0XHRvcHRpb25zID0gYXNzaWduKHsgcng6MCwgcnk6MCwgcno6MCB9LCBvcHRpb25zKTtcblx0XHRvcHRpb25zID0gYXNzaWduKHsgc3g6MSwgc3k6MSwgc3o6MSB9LCBvcHRpb25zKTtcblx0XHRvcHRpb25zID0gYXNzaWduKHsgbWFwcGluZzoge30gfSwgb3B0aW9ucyk7XG5cdFx0dGhpcy5vcHRpb25zID0gb3B0aW9ucztcblx0XHR0aGlzLm9iajNELnBvc2l0aW9uLnNldChvcHRpb25zLngsIG9wdGlvbnMueSwgb3B0aW9ucy56KTtcblx0XHR0aGlzLm9iajNELnJvdGF0aW9uLnNldChvcHRpb25zLnJ4LCBvcHRpb25zLnJ5LCBvcHRpb25zLnJ6KTtcblx0XHR0aGlzLm9iajNELnNjYWxlLnNldChvcHRpb25zLnN4LCBvcHRpb25zLnN5LCBvcHRpb25zLnN6KTtcblx0XHQvLyBUT0RPIGNhbm9uaWNhbGl6ZSwgc2FuaXRpemUgbWFwcGluZ1xuXHRcdHRoaXMubWFwcGluZyA9IHRoaXMub3B0aW9ucy5tYXBwaW5nO1xuXHR9XG5cblx0LyoqXG5cdCAqIFRyYW5zbGF0ZXMgZnJvbSBhIHNvdXJjZSBwcm9wZXJ0eSBvZiBhIGRhdGFwb2ludCB0byBhIHRhcmdldCBwcm9wZXJ0eSBvZiBhbiBlbWJlZGRpbmdcblx0ICogZWxlbWVudC5cblx0ICovXG5cdF9tYXAoZHAsIHNyYykge1xuXHRcdGxldCB0Z3QgPSB0aGlzLm1hcHBpbmdbc3JjXTtcblx0XHRyZXR1cm4gdGd0ID8gZHAuZ2V0KHRndCkgOiBkcC5nZXQoc3JjKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBUcmFuc2xhdGVzIGZyb20gYSBzb3VyY2UgcHJvcGVydHkgb2YgYSBkYXRhcG9pbnQgdG8gYSB0YXJnZXQgcHJvcGVydHkgb2YgYW4gZW1iZWRkaW5nXG5cdCAqIGVsZW1lbnQuXG5cdCAqL1xuXHRfbWFwQXR0cihzcmMpIHtcblx0XHRsZXQgdGd0ID0gdGhpcy5tYXBwaW5nW3NyY107XG5cdFx0cmV0dXJuIHRndCA/IHRndCA6IHNyYztcblx0fVxuXG5cdC8qKlxuXHQgKiBSZW5kZXIgdGhlIGVtYmVkZGluZyAtIG11c3QgYmUgaW1wbGVtZW50ZWQgYnkgZWFjaCBjb25jcmV0ZSBzdWJjbGFzcy5cblx0ICogQGFic3RyYWN0XG5cdCAqL1xuXHRlbWJlZCgpIHtcblx0XHQvLyBub3QgaW1wbGVtZW50ZWQgaGVyZVxuXHR9XG5cblx0bm90aWZ5KGV2ZW50KSB7XG5cdFx0dGhpcy5ldmVudHMucHVzaChldmVudCk7XG5cdH1cblxuXHRnZXRPcHQoeCwgZHAgPSBudWxsKSB7XG5cdFx0bGV0IGEgPSB0aGlzLm9wdGlvbnNbeF07XG5cdFx0aWYgKHR5cGVvZihhKSA9PSAnZnVuY3Rpb24nKSByZXR1cm4gYShkcCk7XG5cdFx0ZWxzZSByZXR1cm4gYTtcblx0fVxufVxuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIGVtYmVkZGluZ3MgdGhhdCByZW5kZXIgRGF0YXBvaW50cyBhcyBpbmRpdmlkdWFsIG1lc2hlc1xuICovXG5leHBvcnQgY2xhc3MgTWVzaEVtYmVkZGluZyBleHRlbmRzIEVtYmVkZGluZyB7XG5cdGNvbnN0cnVjdG9yKHNjZW5lLCBkYXRhc2V0LCBvcHRpb25zPXt9KSB7XG5cdFx0b3B0aW9ucyA9IGFzc2lnbihcblx0XHRcdHtcblx0XHRcdFx0bWF0ZXJpYWw6IG5ldyBUSFJFRS5NZXNoU3RhbmRhcmRNYXRlcmlhbCgge1xuXHRcdFx0XHRcdGNvbG9yOiAweGZmMDBmZixcblx0XHRcdFx0XHRlbWlzc2l2ZTogMHgwNzI1MzQsXG5cdFx0XHRcdFx0c2lkZTogVEhSRUUuRG91YmxlU2lkZSxcblx0XHRcdFx0XHRzaGFkaW5nOiBUSFJFRS5GbGF0U2hhZGluZ1xuXHRcdFx0XHR9IClcblx0XHRcdH0sIG9wdGlvbnMpO1xuXHRcdHN1cGVyKHNjZW5lLCBkYXRhc2V0LCBvcHRpb25zKTtcblx0fVxuXG5cblx0LyoqXG5cdCAqIEEgZGVmYXVsdCBtZXNoIGNyZWF0b3I7IHRoaXMgY2FuIGJlIG92ZXJyaWRlbiBieSBzdWJjbGFzc2VzIFxuXHQgKi9cblx0Y3JlYXRlTWVzaEZvckRhdGFwb2ludChkcCkge1xuXHRcdGxldCBnZW8gPSBuZXcgVEhSRUUuQm94R2VvbWV0cnkoXG5cdFx0XHR0aGlzLmdldE9wdChcIm1lc2hTaXplWFwiLCBkcCksIHRoaXMuZ2V0T3B0KFwibWVzaFNpemVZXCIsIGRwKSwgdGhpcy5nZXRPcHQoXCJtZXNoU2l6ZVpcIiwgZHApKTtcblx0XHRsZXQgbWF0ID0gdGhpcy5nZXRPcHQoJ21hdGVyaWFsJykuY2xvbmUoKTtcblx0XHRyZXR1cm4gbmV3IFRIUkVFLk1lc2goZ2VvLCBtYXQpO1xuXHR9XG59XG5cbi8qKlxuICogQmFzZSBjbGFzcyBmb3IgZW1iZWRkaW5nIGJhY2tlZCBieSBhIFBvaW50cyBvYmplY3QgKGkuZS4sIHBhcnRpY2xlIGNsb3VkcylcbiAqL1xuZXhwb3J0IGNsYXNzIFBvaW50c0VtYmVkZGluZyBleHRlbmRzIEVtYmVkZGluZyB7XG5cdGNvbnN0cnVjdG9yKHNjZW5lLCBkYXRhc2V0LCBvcHRpb25zPXt9KSB7XG5cdFx0b3B0aW9ucyA9IGFzc2lnbihcblx0XHRcdHsgXG5cdFx0XHRcdHBvaW50VHlwZTogXCJiYWxsXCIsXG5cdFx0XHRcdHBvaW50U2l6ZTogMC4yLFxuXHRcdFx0XHRwb2ludENvbG9yOiAweGZmZmZmZlxuXHRcdFx0fSwgb3B0aW9ucyk7XG5cdFx0c3VwZXIoc2NlbmUsIGRhdGFzZXQsIG9wdGlvbnMpO1xuXG5cdFx0Ly8gVE9ETyBiYXNlNjQgZW5jb2RlIGFuZCByZWFkIGZyb20gc3RyaW5nXG5cdFx0bGV0IHNwcml0ZSA9IG5ldyBUSFJFRS5UZXh0dXJlTG9hZGVyKCkubG9hZChcblx0XHRcdFwiaHR0cHM6Ly9yYXdnaXQuY29tL2JlYXVjcm9uaW4vZW1iZWRkaW5nL21hc3Rlci9zdGF0aWMvc3ByaXRlcy9iYWxsLnBuZ1wiKTtcblx0XHRsZXQgbWF0ZXJpYWxQcm9wcyA9IHtcblx0XHRcdHNpemU6IHRoaXMuZ2V0T3B0KFwicG9pbnRTaXplXCIpLFxuXHRcdFx0c2l6ZUF0dGVudWF0aW9uOiB0cnVlLFxuXHRcdFx0bWFwOiBzcHJpdGUsXG5cdFx0XHRjb2xvcjogdGhpcy5nZXRPcHQoXCJwb2ludENvbG9yXCIpLFxuXHRcdFx0YWxwaGFUZXN0OiAwLjUsXG5cdFx0XHR0cmFuc3BhcmVudDogdHJ1ZVxuXHRcdH1cblx0XHR0aGlzLnBvaW50cyA9IG5ldyBUSFJFRS5Qb2ludHMoXG5cdFx0XHRuZXcgVEhSRUUuR2VvbWV0cnkoKSwgbmV3IFRIUkVFLlBvaW50c01hdGVyaWFsKG1hdGVyaWFsUHJvcHMpKTtcblx0XHR0aGlzLnBvaW50cy5nZW9tZXRyeS52ZXJ0aWNlcy5wdXNoKG5ldyBUSFJFRS5WZWN0b3IzKDAsMCwwKSk7XG5cdFx0dGhpcy5vYmozRC5hZGQodGhpcy5wb2ludHMpO1xuXHR9XG59XG5cbi8qKlxuICogQW4gZW1iZWRkaW5nIGluIHdoaWNoIGVhY2ggZGF0YXBvaW50IGlzIHJlbmRlcmVkIGFzIGEgdmVydGV4IGluIGEgVEhSRUUuUG9pbnRzIG9iamVjdC5cbiAqL1xuZXhwb3J0IGNsYXNzIFNjYXR0ZXJFbWJlZGRpbmcgZXh0ZW5kcyBQb2ludHNFbWJlZGRpbmcge1xuXHRjb25zdHJ1Y3RvcihzY2VuZSwgZGF0YXNldCwgb3B0aW9ucz17fSkge1xuXHRcdG9wdGlvbnMgPSBhc3NpZ24oIFxuXHRcdFx0eyBcblx0XHRcdFx0YnVmZmVyU2l6ZTogMTAwMCxcblx0XHRcdFx0bW92ZVNwZWVkOiAyLFxuXHRcdFx0XHRhdXRvU2NhbGU6IGZhbHNlLFxuXHRcdFx0XHRhdXRvU2NhbGVSYW5nZTogMTBcblx0XHRcdH0sIG9wdGlvbnMpO1xuXHRcdHN1cGVyKHNjZW5lLCBkYXRhc2V0LCBvcHRpb25zKVxuXHRcdFxuXHRcdC8vIG1hcHBpbmcgZnJvbSBkYXRhcG9pbnQgaWRzIHRvIHZlcnRleCBpbmRpY2VzXG5cdFx0dGhpcy5kcE1hcCA9IHt9XG5cblx0XHQvLyB1bmFsbG9jYXRlZCB2ZXJ0aWNlcyBcblx0XHR0aGlzLmZyZWVWZXJ0aWNlcyA9IFtdO1xuXHRcdFxuXHRcdC8vIGluaXRpYWxpemUgdmVydGljZXMgYW5kIG1hcmsgdGhlbSBhcyB1bmFsbG9jYXRlZFxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5nZXRPcHQoXCJidWZmZXJTaXplXCIpOyBpKyspIHtcblx0XHRcdHRoaXMucG9pbnRzLmdlb21ldHJ5LnZlcnRpY2VzLnB1c2goXG5cdFx0XHRcdG5ldyBUSFJFRS5WZWN0b3IzKC0xMDAwMDAwLCAtMTAwMDAwMCwgLTEwMDAwMDApKTtcblx0XHRcdHRoaXMuZnJlZVZlcnRpY2VzLnB1c2goaSk7XG5cdFx0fVxuXG5cdFx0Ly8gY3JlYXRlIHJlc2NhbGluZ1xuXHRcdGlmICh0aGlzLmdldE9wdChcImF1dG9TY2FsZVwiKSkge1xuXHRcdFx0dGhpcy5faW5pdEF1dG9TY2FsZSh0aGlzLmdldE9wdChcImF1dG9TY2FsZVJhbmdlXCIpKTtcblx0XHRcdGNvbnNvbGUubG9nKHRoaXMucmVzY2FsZSk7XG5cdFx0fSBlbHNlIGlmICh0aGlzLmdldE9wdChcInJlc2NhbGVcIikpIHtcblx0XHRcdC8vIFRPRE9cblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5yZXNjYWxlID0gbmV3IFJlc2NhbGluZygpO1xuXHRcdH1cblxuXHRcdHRoaXMudHdlZW5zID0ge307XG5cdH1cblxuXHRfaW5pdEF1dG9TY2FsZShyYW5nZSkge1xuXHRcdGxldCBkcHMgPSB0aGlzLmRhdGFzZXQuZ2V0SWRzKCkubWFwKChpZCkgPT4gdGhpcy5kYXRhc2V0LmdldChpZCkpXG5cdFx0bGV0IHhtaW4gPSBNYXRoLm1pbi5hcHBseShNYXRoLCBkcHMubWFwKChkcCkgPT4gZHAuZ2V0KHRoaXMuX21hcEF0dHIoJ3gnKSkpKVxuXHRcdGxldCB4bWF4ID0gTWF0aC5tYXguYXBwbHkoTWF0aCwgZHBzLm1hcCgoZHApID0+IGRwLmdldCh0aGlzLl9tYXBBdHRyKCd4JykpKSlcblx0XHRsZXQgeW1pbiA9IE1hdGgubWluLmFwcGx5KE1hdGgsIGRwcy5tYXAoKGRwKSA9PiBkcC5nZXQodGhpcy5fbWFwQXR0cigneScpKSkpXG5cdFx0bGV0IHltYXggPSBNYXRoLm1heC5hcHBseShNYXRoLCBkcHMubWFwKChkcCkgPT4gZHAuZ2V0KHRoaXMuX21hcEF0dHIoJ3knKSkpKVxuXHRcdGxldCB6bWluID0gTWF0aC5taW4uYXBwbHkoTWF0aCwgZHBzLm1hcCgoZHApID0+IGRwLmdldCh0aGlzLl9tYXBBdHRyKCd6JykpKSlcblx0XHRsZXQgem1heCA9IE1hdGgubWF4LmFwcGx5KE1hdGgsIGRwcy5tYXAoKGRwKSA9PiBkcC5nZXQodGhpcy5fbWFwQXR0cigneicpKSkpXG5cdFx0dGhpcy5yZXNjYWxlID0gbmV3IFJlc2NhbGluZyhcblx0XHRcdC0gKHhtYXggKyB4bWluKSAvIDIsXG5cdFx0XHQtICh5bWF4ICsgeW1pbikgLyAyLFxuXHRcdFx0LSAoem1heCArIHptaW4pIC8gMixcblx0XHRcdHJhbmdlIC8gKHhtYXggLSB4bWluKSxcblx0XHRcdHJhbmdlIC8gKHltYXggLSB5bWluKSxcblx0XHRcdHJhbmdlIC8gKHptYXggLSB6bWluKVxuXHRcdFx0KVxuXHR9XG5cblx0ZW1iZWQoKSB7XG5cdFx0aWYgKCEgdGhpcy5pbml0aWFsaXplZCkge1xuXHRcdFx0Ly8gYWRkIGFsbCBkYXRhcG9pbnRzIGFscmVhZHkgaW4gdGhlIGRhdGFzZXRcblx0XHRcdGZvciAobGV0IGlkIGluIHRoaXMuZGF0YXNldC5kYXRhcG9pbnRzKSB7XG5cdFx0XHRcdHRoaXMuX3BsYWNlRGF0YXBvaW50KGlkKTtcblx0XHRcdH1cblx0XHRcdHRoaXMucG9pbnRzLmdlb21ldHJ5LnZlcnRpY2VzTmVlZFVwZGF0ZSA9IHRydWU7XG5cdFx0XHR0aGlzLmluaXRpYWxpemVkID0gdHJ1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gcHJvY2VzcyBldmVudHMgc2VudCBieSB0aGUgZGF0YXNldCBzaW5jZSBsYXN0IGVtYmVkKCkgY2FsbFxuXHRcdFx0aWYgKHRoaXMuZXZlbnRzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0Zm9yIChsZXQgaSBpbiB0aGlzLmV2ZW50cykge1xuXHRcdFx0XHRcdGxldCBlID0gdGhpcy5ldmVudHNbaV07XG5cdFx0XHRcdFx0aWYgICAgICAoZS50eXBlID09IFwiYWRkXCIpICAgIHRoaXMuX3BsYWNlRGF0YXBvaW50KGUuaWQpO1xuXHRcdFx0XHRcdGVsc2UgaWYgKGUudHlwZSA9PSBcInJlbW92ZVwiKSB0aGlzLl9yZW1vdmVEYXRhcG9pbnQoZS5pZCk7XG5cdFx0XHRcdFx0ZWxzZSBpZiAoZS50eXBlID09IFwidXBkYXRlXCIpIHRoaXMuX3VwZGF0ZURhdGFwb2ludChlLmlkLCBlKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBjb25zb2xlLmxvZyhcImNhbGxpbmcgdmVydGljZXMgdXBkYXRlXCIpO1xuXHRcdFx0XHR0aGlzLnBvaW50cy5nZW9tZXRyeS52ZXJ0aWNlc05lZWRVcGRhdGUgPSB0cnVlO1x0XHRcdFxuXHRcdFx0fSBcblx0XHRcdHRoaXMuZXZlbnRzID0gW107XG5cdFx0fVxuXHR9XG5cblx0X3BsYWNlRGF0YXBvaW50KGlkKSB7XG5cdFx0bGV0IHZpID0gdGhpcy5mcmVlVmVydGljZXMucG9wKCk7XG5cdFx0aWYgKHZpICE9IHVuZGVmaW5lZCkge1xuXHRcdFx0bGV0IGRwICA9IHRoaXMuZGF0YXNldC5kYXRhcG9pbnRzW2lkXTtcblx0XHRcdGlmICghIGRwKSByZXR1cm47XG5cdFx0XHR0aGlzLnBvaW50cy5nZW9tZXRyeS52ZXJ0aWNlc1t2aV0uc2V0KFxuXHRcdFx0XHR0aGlzLnJlc2NhbGUuc2NhbGVYKHRoaXMuX21hcChkcCwgJ3gnKSksXG5cdFx0XHRcdHRoaXMucmVzY2FsZS5zY2FsZVkodGhpcy5fbWFwKGRwLCAneScpKSxcblx0XHRcdFx0dGhpcy5yZXNjYWxlLnNjYWxlWih0aGlzLl9tYXAoZHAsICd6JykpKTtcblx0XHRcdHRoaXMuZHBNYXBbaWRdID0gdmk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnNvbGUud2FybignVmVydGV4IGJ1ZmZlciBzaXplIGV4Y2VlZGVkJyk7XG5cdFx0fVxuXHR9XG5cblx0X3JlbW92ZURhdGFwb2ludChpZCkge1xuXHRcdGxldCB2aSA9IHRoaXMuZHBNYXBbaWRdO1xuXHRcdGlmICh2aSAhPSB1bmRlZmluZWQpIHtcblx0XHRcdHRoaXMucG9pbnRzLmdlb21ldHJ5LnZlcnRpY2VzW3ZpXS5zZXQoLTEwMDAwMDAsIC0xMDAwMDAwLCAtMTAwMDAwMCk7XG5cdFx0XHRkZWxldGUgdGhpcy5kcE1hcFtpZF07XG5cdFx0XHR0aGlzLmZyZWVWZXJ0aWNlcy5wdXNoKHZpKTtcblx0XHR9XG5cdH1cblxuXHRfdXBkYXRlRGF0YXBvaW50KGlkLCBldmVudCkge1xuXHRcdGxldCB2aSA9IHRoaXMuZHBNYXBbaWRdO1xuXHRcdGlmICh2aSAhPSB1bmRlZmluZWQpIHtcblx0XHRcdGxldCBkcCAgPSB0aGlzLmRhdGFzZXQuZGF0YXBvaW50c1tpZF07XG5cdFx0XHRpZiAoISBkcCkgcmV0dXJuO1xuXHRcdFx0Ly8gVE9ETyBvdGhlciBhdHRyaWJ1dGVzIGJlc2lkZSBwb3NpdGlvblxuXHRcdFx0bGV0IHYgPSB0aGlzLnBvaW50cy5nZW9tZXRyeS52ZXJ0aWNlc1t2aV07XG5cdFx0XHRcblx0XHRcdGxldCBzdGFydCA9IHsgeDogdi54LCB5OiB2LnksIHo6IHYueiB9O1xuXHRcdFx0bGV0IGVuZCA9IHsgXG5cdFx0XHRcdHg6IHRoaXMucmVzY2FsZS5zY2FsZVgodGhpcy5fbWFwKGRwLCAneCcpKSwgXG5cdFx0XHRcdHk6IHRoaXMucmVzY2FsZS5zY2FsZVkodGhpcy5fbWFwKGRwLCAneScpKSwgXG5cdFx0XHRcdHo6IHRoaXMucmVzY2FsZS5zY2FsZVoodGhpcy5fbWFwKGRwLCAneicpKSBcblx0XHRcdH07XG5cdFx0XHRsZXQgZCA9IChuZXcgVEhSRUUuVmVjdG9yMyhzdGFydC54LCBzdGFydC55LCBzdGFydC56KSlcblx0XHRcdFx0LnN1YihuZXcgVEhSRUUuVmVjdG9yMyhlbmQueCwgZW5kLnksIGVuZC56KSlcblx0XHRcdFx0Lmxlbmd0aCgpO1xuXHRcdFx0bGV0IHQgPSAxMDAwICogZCAvIHRoaXMuZ2V0T3B0KFwibW92ZVNwZWVkXCIsIGRwKTtcblx0XHRcdFxuXHRcdFx0dmFyIGdlbyA9IHRoaXMucG9pbnRzLmdlb21ldHJ5O1xuXHRcdFx0dmFyIG9iaiA9IHRoaXM7XG5cdFx0XHRpZiAodGhpcy50d2VlbnNbdmldKSB7XG5cdFx0XHRcdHRoaXMudHdlZW5zW3ZpXS5zdG9wKCk7XG5cdFx0XHRcdGRlbGV0ZSB0aGlzLnR3ZWVuc1t2aV07XG5cdFx0XHR9XG5cblx0XHRcdGxldCB0d2VlbiA9IG5ldyBUV0VFTi5Ud2VlbihzdGFydClcblx0XHRcdFx0LnRvKGVuZCwgdClcblx0XHRcdFx0Lm9uVXBkYXRlKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHYuc2V0KHRoaXMueCwgdGhpcy55LCB0aGlzLnopO1xuXHRcdFx0XHRcdGdlby52ZXJ0aWNlc05lZWRVcGRhdGUgPSB0cnVlO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub25Db21wbGV0ZSgoKSA9PiBkZWxldGUgb2JqLnR3ZWVuc1tpZF0pXG5cdFx0XHRcdC5vblN0b3AoKCkgPT4gZGVsZXRlIG9iai50d2VlbnNbaWRdKVxuXHRcdFx0XHQuZWFzaW5nKFRXRUVOLkVhc2luZy5FeHBvbmVudGlhbC5Jbk91dClcblx0XHRcdFx0LnN0YXJ0KCk7XG5cdFx0XHR0aGlzLnR3ZWVuc1t2aV0gPSB0d2Vlbjtcblx0XHR9XG5cdH1cbn1cblxuLyoqXG4gKiBBIHtNZXNoRW1iZWRkaW5nfSBpbiB3aGljaCBlYWNoIHtEYXRhcG9pbnR9IGlzIHJlbmRlcmVkIGFzIGEgTWVzaCB0aGF0IGZvbGxvd3MgYVxuICogcGF0aCBkZWZpbmVkIGJ5IHdheXBvaW50cy5cbiAqL1xuZXhwb3J0IGNsYXNzIFBhdGhFbWJlZGRpbmcgZXh0ZW5kcyBNZXNoRW1iZWRkaW5nIHtcblx0Y29uc3RydWN0b3Ioc2NlbmUsIGRhdGFzZXQsIHdheXBvaW50cywgb3B0aW9ucykge1xuXHRcdG9wdGlvbnMgPSBhc3NpZ24oe1xuXHRcdFx0bWVzaFNpemVYOiAuMixcblx0XHRcdG1lc2hTaXplWTogLjIsXG5cdFx0XHRtZXNoU2l6ZVo6IC4yLFxuXHRcdFx0cGF0aFdpZHRoWDogMCxcblx0XHRcdHBhdGhXaWR0aFk6IDAsXG5cdFx0XHRwYXRoV2lkdGhaOiAwLFxuXHRcdFx0ZGVzY3JpcHRpb246ICcnLFxuXHRcdFx0cmVtb3ZlQWZ0ZXI6IHRydWUsXG5cdFx0XHRwYXRoVGltZTogMTAwMDBcblx0XHR9LCBvcHRpb25zKTtcblx0XHRzdXBlcihzY2VuZSwgZGF0YXNldCwgb3B0aW9ucyk7XG5cdFx0dGhpcy53YXlwb2ludHMgPSB3YXlwb2ludHMubWFwKCh4KSA9PiBuZXcgVEhSRUUuVmVjdG9yMyh4WzBdLCB4WzFdLCB4WzJdKSk7XG5cblx0XHQvLyBtYXBwaW5nIGZyb20gZGF0YXBvaW50IGlkcyB0byBtZXNoZXNcblx0XHR0aGlzLmRwTWFwID0ge307XG5cdFx0dGhpcy5tZXNoT2Zmc2V0cyA9IHt9O1xuXHRcdHRoaXMudHdlZW5zID0ge307XG5cdH1cblxuXHRlbWJlZCgpIHtcblx0XHQvLyBub3RlOiBpZ25vcmUgZGF0YXBvaW50cyB0aGF0IGFyZSBhbHJlYWR5IHByZXNlbnQgaW4gdGhlIGRhdGFzZXRcblxuXHRcdC8vIHByb2Nlc3MgZXZlbnRzIHNlbnQgYnkgdGhlIGRhdGFzZXQgc2luY2UgbGFzdCBlbWJlZCgpIGNhbGxcblx0XHRpZiAodGhpcy5ldmVudHMubGVuZ3RoID4gMCkge1xuXHRcdFx0Zm9yIChsZXQgaSBpbiB0aGlzLmV2ZW50cykge1xuXHRcdFx0XHRsZXQgZSA9IHRoaXMuZXZlbnRzW2ldO1xuXHRcdFx0XHRpZiAgICAgIChlLnR5cGUgPT0gXCJhZGRcIikgICAgdGhpcy5fcGxhY2VEYXRhcG9pbnQoZS5pZCk7XG5cdFx0XHRcdGVsc2UgaWYgKGUudHlwZSA9PSBcInJlbW92ZVwiKSB0aGlzLl9yZW1vdmVEYXRhcG9pbnQoZS5pZCk7XG5cdFx0XHRcdGVsc2UgaWYgKGUudHlwZSA9PSBcInVwZGF0ZVwiKSB0aGlzLl91cGRhdGVEYXRhcG9pbnQoZS5pZCwgZSk7XG5cdFx0XHR9XG5cdFx0fSBcblx0XHR0aGlzLmV2ZW50cyA9IFtdO1x0XHRcblx0fVxuXG5cdF9jcmVhdGVNZXNoT2Zmc2V0KGlkKSB7XG5cdFx0bGV0IHB3eCA9IHRoaXMuZ2V0T3B0KCdwYXRoV2lkdGhYJyk7XG5cdFx0bGV0IHB3eSA9IHRoaXMuZ2V0T3B0KCdwYXRoV2lkdGhZJyk7XG5cdFx0bGV0IHB3eiA9IHRoaXMuZ2V0T3B0KCdwYXRoV2lkdGhaJyk7XG5cdFx0bGV0IG94ID0gcHd4ICogTWF0aC5yYW5kb20oKSAtIHB3eCAvIDI7XG5cdFx0bGV0IG95ID0gcHd5ICogTWF0aC5yYW5kb20oKSAtIHB3eSAvIDI7XG5cdFx0bGV0IG96ID0gcHd6ICogTWF0aC5yYW5kb20oKSAtIHB3eiAvIDI7XG5cdFx0dGhpcy5tZXNoT2Zmc2V0c1tpZF0gPSBuZXcgVEhSRUUuVmVjdG9yMyhveCwgb3ksIG96KTtcblx0fVxuXG5cdF9wbGFjZURhdGFwb2ludChpZCkge1xuXHRcdGxldCBkcCAgPSB0aGlzLmRhdGFzZXQuZGF0YXBvaW50c1tpZF07XG5cdFx0bGV0IG1lc2ggPSB0aGlzLmNyZWF0ZU1lc2hGb3JEYXRhcG9pbnQoZHApO1xuXHRcdHRoaXMuX2NyZWF0ZU1lc2hPZmZzZXQoaWQpO1xuXHRcdG1lc2gudXNlckRhdGEuZGVzY3JpcHRpb24gPSB0aGlzLmdldE9wdChcImRlc2NyaXB0aW9uXCIsIGRwKTtcblx0XHR0aGlzLmRwTWFwW2lkXSA9IG1lc2g7XG5cdFx0dGhpcy5vYmozRC5hZGQobWVzaCk7XG5cdFx0VEhSRUUuaW5wdXQuYWRkKG1lc2gpO1xuXG5cdFx0Ly8gY3JlYXRlIHBhdGggdHdlZW5cblx0XHRsZXQgc3RhcnQgPSB7IHg6IHRoaXMud2F5cG9pbnRzWzBdLngsIHk6IHRoaXMud2F5cG9pbnRzWzBdLnksIHo6IHRoaXMud2F5cG9pbnRzWzBdLnogfVxuXHRcdGxldCBlbmQgPSB7XG5cdFx0XHR4OiB0aGlzLndheXBvaW50cy5zbGljZSgxKS5tYXAoKGEpID0+IGEueCksXG5cdFx0XHR5OiB0aGlzLndheXBvaW50cy5zbGljZSgxKS5tYXAoKGEpID0+IGEueSksXG5cdFx0XHR6OiB0aGlzLndheXBvaW50cy5zbGljZSgxKS5tYXAoKGEpID0+IGEueilcblx0XHR9XG5cdFx0bGV0IHQgPSB0aGlzLmdldE9wdChcInBhdGhUaW1lXCIpO1xuXHRcdHZhciBvYmogPSB0aGlzO1xuXHRcdGxldCB0d2VlbiA9IG5ldyBUV0VFTi5Ud2VlbihzdGFydClcblx0XHRcdC50byhlbmQsIHQpXG5cdFx0XHQuaW50ZXJwb2xhdGlvbiggVFdFRU4uSW50ZXJwb2xhdGlvbi5DYXRtdWxsUm9tIClcblx0XHRcdC5vblVwZGF0ZShmdW5jdGlvbigpIHtcblx0XHRcdFx0Ly8ga2VlcCB0aGUgeC1heGlzIG9mIHRoZSBtZXNoIHRhbmdlbnQgdG8gdGhlIHBhdGggYXMgaXQgbW92ZXNcblx0XHRcdFx0bGV0IG9sZFBvcyA9IG1lc2gucG9zaXRpb24uY2xvbmUoKTtcblx0XHRcdFx0bGV0IG5ld1BvcyA9IG5ldyBUSFJFRS5WZWN0b3IzKHRoaXMueCwgdGhpcy55LCB0aGlzLnopO1xuXHRcdFx0XHRsZXQgZGlyID0gbmV3UG9zLnN1YihvbGRQb3MpLm5vcm1hbGl6ZSgpO1xuXHRcdFx0XHRsZXQgYXhpcyA9IG5ldyBUSFJFRS5WZWN0b3IzKDEsIDAsIDApO1xuXHRcdFx0XHRsZXQgb2Zmc2V0ID0gb2JqLm1lc2hPZmZzZXRzW2lkXVxuXHRcdFx0XHRtZXNoLnBvc2l0aW9uLnNldCh0aGlzLnggKyBvZmZzZXQueCwgdGhpcy55ICsgb2Zmc2V0LnksIHRoaXMueiArIG9mZnNldC56KTtcblx0XHRcdFx0Ly8gbWVzaC5wb3NpdGlvbi5zZXQodGhpcy54LCB0aGlzLnksIHRoaXMueik7XG5cdFx0XHRcdG1lc2gucXVhdGVybmlvbi5zZXRGcm9tVW5pdFZlY3RvcnMoYXhpcywgZGlyKTtcblx0XHRcdH0pXG5cdFx0XHQub25Db21wbGV0ZShmdW5jdGlvbigpIHtcblx0XHRcdFx0ZGVsZXRlIG9iai50d2VlbnNbaWRdO1xuXHRcdFx0XHRpZiAob2JqLmdldE9wdChcInJlbW92ZUFmdGVyXCIpKSBvYmoub2JqM0QucmVtb3ZlKG1lc2gpO1xuXHRcdFx0fSlcblx0XHRcdC5vblN0b3AoKCkgPT4gZGVsZXRlIG9iai50d2VlbnNbaWRdKVxuXHRcdFx0LnN0YXJ0KCk7XG5cdFx0dGhpcy50d2VlbnNbaWRdID0gdHdlZW47XG5cdH1cblxuXHRfcmVtb3ZlRGF0YXBvaW50KGlkKSB7XG5cdFx0aWYgKHRoaXMudHdlZW5zW2lkXSkgdGhpcy50d2VlbnNbaWRdLnN0b3AoKTtcblx0XHRsZXQgbWVzaCA9IHRoaXMuZHBNYXBbaWRdO1xuXHRcdGlmIChtZXNoKSB0aGlzLm9iajNELnJlbW92ZShtZXNoKTtcblx0fVxuXG5cdF91cGRhdGVEYXRhcG9pbnQoaWQsIGV2ZW50KSB7XG5cdFx0Ly8gVE9ETyBpbXBsZW1lbnRcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgQ29uc29sZUVtYmVkZGluZyBleHRlbmRzIEVtYmVkZGluZyB7XG5cdGNvbnN0cnVjdG9yKHNjZW5lLCBkYXRhc2V0LCBvcHRpb25zPXt9KSB7XG5cdFx0b3B0aW9ucyA9IGFzc2lnbih7XG5cdFx0XHRmb250OiBcIkJvbGQgMjRweCBBcmlhbFwiLFxuXHRcdFx0ZmlsbFN0eWxlOiBcInJnYmEoMjU1LDAsMCwwLjk1KVwiXG5cdFx0fSwgb3B0aW9ucyk7XG5cdFx0c3VwZXIoc2NlbmUsIGRhdGFzZXQsIG9wdGlvbnMpO1xuXHRcdHRoaXMuY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdFx0dGhpcy5jYW52YXMud2lkdGggPSAyNTY7XG5cdFx0dGhpcy5jYW52YXMuaGVpZ2h0ID0gMTI4O1xuXHRcdHRoaXMuY29udGV4dCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG5cdFx0dGhpcy5jb250ZXh0LmZvbnQgPSB0aGlzLmdldE9wdCgnZm9udCcpO1xuXHRcdHRoaXMuY29udGV4dC5maWxsU3R5bGUgPSB0aGlzLmdldE9wdCgnZmlsbFN0eWxlJyk7XG5cdFx0dGhpcy5tZXNoID0gdW5kZWZpbmVkO1xuXHR9XG5cblx0c2V0VGV4dCh0ZXh0KSB7XG5cdFx0aWYgKHRoaXMubWVzaClcblx0XHRcdHRoaXMub2JqM0QucmVtb3ZlKHRoaXMubWVzaClcblxuXHRcdHRoaXMuY29udGV4dC5jbGVhclJlY3QoMCwgMCwgdGhpcy5jYW52YXMud2lkdGgsIHRoaXMuY2FudmFzLmhlaWdodCk7XG5cdFx0dGhpcy5jb250ZXh0LmZpbGxUZXh0KHRleHQsIDAsIDI1KTtcblx0XHRsZXQgdGV4dHVyZSA9IG5ldyBUSFJFRS5UZXh0dXJlKHRoaXMuY2FudmFzKTtcblx0XHR0ZXh0dXJlLm5lZWRzVXBkYXRlID0gdHJ1ZTtcblx0XHRsZXQgbWF0ZXJpYWwgPSBuZXcgVEhSRUUuTWVzaEJhc2ljTWF0ZXJpYWwoeyBtYXA6IHRleHR1cmUsIHNpZGU6IFRIUkVFLkRvdWJsZVNpZGUgfSk7XG5cdFx0bWF0ZXJpYWwudHJhbnNwYXJlbnQgPSB0cnVlO1xuXHRcdHRoaXMubWVzaCA9IG5ldyBUSFJFRS5NZXNoKFxuXHRcdFx0bmV3IFRIUkVFLlBsYW5lR2VvbWV0cnkodGhpcy5jYW52YXMud2lkdGggKiAuMSwgdGhpcy5jYW52YXMuaGVpZ2h0ICogLjEpLFxuXHRcdFx0bWF0ZXJpYWxcblx0XHQpO1xuXHRcdHRoaXMubWVzaC5wb3NpdGlvbi5zZXQodGhpcy5nZXRPcHQoJ3gnKSwgdGhpcy5nZXRPcHQoJ3knKSwgdGhpcy5nZXRPcHQoJ3onKSk7XG5cdFx0dGhpcy5vYmozRC5hZGQodGhpcy5tZXNoKTtcblx0fVxufVxuXG5leHBvcnQgY2xhc3MgQWdncmVnYXRlRW1iZWRkaW5nIGV4dGVuZHMgRW1iZWRkaW5nIHtcblxufVxuXG5jbGFzcyBSZXNjYWxpbmcge1xuXHRjb25zdHJ1Y3Rvcih4bz0wLCB5bz0wLCB6bz0wLCB4cz0xLCB5cz0xLCB6cz0xKSB7XG5cdFx0aWYgKHR5cGVvZih4bykgPT0gXCJudW1iZXJcIikge1xuXHRcdFx0dGhpcy54byA9IHhvO1xuXHRcdFx0dGhpcy55byA9IHlvO1xuXHRcdFx0dGhpcy56byA9IHpvO1xuXHRcdFx0dGhpcy54cyA9IHhzO1xuXHRcdFx0dGhpcy55cyA9IHlzO1xuXHRcdFx0dGhpcy56cyA9IHpzO1xuXHRcdH1cblx0fVxuXG5cdHNjYWxlWCh4KSB7XG5cdFx0cmV0dXJuIHRoaXMueHMqKHggKyB0aGlzLnhvKTtcblx0fVxuXG5cdHNjYWxlWSh5KSB7XG5cdFx0cmV0dXJuIHRoaXMueXMqKHkgKyB0aGlzLnlvKTtcblx0fVxuXG5cdHNjYWxlWih6KSB7XG5cdFx0cmV0dXJuIHRoaXMuenMqKHogKyB0aGlzLnpvKTtcblx0fVxufSIsIid1c2Ugc3RyaWN0J1xuXG4vKipcbiAqIEBhdXRob3IgQmVhdSBDcm9uaW4gPGJlYXUuY3JvbmluQGdtYWlsLmNvbT5cbiAqL1xuXG5pbXBvcnQgUmF5SW5wdXQgZnJvbSAncmF5LWlucHV0JztcbmltcG9ydCBUV0VFTiBmcm9tICd0d2Vlbi5qcyc7XG5pbXBvcnQgcXVlcnlTdHJpbmcgZnJvbSAncXVlcnktc3RyaW5nJztcbmltcG9ydCB7XG5cdFdlYlNvY2tldERhdGFzZXQsIFxuXHREYXRhc2V0XG59IGZyb20gJy4vZGF0YXNldC5qcyc7XG5pbXBvcnQge1xuXHRFbWJlZGRpbmcsXG5cdE1lc2hFbWJlZGRpbmcsXG5cdFJhbmRvbUVtYmVkZGluZyxcblx0U2NhdHRlckVtYmVkZGluZyxcblx0UGF0aEVtYmVkZGluZyxcblx0Q29uc29sZUVtYmVkZGluZ1xufSBmcm9tICcuL2VtYmVkZGluZy5qcyc7XG5pbXBvcnQgeyBkZXRlY3RNb2RlIH0gZnJvbSAnLi9kZXRlY3Rpb24tdXRpbHMuanMnO1xuaW1wb3J0IHtcblx0bGF0TG9uZ1RvRXVjbGlkZWFuLFxuXHRkZWdUb1JhZCxcblx0YWpheFdpdGhDYWxsYmFja1xufSBmcm9tICcuL3V0aWxzLmpzJztcblxudmFyIGVtYmVkZGluZ3MgPSBbXTtcbnZhciBsYXN0UmVuZGVyID0gMDtcbnZhciB2ckRpc3BsYXk7XG5cbi8qKlxuICogQ29udmVuaWVuY2UgZnVuY3Rpb24gdG8gY3JlYXRlIGEgcmVzcG9uc2l2ZSBUSFJFRSBzY2VuZSBhbmQgcmVsYXRlZCBvYmplY3RzLiBSZXR1cm5zIGEgbnVtYmVyIFxuICogb2Ygb2JqZWN0cyB0aGF0IHNob3VsZCBwcm9iYWJseSBiZSBrZXB0IGFyb3VuZCBieSB0aGUgZW5jbG9zaW5nIHNjcmlwdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluaXRTY2VuZSgpIHtcblx0Y29uc3Qgc2NlbmUgPSBuZXcgVEhSRUUuU2NlbmUoKTtcblx0Y29uc3QgY2FtZXJhID0gbmV3IFRIUkVFLlBlcnNwZWN0aXZlQ2FtZXJhKCA3NSwgd2luZG93LmlubmVyV2lkdGggLyB3aW5kb3cuaW5uZXJIZWlnaHQsIDEsIDEwMDAwICk7XG5cdGNhbWVyYS5wb3NpdGlvbi56ID0gMTA7XG5cdFxuXHQvLyBUaGUgVlJDb250cm9scyBvYmplY3QgdXBkYXRlcyB0aGUgY2FtZXJhIHBvc2l0aW9uIGluIHJlc3BvbnNlIHRvIHBvc2l0aW9uIGFuZCBvcmllbnRhdGlvblxuXHQvLyBjaGFuZ2VzIG9mIHRoZSBITUQuXG5cdGNvbnN0IGNhbWVyYUNvbnRyb2xzID0gbmV3IFRIUkVFLlZSQ29udHJvbHMoY2FtZXJhKTtcblx0Y2FtZXJhQ29udHJvbHMuc3RhbmRpbmcgPSB0cnVlO1xuXG5cdC8vIFRoaXMgcmVuZGVyZXIgaXMgdGhlIHN0YW5kYXJkIFdlYkdMIHJlbmRlcmVyOyBpdCBtYXkgYmUgZnVydGhlciBwcm9jZXNzZWQgZm9yIFZSIHVzZSBkZXBlbmRpbmdcblx0Ly8gb24gdGhlIG1vZGUgc2VsZWN0ZWQgYnkgdGhlIHdlYnZyLWJvaWxlcnBsYXRlXG5cdGNvbnN0IHJlbmRlcmVyID0gbmV3IFRIUkVFLldlYkdMUmVuZGVyZXIoKTtcblx0cmVuZGVyZXIuc2V0U2l6ZSggd2luZG93LmlubmVyV2lkdGgsIHdpbmRvdy5pbm5lckhlaWdodCApO1xuXHRyZW5kZXJlci5zZXRQaXhlbFJhdGlvKHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvKTtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKCByZW5kZXJlci5kb21FbGVtZW50ICk7XG4gICAgXG4gICAgLy8gVGhlIFZSRWZmZWN0IGlzIHJlc3BvbnNpYmxlIGZvciBkaXN0b3J0aW5nIHRoZSByZW5kZXJlZCBpbWFnZSB0byBtYXRjaCB0aGUgb3B0aWNzIG9mIHRoZSBITUQsXG4gICAgLy8gYXMgd2VsbCBhcyByZW5kZXJpbmcgZGlmZmVyZW50LCBvZmZzZXQgaW1hZ2VzIGZvciBlYWNoIGV5ZVxuICAgIGNvbnN0IGVmZmVjdCA9IG5ldyBUSFJFRS5WUkVmZmVjdChyZW5kZXJlcik7XG5cdGVmZmVjdC5zZXRTaXplKCB3aW5kb3cuaW5uZXJXaWR0aCwgd2luZG93LmlubmVySGVpZ2h0ICk7XG5cblx0Ly8gVGhlIFdlYlZSTWFuYWdlciBpcyBwcm92aWRlZCBieSB0aGUgd2VidnItYm9pbGVycGxhdGUsIGFuZCBoYW5kbGVzIGRldGVjdGlvbiBvZiBkaXNwbGF5IGhhcmR3YXJlXG5cdC8vIChkZXNrdG9wLCBtb2JpbGUsIFZSKSBhbmQgc3dpdGNoaW5nIGJldHdlZW4gcmVndWxhciBhbmQgVlIgbW9kZXNcblx0Y29uc3QgbWFuYWdlciA9IG5ldyBXZWJWUk1hbmFnZXIocmVuZGVyZXIsIGVmZmVjdCk7XG5cblx0dmFyIG9uUmVzaXplID0gZnVuY3Rpb24oZSkge1xuXHQgIGVmZmVjdC5zZXRTaXplKHdpbmRvdy5pbm5lcldpZHRoLCB3aW5kb3cuaW5uZXJIZWlnaHQpO1xuXHQgIGNhbWVyYS5hc3BlY3QgPSB3aW5kb3cuaW5uZXJXaWR0aCAvIHdpbmRvdy5pbm5lckhlaWdodDtcblx0ICBjYW1lcmEudXBkYXRlUHJvamVjdGlvbk1hdHJpeCgpO1xuXHR9XG5cblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIG9uUmVzaXplLCB0cnVlKTtcblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3ZyZGlzcGxheXByZXNlbnRjaGFuZ2UnLCBvblJlc2l6ZSwgdHJ1ZSk7XG5cbiAgICAvLyBUT0RPIHB1dHRpbmcgdGhlIGlucHV0IGluIHRoZSBUSFJFRSBnbG9iYWwgZm9yIG5vdzsgcHJvYmFibHkgd2FudCBlbWJlZGRpbmdzIHRvIGZpcmUgXG4gICAgLy8gZXZlbnRzIHdoZW4gbWVzaGVzIGFyZSBhZGRlZC9yZW1vdmVkIHJhdGhlciB0aGFuIHJlZmVyZW5jaW5nIHRoZSBpbnB1dCBkaXJlY3RseVxuXHRUSFJFRS5pbnB1dCA9IG5ldyBSYXlJbnB1dChjYW1lcmEsIHJlbmRlcmVyLmRvbUVsZW1lbnQpO1xuXHRUSFJFRS5pbnB1dC5zZXRTaXplKHJlbmRlcmVyLmdldFNpemUoKSk7XG5cdHNjZW5lLmFkZChUSFJFRS5pbnB1dC5nZXRNZXNoKCkpO1xuXG4gICAgcmV0dXJuIHsgc2NlbmUsIGNhbWVyYSwgbWFuYWdlciwgZWZmZWN0LCBjYW1lcmFDb250cm9scyB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnRBbmltYXRpb24oKSB7XG5cdC8vIE5PVEU6IGFzc3VtZXMgdGhlIHdlYnZyIHBvbHlmaWxsIGlzIHByZXNlbnQsIHNvIGNhbiBjb3VudCBvbiBhIHZhbGlkIGRpc3BsYXlcblx0bmF2aWdhdG9yLmdldFZSRGlzcGxheXMoKS50aGVuKGZ1bmN0aW9uKGRpc3BsYXlzKSB7XG5cdCAgICBpZiAoZGlzcGxheXMubGVuZ3RoID4gMCkge1xuXHQgICAgICBcdHZyRGlzcGxheSA9IGRpc3BsYXlzWzBdO1xuXHQgICAgICBcdHZyRGlzcGxheS5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG5cdCAgICB9XG5cdH0pO1xufVxuXG4vKipcbiAqIFRoZSBjb3JlIGFuaW1hdGlvbiBjYWxsIHRoYXQgaXMgZXhlY3V0ZWQgZm9yIGVhY2ggZnJhbWUuIFVwZGF0ZXMgYWxsIHJlZ2lzdGVyZWRcbiAqIGVtYmVkZGluZ3MsIHRoZSBwb2ludGVyIGNvbnRyb2xzLCBhbmQgdGhlIGNhbWVyYSBwb3NpdGlvbi4gUmVuZGVycyB0aGUgc2NlbmVcbiAqIHVzaW5nIHRoZSBXZWJWUk1hbmFnZXIsIHdoaWNoIGFwcGxpZXMgdGhlIFZSRWZmZWN0IGlmIGluIFZSIG1vZGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhbmltYXRlKHRpbWVzdGFtcCkge1xuXHRpZiAoISB0aW1lc3RhbXApIHRpbWVzdGFtcCA9IERhdGUubm93KCk7XG5cdHZhciBkZWx0YSA9IE1hdGgubWluKHRpbWVzdGFtcCAtIGxhc3RSZW5kZXIsIDUwMCk7XG4gIFx0bGFzdFJlbmRlciA9IHRpbWVzdGFtcDtcblxuICBcdGZvciAobGV0IGUgb2YgZW1iZWRkaW5ncykge1xuXHRcdGUuZW1iZWQoKTtcbiAgXHR9XG4gIFx0VFdFRU4udXBkYXRlKCk7XG5cdFRIUkVFLmlucHV0LnVwZGF0ZSgpO1xuICAgIGNhbWVyYUNvbnRyb2xzLnVwZGF0ZSgpO1xuICAgIG1hbmFnZXIucmVuZGVyKCBzY2VuZSwgY2FtZXJhLCB0aW1lc3RhbXAgKTtcblxuICAgIHZyRGlzcGxheS5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIGFuaW1hdGUgKTtcbn1cblxuLyoqXG4gKiBSZWdpc3RlciBhbiBlbWJlZGRpbmcgc28gdGhhdCBpdCB3aWxsIGJlIHVwZGF0ZWQgb24gZWFjaCBhbmltYXRpb24gZnJhbWUuXG4gKiBAcGFyYW0ge0VtYmVkZGluZ30gZW1iZWRkaW5nIC0gVGhlIGVtYmVkZGluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXIoZW1iZWRkaW5nKSB7XG5cdGVtYmVkZGluZ3MucHVzaChlbWJlZGRpbmcpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0RGF0YXNldDogRGF0YXNldCxcblx0V2ViU29ja2V0RGF0YXNldDogV2ViU29ja2V0RGF0YXNldCxcblx0RW1iZWRkaW5nOiBFbWJlZGRpbmcsXG5cdE1lc2hFbWJlZGRpbmc6IE1lc2hFbWJlZGRpbmcsXG5cdFJhbmRvbUVtYmVkZGluZzogUmFuZG9tRW1iZWRkaW5nLFxuXHRTY2F0dGVyRW1iZWRkaW5nOiBTY2F0dGVyRW1iZWRkaW5nLFxuXHRQYXRoRW1iZWRkaW5nOiBQYXRoRW1iZWRkaW5nLFxuXHRDb25zb2xlRW1iZWRkaW5nOiBDb25zb2xlRW1iZWRkaW5nLFxuXHRpbml0U2NlbmU6IGluaXRTY2VuZSxcblx0YW5pbWF0ZTogYW5pbWF0ZSxcblx0cXVlcnlTdHJpbmc6IHF1ZXJ5U3RyaW5nLFxuXHRkZXRlY3RNb2RlOiBkZXRlY3RNb2RlLFxuXHRyZWdpc3RlcjogcmVnaXN0ZXIsXG5cdHN0YXJ0QW5pbWF0aW9uLFxuXHR1dGlsczoge1xuXHRcdGRlZ1RvUmFkLFxuXHRcdGxhdExvbmdUb0V1Y2xpZGVhbixcblx0XHRhamF4V2l0aENhbGxiYWNrXG5cdH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IGFzc2lnbiBmcm9tICdvYmplY3QtYXNzaWduJztcblxuLy8gZnJvbSBodHRwczovL2dpdGh1Yi5jb20vbW9jay1lbmQvcmFuZG9tLW5vcm1hbFxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbFBvb2wob3B0aW9ucykge1xuXG4gIHZhciBwZXJmb3JtYW5jZUNvdW50ZXIgPSAwO1xuXG4gIGRvIHtcblxuICAgIHZhciBpZHggPSBNYXRoLnJvdW5kKG5vcm1hbCh7XG4gICAgICBtZWFuOiBvcHRpb25zLm1lYW4sXG4gICAgICBkZXY6IG9wdGlvbnMuZGV2XG4gICAgfSkpO1xuXG4gICAgaWYgKGlkeCA8IG9wdGlvbnMucG9vbC5sZW5ndGggJiYgaWR4ID49IDApIHtcbiAgICAgIHJldHVybiBvcHRpb25zLnBvb2xbaWR4XTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGVyZm9ybWFuY2VDb3VudGVyKys7XG4gICAgfVxuXG4gIH0gd2hpbGUgKHBlcmZvcm1hbmNlQ291bnRlciA8IDEwMCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWwob3B0aW9ucykge1xuXG4gIG9wdGlvbnMgPSBhc3NpZ24oeyBtZWFuOiAwLCBkZXY6IDEsIHBvb2w6IFtdIH0sIG9wdGlvbnMpO1xuXG4gIC8vIElmIGEgcG9vbCBoYXMgYmVlbiBwYXNzZWQsIHRoZW4gd2UgYXJlIHJldHVybmluZyBhbiBpdGVtIGZyb20gdGhhdCBwb29sLFxuICAvLyB1c2luZyB0aGUgbm9ybWFsIGRpc3RyaWJ1dGlvbiBzZXR0aW5ncyB0aGF0IHdlcmUgcGFzc2VkIGluXG4gIGlmIChBcnJheS5pc0FycmF5KG9wdGlvbnMucG9vbCkgJiYgb3B0aW9ucy5wb29sLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gbm9ybWFsUG9vbChvcHRpb25zKTtcbiAgfVxuXG4gIC8vIFRoZSBNYXJzYWdsaWEgUG9sYXIgbWV0aG9kXG4gIHZhciBzO1xuICB2YXIgdTtcbiAgdmFyIHY7XG4gIHZhciBub3JtO1xuICB2YXIgbWVhbiA9IG9wdGlvbnMubWVhbjtcbiAgdmFyIGRldiAgPSBvcHRpb25zLmRldjtcblxuICBkbyB7XG4gICAgLy8gVSBhbmQgViBhcmUgZnJvbSB0aGUgdW5pZm9ybSBkaXN0cmlidXRpb24gb24gKC0xLCAxKVxuICAgIHUgPSBNYXRoLnJhbmRvbSgpICogMiAtIDE7XG4gICAgdiA9IE1hdGgucmFuZG9tKCkgKiAyIC0gMTtcblxuICAgIHMgPSB1ICogdSArIHYgKiB2O1xuICB9IHdoaWxlIChzID49IDEpO1xuXG4gIC8vIENvbXB1dGUgdGhlIHN0YW5kYXJkIG5vcm1hbCB2YXJpYXRlXG4gIG5vcm0gPSB1ICogTWF0aC5zcXJ0KC0yICogTWF0aC5sb2cocykgLyBzKTtcblxuICAvLyBTaGFwZSBhbmQgc2NhbGVcbiAgcmV0dXJuIGRldiAqIG5vcm0gKyBtZWFuO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVnVG9SYWQoZGVnKSB7XG4gIHJldHVybiBkZWcgKiBNYXRoLlBJIC8gMTgwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGF0TG9uZ1RvRXVjbGlkZWFuKGxhdCwgbG9uZywgUj0xLCByZXZlcnNlPXRydWUpIHtcbiAgbGV0IHJhZExhdCA9IGRlZ1RvUmFkKGxhdCk7XG4gIGxldCByYWRMb25nID0gcmV2ZXJzZSA/IGRlZ1RvUmFkKC1sb25nKSA6IGRlZ1RvUmFkKGxvbmcpO1xuICBsZXQgeCA9IFIgKiBNYXRoLmNvcyhyYWRMYXQpICogTWF0aC5jb3MocmFkTG9uZyk7XG4gIGxldCB6ID0gUiAqIE1hdGguY29zKHJhZExhdCkgKiBNYXRoLnNpbihyYWRMb25nKTtcbiAgbGV0IHkgPSBSICogTWF0aC5zaW4ocmFkTGF0KVxuICByZXR1cm4ge3gsIHksIHp9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhamF4V2l0aENhbGxiYWNrKHVybCwgY2IpIHtcbiAgdmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICB4aHIub3BlbignR0VUJywgdXJsKTtcbiAgeGhyLnNlbmQobnVsbCk7XG4gIHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoeGhyLnJlYWR5U3RhdGUgPT09IDQgJiYgeGhyLnN0YXR1cyA9PT0gMjAwKSB7XG4gICAgICBjYihKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpKTtcbiAgICB9XG4gIH1cbn1cblxuIl19
