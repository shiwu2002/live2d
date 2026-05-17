# 自定义语音模型接口文档

> 基础路径：`/api/voice-model`
> 所有接口返回统一格式：`{ code: number, msg: string, data: T }`

---

## 一、性能影响分析

### 1.1 未使用自定义模型（默认 DashScope）

```
用户说话 → [流式ASR: 实时识别，边说边出字] → [LLM流式生成] → [流式TTS: 边生成边播放]
```

- ASR 延迟：**~200ms**（首包），支持中间结果实时展示
- TTS 延迟：**~300ms**（首包），流式播放，逐帧推送

### 1.2 使用自定义模型（批量模式 streamMode=none）

```
用户说话 → [音频累积到缓冲区] → [停止录音后整段发送ASR] → [LLM流式生成] → [整段文本发送TTS → 整段音频返回]
```

- ASR 延迟：**录音结束后 + 网络往返**（无中间结果，不支持边说边出字）
- TTS 延迟：**整段文本合成完成后一次性返回**（无流式播放，需等待整段合成）

### 1.3 使用自定义模型（流式模式 streamMode=stream）✅ 推荐

```
用户说话 → [WebSocket流式ASR: 实时发送音频，实时出字] → [LLM流式生成] → [HTTP流式TTS: 边生成边播放]
```

- ASR 延迟：**~200ms**（与DashScope相当），支持 `partial:` 中间结果
- TTS 延迟：**~300ms**（与DashScope相当），音频帧逐块推送，边生成边播放

### 1.4 性能对比

| 环节 | 默认 DashScope | 自定义(批量 none) | 自定义(流式 stream) |
|------|---------------|------------------|-------------------|
| **连接建立** | ~100ms | ~120ms | ~150ms（+WS连接） |
| **ASR 首字延迟** | ~200ms（流式） | 录音结束后才开始 | ~200ms（流式） |
| **ASR 中间结果** | ✅ `partial:` | ❌ 不支持 | ✅ `partial:` |
| **TTS 首音延迟** | ~300ms（流式） | 整段合成后返回 | ~300ms（流式） |
| **TTS 流式播放** | ✅ 边生成边播放 | ❌ 整段返回 | ✅ 边生成边播放 |
| **内存占用** | 低（流式） | 较高（缓冲整段） | 低（流式） |

### 1.5 结论

- **未设置自定义模型的用户**：零性能损失，流程完全不变
- **streamMode=stream**：**与DashScope体验一致**，支持实时ASR中间结果和TTS流式播放
- **streamMode=none**：批量模式，体验降级，仅在不支持流式的服务商时使用
- **推荐**：优先设置 `streamMode=stream`，流式连接失败时自动回退到批量模式

---

## 二、streamMode 说明

`streamMode` 字段控制自定义语音模型的调用方式：

| 值 | 说明 | ASR 行为 | TTS 行为 |
|------|------|---------|---------|
| `none` | 批量HTTP模式（默认） | 录音停止后整段发送 | 整段文本合成后返回 |
| `stream` | 流式模式（推荐） | WebSocket实时发送音频，实时返回识别结果 | HTTP流式读取，边收音频帧边推送 |

**ASR 流式模式要求：**
- `baseUrl` 必须是 WebSocket 地址（`ws://` 或 `wss://`）
- 服务端需支持接收二进制音频帧，返回 JSON 文本消息
- JSON 结果需包含 `text` 字段（识别文本）和 `is_final`/`is_sentence_end` 字段（是否最终结果）

**TTS 流式模式要求：**
- 服务端需支持 HTTP 流式响应（chunked transfer / SSE）
- 请求体中会自动附加 `"stream": true` 参数
- 响应体为流式音频数据，服务端需逐块返回

---

## 三、接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/voice-model/create` | 创建语音模型 |
| PUT | `/api/voice-model/update/{id}` | 更新语音模型 |
| DELETE | `/api/voice-model/delete/{id}` | 删除语音模型 |
| GET | `/api/voice-model/list` | 获取用户所有语音模型 |
| GET | `/api/voice-model/list/{modelType}` | 按类型获取语音模型 |
| GET | `/api/voice-model/detail/{id}` | 获取语音模型详情 |
| POST | `/api/voice-model/test-tts/{id}` | 测试TTS模型 |
| POST | `/api/voice-model/test-asr/{id}` | 测试ASR模型 |
| POST | `/api/voice-model/set-default/{id}` | 设置默认语音模型 |
| GET | `/api/voice-model/user/tts` | 获取用户当前TTS配置 |
| GET | `/api/voice-model/user/asr` | 获取用户当前ASR配置 |

---

## 四、接口详情

### 4.1 创建语音模型

`POST /api/voice-model/create`

**请求体（JSON）：**

```json
{
  "userId": "用户ID（必填）",
  "modelType": "tts",
  "modelName": "我的TTS模型（必填）",
  "baseUrl": "https://api.openai.com/v1/audio/speech（必填）",
  "modelId": "tts-1（必填）",
  "apiKey": "sk-xxx（选填）",
  "voice": "alloy（TTS选填，默认alloy）",
  "format": "pcm（ASR选填，默认pcm）",
  "sampleRate": 16000,
  "streamMode": "stream（选填，默认none）",
  "isDefault": true
}
```

**modelType 取值：**
- `tts` — 语音合成模型
- `asr` — 语音识别模型

**streamMode 取值：**
- `none` — 批量HTTP模式（默认），录音停止后整段发送
- `stream` — 流式模式（推荐），实时发送音频/实时返回结果

**voice 取值（TTS模型）：** 取决于服务商，常见值：
- OpenAI: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`
- DashScope: `longhua_v2`, `waner`, `longxia`, `xiaoyun`

**format 取值（ASR模型）：** `pcm`, `wav`, `mp3`, `ogg`, `flac`

**响应：**

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "id": 1,
    "fullIdentifier": "voice:1",
    "modelName": "我的TTS模型",
    "modelType": "tts",
    "modelId": "tts-1",
    "message": "语音模型创建成功"
  }
}
```

---

### 4.2 更新语音模型

`PUT /api/voice-model/update/{id}`

**路径参数：**
- `id` — 模型ID

**查询参数：**
- `userId` — 用户ID

**请求体（JSON，仅传需要更新的字段）：**

```json
{
  "modelName": "新名称",
  "baseUrl": "https://new-api.example.com/v1/audio/speech",
  "modelId": "new-model",
  "apiKey": "sk-new-key",
  "voice": "nova",
  "streamMode": "stream",
  "isDefault": true
}
```

**响应：**

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "id": 1,
    "fullIdentifier": "voice:1",
    "modelName": "新名称",
    "message": "语音模型更新成功"
  }
}
```

---

### 4.3 删除语音模型

`DELETE /api/voice-model/delete/{id}?userId=xxx`

**响应：**

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "success": true,
    "message": "语音模型删除成功"
  }
}
```

---

### 4.4 获取用户所有语音模型

`GET /api/voice-model/list?userId=xxx`

**响应：**

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": [
    {
      "id": 1,
      "userId": "xxx",
      "modelType": "tts",
      "modelName": "OpenAI TTS",
      "baseUrl": "https://api.openai.com/v1/audio/speech",
      "modelId": "tts-1",
      "apiKey": "sk-1****abcd",
      "hasApiKey": true,
      "voice": "alloy",
      "format": null,
      "sampleRate": null,
      "streamMode": "stream",
      "isDefault": true,
      "status": 1,
      "fullIdentifier": "voice:1",
      "createTime": "2026-05-17T10:00:00",
      "updateTime": "2026-05-17T10:00:00"
    },
    {
      "id": 2,
      "userId": "xxx",
      "modelType": "asr",
      "modelName": "Whisper ASR",
      "baseUrl": "wss://api.example.com/v1/audio/asr/stream",
      "modelId": "whisper-1",
      "apiKey": "sk-1****abcd",
      "hasApiKey": true,
      "voice": null,
      "format": "pcm",
      "sampleRate": 16000,
      "streamMode": "stream",
      "isDefault": true,
      "status": 1,
      "fullIdentifier": "voice:2",
      "createTime": "2026-05-17T10:00:00",
      "updateTime": "2026-05-17T10:00:00"
    }
  ]
}
```

---

### 4.5 按类型获取语音模型

`GET /api/voice-model/list/{modelType}?userId=xxx`

**路径参数：**
- `modelType` — `tts` 或 `asr`

**响应：** 同 4.4，仅返回指定类型的模型

---

### 4.6 获取语音模型详情

`GET /api/voice-model/detail/{id}?userId=xxx`

**响应：** 同 4.4 中的单个模型对象

---

### 4.7 测试TTS模型

`POST /api/voice-model/test-tts/{id}?userId=xxx&text=你好，这是测试`

**路径参数：**
- `id` — TTS模型ID

**查询参数：**
- `userId` — 用户ID
- `text` — 测试文本（默认：`你好，这是一段测试语音。`）

**响应：**

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "success": true,
    "modelId": "tts-1",
    "modelName": "OpenAI TTS",
    "audioSize": 24576,
    "executionTime": "850ms"
  }
}
```

---

### 4.8 测试ASR模型

`POST /api/voice-model/test-asr/{id}?userId=xxx`

**响应：**

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "success": true,
    "message": "ASR模型配置验证通过，请通过语音对话进行实际测试"
  }
}
```

---

### 4.9 设置默认语音模型

`POST /api/voice-model/set-default/{id}?userId=xxx`

> 设置后，该用户下次建立语音WebSocket连接时自动使用此模型。同一类型只能有一个默认模型。

**响应：**

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "success": true,
    "message": "默认语音模型设置成功",
    "fullIdentifier": "voice:1",
    "modelType": "tts"
  }
}
```

---

### 4.10 获取用户当前TTS配置

`GET /api/voice-model/user/tts?userId=xxx`

**响应（已设置自定义TTS）：**

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "id": 1,
    "modelType": "tts",
    "modelName": "OpenAI TTS",
    "modelId": "tts-1",
    "voice": "alloy",
    "streamMode": "stream",
    "isDefault": true,
    "hasCustomTts": true,
    "..."
  }
}
```

**响应（未设置自定义TTS）：**

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "hasCustomTts": false,
    "message": "未设置自定义TTS模型，将使用默认DashScope TTS"
  }
}
```

---

### 4.11 获取用户当前ASR配置

`GET /api/voice-model/user/asr?userId=xxx`

**响应（已设置自定义ASR）：**

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "id": 2,
    "modelType": "asr",
    "modelName": "Whisper ASR",
    "modelId": "whisper-1",
    "format": "pcm",
    "sampleRate": 16000,
    "streamMode": "stream",
    "isDefault": true,
    "hasCustomAsr": true,
    "..."
  }
}
```

**响应（未设置自定义ASR）：**

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "hasCustomAsr": false,
    "message": "未设置自定义ASR模型，将使用默认DashScope ASR"
  }
}
```

---

## 五、前端对接指南

### 5.1 语音设置页面流程

```
1. 进入设置页 → GET /api/voice-model/list?userId=xxx 获取已有模型列表
2. 点击"添加TTS" → 弹出表单 → POST /api/voice-model/create
3. 点击"添加ASR" → 弹出表单 → POST /api/voice-model/create
4. 点击"测试" → POST /api/voice-model/test-tts/{id} 或 test-asr/{id}
5. 点击"设为默认" → POST /api/voice-model/set-default/{id}
6. 点击"编辑" → PUT /api/voice-model/update/{id}
7. 点击"删除" → DELETE /api/voice-model/delete/{id}
```

### 5.2 创建TTS模型表单

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | ✅ | 用户ID |
| modelType | string | ✅ | 固定填 `tts` |
| modelName | string | ✅ | 模型名称（如"OpenAI TTS"） |
| baseUrl | string | ✅ | TTS接口地址 |
| modelId | string | ✅ | 模型ID（如 `tts-1`） |
| apiKey | string | ❌ | API密钥 |
| voice | string | ❌ | 音色（默认 `alloy`） |
| streamMode | string | ❌ | `none`（默认）或 `stream`（推荐） |
| isDefault | boolean | ❌ | 是否设为默认 |

**常见TTS baseUrl 示例：**
- OpenAI: `https://api.openai.com/v1/audio/speech`
- DashScope: `https://dashscope.aliyuncs.com/compatible-mode/v1/audio/speech`

### 5.3 创建ASR模型表单

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | ✅ | 用户ID |
| modelType | string | ✅ | 固定填 `asr` |
| modelName | string | ✅ | 模型名称（如"Whisper ASR"） |
| baseUrl | string | ✅ | ASR接口地址（流式模式需 `ws://` 或 `wss://`） |
| modelId | string | ✅ | 模型ID（如 `whisper-1`） |
| apiKey | string | ❌ | API密钥 |
| format | string | ❌ | 音频格式（默认 `pcm`） |
| sampleRate | number | ❌ | 采样率（默认 `16000`） |
| streamMode | string | ❌ | `none`（默认）或 `stream`（推荐） |
| isDefault | boolean | ❌ | 是否设为默认 |

**常见ASR baseUrl 示例：**
- OpenAI（批量）: `https://api.openai.com/v1/audio/transcriptions`
- DashScope（批量）: `https://dashscope.aliyuncs.com/compatible-mode/v1/audio/transcriptions`
- 自建流式ASR: `wss://asr.example.com/v1/asr/stream`

### 5.4 WebSocket 行为差异

| 行为 | 默认 DashScope | 自定义ASR(批量) | 自定义ASR(流式) |
|------|---------------|----------------|----------------|
| `partial:xxx` 中间结果 | ✅ 实时推送 | ❌ 不推送 | ✅ 实时推送 |
| `final:xxx` 最终结果 | ✅ 识别完成即推送 | ⏳ 录音停止后推送 | ✅ 识别完成即推送 |
| 录音中实时反馈 | ✅ | ❌ | ✅ |
| TTS 流式播放 | ✅ | ❌ 整段返回 | ✅ 逐帧推送 |

**前端适配建议：**
- `streamMode=stream` 时，行为与默认DashScope一致，无需特殊处理
- `streamMode=none` 时，录音中显示"识别中..."占位提示，收到 `final:xxx` 后再更新
- TTS 播放行为：`streamMode=stream` 时音频帧逐块推送（与DashScope一致），`streamMode=none` 时整段返回

### 5.5 错误码

| code | 说明 |
|------|------|
| 200 | 成功 |
| 400 | 参数错误（缺少必填字段、modelType不合法等） |
| 404 | 语音模型不存在或无权限 |
| 500 | 服务器异常（模型调用失败等） |

### 5.6 自动回退机制

当 `streamMode=stream` 但流式连接失败时（如ASR WebSocket连接超时），系统会自动回退到批量模式，无需前端额外处理。

---

## 六、数据库表结构

使用前需执行建表SQL：`app/src/main/resources/sql/user_voice_model.sql`

已有表需执行增量SQL添加 `stream_mode` 列：

```sql
ALTER TABLE `user_voice_model` ADD COLUMN `stream_mode` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'none' COMMENT '流式模式（none-批量HTTP，stream-流式WebSocket/SSE）' AFTER `sample_rate`;
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint | 主键自增 |
| user_id | varchar(64) | 用户ID |
| model_type | varchar(20) | `tts` 或 `asr` |
| model_name | varchar(100) | 模型名称 |
| base_url | varchar(500) | 接口地址 |
| model_id | varchar(100) | 模型ID |
| api_key | varchar(500) | API密钥（脱敏返回） |
| voice | varchar(100) | TTS音色 |
| format | varchar(20) | ASR音频格式 |
| sample_rate | int | ASR采样率 |
| stream_mode | varchar(20) | `none`（批量）或 `stream`（流式） |
| is_default | tinyint(1) | 是否默认 |
| status | tinyint(1) | 1-启用 0-禁用 |
| create_time | datetime | 创建时间 |
| update_time | datetime | 更新时间 |
