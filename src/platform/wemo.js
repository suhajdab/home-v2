var wemore = require( 'wemore' );

var devices = [], emitter,
	signature = {
		commands: {
			'setPower': {
				type: 'boolean'
			}
		},
		events: {
			power: {
				type: 'boolean'
			}
		}
	};

Object.freeze( signature );

// TODO: add device state listeners
// TODO: debug lost commands

/**
 * Function to check if WeMo is present in device's firmwareVersion,
 * which is needed as Discovery seems to return others ( ex: Hue hub )
 * @param {Object} device - device object
 * @returns {*|boolean}
 */
function isWemo( device ) {
	return device.firmwareVersion && /^(WeMo)/.test( device.firmwareVersion );
}

/**
 *
 * @returns {Promise}
 */
function getDevices() {
	return new Promise( function( resolve, reject ) {
		// TODO think of a better way to wait for ready
		setTimeout( function() {
			resolve( standardizeDevices( devices ) );
		}, 1000 );
	} );
}

function standardizeDevices( devices ) {
	return devices.map( function( device ) {
		return {
			label: device.friendlyName,
			nativeId: device.serialNumber,
			type: 'switch'
		};
	} );
}

function findDeviceByNativeId( id ) {
	var result;
	devices.forEach( function( device ) {
		if ( device.serialNumber == id ) result = device;
	} );
	return result;
}

function discover() {
	var discovery = wemore.Discover()
		.on( 'device', function( device ) {
			// seems to discover hue hub too, so gotta filter
			if ( isWemo( device ) ) devices.push( device );
		} );

	// not sure how to ensure discovery ended
	setTimeout( function() {
		discovery.close();
		ready();
	}, 5000 );
}

function ready() {
	discover();
	console.log( 'wemo ready' );
}

/* PUBLIC */
var api = {};

/**
 * Turns on switch with specified id on/off
 *
 * @param id
 * @param {Boolean} power  state to set
 */
api.setPower = function( id, power ) {
	var device = findDeviceByNativeId( id );
	device && device.setBinaryState( power );
};

function init( globalSettings, platformSettings, em ) {
	emitter = em;
	ready();
}

module.exports = {
	command: function( cmd ) {
		var args = [].splice.call( arguments, 1 );
		console.log( 'wemo command', cmd, args );
		if ( !api[ cmd ] ) return new Error( 'wemo platform has no command: ' + cmd );
		api[ cmd ].apply( this, args );
	},
	init: init,
	signature: signature
};
