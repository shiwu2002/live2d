# RAG 接口文档

> 基础路径：`/rag`
>
> 统一响应格式：

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {}
}
```

### 响应码说明

| code | 含义 |
|------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未认证或token无效 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器异常 |

---

## 一、RAG 问答

### 1.1 基于知识库的 RAG 问答

**请求**

```
GET /rag/ask
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| question | String | ✅ | 用户问题 |
| userId | String | ❌ | 用户ID（微信openid） |
| aiSessionId | String | ❌ | AI会话ID |

**请求示例**

```
GET /rag/ask?question=你喜欢什么食物&userId=oIHwF7gRcXtNgvaU20hfsfy922rI&aiSessionId=c5cb38c9-0b8e-4a27-a88f-59f54ffd6a38
```

**响应示例**

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": "根据记忆，我喜欢火锅和烧烤，特别是冬天的时候和朋友们一起吃火锅。"
}
```

---

### 1.2 搜索相关文档

**请求**

```
GET /rag/search
```

**参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| query | String | ✅ | - | 查询内容 |
| userId | String | ❌ | - | 用户ID |
| aiSessionId | String | ❌ | - | AI会话ID |
| topK | int | ❌ | 3 | 返回结果数量 |

**请求示例**

```
GET /rag/search?query=食物偏好&userId=oIHwF7gRcXtNgvaU20hfsfy922rI&topK=5
```

**响应示例**

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": [
    {
      "text": "我喜欢的食物是火锅和烧烤",
      "metadata": {
        "userId": "oIHwF7gRcXtNgvaU20hfsfy922rI",
        "aiSessionId": "c5cb38c9-0b8e-4a27-a88f-59f54ffd6a38",
        "docType": "memory",
        "source": "memory_upload",
        "category": "preference",
        "index": 0,
        "createdAt": "2026-05-16T10:30:00Z",
        "memoryTimestamp": "2025-01-01T00:00:00"
      }
    }
  ]
}
```

---

## 二、记忆文档上传

### 2.1 文件上传（支持 Excel 和 JSON）

**请求**

```
POST /rag/memory/upload
Content-Type: multipart/form-data
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | ✅ | 上传的文件，支持 `.xlsx`、`.xls`、`.json` |
| userId | String | ❌ | 用户ID |
| aiSessionId | String | ❌ | AI会话ID |

**请求示例（curl）**

```bash
# 上传 Excel 文件
curl -X POST http://localhost:8080/rag/memory/upload \
  -F "file=@我的记忆.xlsx" \
  -F "userId=oIHwF7gRcXtNgvaU20hfsfy922rI" \
  -F "aiSessionId=c5cb38c9-0b8e-4a27-a88f-59f54ffd6a38"

# 上传 JSON 文件
curl -X POST http://localhost:8080/rag/memory/upload \
  -F "file=@memories.json" \
  -F "userId=oIHwF7gRcXtNgvaU20hfsfy922rI"
```

**响应示例**

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "documentId": 1,
    "title": "我的记忆",
    "memoryCount": 5,
    "chunkCount": 5
  }
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| documentId | Long | 记忆文档ID |
| title | String | 文档标题 |
| memoryCount | int | 记忆条数 |
| chunkCount | int | 向量化分块数 |

---

### 2.2 JSON Body 直接上传

**请求**

```
POST /rag/memory/upload-json?userId=xxx&aiSessionId=xxx
Content-Type: application/json
```

**参数**

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| jsonContent | Body | String | ✅ | JSON 格式的记忆文档内容 |
| userId | Query | String | ❌ | 用户ID |
| aiSessionId | Query | String | ❌ | AI会话ID |

**请求示例**

```bash
curl -X POST "http://localhost:8080/rag/memory/upload-json?userId=oIHwF7gRcXtNgvaU20hfsfy922rI" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "我的大学回忆",
    "description": "关于大学时期的聊天记忆",
    "memories": [
      {
        "content": "我和小明在大学时期是室友，我们经常一起打篮球",
        "category": "friendship",
        "timestamp": "2020-09-01T00:00:00"
      },
      {
        "content": "我喜欢的食物是火锅和烧烤",
        "category": "preference"
      }
    ]
  }'
```

**响应示例**

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "documentId": 2,
    "title": "我的大学回忆",
    "memoryCount": 2,
    "chunkCount": 2
  }
}
```

---

## 三、记忆文档管理

### 3.1 查询用户的记忆文档列表

**请求**

```
GET /rag/memory/list
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | String | ✅ | 用户ID |

**请求示例**

```
GET /rag/memory/list?userId=oIHwF7gRcXtNgvaU20hfsfy922rI
```

**响应示例**

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": [
    {
      "id": 1,
      "userId": "oIHwF7gRcXtNgvaU20hfsfy922rI",
      "aiSessionId": "c5cb38c9-0b8e-4a27-a88f-59f54ffd6a38",
      "title": "我的记忆",
      "description": null,
      "fileName": "我的记忆.xlsx",
      "fileContent": "...",
      "memoryCount": 5,
      "chunkCount": 5,
      "status": 1,
      "source": "upload",
      "createTime": "2026-05-16T10:30:00",
      "updateTime": "2026-05-16T10:30:00"
    }
  ]
}
```

**MemoryDocument 字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 文档ID |
| userId | String | 用户ID |
| aiSessionId | String | AI会话ID |
| title | String | 文档标题 |
| description | String | 文档描述 |
| fileName | String | 原始文件名 |
| fileContent | String | 原始文件内容（JSON序列化） |
| memoryCount | int | 记忆条数 |
| chunkCount | int | 向量化分块数 |
| status | int | 状态：0-待处理 1-已处理 2-处理失败 |
| source | String | 来源：upload |
| createTime | String | 创建时间 |
| updateTime | String | 更新时间 |

---

### 3.2 查询单个记忆文档详情

**请求**

```
GET /rag/memory/{id}
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Long | ✅ | 文档ID（路径参数） |

**请求示例**

```
GET /rag/memory/1
```

**响应示例**

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": {
    "id": 1,
    "userId": "oIHwF7gRcXtNgvaU20hfsfy922rI",
    "aiSessionId": "c5cb38c9-0b8e-4a27-a88f-59f54ffd6a38",
    "title": "我的记忆",
    "description": null,
    "fileName": "我的记忆.xlsx",
    "fileContent": "...",
    "memoryCount": 5,
    "chunkCount": 5,
    "status": 1,
    "source": "upload",
    "createTime": "2026-05-16T10:30:00",
    "updateTime": "2026-05-16T10:30:00"
  }
}
```

---

### 3.3 删除记忆文档

**请求**

```
DELETE /rag/memory/{id}
```

**参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | Long | ✅ | 文档ID（路径参数） |
| userId | String | ✅ | 用户ID（需与文档所属用户一致） |

**请求示例**

```
DELETE /rag/memory/1?userId=oIHwF7gRcXtNgvaU20hfsfy922rI
```

**响应示例**

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": null
}
```

---

## 四、文件格式规范

### 4.1 Excel 格式（推荐）

第一行为标题行，第二行起为数据，每行一条记忆。

**列定义**

| 列名 | 必填 | 说明 | 支持的中文列名 |
|------|------|------|---------------|
| content | ✅ | 记忆内容 | `内容` / `记忆内容` / `记忆` |
| category | ❌ | 记忆分类 | `分类` / `类别` / `类型` |
| timestamp | ❌ | 发生时间 | `时间` / `日期` / `发生时间` |

**示例表格**

| content | category | timestamp |
|---------|----------|-----------|
| 我和小明在大学时期是室友，我们经常一起打篮球 | friendship | 2020-09-01 |
| 我喜欢的食物是火锅和烧烤 | preference | |
| 我每天早上7点起床 | habit | 2025-01-01 |
| 我养了一只叫咪咪的猫 | pet | |
| 我最爱的电影是星际穿越 | preference | 2024-06-15 |

**category 常用值参考**

| 值 | 含义 |
|----|------|
| preference | 偏好/喜好 |
| habit | 习惯 |
| event | 事件/经历 |
| friendship | 友情/社交 |
| pet | 宠物 |
| family | 家庭 |
| work | 工作 |
| general | 通用（默认） |

**注意事项**
- 支持 `.xlsx`（Excel 2007+）和 `.xls`（Excel 97-2003）格式
- 文件大小限制：5MB
- 文件名（去掉扩展名）自动作为记忆文档标题
- timestamp 列支持日期格式单元格和文本格式
- content 为空的行会自动跳过

---

### 4.2 JSON 格式

```json
{
  "title": "我的大学回忆",
  "description": "关于大学时期的聊天记忆",
  "memories": [
    {
      "content": "我和小明在大学时期是室友，我们经常一起打篮球",
      "category": "friendship",
      "timestamp": "2020-09-01T00:00:00"
    },
    {
      "content": "我喜欢的食物是火锅和烧烤",
      "category": "preference"
    },
    {
      "content": "我每天早上7点起床",
      "category": "habit",
      "timestamp": "2025-01-01T00:00:00"
    }
  ]
}
```

**字段说明**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | String | ✅ | 记忆文档标题 |
| description | String | ❌ | 记忆文档描述 |
| memories | Array | ✅ | 记忆条目数组，至少1条 |
| memories[].content | String | ✅ | 记忆内容 |
| memories[].category | String | ❌ | 记忆分类，默认 `general` |
| memories[].timestamp | String | ❌ | 发生时间，ISO 8601 格式 |

---

## 五、接口总览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/rag/ask` | RAG 知识库问答 |
| GET | `/rag/search` | 搜索相关文档 |
| POST | `/rag/memory/upload` | 文件上传（Excel / JSON） |
| POST | `/rag/memory/upload-json` | JSON Body 直接上传 |
| GET | `/rag/memory/list` | 查询用户记忆文档列表 |
| GET | `/rag/memory/{id}` | 查询单个记忆文档详情 |
| DELETE | `/rag/memory/{id}` | 删除记忆文档 |

---

## 六、前端对接示例

### 6.1 Vue3 + Axios 上传 Excel

```javascript
async function uploadMemoryExcel(file, userId, aiSessionId) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('userId', userId)
  if (aiSessionId) {
    formData.append('aiSessionId', aiSessionId)
  }

  const res = await axios.post('/rag/memory/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data
}
```

### 6.2 微信小程序上传 Excel

```javascript
wx.chooseMessageFile({
  count: 1,
  type: 'file',
  extension: ['xlsx', 'xls', 'json'],
  success(res) {
    const filePath = res.tempFiles[0].path
    wx.uploadFile({
      url: 'https://your-domain.com/rag/memory/upload',
      filePath: filePath,
      name: 'file',
      formData: {
        userId: 'xxx',
        aiSessionId: 'xxx'
      },
      success(uploadRes) {
        const data = JSON.parse(uploadRes.data)
        console.log('上传结果:', data)
      }
    })
  }
})
```

### 6.3 RAG 问答调用

```javascript
async function askRag(question, userId, aiSessionId) {
  const res = await axios.get('/rag/ask', {
    params: { question, userId, aiSessionId }
  })
  return res.data
}
```
