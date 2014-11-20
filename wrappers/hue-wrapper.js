require('es6-promise').polyfill();


var hue = require("node-hue-api"),
	HueApi = hue.HueApi,
	lightState = hue.lightState;

var hostname = "10.0.1.2",
	username = "2b107172103c8c9f1e4ee403426a87f",
	api = new HueApi( hostname, username );

console.log(lightState.create().white(500,100).transition(5));

/*
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

// TODO: create lifx-like id API


function discover () {
	// get all lights
}


function getAllLights () {
	return api.lights();
}

function getState ( id ) {
	return api.lightStatus( id );
}

function setState ( id, state ) {

	return requestPromise( id + '/' + fn, args, 'put' );
}

module.exports = {
	getAllLights: getAllLights(),
	getState: getState,
	setState: setState
};
