var history;
var app = getApp();
// pages/history/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    history: []
  },

  onReady: function () {
    let datas = this.data.history;
    try {
      let history = wx.getStorageSync('history');
      if (history) {
        let historyList = history.split("#");
        historyList.forEach(item => {
          console.log(item);
          if (item == "") {
            return;
          }
          let data = item.replace(/;/g, " -> ");
          // console.log(data);
          datas.push({name: data});
        })
        this.setData({history: datas});
      }
    }
    catch (e) {
      console.error(e);
    }
  },

  btnReturn: function() {
    wx.navigateBack();
  },

  btnClick: function(e) {
    let index = e.currentTarget.dataset.index;
    let history = this.data.history[index].name.replace(/ -> /g, ";");
    app.globalData.history = history;
    app.globalData.isSetHistory = true;
    wx.navigateBack();
  },

  btnDelete: function(e) {
    let index = e.currentTarget.dataset.index;
    console.log(this.data.history[index].name);
  }
})