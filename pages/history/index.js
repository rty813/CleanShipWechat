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
          let data = item.replace(/;/g, "\r\n");
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
    app.globalData.history = this.data.history[index].name;
    app.globalData.isSetHistory = true;
    wx.navigateBack();
  }
})