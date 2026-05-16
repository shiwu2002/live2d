<template>
  <div class="memory-upload-modal" v-if="visible" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>📝 对话记忆管理</h3>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <div class="upload-section">
          <h4>上传对话记忆文件</h4>
          <p class="upload-hint">支持 Excel (.xlsx, .xls) 和 JSON 格式</p>

          <div class="format-guide" @click="showFormatGuide = !showFormatGuide">
            <span class="guide-icon">📖</span>
            <span>查看上传格式说明</span>
            <span class="guide-toggle">{{ showFormatGuide ? '▲' : '▼' }}</span>
          </div>

          <div v-if="showFormatGuide" class="format-guide-content">
            <div class="format-tab">
              <button
                :class="{ active: activeTab === 'excel' }"
                @click="activeTab = 'excel'"
              >
                📊 Excel 格式
              </button>
              <button
                :class="{ active: activeTab === 'json' }"
                @click="activeTab = 'json'"
              >
                📋 JSON 格式
              </button>
            </div>

            <div v-if="activeTab === 'excel'" class="format-detail">
              <div class="format-section">
                <h5>基本要求</h5>
                <ul>
                  <li>第一行为<strong>标题行</strong>，第二行起为数据</li>
                  <li>每行代表一条<strong>对话消息</strong>（用户或AI说的话）</li>
                  <li>支持 <code>.xlsx</code>（推荐）和 <code>.xls</code> 格式</li>
                  <li>文件大小限制：<strong>5MB</strong></li>
                </ul>
              </div>

              <div class="format-section">
                <h5>列定义（支持中英文）</h5>
                <table class="format-table">
                  <thead>
                    <tr>
                      <th>列名</th>
                      <th>必填</th>
                      <th>支持的中文列名</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>role</code></td>
                      <td><strong>✅ 是</strong></td>
                      <td><code>角色</code> / <code>发送者</code> / <code>说话人</code> / <code>谁说的</code></td>
                    </tr>
                    <tr>
                      <td><code>content</code></td>
                      <td><strong>✅ 是</strong></td>
                      <td><code>内容</code> / <code>消息内容</code> / <code>消息</code> / <code>对话内容</code></td>
                    </tr>
                    <tr>
                      <td><code>timestamp</code></td>
                      <td>❌ 否</td>
                      <td><code>时间</code> / <code>日期</code> / <code>发生时间</code></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="format-section">
                <h5>role 值说明（说话角色）</h5>
                <div class="tag-list">
                  <span class="tag"><code>user</code> 用户说的话（也识别：我、人类）</span>
                  <span class="tag"><code>ai</code> AI说的话（也识别：assistant、bot、机器人、助手）</span>
                </div>
              </div>

              <div class="format-section">
                <h5>示例表格（对话记录）</h5>
                <div class="example-table-wrapper">
                  <table class="example-table">
                    <thead>
                      <tr>
                        <th>role</th>
                        <th>content</th>
                        <th>timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>user</td>
                        <td>你好，我今天心情不太好</td>
                        <td>2026-05-15 20:00</td>
                      </tr>
                      <tr>
                        <td>ai</td>
                        <td>怎么了？发生什么事了吗？跟我说说吧，我会一直陪着你的。</td>
                        <td>2026-05-15 20:00</td>
                      </tr>
                      <tr>
                        <td>user</td>
                        <td>其实也没什么，就是工作压力太大了</td>
                        <td>2026-05-15 20:01</td>
                      </tr>
                      <tr>
                        <td>ai</td>
                        <td>辛苦了！工作压力大的时候更要好好照顾自己。</td>
                        <td>2026-05-15 20:01</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="format-tips">
                <p>💡 <strong>提示：</strong></p>
                <ul>
                  <li><code>content</code> 为空的行会自动跳过</li>
                  <li><code>timestamp</code> 支持日期格式单元格或文本格式（<code>yyyy-MM-dd HH:mm:ss</code> 等）</li>
                  <li>文件名（去掉扩展名）会自动作为对话记忆标题</li>
                  <li>对话按行顺序排列，系统会按轮次进行<strong>对话感知分块</strong></li>
                </ul>
              </div>
            </div>

            <div v-if="activeTab === 'json'" class="format-detail">
              <div class="format-section">
                <h5>基本要求</h5>
                <ul>
                  <li>使用标准 <strong>JSON</strong> 格式</li>
                  <li>必须包含 <code>title</code> 和 <code>conversations</code> 字段</li>
                  <li><code>conversations</code> 数组至少包含 1 条对话记录</li>
                </ul>
              </div>

              <div class="format-section">
                <h5>字段说明</h5>
                <table class="format-table">
                  <thead>
                    <tr>
                      <th>字段</th>
                      <th>类型</th>
                      <th>必填</th>
                      <th>说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>title</code></td>
                      <td>String</td>
                      <td><strong>✅ 是</strong></td>
                      <td>对话记忆标题</td>
                    </tr>
                    <tr>
                      <td><code>description</code></td>
                      <td>String</td>
                      <td>❌ 否</td>
                      <td>对话记忆描述</td>
                    </tr>
                    <tr>
                      <td><code>conversations</code></td>
                      <td>Array</td>
                      <td><strong>✅ 是</strong></td>
                      <td>对话记录数组</td>
                    </tr>
                    <tr>
                      <td><code>conversations[].role</code></td>
                      <td>String</td>
                      <td><strong>✅ 是</strong></td>
                      <td>说话角色：<code>user</code> 或 <code>ai</code></td>
                    </tr>
                    <tr>
                      <td><code>conversations[].content</code></td>
                      <td>String</td>
                      <td><strong>✅ 是</strong></td>
                      <td>消息内容</td>
                    </tr>
                    <tr>
                      <td><code>conversations[].timestamp</code></td>
                      <td>String</td>
                      <td>❌ 否</td>
                      <td>消息时间（支持多种格式）</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="format-section">
                <h5>示例 JSON（对话记录）</h5>
                <div class="code-example">
<pre>{
  "title": "我和AI的日常对话",
  "description": "关于生活喜好的聊天记录",
  "conversations": [
    {
      "role": "user",
      "content": "你好，我今天心情不太好",
      "timestamp": "2026-05-15T20:00:00"
    },
    {
      "role": "ai",
      "content": "怎么了？发生什么事了吗？跟我说说吧，我会一直陪着你的。",
      "timestamp": "2026-05-15T20:00:01"
    },
    {
      "role": "user",
      "content": "其实也没什么，就是工作压力太大了",
      "timestamp": "2026-05-15T20:01:00"
    },
    {
      "role": "ai",
      "content": "辛苦了！工作压力大的时候更要好好照顾自己。要不要出去散散步放松一下？",
      "timestamp": "2026-05-15T20:01:01"
    }
  ]
}</pre>
                </div>
              </div>

              <div class="format-tips">
                <p>💡 <strong>提示：</strong></p>
                <ul>
                  <li><code>role</code> 必须是 <code>user</code> 或 <code>ai</code></li>
                  <li><code>timestamp</code> 支持多种格式（<code>yyyy-MM-ddTHH:mm:ss</code>、<code>yyyy-MM-dd HH:mm:ss</code>、<code>yyyy-MM-dd</code>）</li>
                  <li>确保 JSON 格式正确（注意逗号、引号等语法）</li>
                  <li>系统会自动进行<strong>对话感知分块</strong>，保持上下文完整</li>
                </ul>
              </div>
            </div>
          </div>

          <div
            class="upload-area"
            :class="{ 'drag-over': isDragOver }"
            @drop.prevent="handleDrop"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
          >
            <input
              type="file"
              ref="fileInput"
              accept=".xlsx,.xls,.json"
              @change="handleFileSelect"
              style="display: none"
            />
            <div class="upload-placeholder" @click="fileInput?.click()">
              <span class="upload-icon">📁</span>
              <p>点击或拖拽文件到此处上传</p>
              <p class="file-types">支持 .xlsx .xls .json 格式</p>
            </div>
          </div>

          <div v-if="selectedFile" class="selected-file">
            <span class="file-icon">📄</span>
            <span class="file-name">{{ selectedFile.name }}</span>
            <span class="file-size">({{ formatFileSize(selectedFile.size) }})</span>
            <button class="remove-file" @click="clearSelectedFile">✕</button>
          </div>

          <button
            class="upload-btn"
            :disabled="!selectedFile || isUploading"
            @click="handleUpload"
          >
            {{ isUploading ? '上传中...' : '开始上传' }}
          </button>
        </div>

        <div class="divider"></div>

        <div class="list-section">
          <h4>已上传的对话记忆</h4>

          <div v-if="isLoading" class="loading-state">
            <span class="loading-spinner"></span>
            <p>加载中...</p>
          </div>

          <div v-else-if="memoryList.length === 0" class="empty-state">
            <span class="empty-icon">💭</span>
            <p>暂无对话记忆</p>
            <p class="empty-hint">上传你的第一个对话记忆文件吧！</p>
          </div>

          <div v-else class="memory-list">
            <div
              v-for="doc in memoryList"
              :key="doc.id"
              class="memory-item"
            >
              <div class="memory-info">
                <div class="memory-title">{{ doc.title }}</div>
                <div class="memory-meta">
                  <span>📊 {{ doc.messageCount }} 条对话</span>
                  <span>📅 {{ formatTime(doc.createTime) }}</span>
                </div>
                <div v-if="doc.fileName" class="memory-file">
                  📎 {{ doc.fileName }}
                </div>
              </div>
              <div class="memory-actions">
                <button
                  class="delete-btn"
                  @click="handleDelete(doc.id)"
                  :disabled="isDeleting === doc.id"
                >
                  {{ isDeleting === doc.id ? '删除中...' : '🗑️' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="message" class="toast" :class="message.type">
        {{ message.text }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { ragService, type MemoryDocument } from '../services/ragService'

const props = defineProps<{
  visible: boolean
  userId: string
  aiSessionId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const isDragOver = ref(false)
const isUploading = ref(false)
const isLoading = ref(false)
const isDeleting = ref<number | null>(null)
const memoryList = ref<MemoryDocument[]>([])
const message = ref<{ text: string; type: 'success' | 'error' } | null>(null)

const showFormatGuide = ref(false)
const activeTab = ref<'excel' | 'json'>('excel')

watch(() => props.visible, (newVal) => {
  if (newVal && props.userId) {
    loadMemoryList()
  }
})

onMounted(() => {
  if (props.visible && props.userId) {
    loadMemoryList()
  }
})

const loadMemoryList = async () => {
  if (!props.userId) return

  isLoading.value = true
  try {
    const result = await ragService.getMemoryList(props.userId)
    if (result.code === 200 && result.data) {
      memoryList.value = result.data
    } else {
      showMessage(result.msg || '加载失败', 'error')
    }
  } catch (error) {
    console.error('加载记忆列表失败:', error)
    showMessage('网络错误，请重试', 'error')
  } finally {
    isLoading.value = false
  }
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    validateAndSelectFile(input.files[0])
  }
}

const handleDrop = (event: DragEvent) => {
  isDragOver.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    validateAndSelectFile(event.dataTransfer.files[0])
  }
}

const validateAndSelectFile = (file: File) => {
  const validTypes = ['.xlsx', '.xls', '.json']
  const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()

  if (!validTypes.includes(fileExt)) {
    showMessage('不支持的文件格式，请选择 Excel 或 JSON 文件', 'error')
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    showMessage('文件大小不能超过 5MB', 'error')
    return
  }

  selectedFile.value = file
}

const clearSelectedFile = () => {
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const handleUpload = async () => {
  if (!selectedFile.value || !props.userId || isUploading.value) return

  isUploading.value = true
  try {
    const result = await ragService.uploadMemoryFile(
      selectedFile.value,
      props.userId,
      props.aiSessionId
    )

    if (result.code === 200 && result.data) {
      showMessage(`上传成功：${result.data.title}（${result.data.messageCount} 条对话）`, 'success')
      clearSelectedFile()
      await loadMemoryList()
    } else {
      showMessage(result.msg || '上传失败', 'error')
    }
  } catch (error) {
    console.error('上传失败:', error)
    showMessage('网络错误，请重试', 'error')
  } finally {
    isUploading.value = false
  }
}

const handleDelete = async (id: number) => {
  if (!props.userId || isDeleting.value) return

  if (!confirm('确定要删除这个对话记忆吗？删除后无法恢复。')) {
    return
  }

  isDeleting.value = id
  try {
    const result = await ragService.deleteMemory(id, props.userId)
    if (result.code === 200) {
      showMessage('删除成功', 'success')
      await loadMemoryList()
    } else {
      showMessage(result.msg || '删除失败', 'error')
    }
  } catch (error) {
    console.error('删除失败:', error)
    showMessage('网络错误，请重试', 'error')
  } finally {
    isDeleting.value = null
  }
}

const showMessage = (text: string, type: 'success' | 'error') => {
  message.value = { text, type }
  setTimeout(() => {
    message.value = null
  }, 3000)
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formatTime = (timeStr: string): string => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
</script>

<style scoped>
.memory-upload-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(8px);
}

.modal-content {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(255, 107, 157, 0.25);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  border: 2px solid rgba(255, 107, 157, 0.15);
  animation: modalSlideIn 0.3s ease;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #FFE0EB;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #FFF5F9 0%, #ffffff 100%);
  border-radius: 18px 18px 0 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #C44569;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 107, 157, 0.1);
  color: #C44569;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(255, 107, 157, 0.2);
  transform: scale(1.1);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.upload-section h4,
.list-section h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.upload-hint {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: #999;
}

.format-guide {
  padding: 12px 16px;
  background: linear-gradient(135deg, #FFF9FB 0%, #ffffff 100%);
  border: 1px solid #FFD0E0;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  transition: all 0.2s ease;
  user-select: none;
}

.format-guide:hover {
  border-color: #FFB6C1;
  box-shadow: 0 2px 8px rgba(255, 107, 157, 0.08);
  transform: translateY(-1px);
}

.guide-icon {
  font-size: 18px;
}

.format-guide span:not(.guide-icon):not(.guide-toggle) {
  flex: 1;
  font-size: 14px;
  color: #C44569;
  font-weight: 500;
}

.guide-toggle {
  font-size: 12px !important;
  color: #999 !important;
  transition: transform 0.2s ease;
}

.format-guide-content {
  margin-bottom: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%);
  border: 1px solid #E8E8E8;
  border-radius: 12px;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    max-height: 1000px;
    transform: translateY(0);
  }
}

.format-tab {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  border-bottom: 2px solid #E0E0E0;
  padding-bottom: 0;
}

.format-tab button {
  padding: 10px 20px;
  border: none;
  background: transparent;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  border-radius: 8px 8px 0 0;
}

.format-tab button:hover {
  color: #C44569;
  background: rgba(255, 107, 157, 0.05);
}

.format-tab button.active {
  color: #C44569;
  font-weight: 600;
  background: white;
  border: 2px solid #E0E0E0;
  border-bottom-color: white;
  margin-bottom: -2px;
}

.format-detail {
  animation: fadeIn 0.3s ease;
}

.format-section {
  margin-bottom: 18px;
}

.format-section:last-child {
  margin-bottom: 0;
}

.format-section h5 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 6px;
}

.format-section ul {
  margin: 0;
  padding-left: 20px;
  list-style-type: disc;
}

.format-section li {
  margin-bottom: 6px;
  font-size: 13px;
  color: #555;
  line-height: 1.5;
}

.format-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  margin-top: 8px;
}

.format-table th,
.format-table td {
  padding: 10px 12px;
  text-align: left;
  border: 1px solid #E0E0E0;
}

.format-table th {
  background: linear-gradient(135deg, #FFF5F9 0%, #FFE8EE 100%);
  font-weight: 600;
  color: #C44569;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.format-table td {
  background: white;
  color: #555;
}

.format-table code {
  background: #F5F5F5;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: #C44569;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.tag {
  padding: 6px 12px;
  background: white;
  border: 1px solid #E0E0E0;
  border-radius: 6px;
  font-size: 12px;
  color: #555;
  transition: all 0.2s ease;
}

.tag:hover {
  border-color: #FFB6C1;
  background: #FFF9FB;
}

.tag code {
  background: transparent !important;
  padding: 0 !important;
  color: #C44569 !important;
  font-weight: 600;
}

.example-table-wrapper {
  overflow-x: auto;
  margin-top: 8px;
  border-radius: 8px;
  border: 1px solid #E0E0E0;
}

.example-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.example-table th,
.example-table td {
  padding: 10px 12px;
  text-align: left;
  border: 1px solid #E0E0E0;
}

.example-table th {
  background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
  color: white;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.example-table td {
  background: white;
  color: #555;
}

.example-table tr:hover td {
  background: #FFF9FB;
}

.code-example {
  margin-top: 8px;
  background: #2D2D2D;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #444;
}

.code-example pre {
  margin: 0;
  padding: 16px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #E0E0E0;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.format-tips {
  margin-top: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #FFF9E6 0%, #FFF4CC 100%);
  border: 1px solid #FFE082;
  border-left: 4px solid #FFC107;
  border-radius: 8px;
}

.format-tips p {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #F57C00;
  font-weight: 600;
}

.format-tips ul {
  margin: 0;
  padding-left: 18px;
}

.format-tips li {
  margin-bottom: 4px;
  font-size: 12px;
  color: #E65100;
}

.upload-area {
  border: 2px dashed #FFD0E0;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #FFF9FB;
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: #FF6B9D;
  background: rgba(255, 107, 157, 0.05);
  transform: translateY(-2px);
}

.upload-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.upload-placeholder p {
  margin: 6px 0;
  color: #666;
  font-size: 14px;
}

.file-types {
  color: #999 !important;
  font-size: 12px !important;
}

.selected-file {
  margin-top: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #FFF5F9 0%, #ffffff 100%);
  border: 1px solid #FFD0E0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

.file-icon {
  font-size: 20px;
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.file-size {
  font-size: 12px;
  color: #999;
}

.remove-file {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(255, 107, 157, 0.1);
  color: #C44569;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-file:hover {
  background: rgba(255, 107, 157, 0.2);
  transform: scale(1.1);
}

.upload-btn {
  width: 100%;
  margin-top: 16px;
  padding: 14px 24px;
  border: none;
  background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
  color: white;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(255, 107, 157, 0.3);
}

.upload-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(255, 107, 157, 0.4);
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.divider {
  height: 1px;
  background: linear-gradient(to right, transparent, #FFE0EB, transparent);
  margin: 28px 0;
}

.list-section {
  margin-top: 8px;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 48px 20px;
  color: #999;
}

.loading-spinner {
  display: inline-block;
  width: 32px;
  height: 32px;
  border: 3px solid #FFE0EB;
  border-top-color: #FF6B9D;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.empty-hint {
  font-size: 13px !important;
  color: #bbb !important;
}

.memory-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.memory-item {
  padding: 16px;
  background: linear-gradient(135deg, #FFF9FB 0%, #ffffff 100%);
  border: 1px solid #FFE0EB;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  transition: all 0.2s ease;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.memory-item:hover {
  border-color: #FFB6C1;
  box-shadow: 0 4px 12px rgba(255, 107, 157, 0.1);
  transform: translateX(4px);
}

.memory-info {
  flex: 1;
  min-width: 0;
}

.memory-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
}

.memory-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.memory-file {
  font-size: 12px;
  color: #FF8A9E;
}

.memory-actions {
  flex-shrink: 0;
}

.delete-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 107, 157, 0.08);
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn:hover:not(:disabled) {
  background: rgba(255, 107, 157, 0.15);
  transform: scale(1.1);
}

.delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toast {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  z-index: 10001;
  animation: toastFadeIn 0.3s ease;
  backdrop-filter: blur(10px);
}

.toast.success {
  background: rgba(76, 175, 80, 0.95);
  color: white;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.3);
}

.toast.error {
  background: rgba(244, 67, 54, 0.95);
  color: white;
  box-shadow: 0 4px 16px rgba(244, 67, 54, 0.3);
}

@keyframes toastFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
