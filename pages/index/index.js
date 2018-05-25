//index.js
//获取应用实例
const app = getApp()
const utils = require('./utils')
const timeUtils = require('../../utils/util.js');

var windowWidth;
var windowHeight;
var markable = false;
var deviceAddr;
var latitude;
var longitude;
var queryStateInterval;
const UUID_SERVICE = "0000FFE0-0000-1000-8000-00805F9B34FB";
const UUID_NOTIFY  = "0000FFE1-0000-1000-8000-00805F9B34FB";
var newData = '';
var queryType = 0;
var counter = 0;

Page({
  data: {
    controls: [{
      id: 1,
      iconPath: '/resources/location.png',
      position: {
        left: 10,
        top: 10,
        width: 30,
        height: 30
      },
      clickable: true
    }, {
      id: 2,
      iconPath: '/resources/scan.png',
      position: {
        left: 10,
        top: 50,
        width: 30,
        height: 30
      },
      clickable: true
    }, {
      id: 3,
      iconPath: '/resources/history.png',
      position: {
        left: 8,
        top: 90,
        width: 33,
        height: 33
      },
      clickable: true
    }],
    markers: [{
      id: 0,
      latitude: 34.12345,
      longitude: 108.312123,
      iconPath: '/resources/ship.png',
      anchor: { x: .5, y: .5 },
      width: 30,
      height: 30
    }],
    polyline: [{
      points: [],
      color: "#FF0000DD",
      width: 4,
      arrowLine: true
    }, {
      points: [],
      color: "#0000FFDD",
      width: 3,
      arrowLine: true
    }],
    UNBIND: -1,
    UNREADY: 0,
    READY: 1,
    NAV: 2,
    state: -1,
    platform: '',
    text_pause: "暂停",
    charge: '剩余电量：100%',
  },
  onReady: function (e) {
    this.mapCtx = wx.createMapContext('myMap')
    this.mapCtx.moveToLocation()
    var that = this; 
    wx.closeBluetoothAdapter({
      success: function (res) {
        if (wx.openBluetoothAdapter) {
          wx.openBluetoothAdapter({
            success: function (res) {
              console.log("蓝牙启动成功");
            },
            fail: function (res) {
              wx.showToast({
                title: '蓝牙未打开！',
                icon: 'none'
              })
            }
          })
        } else {
          // 如果希望用户在最新版本的客户端上体验您的小程序，可以这样子提示
          wx.showModal({
            title: '提示',
            content: '当前微信版本过低，无法使用该功能，请升级到最新微信版本后重试。'
          })
        };
      },
    })
    wx.getSystemInfo({
      success: function (res) {
        windowHeight = res.windowHeight
        windowWidth = res.windowWidth
        that.setData({platform: res.platform});
        console.log(res.platform);
        wx.getStorage({
          key: 'addr',
          success: function (res) {
            console.log(res);
            deviceAddr = res.data;
            that.setData({ state: that.data.UNREADY });
            if (that.data.platform == 'ios' && res.data.length < 20) {
              wx.clearStorage();
              that.setData({ state: that.data.UNBIND });
            }
          },
          fail: function (err) {
            that.setData({ state: that.data.UNBIND });
          }
        });
      }
    })

    wx.onBLEConnectionStateChange(function(res){
      if (!res.connected) {
        wx.showToast({
          title: '连接中断',
          duration: 2000,
          mask: true,
        })  
      }
    })
  },

  onUnload: function() {
    clearInterval(queryStateInterval);
    wx.closeBLEConnection({
      deviceId: deviceAddr,
      success: res => {console.log(res)},
    })
    wx.closeBluetoothAdapter({
      success: function(res) {},
    })
  },

  onShow: function() {
    if (app.globalData.isSetHistory) {
      console.log(app.globalData.history);
      let markers = this.data.markers;
      while (markers.length > 1) {
        markers.pop();
      }
      let polylinePoints = [];
      let historyList = app.globalData.history.split(";");
      let includePoints = [];
      historyList.forEach(item => {
        if (item == "") {
          return
        }
        let lat = item.split(",")[0];
        let lng = item.split(",")[1];
        console.log(lat + ';' + lng + "#");
        includePoints.push({latitude:lat, longitude:lng});
        markers.push({
          id: markers.length,
          latitude: lat,
          longitude: lng,
          iconPath: '/resources/mao.png',
          anchor: { x: .5, y: .5 },
          width: 20,
          height: 20
        });
        polylinePoints.push({
          latitude: lat,
          longitude: lng,
        });
      });
      this.mapCtx.includePoints({points: includePoints})
      this.setData({'markers': markers});
      this.setData({ 'polyline[0].points': polylinePoints });
    }
  },

  moveToLocation: function () {
    this.mapCtx.moveToLocation()
  },

  btnBind: function () {
    var that = this;
    wx.scanCode({
      success: (res) => {
        console.log(res)
        let datas = res.result.split(";");
        if (datas.length == 4) {
          wx.showToast({
            icon: "success",
            title: datas[1] + "绑定成功",
            duration: 2000
          })
          deviceAddr = that.data.platform == "android" ? datas[2] : datas[3];
          wx.setStorage({
            key: 'id',
            data: datas[0],
          })
          wx.setStorage({
            key: 'name',
            data: datas[1],
          })
          wx.setStorage({
            key: 'addr',
            data: deviceAddr,
          })
          that.setData({ state: that.data.UNREADY })
        }
        else {
          wx.showToast({
            icon: "none",
            title: "扫码失败",
            duration: 2000
          })
        }
      }
    })
  },

  btnConnect: function (e) {
    var that = this;
    wx.showLoading({
      title: '连接中',
      mask: true,
    })

    wx.createBLEConnection({
      deviceId: deviceAddr,
      success: function(res) {
        console.log('connect success');
        that.getService();
      },
      fail: function(errMsg) {
        console.log(errMsg);
        wx.hideLoading();
        wx.showToast({
          title: "连接失败",
          icon: "none",
          duration: 2000,
          mask: true,
        })
      },
    })
  },
  getService: function() {
    var that = this;
    wx.getBLEDeviceServices({
      deviceId: deviceAddr,
      success: function(res) {
        res.services.forEach(service => {
          // console.log("SERVICE UUID: " + service.uuid);
          if (service.uuid == UUID_SERVICE) {
            setTimeout(() => {
              that.getCharacteristics();
            }, 200);
          }
        })
      },
      fail: function(res) {},
      complete: function(res) {},
    })
  },

  getCharacteristics: function() {
    var that = this;
    wx.getBLEDeviceCharacteristics({
      deviceId: deviceAddr,
      serviceId: UUID_SERVICE,
      success: function(res) {
        res.characteristics.forEach(characteristic => {
          // console.log("CHARACTERISTIC UUID: " + characteristic.uuid);
          if (characteristic.uuid == UUID_NOTIFY) {
            setTimeout(() => {
              that.setCharacteristicNotification();
            }, 200)
          }
        });
      },
      fail: function(res) {},
      complete: function(res) {},
    })
  },

  setCharacteristicNotification: function() {
    var that = this;
    wx.notifyBLECharacteristicValueChange({
      deviceId: deviceAddr,
      serviceId: UUID_SERVICE,
      characteristicId: UUID_NOTIFY,
      state: true,
      success: function(res) {
        that.setBleListener();
        wx.hideLoading();
        wx.showToast({
          title: "连接成功",
          icon: "success",
          duration: 2000,
          mask: true,
        })
        that.setData({state : that.data.READY});
        queryStateInterval = setInterval(that.queryState, 2000);
      },
    })
  },

  setBleListener: function() {
    let that = this;
    wx.onBLECharacteristicValueChange(function(res){
      console.log(utils.ab2str(res.value));
      newData += utils.ab2str(res.value);
      if (newData.endsWith("#")) {
        //move marker
        newData = newData.replace("#", "");
        newData = newData.replace("$", "");
        let datas = newData.split(";");
        if (datas.length == 2){
          switch (parseInt(datas[0])) {
            case 0:
              datas = datas[1].split(",");
              if (datas.length == 2) {
                let lat = parseFloat(datas[0]);
                let lng = parseFloat(datas[1]);
                console.log(lat + ";" + lng);
                // 上传数据
                counter = counter > 5 ? 0 : counter + 1;
                if (counter == 0 || true) {
                  console.debug('request');
                  wx.request({
                    url: 'http://orca-tech.cn/app/fengqing/data_collect.php',
                    data: {
                      latlng: lng + ',' + lat,
                      date: timeUtils.formatTime(new Date())
                    },
                    header: {
                      'content-type': 'application/x-www-form-urlencoded' // 默认值
                    },
                    method: 'POST',
                    success: (res) => {
                      console.log(res.data);
                      that.setData({charge: res.data});
                    },
                    fail: (res) => {
                      console.warn(res);
                      that.setData({ charge: 'fail' });
                    }
                  })
                }
                counter = counter > 5 ? 0 : counter + 1;
                // 移动船
                that.mapCtx.translateMarker({
                  markerId: 0,
                  destination: {latitude:lat, longitude:lng},
                  autoRotate: true,
                  duration: 1500,
                });
                // 连线
                let points = that.data.polyline[1].points;
                points.push({
                  latitude: lat,
                  longitude: lng
                });
                if (points.length == 1) {
                  that.mapCtx.includePoints({points: points});
                }
                console.log(that.data.polyline);
                that.setData({ 'polyline[1].points': points });
              }
              break;
            case 7:
              that.handleState(parseInt(datas[1]));
              break;
            case 9:
              that.setData({charge : '剩余电量：' + datas[1] + "%"});
              break;
          };
          
        }
        newData = '';
      }
    })
  },

  writeValue: function (data) {
    console.log(data);
    if (data.length > 18) {
      let data1 = data.substring(0, 18);
      let data2 = data.substring(18) + "\r\n";
      let buffer = utils.str2ab(data1);
      wx.writeBLECharacteristicValue({
        deviceId: deviceAddr,
        serviceId: UUID_SERVICE,
        characteristicId: UUID_NOTIFY,
        value: buffer,
        success: function (res) {console.log(res) },
        fail: (res) => { console.log(res) }
      })
      buffer = utils.str2ab(data2);
      setTimeout(() => {
        wx.writeBLECharacteristicValue({
          deviceId: deviceAddr,
          serviceId: UUID_SERVICE,
          characteristicId: UUID_NOTIFY,
          value: buffer,
          success: function (res) { console.log(res) },
          fail: (res) => { console.log(res) }
        })
      }, 1000);
    }
    else {
      let buffer = utils.str2ab(data + "\r\n");
      wx.writeBLECharacteristicValue({
        deviceId: deviceAddr,
        serviceId: UUID_SERVICE,
        characteristicId: UUID_NOTIFY,
        value: buffer,
        success: function (res) { console.log(res)},
        fail: (res) => {console.log(res)}
      })
    }
  },

  handleState: function(state) {
    console.log(state);
  },

  btnMarkEnable: function () {
    // let len = this.data.controls.length;
    if (markable) {
      this.setData({
        'controls[3].iconPath': null
      })
    } else {
      this.setData({
        'controls[3].id': 4,
        'controls[3].iconPath': '/resources/mylocation.png',
        'controls[3].position': { left: windowWidth / 2 - 20, top: windowHeight / 2 - 20, width: 40, height: 40 }
      })
    }
    markable = !markable;
  },

  btnMark: function () {
    if (!markable) {
      return;
    }
    let markers = this.data.markers;
    if (markers.length > 1 
      && markers[markers.length - 1].latitude == latitude
      && markers[markers.length - 1].longitude == longitude){
        return;
    }
    markers.push({
      id: markers.length,
      latitude: latitude,
      longitude: longitude,
      iconPath: '/resources/mao.png',
      anchor: { x: .5, y: .5 },
      width: 20,
      height: 20
    })
    this.setData({
      'markers': markers
    })

    // 添加连线
    let polylinePoints = this.data.polyline[0].points;
    polylinePoints.push({
      latitude: latitude,
      longitude: longitude,
    })
    this.setData({ 'polyline[0].points': polylinePoints });
  },

  btnCancel: function () {
    let markers = this.data.markers;
    if (markers.length > 1) {
      markers.pop();
    }
    let polylinePoints = this.data.polyline[0].points;
    if (polylinePoints.length > 0) {
      polylinePoints.pop();
    }
    this.setData({ 'markers': markers });
    this.setData({ 'polyline[0].points': polylinePoints});
  },

  btnDelete: function () {
    let that = this;
    wx.showModal({
      title: '提示',
      content: '是否要删除全部标记点',
      success: function (res) {
        if (res.confirm) {
          // console.log('用户点击确定')
          let markers = that.data.markers;
          while (markers.length > 1) {
            markers.pop();
          }
          that.setData({markers: markers});
          that.setData({ 'polyline[0].points': [] });
          that.setData({ 'polyline[1].points': [] });
        }
      }
    })
  },

  btnNav: function() {
    let markers = this.data.markers;
    if (markers.length < 2) {
      return;
    }
    if (markable) {
      this.btnMarkEnable();
    }
    wx.showLoading({
      title: '发送中',
      mask: true,
    })
    
    let aHistory = '';
    markers.forEach(marker => {
      if (marker.id != 0) {
        aHistory += marker.latitude.toString() + "," + marker.longitude.toString() + ";";
      }
    });
    console.log(aHistory);
    aHistory += "#";

    try{
      let history = wx.getStorageSync('history');
      if (history) {
        history += aHistory;
        wx.setStorageSync('history', history);
      }
      else {
        wx.setStorageSync('history', aHistory);
      }
    } catch(e) {
      console.error(e);
    }
    let index = 1;
    let that = this;
    clearInterval(queryStateInterval);
    this.writeValue("$CLEAR#");
    let interval = setInterval(() => {
      if (index >= markers.length) {
        that.writeValue("$NAV,1#");
        that.setData({state : that.data.NAV});
        wx.hideLoading();
        clearInterval(interval);
        queryStateInterval = setInterval(that.queryState, 2000);
        return;
      }
      let marker = markers[index];
      let lat = marker.latitude.toString();
      let lng = marker.longitude.toString();
      lat = lat.substr(0, lat.indexOf(".") + 7) + ",";
      lng = lng.substr(0, lng.indexOf(".") + 7) + "#";
      that.writeValue("$GNGGA," + lat + lng);
      index++;
    }, 2000)
  },

  btnPause: function () {
    clearInterval(queryStateInterval);
    if (this.data.text_pause == "暂停") {
      setTimeout(() => {
        this.writeValue("$PAUSE#");
        queryStateInterval = setInterval(this.queryState, 2000);
      },1000)
      this.setData({text_pause: "继续"})
    } else {
      setTimeout(() => {
        this.writeValue("$GO#");
        queryStateInterval = setInterval(this.queryState, 2000);
      }, 1000)
      this.setData({ text_pause: "暂停" })
    }
  },

  btnStop: function () {
    clearInterval(queryStateInterval);
    setTimeout(() => {
      this.writeValue("$CLEAR#");
      queryStateInterval = setInterval(this.queryState, 2000);
      this.setData({state: this.data.READY});
    }, 1000)
  },
  
  btnHome: function () {
    clearInterval(queryStateInterval);
    setTimeout(() => {
      this.writeValue("$ORDER,2#");
      queryStateInterval = setInterval(this.queryState, 2000);
    }, 1000)
  },

  queryState: function() {
    let data = queryType % 5 == 0 ? "$QUERY,7#" : "$QUERY,0#";
    data = queryType % 20 == 0 ? "$QUERY,9#" : data;
    this.writeValue(data);
    queryType++;
  },

  controltap: function (e) {
    switch (e.controlId) {
      case 1:
        this.mapCtx.moveToLocation()
        break;
      case 2:
        this.setData({state : this.data.UNBIND});
        this.btnBind();
        break;
      case 3:
        console.log("history");
        app.globalData.isSetHistory = false;
        wx.navigateTo({
          url: '/pages/history/index',
        });
        break;
      default:
        console.log(e.controlId)
        break;
    }
  },
  regionchange: function (e) {
    this.mapCtx.getCenterLocation({
      success: function (res) {
        longitude = res.longitude;
        latitude = res.latitude;
      }
    })

  }
})
