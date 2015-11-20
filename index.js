var usb = require('usb'),
    events = require('events'),
    async = require('async'),
    Scale;
    
Scale = function() {
  var that = this,
      status = false;

  events.EventEmitter.call(this);

  this.vendorId = 2338;
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
          // A device was already provided, no need to scan for it
          callback(null, device);
          return;
        }

        if (productId && usb.findByIds(that.vendorId, productId)) {
          // The productId is a valid one, move along
          callback(null, usb.findByIds(that.vendorId, productId));
        } else {
          // .connect() wasn't passed a productId, attempt to find it
          devices = usb.getDeviceList();
          for (i=0,ii=devices.length;i<ii;i++) {
            // Scan all USB devices to see if there's a hit
            if (devices[i].deviceDescriptor.idVendor === that.vendorId) {
              devicesFound.push(devices[i]);
            }
          }
          if (devicesFound.length > 1) {
            // For now, we can only have one scale plugged in
            callback('There is more than one Dymo scale connected.  A productId is required.');
          } else if (devicesFound.length === 0) {
            // No scales were found
            callback('No USB scale detected');
          } else {
            // Exactly one valid scale was found.  Good!
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
        status = true;

        device.interface(0).endpoint(130).on('error', function(data) {
          status = false;
          that.emit('end');
          callback(data);
        });

        device.interface(0).endpoint(130).on('end', function(data) {
          status = false;
          that.emit('end');
          device.interface(0).endpoint(130).stopPoll();
          callback(data);
        });

        device.interface(0).endpoint(130).on('data', function(data) {
          var dataArray = data.toJSON(),
              change = false,
              value = 0,
              overweight = false,
              system = 'ounces';

          if (dataArray[1] === 2) {
            // no weight is on the scale
            value = 0;
            overweight = false;
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
          if (dataArray[1] === 6) {
            // there's too much weight
            value = 0;
            overweight = true;
          }

          if (that.weight.value !== value) {
            that.weight.value = value;
            that.weight.system = system;
            that.emit('weight-change', { value: value, system: system });
            change = true;
          }
          if (that.weight.overweight !== overweight) { 
            that.weight.overweight = overweight; 
            that.emit('overweight-change', overweight);
            change = true;
          }
          if (change === true) {
            that.emit('weight', that.weight);
          }
        });
      }
    ], function(err, result) {
      if (err) {
        // TODO: do something to handle errors
      }
    });
  };

  this.getWeight = function() {
    return {
      value: this.weight.value,
      system: this.weight.system
    }
  };

  this.getOverweightStatus = function() {
    return this.weight.overweight;
  };

  this.getStatus = function() {
    return status;
  };

  usb.on('attach', function(device) {
    // A new USB device was attached/powered on, check to see if it's a scale
    if (device.deviceDescriptor.idVendor === that.vendorId) {
      that.connect(null, device);
      that.emit('online');
    }
  })

  usb.on('detach', function(device) {
    // A device was detached.  See if it's our scale
    if (device.deviceDescriptor.idVendor === that.vendorId) {
      status = false;
      that.emit('offline');
    }
  })

};

Scale.prototype.__proto__ = events.EventEmitter.prototype;
module.exports = new Scale();
