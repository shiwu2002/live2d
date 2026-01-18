# 语音通话功能测试指南

## 已完成的修改

基于后端WebSocket接口v2.0.0版本文档，已完成以下修改：

### 1. AudioPlayer (src/services/audioPlayer.ts)
- ✅ 从PCM格式改为MP3格式
- ✅ MIME类型修正为 `audio/mpeg`
- ✅ 实现音频队列管理，支持顺序播放

### 2. VoiceCallManager (src/services/voiceCallManager.ts)
- ✅ 实现流式AI回复累积逻辑
- ✅ 添加 `aiReplyBuffer` 缓冲区
- ✅ 实现 `ai:` 前缀识别和内容拼接
- ✅ 实现 `ai_reply_complete` 标记处理
- ✅ 添加详细调试日志输出

### 3. VoiceCall.vue (src/components/VoiceCall.vue)
- ✅ 添加AI回复显示区域
- ✅ 实现流式文本显示
- ✅ 添加流式指示器动画
- ✅ 订阅AI回复事件

## 测试步骤

### 1. 启动开发服务器
```bash
npm run dev
```

### 2. 打开浏览器控制台
- 按 F12 打开开发者工具
- 切换到 Console 标签页

### 3. 开始语音通话
- 点击"开始通话"按钮
- 允许麦克风权限

### 4. 说话测试
- 对着麦克风说话
- 观察界面上的识别结果和AI回复

### 5. 关键调试信息

当收到音频数据时，控制台会输出以下信息：

```
收到音频数据，大小: XXXX bytes
音频数据前两个字节: 0xXX 0xXX
```

#### 判断标准

1. **有效的MP3数据**
   - 前两个字节应该是：`0xFF 0xFB` 或 `0xFF 0xF3`
   - 数据大小应该大于0

2. **无效数据**
   - 如果数据大小为0，说明后端没有发送音频
   - 如果前两个字节不是MP3标准头，需要检查后端实际发送的格式

### 6. 常见问题排查

#### 问题1：音频播放失败 "NotSupportedError"
**可能原因：**
- 后端发送的不是MP3格式
- 音频数据损坏
- 浏览器不支持该MP3编码格式

**排查方法：**
1. 查看控制台输出的音频数据前两个字节
2. 如果不是 `0xFF 0xFB` 或 `0xFF 0xF3`，联系后端确认实际格式
3. 尝试保存接收到的音频数据为文件，用播放器测试

#### 问题2：没有收到AI回复
**可能原因：**
- WebSocket连接未建立
- 后端未发送AI回复
- 消息格式不匹配

**排查方法：**
1. 查看控制台是否有 "WebSocket已连接" 消息
2. 查看是否有 "收到流式AI回复" 日志
3. 检查后端是否正确发送 `ai:` 前缀的消息

#### 问题3：AI回复显示不完整
**可能原因：**
- 未收到 `ai_reply_complete` 标记
- 消息顺序错乱

**排查方法：**
1. 查看控制台是否有 "AI回复完成" 日志
2. 检查所有 "收到流式AI回复" 的内容

## 测试检查清单

- [ ] WebSocket成功连接
- [ ] 能够录音并发送
- [ ] 收到识别结果（如果后端支持）
- [ ] 收到流式AI回复（带 `ai:` 前缀）
- [ ] AI回复能正确累积显示
- [ ] 收到 `ai_reply_complete` 标记
- [ ] 收到MP3音频数据（大小>0）
- [ ] 音频数据格式正确（前两字节是MP3头）
- [ ] 音频能够正常播放
- [ ] 打断功能正常工作

## 下一步行动

根据测试结果：

1. **如果音频数据前两字节是MP3格式**
   - 可能是浏览器兼容性问题
   - 尝试不同的浏览器测试
   - 检查音频编码参数

2. **如果音频数据不是MP3格式**
   - 联系后端开发确认实际发送的格式
   - 可能需要调整AudioPlayer的处理逻辑

3. **如果没有收到音频数据**
   - 检查后端TTS服务是否正常
   - 检查WebSocket消息类型判断逻辑

## 代码位置参考

- **AudioPlayer**: `src/services/audioPlayer.ts`
- **VoiceCallManager**: `src/services/voiceCallManager.ts`
- **VoiceCall组件**: `src/components/VoiceCall.vue`
- **WebSocket服务**: `src/services/websocket.ts`
