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
    let datas = [];
    try {
      let history = wx.getStorageSync('history');
      if (history) {
        console.log(history);
        let historyList = history.split("#");
        historyList.forEach(item => {
          if (item == "") {
            return;
          }
          let data = item.replace(/;/g, " -> ");
          datas.push(data);
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
    let history = this.data.history[index].replace(/ -> /g, ";");
    app.globalData.history = history;
    app.globalData.isSetHistory = true;
    wx.navigateBack();
  },

  btnDelete: function(e) {
    let index = e.currentTarget.dataset.index;
    let datas = this.data.history.join('#');
    datas = datas.replace(this.data.history[index], "");
    datas = datas.replace(/ -> /g, ";");
    datas = datas.replace(/##/g, "#");
    try{
      wx.setStorageSync("history", datas);
      this.onReady();
    } catch (e) {
      console.error(e);
    }
  }
})