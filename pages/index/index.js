Page({
  data: {
    audioSrc: '',
    startTime: 0,
    startTimeInput: '0',
    endTime: 0,
    endTimeInput: '',
    loopTimes: 100,
    currentLoop: 0,
    currentTime: 0,
    formattedCurrentTime: '0.0',
    formattedEndTime: '0.0',
    durationSet: false,
    volumeEnabled: false,
    baseVolume: 0.5,
    refreshTrigger: 0,
    audioDataUrl: '',
    loopTimesInput: '100',
    noteText: '',
    noteInput: ''
  },
  onLoad() {
    // 创建背景音频管理器
    this.backgroundAudioManager = wx.getBackgroundAudioManager();
    
    // 监听背景音频事件
    this.backgroundAudioManager.onTimeUpdate(() => {
      const currentTime = this.backgroundAudioManager.currentTime;
      
      // 更新当前时间显示
      this.setData({
        currentTime: currentTime || 0,
        formattedCurrentTime: (currentTime || 0).toFixed(1)
      });
      
      // 检查是否达到结束时间
      if (this.data.endTime > 0 && currentTime >= this.data.endTime) {
        console.log('达到结束时间:', currentTime.toFixed(2), '目标:', this.data.endTime.toFixed(2));
        
        // 停止当前播放
        this.backgroundAudioManager.stop();
        
        // 处理循环
        setTimeout(() => {
          this.handleLoopPlayback();
        }, 100);
      }
    });

    // 添加播放结束事件监听
    this.backgroundAudioManager.onEnded(() => {
      console.log('音频播放结束');
      this.handleLoopPlayback();
    });

    // 添加停止事件监听
    this.backgroundAudioManager.onStop(() => {
      console.log('音频停止播放');
      // 如果是手动停止，不进行循环
      if (this.manualStop) {
        this.manualStop = false;
        return;
      }
      this.handleLoopPlayback();
    });
  },
  initAudioContext() {
    if (this.audioCtx) {
      this.audioCtx.destroy();
    }
    
    // 创建音频上下文
    this.audioCtx = wx.createInnerAudioContext({
      useWebAudioImplement: false  // 使用原生音频播放器
    });
    
    if (this.audioCtx) {
      // 设置音频属性
      this.audioCtx.obeyMuteSwitch = false;  // 不遵循系统静音开关
      this.audioCtx.volume = 1.0;  // 设置最大音量
      
      // 添加事件监听
      this.audioCtx.onError((res) => {
        console.error('音频播放错误:', res);
        wx.showToast({
          title: '音频播放错误',
          icon: 'none'
        });
      });

      this.audioCtx.onTimeUpdate(() => {
        const currentTime = this.audioCtx.currentTime;
        
        // 更新当前时间显示
        this.setData({
          currentTime: currentTime || 0,
          formattedCurrentTime: (currentTime || 0).toFixed(1)
        });
        
        // 检查是否达到结束时间
        if (this.data.endTime > 0 && currentTime >= this.data.endTime) {
          console.log('达到结束时间:', currentTime.toFixed(2), '目标:', this.data.endTime.toFixed(2));
          
          // 暂停播放
          this.audioCtx.pause();
          
          // 处理循环
          setTimeout(() => {
            this.handleLoopPlayback();
          }, 100);
        }
      });

      this.audioCtx.onPlay(() => {
        console.log('音频开始播放');
        // 确保音量设置正确
        if (this.audioCtx.volume < 0.5) {
          this.audioCtx.volume = 1.0;
        }
      });
      
      this.audioCtx.onEnded(() => {
        console.log('音频播放结束');
        // 处理循环播放
        this.handleLoopPlayback();
      });
    }
  },
  compareVersion(v1, v2) {
    v1 = v1.split('.');
    v2 = v2.split('.');
    const len = Math.max(v1.length, v2.length);

    while (v1.length < len) {
      v1.push('0');
    }
    while (v2.length < len) {
      v2.push('0');
    }

    for (let i = 0; i < len; i++) {
      const num1 = parseInt(v1[i]);
      const num2 = parseInt(v2[i]);
      if (num1 > num2) {
        return 1;
      } else if (num1 < num2) {
        return -1;
      }
    }
    return 0;
  },
  chooseAudio() {
    let that = this;
    
    // 直接使用 chooseMessageFile 从聊天记录中选择文件
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['mp3', 'wav', 'm4a', 'aac'],
      success(res) {
        console.log('选择音频成功:', res);
        const audioPath = res.tempFiles[0].path;
        
        // 更新状态
        that.setData({
          audioSrc: audioPath,
          startTime: 0,
          startTimeInput: '0',
          loopTimes: 100,
          loopTimesInput: '100',
          currentTime: 0,
          formattedCurrentTime: '0.0',
          formattedEndTime: '0.0',
          durationSet: false,
          currentLoop: 0
        });
        
        wx.showLoading({ title: '加载音频中...' });
        
        // 初始化音频上下文
        that.initAudioContext();
        
        // 设置音频源
        that.audioCtx.src = audioPath;
        
        // 尝试获取音频时长
        const checkDuration = () => {
          // 播放一小段来获取时长
          that.audioCtx.play();
          
          setTimeout(() => {
            that.audioCtx.pause();
            
            const duration = that.audioCtx.duration;
            console.log('获取到音频时长:', duration);
            
            if (duration && duration > 0) {
              that.setData({
                endTime: duration,
                endTimeInput: duration.toFixed(1),
                formattedEndTime: duration.toFixed(1),
                durationSet: true
              });
              wx.hideLoading();
            } else {
              // 如果还没有获取到时长，再次尝试
              setTimeout(() => {
                const retryDuration = that.audioCtx.duration;
                if (retryDuration && retryDuration > 0) {
                  that.setData({
                    endTime: retryDuration,
                    endTimeInput: retryDuration.toFixed(1),
                    formattedEndTime: retryDuration.toFixed(1),
                    durationSet: true
                  });
                  wx.hideLoading();
                } else {
                  wx.hideLoading();
                  wx.showToast({
                    title: '无法获取音频时长',
                    icon: 'none'
                  });
                }
              }, 1000);
            }
          }, 200);
        };
        
        // 监听音频加载完成事件
        that.audioCtx.onCanplay(() => {
          console.log('音频可以播放');
          
          // 只在初始加载时获取时长
          if (!that.data.durationSet) {
            checkDuration();
          }
        });
        
        // 设置加载超时
        setTimeout(() => {
          if (!that.data.durationSet) {
            checkDuration();
          }
        }, 2000);
      },
      fail(err) {
        console.error('选择音频失败', err);
        wx.showToast({
          title: '请选择有效的音频文件',
          icon: 'none'
        });
        
        // 显示提示
        that.showFileSelectionTip();
      }
    });
  },
  chooseMedia() {
    let that = this;
    const params = {
      count: 1,
      mediaType: ['audio'],
      sourceType: ['album'],
      success(res) {
        console.log('选择音频成功:', res);
        const audioPath = res.tempFiles[0].tempFilePath;
        that.setData({
          audioSrc: audioPath,
          startTime: 0,
          startTimeInput: '0',
          loopTimes: 100,
          endTime: 0,
          endTimeInput: '',
          currentTime: 0,
          formattedCurrentTime: '0.0',
          formattedEndTime: '0.0',
          durationSet: false
        });
        that.audioCtx.src = audioPath;

        wx.showLoading({ title: '加载音频中' });

        that.audioCtx.onCanplay(() => {
          if (that.data.durationSet) return;

          let duration = that.audioCtx.duration;
          console.log('onCanplay duration:', duration);

          if (!duration || duration <= 0) {
            that.audioCtx.play();
            that.audioCtx.pause();
            setTimeout(() => {
              duration = that.audioCtx.duration;
              console.log('After force play/pause duration:', duration);
              that.setData({
                endTime: duration || 0,
                endTimeInput: (duration || 0).toFixed(1),
                formattedEndTime: (duration || 0).toFixed(1),
                durationSet: true,
                refreshTrigger: Date.now()
              });
              console.log('Set endTime (force):', that.data.endTime);
              wx.hideLoading();
              if (!duration || duration <= 0) {
                wx.showToast({ title: '无法获取音频时长', icon: 'none' });
              }
            }, 500);
          } else {
            that.setData({
              endTime: duration,
              endTimeInput: duration.toFixed(1),
              formattedEndTime: duration.toFixed(1),
              durationSet: true,
              refreshTrigger: Date.now()
            });
            console.log('Set endTime (direct):', that.data.endTime);
            wx.hideLoading();
          }
        });

        that.audioCtx.onError((err) => {
          console.error('Audio error:', err);
          wx.hideLoading();
          wx.showToast({ title: '音频加载失败: ' + JSON.stringify(err), icon: 'none' });
        });
      },
      fail(err) {
        console.error('选择音频失败', err);
        wx.showToast({ title: '音频选择失败: ' + JSON.stringify(err), icon: 'none' });
        that.showFileSelectionTip();
      }
    };
    console.log('Calling wx.chooseMedia with params:', params);
    wx.chooseMedia(params);
  },
  chooseFileFromChat() {
    let that = this;
    
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['mp3', 'wav', 'm4a', 'aac'],
      success(res) {
        console.log('从聊天记录选择音频成功:', res);
        const audioPath = res.tempFiles[0].path;
        
        // 更新状态
        that.setData({
          audioSrc: audioPath,
          startTime: 0,
          startTimeInput: '0',
          loopTimes: 100,
          loopTimesInput: '100',
          currentTime: 0,
          formattedCurrentTime: '0.0',
          formattedEndTime: '0.0',
          durationSet: false,
          currentLoop: 0
        });
        
        // 其余代码与 chooseAudio 成功回调相同...
        wx.showLoading({ title: '加载音频中...' });
        
        // 初始化音频上下文
        that.initAudioContext();
        
        // 设置音频源
        that.audioCtx.src = audioPath;
        
        // 尝试获取音频时长
        const checkDuration = () => {
          // 播放一小段来获取时长
          that.audioCtx.play();
          
          setTimeout(() => {
            that.audioCtx.pause();
            
            const duration = that.audioCtx.duration;
            console.log('获取到音频时长:', duration);
            
            if (duration && duration > 0) {
              that.setData({
                endTime: duration,
                endTimeInput: duration.toFixed(1),
                formattedEndTime: duration.toFixed(1),
                durationSet: true
              });
              wx.hideLoading();
            } else {
              // 如果还没有获取到时长，再次尝试
              setTimeout(() => {
                const retryDuration = that.audioCtx.duration;
                if (retryDuration && retryDuration > 0) {
                  that.setData({
                    endTime: retryDuration,
                    endTimeInput: retryDuration.toFixed(1),
                    formattedEndTime: retryDuration.toFixed(1),
                    durationSet: true
                  });
                  wx.hideLoading();
                } else {
                  wx.hideLoading();
                  wx.showToast({
                    title: '无法获取音频时长',
                    icon: 'none'
                  });
                }
              }, 1000);
            }
          }, 200);
        };
        
        // 监听音频加载完成事件
        that.audioCtx.onCanplay(() => {
          console.log('音频可以播放');
          
          // 只在初始加载时获取时长
          if (!that.data.durationSet) {
            checkDuration();
          }
        });
        
        // 设置加载超时
        setTimeout(() => {
          if (!that.data.durationSet) {
            checkDuration();
          }
        }, 2000);
      },
      fail(err) {
        console.error('从聊天记录选择文件失败', err);
        wx.showToast({ 
          title: '请选择有效的音频文件', 
          icon: 'none' 
        });
      }
    });
  },
  showFileSelectionTip() {
    wx.showModal({
      title: '提示',
      content: '如果您使用的是iPhone，请先将音频文件发送到微信聊天中（可以发送给文件传输助手），然后从聊天记录中选择文件。',
      showCancel: false,
      confirmText: '我知道了'
    });
  },
  setStartTime(e) {
    // 获取用户输入的原始值
    const inputValue = e.detail.value;
    
    // 更新输入框显示值，保留用户输入的原始值
    this.setData({
      startTimeInput: inputValue
    });
    
    // 如果输入有效，更新实际起始时间
    if (inputValue !== '') {
      const value = parseFloat(inputValue);
      if (!isNaN(value)) {
        console.log('设置起始时间:', value);
        this.setData({
          startTime: value,
          currentTime: value,  // 同时更新当前时间
          formattedCurrentTime: value.toFixed(1)  // 更新显示的当前时间
        });
        
        // 如果音频已加载，将播放位置设置到起始时间
        if (this.audioCtx && this.data.audioSrc) {
          this.audioCtx.seek(value);
        }
      }
    } else {
      // 如果输入为空，设置起始时间为0
      this.setData({
        startTime: 0
      });
    }
  },
  setEndTime(e) {
    const inputValue = e.detail.value;
    
    // 更新输入框显示值
    this.setData({
      endTimeInput: inputValue
    });
    
    // 如果输入有效，更新实际结束时间
    if (inputValue !== '') {
      const value = parseFloat(inputValue);
      if (!isNaN(value)) {
        console.log('设置结束时间:', value);
        this.setData({
          endTime: value,
          formattedEndTime: value.toFixed(1)
        });
      }
    } else {
      // 如果输入为空，使用音频总时长作为结束时间
      if (this.audioCtx && this.audioCtx.duration) {
        this.setData({
          endTime: this.audioCtx.duration,
          formattedEndTime: this.audioCtx.duration.toFixed(1)
        });
      } else {
        this.setData({
          endTime: 0,
          formattedEndTime: '0.0'
        });
      }
    }
  },
  setLoopTimes(e) {
    // 获取输入值
    const value = e.detail.value;
    
    // 更新输入框显示值
    this.setData({ loopTimesInput: value });
    
    // 如果输入有效，更新实际循环次数
    if (value) {
      const loopTimes = parseInt(value);
      if (!isNaN(loopTimes) && loopTimes > 0) {
        this.setData({ loopTimes: loopTimes });
      }
    }
  },
  playAudio() {
    if (!this.data.audioSrc) {
      wx.showToast({ title: '请先选择音频', icon: 'none' });
      return;
    }
    
    console.log('开始播放音频, 当前循环:', this.data.currentLoop);
    
    // 设置必要的属性
    this.backgroundAudioManager.title = '音频循环播放';
    this.backgroundAudioManager.epname = '音频循环播放';
    this.backgroundAudioManager.singer = '音频循环播放';
    
    // 设置音频源
    this.backgroundAudioManager.src = this.data.audioSrc;
    
    // 开始播放
    this.backgroundAudioManager.play();
    
    // 设置播放位置
    setTimeout(() => {
      this.backgroundAudioManager.seek(this.data.startTime);
    }, 100);
  },
  startPlaySegment() {
    // 设置播放位置
    this.audioCtx.seek(this.data.startTime);
    console.log('设置播放位置:', this.data.startTime);
    
    // 开始播放
    setTimeout(() => {
      this.audioCtx.play();
    }, 100);
  },
  handleLoopPlayback() {
    console.log('处理循环播放, 当前循环:', this.data.currentLoop, '总循环:', this.data.loopTimes);
    
    if (this.data.currentLoop < this.data.loopTimes - 1) {
      // 增加循环计数
      this.setData({
        currentLoop: this.data.currentLoop + 1
      });
      console.log('开始下一次循环，当前次数:', this.data.currentLoop);
      
      // 重新开始播放
      setTimeout(() => {
        this.playAudio();
      }, 300);
    } else {
      // 循环完成
      console.log('循环播放完成');
      this.setData({
        currentLoop: 0
      });
      this.manualStop = true;  // 标记为手动停止
      this.backgroundAudioManager.stop();
    }
  },
  pauseAudio() {
    if (this.backgroundAudioManager) {
      this.backgroundAudioManager.pause();
    }
  },
  stopAudio() {
    if (this.backgroundAudioManager) {
      this.manualStop = true;  // 标记为手动停止
      this.backgroundAudioManager.stop();
      // 重置循环计数
      this.setData({
        currentLoop: 0
      });
    }
  },
  seekAudio(e) {
    const seekTime = parseFloat(e.detail.value);
    if (this.audioCtx) {
      this.audioCtx.seek(seekTime);
      this.setData({
        currentTime: seekTime,
        formattedCurrentTime: seekTime.toFixed(1)
      });
    }
  },
  resetEndTime() {
    if (this.data.audioSrc) {
      const duration = this.audioCtx.duration;
      if (duration && duration > 0) {
        this.setData({
          endTime: duration,
          endTimeInput: duration.toFixed(1),
          formattedEndTime: duration.toFixed(1)
        });
      } else {
        wx.showToast({ title: '无法获取音频时长', icon: 'none' });
      }
    } else {
      wx.showToast({ title: '请先选择音频', icon: 'none' });
    }
  },
  toggleVolume(e) {
    const enabled = e.detail.value;
    // 背景音频不支持直接调整音量，需要用户通过系统音量控制
    this.setData({
      volumeEnabled: enabled
    });
  },
  onUnload() {
    if (this.audioCtx) {
      this.audioCtx.destroy();
    }
  },
  onReady() {
    // 微信小程序不支持 wx.createComponent，所以我们需要移除这段代码
  },
  showLoopTimesDialog() {
    // 显示一个自定义对话框来设置循环次数
    wx.showModal({
      title: '设置循环次数',
      content: '请输入循环次数（1-100）:',
      editable: true,
      placeholderText: this.data.loopTimes.toString(),
      success: (res) => {
        if (res.confirm && res.content) {
          const value = res.content;
          const loopTimes = parseInt(value);
          
          // 确保是有效的正整数
          if (!isNaN(loopTimes) && loopTimes > 0) {
            console.log('通过对话框设置循环次数:', loopTimes);
            this.setData({ loopTimes: loopTimes });
          } else {
            wx.showToast({
              title: '请输入有效的正整数',
              icon: 'none'
            });
          }
        }
      }
    });
  },
  onShow() {
    // 页面显示时，检查并恢复播放状态
    if (this.audioCtx) {
      console.log('页面显示，检查播放状态');
      if (!this.audioCtx.paused) {
        // 如果之前在播放，则恢复播放
        this.audioCtx.play();
      }
    }
  },
  onHide() {
    // 页面隐藏时，不要暂停播放
    console.log('页面隐藏，保持播放状态');
  },
  setNoteText(e) {
    const inputValue = e.detail.value;
    this.setData({
      noteInput: inputValue,
      noteText: inputValue
    });
  }
});