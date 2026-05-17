<template>
  <div v-if="visible" class="vm-overlay" @click.self="handleClose">
    <div class="vm-modal">
      <button class="vm-close" @click="handleClose" aria-label="关闭">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <h2 class="vm-title">{{ showForm ? (editingId ? '编辑模型' : '添加模型') : '语音模型设置' }}</h2>

      <div class="vm-body">
        <div v-if="!showForm">
          <div class="vm-tabs">
            <button
              class="vm-tab"
              :class="{ active: activeTab === 'tts' }"
              @click="activeTab = 'tts'"
            >
              <span class="vm-tab-icon">🔊</span>
              <span>TTS 语音合成</span>
              <span v-if="ttsModels.length > 0" class="vm-tab-count">{{ ttsModels.length }}</span>
            </button>
            <button
              class="vm-tab"
              :class="{ active: activeTab === 'asr' }"
              @click="activeTab = 'asr'"
            >
              <span class="vm-tab-icon">🎤</span>
              <span>ASR 语音识别</span>
              <span v-if="asrModels.length > 0" class="vm-tab-count">{{ asrModels.length }}</span>
            </button>
          </div>

          <div class="vm-list-section">
            <div v-if="currentModels.length > 0" class="vm-list">
              <div class="vm-list-header">
                <span class="vm-list-count">{{ activeTab === 'tts' ? 'TTS' : 'ASR' }} 模型 ({{ currentModels.length }})</span>
                <span class="vm-stream-tip">支持流式模式</span>
              </div>
              <div v-for="model in currentModels" :key="model.id" class="vm-card" :class="{ 'is-default': model.isDefault }">
                <div class="vm-card-info">
                  <div class="vm-card-name-row">
                    <span class="vm-card-name">{{ model.modelName }}</span>
                    <span v-if="model.isDefault" class="vm-default-badge">默认</span>
                  </div>
                  <div class="vm-card-meta">
                    <span class="vm-tag" :class="'tag-' + model.modelType">{{ model.modelType === 'tts' ? 'TTS' : 'ASR' }}</span>
                    <span class="vm-tag" :class="model.streamMode === 'stream' ? 'tag-stream' : 'tag-batch'">
                      {{ model.streamMode === 'stream' ? '流式' : '批量' }}
                    </span>
                    <span class="vm-card-id">{{ model.modelId }}</span>
                  </div>
                  <div v-if="model.baseUrl" class="vm-card-url">{{ model.baseUrl }}</div>
                  <div class="vm-card-extra">
                    <span v-if="model.modelType === 'tts' && model.voice">音色: {{ model.voice }}</span>
                    <span v-if="model.modelType === 'asr' && model.format">格式: {{ model.format }} / {{ model.sampleRate || 16000 }}Hz</span>
                  </div>
                </div>
                <div class="vm-card-actions">
                  <button
                    v-if="!model.isDefault"
                    class="vm-btn vm-btn-default"
                    @click="handleSetDefault(model)"
                    title="设为默认"
                  >默认</button>
                  <button
                    class="vm-btn vm-btn-test"
                    @click="handleTest(model)"
                    title="测试"
                    :disabled="testingId === model.id"
                  >{{ testingId === model.id ? '测试中...' : '测试' }}</button>
                  <button class="vm-btn vm-btn-edit" @click="startEdit(model)">编辑</button>
                  <button class="vm-btn vm-btn-del" @click="handleDelete(model)">删除</button>
                </div>
              </div>
            </div>

            <div v-else class="vm-empty">
              <div class="vm-empty-icon">{{ activeTab === 'tts' ? '🔊' : '🎤' }}</div>
              <p>还没有 {{ activeTab === 'tts' ? 'TTS 语音合成' : 'ASR 语音识别' }} 模型</p>
              <p class="vm-empty-sub">点击下方按钮添加你的第一个{{ activeTab.toUpperCase() }}模型</p>
            </div>

            <div v-if="testResult" class="vm-test-result" :class="testResult.success ? 'success' : 'error'">
              <span>{{ testResult.success ? '✅' : '❌' }}</span>
              <span>{{ testResult.message }}</span>
            </div>
          </div>
        </div>

        <div v-if="showForm" class="vm-form-wrap">
          <h3 class="vm-form-title">{{ editingId ? '编辑模型' : `添加${form.modelType === 'tts' ? 'TTS 语音合成' : 'ASR 语音识别'}模型` }}</h3>

          <div class="vm-model-type-toggle">
            <button
              type="button"
              class="vm-type-btn"
              :class="{ active: form.modelType === 'tts' }"
              @click="switchFormType('tts')"
            >
              <span class="vm-type-icon">🔊</span>
              <span class="vm-type-label">TTS 语音合成</span>
              <span class="vm-type-desc">文字转语音</span>
            </button>
            <button
              type="button"
              class="vm-type-btn"
              :class="{ active: form.modelType === 'asr' }"
              @click="switchFormType('asr')"
            >
              <span class="vm-type-icon">🎤</span>
              <span class="vm-type-label">ASR 语音识别</span>
              <span class="vm-type-desc">语音转文字</span>
            </button>
          </div>

          <form class="vm-form" @submit.prevent="handleSubmit">
            <div class="vm-field">
              <label>显示名称 <em>*</em></label>
              <input v-model="form.modelName" type="text" placeholder="如：OpenAI TTS" required />
            </div>
            <div class="vm-field">
              <label>API Base URL <em>*</em></label>
              <input
                v-model="form.baseUrl"
                type="text"
                :placeholder="form.modelType === 'tts' ? '如：https://api.openai.com/v1/audio/speech' : '如：wss://api.example.com/v1/asr/stream（流式）或 https://api.example.com/v1/audio/transcriptions（批量）'"
                required
              />
            </div>
            <div class="vm-field">
              <label>模型 ID <em>*</em></label>
              <input v-model="form.modelId" type="text" :placeholder="form.modelType === 'tts' ? '如：tts-1' : '如：whisper-1'" required />
            </div>
            <div class="vm-field">
              <label>API Key</label>
              <div class="vm-pwd-row">
                <input
                  v-model="form.apiKey"
                  :type="showApiKey ? 'text' : 'password'"
                  :placeholder="editingId ? '留空则不修改' : '输入 API Key'"
                  @input="onApiKeyInput"
                />
                <button type="button" class="vm-toggle-pwd" @click="showApiKey = !showApiKey">{{ showApiKey ? '隐藏' : '显示' }}</button>
              </div>
            </div>

            <template v-if="form.modelType === 'tts'">
              <div class="vm-field">
                <label>音色 (Voice)</label>
                <input v-model="form.voice" type="text" placeholder="如：alloy、nova、longhua_v2（留空使用服务商默认）" />
              </div>
            </template>

            <template v-if="form.modelType === 'asr'">
              <div class="vm-row">
                <div class="vm-field vm-field-half">
                  <label>音频格式</label>
                  <select v-model="form.format">
                    <option value="pcm">PCM</option>
                    <option value="wav">WAV</option>
                    <option value="mp3">MP3</option>
                    <option value="ogg">OGG</option>
                    <option value="flac">FLAC</option>
                  </select>
                </div>
                <div class="vm-field vm-field-half">
                  <label>采样率 (Hz)</label>
                  <input v-model.number="form.sampleRate" type="number" placeholder="16000" />
                </div>
              </div>
            </template>

            <div class="vm-field">
              <label>调用模式 <em>*</em></label>
              <div class="vm-stream-toggle">
                <button
                  type="button"
                  class="vm-stream-btn"
                  :class="{ active: form.streamMode === 'none' }"
                  @click="form.streamMode = 'none'"
                >
                  <span class="vm-stream-label">批量模式 (none)</span>
                  <span class="vm-stream-desc">录音结束后整段处理，兼容性好但延迟较高</span>
                </button>
                <button
                  type="button"
                  class="vm-stream-btn active recommended"
                  :class="{ active: form.streamMode === 'stream' }"
                  @click="form.streamMode = 'stream'"
                >
                  <span class="vm-stream-label">流式模式 (stream) ✅ 推荐</span>
                  <span class="vm-stream-desc">实时传输，与DashScope体验一致，延迟更低</span>
                </button>
              </div>
            </div>

            <div class="vm-field vm-checkbox-field">
              <label class="vm-checkbox-label">
                <input type="checkbox" v-model="form.isDefault" />
                <span>设为默认{{ form.modelType === 'tts' ? 'TTS' : 'ASR' }}模型</span>
              </label>
            </div>

            <div class="vm-form-actions">
              <button type="button" class="vm-btn vm-btn-cancel" @click="cancelForm">取消</button>
              <button type="submit" class="vm-btn vm-btn-save" :disabled="saving">
                {{ saving ? '保存中...' : (editingId ? '更新' : '添加') }}
              </button>
            </div>
          </form>
        </div>

        <div v-if="!showForm" class="vm-footer">
          <button class="vm-btn vm-btn-add-lg" @click="startAdd(activeTab)">+ 添加 {{ activeTab === 'tts' ? 'TTS' : 'ASR' }} 模型</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { voiceModelService, type VoiceModel } from '../services/voiceModelService'

const props = defineProps<{
  visible: boolean
  userId: string
}>()

const emit = defineEmits<{
  close: []
  changed: []
}>()

const loading = ref(false)
const saving = ref(false)
const testingId = ref<number | null>(null)
const showForm = ref(false)
const editingId = ref<number | null>(null)
const activeTab = ref<'tts' | 'asr'>('tts')
const ttsModels = ref<VoiceModel[]>([])
const asrModels = ref<VoiceModel[]>([])
const showApiKey = ref(false)
const apiKeyChanged = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)

const currentModels = computed(() => {
  return activeTab.value === 'tts' ? ttsModels.value : asrModels.value
})

const defaultForm = (type: 'tts' | 'asr'): VoiceModel => ({
  userId: props.userId,
  modelType: type,
  modelName: '',
  baseUrl: '',
  modelId: '',
  apiKey: '',
  voice: type === 'tts' ? '' : undefined,
  format: type === 'asr' ? 'pcm' : undefined,
  sampleRate: type === 'asr' ? 16000 : undefined,
  streamMode: 'stream',
  isDefault: false
})

const form = ref<VoiceModel>(defaultForm('tts'))

const loadModels = async () => {
  loading.value = true
  testResult.value = null
  try {
    const [ttsList, asrList] = await Promise.all([
      voiceModelService.getListByType('tts'),
      voiceModelService.getListByType('asr')
    ])
    ttsModels.value = ttsList || []
    asrModels.value = asrList || []
  } catch {
    ttsModels.value = []
    asrModels.value = []
  } finally {
    loading.value = false
  }
}

const startAdd = (type: 'tts' | 'asr') => {
  form.value = defaultForm(type)
  editingId.value = null
  showForm.value = true
  showApiKey.value = false
  apiKeyChanged.value = false
}

const startEdit = (model: VoiceModel) => {
  form.value = { ...model, apiKey: '' }
  editingId.value = model.id ?? null
  showForm.value = true
  showApiKey.value = false
  apiKeyChanged.value = false
}

const switchFormType = (type: 'tts' | 'asr') => {
  if (!editingId.value) {
    form.value = defaultForm(type)
  }
}

const cancelForm = () => {
  showForm.value = false
  editingId.value = null
}

const handleSubmit = async () => {
  saving.value = true
  try {
    const payload: any = { ...form.value }
    if (editingId.value && !apiKeyChanged.value) {
      delete payload.apiKey
    }
    if (editingId.value) {
      await voiceModelService.update(editingId.value, payload)
    } else {
      await voiceModelService.create(payload)
    }
    showForm.value = false
    editingId.value = null
    await loadModels()
    emit('changed')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (model: VoiceModel) => {
  if (!model.id) return
  await voiceModelService.delete(model.id)
  testResult.value = null
  await loadModels()
  emit('changed')
}

const handleSetDefault = async (model: VoiceModel) => {
  if (!model.id) return
  await voiceModelService.setDefault(model.id)
  await loadModels()
  emit('changed')
}

const handleTest = async (model: VoiceModel) => {
  if (!model.id) return
  testResult.value = null
  testingId.value = model.id ?? null
  try {
    let result
    if (model.modelType === 'tts') {
      result = await voiceModelService.testTts(model.id!)
      if (result?.success) {
        testResult.value = { success: true, message: `TTS 测试成功！耗时 ${result.executionTime || '-'}，音频大小正常` }
      } else {
        testResult.value = { success: false, message: 'TTS 测试失败，请检查配置是否正确' }
      }
    } else {
      result = await voiceModelService.testAsr(model.id!)
      if (result?.success) {
        testResult.value = { success: true, message: 'ASR 模型配置验证通过，请通过语音对话进行实际测试' }
      } else {
        testResult.value = { success: false, message: 'ASR 测试失败，请检查配置是否正确' }
      }
    }
  } catch {
    testResult.value = { success: false, message: '测试请求异常，请检查网络连接' }
  } finally {
    testingId.value = null
  }
}

const handleClose = () => {
  showForm.value = false
  editingId.value = null
  testResult.value = null
  emit('close')
}

const onApiKeyInput = () => {
  apiKeyChanged.value = true
}

watch(() => props.visible, (newVal) => {
  if (newVal && props.userId) {
    loadModels()
  }
})

onMounted(() => {
  if (props.visible && props.userId) {
    loadModels()
  }
})
</script>

<style scoped>
.vm-overlay {
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

.vm-modal {
  width: 540px;
  max-width: calc(100vw - 32px);
  max-height: 85vh;
  background: #1a1a24;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.vm-close {
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
.vm-close svg { width: 16px; height: 16px; }
.vm-close:hover { background: rgba(255, 255, 255, 0.12); color: #ddd; }

.vm-title {
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

.vm-body {
  padding: 4px 22px 20px;
  overflow-y: auto;
  flex: 1;
}

/* Tabs */
.vm-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.vm-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: #18181f;
  color: #888;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
}
.vm-tab:hover { border-color: rgba(255, 107, 157, 0.25); color: #bbb; }
.vm-tab.active {
  border-color: rgba(255, 107, 157, 0.4);
  background: rgba(255, 107, 157, 0.08);
  color: #FF6B9D;
}
.vm-tab-icon { font-size: 16px; }

.vm-tab-count {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 10px;
  background: rgba(255, 107, 157, 0.15);
  color: #FF6B9D;
}

/* List */
.vm-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.vm-list-count {
  font-size: 13px;
  color: #999;
  font-weight: 500;
}

.vm-stream-tip {
  font-size: 11px;
  color: #4ecdc4;
  background: rgba(78, 205, 196, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.vm-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #22222e;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 8px;
  transition: border-color 0.15s;
}
.vm-card:hover { border-color: rgba(255, 107, 157, 0.2); }
.vm-card.is-default { border-color: rgba(78, 205, 196, 0.2); }

.vm-card-info { flex: 1; min-width: 0; }

.vm-card-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vm-card-name {
  font-size: 14px;
  font-weight: 500;
  color: #e8e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vm-default-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 4px;
  background: rgba(78, 205, 196, 0.12);
  color: #4ecdc4;
  letter-spacing: 0.3px;
  flex-shrink: 0;
}

.vm-card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.vm-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 4px;
  letter-spacing: 0.3px;
}
.tag-tts { background: rgba(108, 92, 231, 0.15); color: #a29bfe; }
.tag-asr { background: rgba(255, 107, 157, 0.12); color: #FF6B9D; }
.tag-stream { background: rgba(78, 205, 196, 0.12); color: #4ecdc4; }
.tag-batch { background: rgba(255, 193, 7, 0.1); color: #ffc107; }

.vm-card-id {
  font-size: 12px;
  color: #777;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
}

.vm-card-url {
  font-size: 11px;
  color: #555;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.vm-card-extra {
  display: flex;
  gap: 10px;
  margin-top: 3px;
  font-size: 11px;
  color: #666;
}

.vm-card-actions {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* Empty */
.vm-empty {
  text-align: center;
  padding: 36px 0 20px;
}
.vm-empty-icon { font-size: 36px; margin-bottom: 10px; opacity: 0.5; }
.vm-empty p { margin: 0; font-size: 14px; color: #888; }
.vm-empty-sub { font-size: 12px !important; color: #555; margin-top: 4px !important; }

/* Test result */
.vm-test-result {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  animation: fadeIn 0.3s ease;
}
.vm-test-result.success { background: rgba(78, 205, 196, 0.08); color: #4ecdc4; border: 1px solid rgba(78, 205, 196, 0.15); }
.vm-test-result.error { background: rgba(239, 83, 80, 0.08); color: #ef8b85; border: 1px solid rgba(239, 83, 80, 0.15); }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Form */
.vm-form-wrap {
  margin-top: 4px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.vm-form-title {
  font-size: 14px;
  font-weight: 600;
  color: #ccc;
  margin: 0 0 14px;
}

.vm-model-type-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 18px;
}

.vm-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 10px 12px;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: #18181f;
  color: #888;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}
.vm-type-btn:hover {
  border-color: rgba(255, 255, 255, 0.15);
  background: #1e1e28;
  color: #bbb;
}
.vm-type-btn.active {
  border-color: #FF6B9D;
  background: rgba(255, 107, 157, 0.08);
  color: #FF6B9D;
  box-shadow: 0 0 0 3px rgba(255, 107, 157, 0.08);
}

.vm-type-icon { font-size: 22px; line-height: 1; margin-bottom: 2px; }
.vm-type-label { font-size: 13px; font-weight: 600; }
.vm-type-desc { font-size: 11px; opacity: 0.55; }

.vm-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vm-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.vm-field label {
  font-size: 12px;
  font-weight: 500;
  color: #999;
}
.vm-field label em {
  color: #ef5350;
  font-style: normal;
  margin-left: 2px;
}

.vm-field input,
.vm-field select {
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
.vm-field input::placeholder { color: #555; }
.vm-field input:focus,
.vm-field select:focus {
  border-color: #FF6B9D;
  box-shadow: 0 0 0 3px rgba(255, 107, 157, 0.1);
}

.vm-row { display: flex; gap: 12px; }
.vm-field-half { flex: 1; }

.vm-pwd-row {
  display: flex;
  gap: 0;
}
.vm-pwd-row input {
  flex: 1;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.vm-toggle-pwd {
  padding: 9px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-left: none;
  border-radius: 0 8px 8px 0;
  background: #22222e;
  color: #999;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.vm-toggle-pwd:hover { color: #ccc; background: #2a2a36; }

/* Stream mode toggle */
.vm-stream-toggle {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vm-stream-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 12px 14px;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: #18181f;
  color: #888;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-family: inherit;
}
.vm-stream-btn:hover {
  border-color: rgba(255, 255, 255, 0.15);
  background: #1e1e28;
}
.vm-stream-btn.active {
  border-color: #4ecdc4;
  background: rgba(78, 205, 196, 0.06);
  box-shadow: 0 0 0 3px rgba(78, 205, 196, 0.06);
}
.vm-stream-btn.recommended.active {
  border-color: #4ecdc4;
  box-shadow: 0 0 0 3px rgba(78, 205, 196, 0.1);
}
.vm-stream-btn .vm-stream-label {
  font-size: 13px;
  font-weight: 600;
  color: inherit;
}
.vm-stream-btn.active .vm-stream-label { color: #4ecdc4; }
.vm-stream-btn .vm-stream-desc {
  font-size: 11px;
  opacity: 0.55;
  color: inherit;
}
.vm-stream-btn.active .vm-stream-desc { opacity: 0.75; }

/* Checkbox */
.vm-checkbox-field { margin-top: 4px; }
.vm-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #aaa;
}
.vm-checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #FF6B9D;
  cursor: pointer;
}

/* Actions */
.vm-form-actions,
.vm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}
.vm-footer { justify-content: center; }

.vm-btn {
  padding: 9px 18px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.vm-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.vm-btn-edit {
  background: rgba(108, 92, 231, 0.12);
  color: #a29bfe;
}
.vm-btn-edit:hover:not(:disabled) { background: rgba(108, 92, 231, 0.22); }

.vm-btn-del {
  background: rgba(239, 83, 80, 0.1);
  color: #ef8b85;
}
.vm-btn-del:hover:not(:disabled) { background: rgba(239, 83, 80, 0.2); }

.vm-btn-test {
  background: rgba(78, 205, 196, 0.1);
  color: #4ecdc4;
}
.vm-btn-test:hover:not(:disabled) { background: rgba(78, 205, 196, 0.2); }

.vm-btn-default {
  background: rgba(78, 205, 196, 0.08);
  color: #4ecdc4;
  font-size: 12px;
  padding: 6px 12px;
}
.vm-btn-default:hover:not(:disabled) { background: rgba(78, 205, 196, 0.18); }

.vm-btn-cancel {
  background: rgba(255, 255, 255, 0.06);
  color: #aaa;
}
.vm-btn-cancel:hover { background: rgba(255, 255, 255, 0.1); }

.vm-btn-save {
  background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
  color: #fff;
}
.vm-btn-save:hover:not(:disabled) { box-shadow: 0 4px 14px rgba(255, 107, 157, 0.35); transform: translateY(-1px); }

.vm-btn-add-lg {
  padding: 11px 28px;
  background: linear-gradient(135deg, #FF6B9D 0%, #C44569 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.3px;
}
.vm-btn-add-lg:hover { box-shadow: 0 6px 20px rgba(255, 107, 157, 0.35); transform: translateY(-1px); }

@media (max-width: 520px) {
  .vm-modal {
    width: calc(100vw - 24px);
    max-height: 88vh;
  }
  .vm-title { padding-left: 16px; font-size: 16px; }
  .vm-body { padding: 14px 16px 18px; }
  .vm-close { top: 12px; right: 12px; }
  .vm-row { flex-direction: column; gap: 0; }
  .vm-field-half { flex: none; }
  .vm-tabs { flex-direction: column; }
  .vm-model-type-toggle { grid-template-columns: 1fr; }
  .vm-card-actions { flex-direction: column; }
}
</style>
