var wemore = require( 'wemore' );

var devices = [];

// TODO: add device state listeners
// TODO: debug lost commands

/**
 * Function to check if WeMo is present in device's firmwareVersion,
 * which is needed as Discovery seems to return others ( ex: Hue hub )
 * @param {Object} device - device object
 * @returns {*|boolean}
 */
function isWemo ( device ) {
	return device.firmwareVersion && (/^(WeMo)/).test( device.firmwareVersion );
}

/**
 *
 * @returns {Promise}
 */
function getDevices () {
	return new Promise( function ( resolve, reject ) {
		// TODO think of a better way to wait for ready
		setTimeout( function () {
			resolve( standardizeDevices( devices ));
		}, 1000 );
	});
}

function standardizeDevices ( devices ) {
	return devices.map( function ( device ) {
		return {
			label   : device.friendlyName,
			nativeId: device.serialNumber,
			type    : 'switch',
			platform: 'wemo' // TODO: remove hardcoded platform
		};
	});
}

function findDeviceByNativeId ( id ) {
	var result;
	devices.forEach( function ( device ) {
		if ( device.serialNumber == id ) result = device;
	});
	return result;
}

function on ( id ) {
	var device = findDeviceByNativeId( id );
	device && device.setBinaryState( true );
}

function off ( id ) {
	var device = findDeviceByNativeId( id );
	device && device.setBinaryState( false );
}

function ready () {
	console.log( 'wemo ready' );
}

function discover () {
	var discovery = wemore.Discover()
		.on( 'device', function( device ) {
			// seems to discover hue hub too, so gotta filter
			if ( isWemo( device )) devices.push( device );
		});

	// not quite sure how to ensure discovery ended
	setTimeout( function () {
		discovery.close();
		ready();
	}, 1000 );
}

function init() {
	discover();
}

module.exports = {
	// should return all known devices
	getDevices: getDevices,
	on        : on,
	off       : off,
	init      : init
};
