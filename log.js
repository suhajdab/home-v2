/**
 * LOG
 */

var bus = require('servicebus').bus();

bus.use(bus.package());

bus.subscribe('*', function (event) {
	console.log('LOG', event);
});
