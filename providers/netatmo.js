require( 'es6-promise' ).polyfill();

var netatmo = require('netatmo');

var api;
/*
// Get User
// See Docs: http://dev.netatmo.com/doc/restapi/getuser
api.getUser(function(err, user) {
	console.log(user);
});
*/
// Get Devicelist
// See docs: http://dev.netatmo.com/doc/restapi/devicelist
function getDevices () {
	return new Promise( function( resolve, reject ) {
		api.getDevicelist( function( err, devices, modules ) {
			console.log( arguments );
			if ( err ) throw new Error ( err );
			else {
				var result = devices.concat( modules ).map( function( device ) {
					return {
						nativeId: device._id,
						label: device.module_name,
						type: 'climate'
					};
				});
				resolve ( result );
			}
		});
	});
}

function getMeasures ( id ) {
	console.log( 'getting measures for netatmo device id: ' + id );
	return new Promise( function( resolve, reject ) {
		var options = {
			device_id: id,
			scale: 'max',
			//date_end: 'last', // to only get last measurement
			type: ['Temperature', 'CO2', 'Humidity', 'Pressure', 'Noise']
		};

		api.getMeasure( options, function( err, measures ) {
			if ( err ) throw new Error ( err );
			resolve ( measures );
		});
	});
}
/*
// Get Measure
// See docs: http://dev.netatmo.com/doc/restapi/getmeasure
var options = {
	device_id: '',
	scale: 'max',
	type: ['Temperature', 'CO2', 'Humidity', 'Pressure', 'Noise']
};

api.getMeasure(options, function(err, measure) {
	console.log(measure.length);
	console.log(measure[0]);
});

// Get Thermstate
// See docs: http://dev.netatmo.com/doc/restapi/getthermstate
var options = {
	device_id: '',
	module_id: '',
};

api.getThermstate(options, function(err, result) {
	console.log(result);
});
*/

function log ( obj ) {
	console.log( JSON.stringify( obj, null, "\t" ));
}

function ready () {
	getDevices().then( function( ids ) {
		getMeasures( ids[0].nativeId )
			.then( log )
			.catch( log);
	});
}

function init () {
	var auth = {
		"client_id": "52bcc31c1c7759e8ad8b45f8",
		"client_secret": "oIZEX9V1QVRgcost6mXGt9cuq1aHPY1Yz55W04gG1Rl2",
		"username": "suhajdab@gmail.com",
		"password": "navic3!"
	};

	api = new netatmo(auth);
	ready();
}


module.exports = {
	init: init,
	getDevices: getDevices

};

init();