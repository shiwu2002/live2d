<template>
  <div v-if="visible" class="lm-overlay" @click.self="handleClose">
    <div class="lm-modal">
      <button class="lm-close" @click="handleClose" aria-label="关闭">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <h2 class="lm-title">Live2D 模型管理</h2>

      <div class="lm-body">
        <div v-if="models.length > 0" class="lm-list">
          <div class="lm-list-header">
            <span class="lm-list-count">模型 ({{ models.length }})</span>
          </div>
          <div v-for="model in models" :key="model.id" class="lm-card">
            <div class="lm-card-preview" v-if="model.previewImage">
              <img :src="model.previewImage" :alt="model.name" />
            </div>
            <div class="lm-card-preview lm-card-preview-placeholder" v-else>
              <span>🎭</span>
            </div>
            <div class="lm-card-info">
              <div class="lm-card-name">{{ model.name }}</div>
              <div class="lm-card-meta">
                <span class="lm-tag" :class="getModelTagClass(model)">
                  {{ getModelTagText(model) }}
                </span>
                <span class="lm-card-id">{{ model.id }}</span>
              </div>
              <div v-if="model.fileSize" class="lm-card-size">
                {{ formatFileSize(model.fileSize) }}{{ model.fileCount ? ` · ${model.fileCount} 个文件` : '' }}
              </div>
            </div>
            <div class="lm-card-actions">
              <button
                v-if="canDeleteModel(model)"
                class="lm-btn lm-btn-del"
                @click="handleDelete(model)"
                :disabled="deleting === model.id"
              >
                {{ deleting === model.id ? '删除中...' : '删除' }}
              </button>
            </div>
          </div>
        </div>

        <div v-else class="lm-empty">
          <div class="lm-empty-icon">📦</div>
          <p>暂无模型</p>
          <p class="lm-empty-sub">点击下方按钮上传 Live2D 模型</p>
        </div>

        <div class="lm-upload-section">
          <div class="lm-upload-area" :class="{ 'lm-dragover': isDragOver }"
            @dragover.prevent="isDragOver = true"
            @dragleave.prevent="isDragOver = false"
            @drop.prevent="handleDrop"
            @click="triggerFileInput"
          >
            <input
              ref="fileInputRef"
              type="file"
              accept=".zip"
              class="lm-file-input"
              @change="handleFileSelect"
            />
            <div class="lm-upload-icon">📤</div>
            <p class="lm-upload-text">点击或拖拽上传模型 ZIP 包</p>
            <p class="lm-upload-hint">支持 .zip 格式，包含 .model3.json 入口文件</p>
          </div>

          <div v-if="selectedFile" class="lm-selected-file">
            <span class="lm-file-name">{{ selectedFile.name }}</span>
            <span class="lm-file-size">{{ formatFileSize(selectedFile.size) }}</span>
            <button class="lm-btn lm-btn-clear" @click="clearFile">✕</button>
          </div>

          <div class="lm-upload-row">
            <div class="lm-field lm-field-name">
              <label>显示名称（可选）</label>
              <input v-model="uploadName" type="text" placeholder="留空则自动生成" />
            </div>
            <button
              class="lm-btn lm-btn-upload"
              :disabled="!selectedFile || uploading"
              @click="handleUpload"
            >
              {{ uploading ? '上传中...' : '上传模型' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { live2dModelService, type Live2DModelInfo } from '../services/live2dModelService'
import { authService } from '../services/authService'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  changed: []
}>()

const models = ref<Live2DModelInfo[]>([])
const loading = ref(false)
const uploading = ref(false)
const deleting = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const uploadName = ref('')
const isDragOver = ref(false)
const fileInputRef = ref<HTMLInputElement>()

const currentUserId = computed(() => {
  const userInfo = authService.getUserInfo()
  return userInfo?.userId || null
})

const canDeleteModel = (model: Live2DModelInfo): boolean => {
  if (model.isDefault) return false
  if (!currentUserId.value) return true
  if (!model.ownerId) return true
  return model.ownerId === currentUserId.value
}

const getModelTagClass = (model: Live2DModelInfo): string => {
  if (model.isDefault) return 'tag-default'
  if (currentUserId.value && model.ownerId === currentUserId.value) return 'tag-mine'
  return 'tag-custom'
}

const getModelTagText = (model: Live2DModelInfo): string => {
  if (model.isDefault) return '系统默认'
  if (currentUserId.value && model.ownerId === currentUserId.value) return '我的模型'
  return '其他用户'
}

const loadModels = async () => {
  loading.value = true
  try {
    models.value = await live2dModelService.list()
  } catch {
    models.value = []
  } finally {
    loading.value = false
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0]!
  }
}

const handleDrop = (e: DragEvent) => {
  isDragOver.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0]!
    if (file.name.endsWith('.zip')) {
      selectedFile.value = file
    }
  }
}

const clearFile = () => {
  selectedFile.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const handleUpload = async () => {
  if (!selectedFile.value) return
  uploading.value = true
  try {
    await live2dModelService.upload(selectedFile.value, uploadName.value || undefined)
    selectedFile.value = null
    uploadName.value = ''
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
    await loadModels()
    emit('changed')
  } catch (err: any) {
    alert(err.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

const handleDelete = async (model: Live2DModelInfo) => {
  if (model.isDefault) return
  if (!confirm(`确定删除模型「${model.name}」？`)) return
  deleting.value = model.id
  try {
    await live2dModelService.remove(model.id)
    await loadModels()
    emit('changed')
  } catch (err: any) {
    const errorMessage = err.message || '删除失败'
    if (errorMessage.includes('无权删除') || errorMessage.includes('权限') || errorMessage.includes('只能删除')) {
      alert('你只能删除自己上传的模型')
    } else {
      alert(errorMessage)
    }
  } finally {
    deleting.value = null
  }
}

const handleClose = () => {
  emit('close')
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadModels()
  }
})

onMounted(() => {
  if (props.visible) {
    loadModels()
  }
})
</script>

<style scoped>
.lm-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.lm-modal {
  width: 520px;
  max-width: calc(100vw - 32px);
  max-height: 82vh;
  background: #1a1a24;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.lm-close {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 10;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #888;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.2s ease;
}
.lm-close svg { width: 16px; height: 16px; }
.lm-close:hover { background: rgba(255, 255, 255, 0.12); color: #ddd; }

.lm-title {
  margin: 0;
  padding: 22px 52px 14px 22px;
  font-size: 17px;
  font-weight: 600;
  color: #eee;
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  position: sticky;
  top: 0;
  z-index: 5;
  background: #1a1a24;
  border-radius: 16px 16px 0 0;
}

.lm-body {
  padding: 4px 22px 20px;
  overflow-y: auto;
  flex: 1;
}

.lm-list-header {
  margin-bottom: 10px;
}
.lm-list-count {
  font-size: 13px;
  color: #999;
  font-weight: 500;
}

.lm-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #22222e;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 8px;
  transition: border-color 0.15s;
}
.lm-card:hover { border-color: rgba(108, 92, 231, 0.25); }

.lm-card-preview {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #2a2a36;
}
.lm-card-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.lm-card-preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.lm-card-info { flex: 1; min-width: 0; }

.lm-card-name {
  font-size: 14px;
  font-weight: 500;
  color: #e8e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lm-card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.lm-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 4px;
  letter-spacing: 0.3px;
}
.tag-default { background: rgba(108, 92, 231, 0.15); color: #a29bfe; }
.tag-mine { background: rgba(46, 213, 115, 0.12); color: #7bed9f; }
.tag-custom { background: rgba(255, 159, 67, 0.12); color: #ffa94d; }

.lm-card-id {
  font-size: 12px;
  color: #777;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
}

.lm-card-size {
  font-size: 11px;
  color: #555;
  margin-top: 3px;
}

.lm-card-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.lm-empty {
  text-align: center;
  padding: 36px 0 20px;
}
.lm-empty-icon { font-size: 36px; margin-bottom: 10px; opacity: 0.5; }
.lm-empty p { margin: 0; font-size: 14px; color: #888; }
.lm-empty-sub { font-size: 12px !important; color: #555; margin-top: 4px !important; }

.lm-upload-section {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.lm-upload-area {
  border: 2px dashed rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #18181f;
}
.lm-upload-area:hover {
  border-color: rgba(108, 92, 231, 0.4);
  background: rgba(108, 92, 231, 0.04);
}
.lm-upload-area.lm-dragover {
  border-color: #6c5ce7;
  background: rgba(108, 92, 231, 0.08);
}

.lm-file-input {
  display: none;
}

.lm-upload-icon {
  font-size: 28px;
  margin-bottom: 8px;
  opacity: 0.7;
}

.lm-upload-text {
  margin: 0 0 4px;
  font-size: 14px;
  color: #bbb;
  font-weight: 500;
}

.lm-upload-hint {
  margin: 0;
  font-size: 12px;
  color: #666;
}

.lm-selected-file {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 12px;
  background: #22222e;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.lm-file-name {
  flex: 1;
  font-size: 13px;
  color: #ddd;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lm-file-size {
  font-size: 12px;
  color: #777;
  flex-shrink: 0;
}

.lm-upload-row {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  align-items: flex-end;
}

.lm-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
}
.lm-field label {
  font-size: 12px;
  font-weight: 500;
  color: #999;
}
.lm-field input {
  padding: 9px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: #18181f;
  color: #e0e0e8;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
}
.lm-field input::placeholder { color: #555; }
.lm-field input:focus {
  border-color: #6c5ce7;
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
}

.lm-btn {
  padding: 9px 18px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.lm-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.lm-btn-del {
  background: rgba(239, 83, 80, 0.1);
  color: #ef8b85;
}
.lm-btn-del:hover:not(:disabled) { background: rgba(239, 83, 80, 0.2); }

.lm-btn-clear {
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #888;
  font-size: 12px;
}
.lm-btn-clear:hover { background: rgba(255, 255, 255, 0.12); color: #ddd; }

.lm-btn-upload {
  background: linear-gradient(135deg, #6c5ce7 0%, #5a4bd1 100%);
  color: #fff;
  flex-shrink: 0;
}
.lm-btn-upload:hover:not(:disabled) { box-shadow: 0 4px 14px rgba(108, 92, 231, 0.35); transform: translateY(-1px); }

@media (max-width: 520px) {
  .lm-modal {
    width: calc(100vw - 24px);
    max-height: 88vh;
  }
  .lm-title { padding-left: 16px; font-size: 16px; }
  .lm-body { padding: 14px 16px 18px; }
  .lm-close { top: 12px; right: 12px; }
  .lm-upload-row { flex-direction: column; }
}
</style>
