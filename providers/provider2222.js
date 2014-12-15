SwitchServices = {
	on: {
		name: "power",

	}
};

Provider.create = function(options) {
	options.read.foreEach(function(option) {
		// define a getter for option
		this['get' + option.name] = function() {
			return 'some value from device or cache';
		}
	});
	options.write.foreEach(function(option) {
		// define a setter for option
		this['set' + option.name] = function() {
			device.prop = value;
		}
	});
}