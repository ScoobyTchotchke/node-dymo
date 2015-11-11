var usb = require('usb'),
    events = require('events'),
    async = require('async'),
    Scale = function() {
      var that = this;

      events.EventEmitter.call(this);

      this.vendorId = 2338;
      this.scale = undefined;
      this.weight = {
        value: 0,
        overweight: false,
        system: undefined,
      };

      this.connect = function(productId, device) {
        async.waterfall([
          function(callback) {
            var devicesFound = [],
                devices,
                i, ii;

            if (device) {
              callback(null, device);
            }

            if (productId && usb.findByIds(that.vendorId, productId)) {
              callback(null, usb.findByIds(that.vendorId, productId));
            } else {
              // .connect() wasn't passed a productId, attempt to find it
              devices = usb.getDeviceList();
              console.log('length: ' + devices.length);
              for (i=0,ii=devices.length;i<ii;i++) {
                if (devices[i].deviceDescriptor.idVendor === that.vendorId) {
                  devicesFound.push(devices[i]);
                }
              }
              if (devicesFound.length > 1) {
                console.log('more than one');
                callback('There is more than one Dymo scale connected.  A productId is required.');
              } else if (devicesFound.length === 0) {
                console.log('none detected');
                callback('No USB scale detected');
              } else {
                console.log(devicesFound[0]);
                callback(null, devicesFound[0]);
              }
            }
          },

          function(device, callback) {
              device.open();
              device.reset(function() {
                if (device.interface(0).isKernelDriverActive()) {
                  device.interface(0).detachKernelDriver();
                }
                device.interface(0).claim();
                callback(null, device);
              });
          },

          function(device, callback) {
            device.interface(0).endpoint(130).startPoll(3,6);

            device.interface(0).endpoint(130).on('error', function(data) {
              that.emit('error');
              callback(data);
            });

            device.interface(0).endpoint(130).on('end', function(data) {
              that.emit('end');
              callback(data);
            });

            device.interface(0).endpoint(130).on('data', function(data) {
              var dataArray = data.toJSON(),
                  value,
                  overweight,
                  system;

              if (dataArray[1] === 2) {
                // no weight is on the scale
                value = 0;
                overweight = false;
              }
              if (dataArray[1] === 6) {
                // there's too much weight
                value = 0;
                overweight = true;
              }
              if (dataArray[2] == 11) {
                system = 'ounces';
              }
              if (dataArray[2] == 2) {
                system = 'grams';
              }
              if (dataArray[1] === 4 && system === 'ounces') {
                overweight = false;
                value = Math.round(((dataArray[4] + (dataArray[5] * 256)) * 0.1) * 10) / 10;
              }
              if (dataArray[1] === 4 && system === 'grams') {
                overweight = false;
                value = Math.round((dataArray[4] + dataArray[5] * 256) * 10) / 10;
              }
              if (that.weight.value !== value || that.weight.overweight !== overweight || that.weight.system !== system) {
                that.weight = {
                  value: value,
                  overweight: overweight,
                  system: system
                };
                that.emit('weight', that.weight);
                console.log(that.weight);
              }
              console.log(that.weight);
            });
          }
        ], function(err, result) {
        });
      };


      usb.on('attach', function(device) {
        if (device.deviceDescriptor.idVendor === that.vendorId) {
          that.connect(null, device);
        }
      })

      usb.on('detach', function(device) {
        if (device.deviceDescriptor.idVendor === that.vendorId) {
          that.emit('offline');
        }
      })

    };

Scale.prototype.__proto__ = events.EventEmitter.prototype;
var s = new Scale().connect();
