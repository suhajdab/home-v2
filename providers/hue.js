require( 'es6-promise' ).polyfill();

var Colr = require( 'Colr' );

var hue = require( 'node-hue-api' ),
	HueApi = hue.HueApi,
	lightState = hue.lightState;

var hostname = "10.0.1.2",
	username = "2b107172103c8c9f1e4ee403426a87f",
	api = new HueApi( hostname, username );

var deviceSignature = {
	nativeId: '',
	label: '',
	provider: 'hue',
	tags: []
};

var deviceStates = {};

/*
	node-hue-api API

	on() 			{ on: true }
 	off()			{ on: false }

 	white(colorTemp, brightPercent) where colorTemp is a value between 154 (cool) and 500 (warm) and brightPercent is 0 to 100
 	white(154,100)	{ ct: 154, bri: 254 }

	brightness(percent) where percent is the brightness from 0 to 100
	brightness(50)	{ bri: 127 }

 	hsl(hue, saturation, brightPercent) where hue is a value from 0 to 359, saturation is a percent value from 0 to 100, and brightPercent is from 0 to 100
 	hsl(30,50,75)	{ hue: 5476, sat: 127, bri: 191 }

 	rgb(red, green, blue) where red, green and blue are values from 0 to 255 - Not all colors can be created by the lights
 	transition(seconds) this can be used with another setting to create a transition effect (like change brightness over 10 seconds)
 	.transition(5)	{ ..., transitiontime: 50 }


 	colors: {
 		hue: 0 - 65534,
		sat: 0 - 254,
		bri: 0 - 254
	},
	white: {
		ct: 154 - 500,
		bri: 0 - 254
	}

 */

// TODO: keep polling lights' state and publish changes, so UI can be updated following external changes
// TODO: expose native scheduling api
// TODO: discover hub automatically

//api.getFullState().then(function(data){
//	console.log(JSON.stringify(data, null, "\t"));
//}).catch(console.log.bind(console));


/* UTILITY */


/**
 * Function to compare data received from lights state to old data
 * @param {Object} oldData - data from previous state
 * @param {Object} newData - data from current state
 * @returns {boolean} - result of comparison
 */
function isStateChanged( oldData, newData ) {
	var keys = [ 'lights' ],
		oldFiltered = filterObject( oldData, keys ),
		newFiltered = filterObject( newData, keys );
	return JSON.stringify( oldFiltered ) !== JSON.stringify( newFiltered );
}

/**
 * Function returns Object containing only those properties specified in keys array
 * @param {Object} obj - Object to filter
 * @param {Array} keys - Array of keys to filter by
 * @returns {Object} - New object containing only specified properties
 */
function filterObject( obj, keys ) {
	var newObj = {};
	Object.keys( obj ).forEach( function ( key ) {
		if ( ~keys.indexOf( key )) newObj[ key ] = obj[ key ];
	});
	return newObj;
}


/* PRIVATE */

function getDeviceStates () {
}

/**
 * Function takes HSL and converts it to HSB specific for device
 * @param hsl
 * @returns {{hue: number, saturation: number, brightness: number}}
 */
function convertToHSB( hsl ) {
	var hsv = Colr.fromHslObject( hsl ).toHsvObject(),
		HSB = {
			hue: hsv.h * 182.03888889, // 0 - 360 degrees => 0 - 65534
			saturation: hsv.s * 2.54,
			brightness: hsv.v * 2.54
		};
	return HSB;
}

// TODO: check what hue does with out of bounds values OR just keep in range :)
/**
 *
 * @param kelvin
 * @returns {number}
 */
function convertToMireds ( kelvin ) {
	var mireds = 1000000 / kelvin;
	return mireds;
}

function addDuration( stateObj, duration ) {
	if ( duration !== undefined ) stateObj.duration = duration;
}


/* PUBLIC */

/**
 * Returns an array of known devices with id & label
 * @returns {Promise}
 */
function getAllLights () {
	// TODO: error handling when no network, devices not found
	return api.lights().then( function ( result ) {
		var newObj = result.lights.map( function ( obj ) {
			return {
				nativeId: obj.id,
				label   : obj.name,
				type    : 'light',
				provider: 'hue' // TODO: remove hardcoded provider
			};
		});
		return Promise.resolve( newObj );
	});
}

function getState ( id ) {
	return api.lightStatus( id );
}

function setState ( id, stateObj, duration ) {
	addDuration( stateObj, duration );
	return api.setLightState( id , stateObj );
}

function on ( id, duration ) {
	var stateObj = { on: true };
	return setState( id, stateObj, duration );
}

function off ( id, duration ) {
	var stateObj = { on: false };
	return setState( id, stateObj, duration );
}

/**
 * Set color of lamp with specified id
 * @param {String} id
 * @param {Object} hsl - HSL color
 * @param {Number} hsl.h - hue ( 0 - 360 )
 * @param {Number} hsl.s - saturation ( 0 - 100 )
 * @param {Number} hsl.l - luminance ( 0 - 100 )
 * @returns {Promise}
 */
function setColor ( id, hsl, duration ) {
	var stateObj = convertToHSB( hsl );
	return setState( id, stateObj, duration );
}

/**
 *	Set a white color on the lamp with specified id
 *	Hue appears takes Mireds for white temperature ( = 1000000 / kelvin )
 * @param {String} id
 * @param {Number} kelvin - white temperature of lamp ( warm: 2500 - cool: 10000 )
 * @param {Number} brightness - brightness of lamp ( 0 - 100 )
 * @returns {Promise}
 */
function setWhite ( id, kelvin, brightness, duration ) {
	var stateObj = {
		ct: convertToMireds( kelvin ),
		bri: brightness * 2.54
	};
	return setState( id, stateObj, duration );
}

module.exports = {
	// should return all known devices
	getDevices: getAllLights,
	getState  : getState,
	setColor  : setColor,
	setWhite  : setWhite,
	on        : on,
	off       : off
};

//getAllLights().then( console.log.bind(console) );