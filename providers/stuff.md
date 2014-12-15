# Take 1

Provider
	.storeState()
	.power
	LightProvider
		.brightness
		.whites
		.rgb
		LifxLightProvider(rbg, whites)
	WeatherProvider
		SmhiWeatherProvider
		YahooWeatherProvider


		var provider = WheatherProvider.create('YahooWeatherProvider', {
			read: [Provider.power, LightProvider.rgb],
			write: [Provider.power, LightProvider.rgb, , LightProvider.whites]
		});


# Take 2

class Provider
enum LightServices (hue, saturation, brightness)
enum WeatherServices ()
enum SwitchServices (on)

// events (both device & state) = stateChange
var lifxProvider = Provider.create({
	read: [SwitchServices.on, LightServices.hue, LightServices.brightness],
	write: [SwitchServices.on, LightServices.hue]
});

var strangeLightProvider = Provider.create({
	read: [LightServices.hue],
	write: [LightServices.hue]
});


