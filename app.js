// app.js
App({
  onLaunch() {
    // 设置音频播放选项，不遵循系统静音开关
    wx.setInnerAudioOption({
      obeyMuteSwitch: false,
      mixWithOther: true
    });
    
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
  },
  globalData: {
    userInfo: null
  }
})
