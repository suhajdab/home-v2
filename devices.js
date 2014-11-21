require('es6-promise').polyfill();
var redis = require("redis").createClient();

//var hue = require('./wrappers/hue.js');
//var lx = require('./wrappers/lifx.js');


var providers = ['hue', 'lifx']; // should come from redis
var devices = [];

// TODO: add listener for new devices
function requestDevices ( providerName ) {
	var provider = require('./wrappers/' + providerName + '.js');
	console.log(provider);
	provider.getDevices().then( registerDevices ).catch( onRegistrationError );
}

function registerDevice( device ) {
	// TODO: finish registration, publish new device
	// TODO:
}

function registerDevices ( deviceList ) {
	deviceList.forEach( registerDevice );
}

function onRegistrationError ( err ) {
	console.error( err )
}

providers.forEach( requestDevices );