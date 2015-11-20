# node-dymo

node-dymo is a Node.js wrapper that reads from a Dymo brand USB scale.  The wrapper provides several events as well as methods to read measurements from the scale.

## Dependencies

Libusb is included as a submodule. On Linux, you'll need libudev to build libusb. On Ubuntu/Debian: `sudo apt-get install build-essential libudev-dev`

### Windows
Use [Zadig](http://sourceforge.net/projects/libwdi/files/zadig/) to install the WinUSB driver for your USB device. Otherwise you will get `LIBUSB_ERROR_NOT_SUPPORTED` when attempting to open devices.

## Quick Examples

```js
dymo.on('online', function() {
  console.log('scale was connected/powered on'); // ## ounces(/grams);
});

dymo.on('weight-change', function(obj) {
  console.log(obj.value + ' ' + obj.system); // ## ounces(/grams);
});

console.log(dymo.getWeight()); // { value: 10, system: 'grams' }
```

## Methods

node-dymo provides three methods you can call at any time:

* `connect()` Connect to the driver, and if a scale isn't immediately online, establish listeners until it becomes online.  This method is required in order to gain access to the below methods and listeners
* `getWeight()` Get the current weight on the scale. Returns an object containing the properties `value`, and `system`, with the numerical weight and either `ounces` or `grams` respectively
* `getOverweightStatus()` In the event the scale is overweight, this method will return `true`, otherwise `false`
* `getStatus()` returns either `true` or `false` if a scale is available or not.

## Events

* `online` A Dymo scale was connected and powered on
* `offline` A Dymo scale was powered off/disconnected
* `weight-change` Fires when the weight on the scale changes.  Passes an object to the event listener containing a numerical `value` property and either `ounces` or `grams` for the `system` property.
* `overweight-change` Fires when the weight on the scale exceeds it's maximum capacity.  Passes a `true` or `false` boolean to the event listener depending on whether or not the scale is over or under weight respectively.
* `weight` Fires when either the weight changes, or when the scale becomes overweight or underweight (combination of both `weight-change` and `overweight-change` events)
* `end` Fires when the scale errors or is powered off
