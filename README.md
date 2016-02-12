home-v2
=======
home api


devices signature sample:

```javascript
commands: {
  'setPower': {
    type: 'boolean'
  },
  'setWhite': {
    type: 'int',
    minimum: 2500,
    maximum: 9000,
    unit: 'kelvin'
  },
  'setHSL': {
    type: 'object',
    properties: {
      hue: {
        type: 'float',
        minimum: 0,
        maximum: 360
      },
      saturation: {
        type: 'float',
        minimum: 0,
        maximum: 100
      },
      luminance: {
        type: 'float',
        minimum: 0,
        maximum: 100
      }
    }
  }
},
events: {
  power: {
    type: 'boolean'
  },
  color: {
    type: 'object',
    properties: {
      hue: {
        type: 'float',
        minimum: 0,
        maximum: 360
      },
      saturation: {
        type: 'float',
        minimum: 0,
        maximum: 100
      },
      luminance: {
        type: 'float',
        minimum: 0,
        maximum: 100
      }
    }
  },
  white: {
    type: 'int',
    minimum: 2500,
    maximum: 9000,
    unit: 'kelvin'
  }
},
settings: {
  client_id: {
    type: 'string',
    label: 'client_id',
    required: true
  },
  client_secret: {
    type: 'string',
    label: 'client_secret',
    required: true
  },
  username: {
    type: 'string',
    label: 'username',
    required: true
  },
  password: {
    type: 'string',
    label: 'password',
    required: true
  }
}
```

emitted device data sample:
```javascript
 { '70:ee:50:00:b0:7c': 
   { 
      temperature: 17.9,
      co2: 651,
      humidity: 49,
      noise: 36,
      pressure: 999 
   }
 }
```
