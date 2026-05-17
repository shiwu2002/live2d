<template>
  <div v-if="visible" class="cm-overlay" @click.self="handleClose">
    <div class="cm-modal">
      <button class="cm-close" @click="handleClose" aria-label="关闭">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <h2 class="cm-title">{{ showForm ? (editingId ? '编辑模型' : '添加模型') : '自定义模型管理' }}</h2>

      <div class="cm-body">
        <div v-if="!showForm">
          <div v-if="customModels.length > 0" class="cm-list">
          <div class="cm-list-header">
            <span class="cm-list-count">我的模型 ({{ customModels.length }})</span>
          </div>
          <div v-for="model in customModels" :key="model.id" class="cm-card">
            <div class="cm-card-info">
              <div class="cm-card-name">{{ model.modelName }}</div>
              <div class="cm-card-meta">
                <span class="cm-tag" :class="'tag-' + model.protocolType">{{ model.protocolType === 'openai' ? 'OpenAI' : 'Anthropic' }}</span>
                <span class="cm-card-id">{{ model.modelId }}</span>
              </div>
              <div v-if="model.baseUrl" class="cm-card-url">{{ model.baseUrl }}</div>
            </div>
            <div class="cm-card-actions">
              <button class="cm-btn cm-btn-edit" @click="startEdit(model)">编辑</button>
              <button class="cm-btn cm-btn-del" @click="handleDelete(model)">删除</button>
            </div>
          </div>
        </div>

        <div v-else class="cm-empty">
          <div class="cm-empty-icon">📦</div>
          <p>还没有自定义模型</p>
          <p class="cm-empty-sub">点击下方按钮添加你的第一个模型</p>
        </div>
      </div>

      <div v-if="showForm" class="cm-form-wrap">
          <h3 class="cm-form-title">{{ editingId ? '编辑模型' : '添加模型' }}</h3>
          <form class="cm-form" @submit.prevent="handleSubmit">
            <div class="cm-field">
              <label>显示名称 <em>*</em></label>
              <input v-model="form.modelName" type="text" placeholder="如：我的 GPT-4o" required />
            </div>
            <div class="cm-field">
              <label>协议类型 <em>*</em></label>
              <select v-model="form.protocolType" required>
                <option value="openai">OpenAI 兼容协议</option>
                <option value="anthropic">Anthropic 原生协议</option>
              </select>
            </div>
            <div class="cm-field">
              <label>API Base URL <em>*</em></label>
              <input v-model="form.baseUrl" type="text" placeholder="如：https://api.openai.com/v1/chat/completions" required />
            </div>
            <div class="cm-field">
              <label>模型 ID <em>*</em></label>
              <input v-model="form.modelId" type="text" placeholder="如：gpt-4o" required />
            </div>
            <div class="cm-field">
              <label>模型类型 <em>*</em></label>
              <div class="cm-type-toggle">
                <button
                  type="button"
                  class="cm-type-btn"
                  :class="{ active: form.modelType === 'text' }"
                  @click="form.modelType = 'text'"
                >
                  <span class="cm-type-icon">💬</span>
                  <span class="cm-type-label">文本模型</span>
                  <span class="cm-type-desc">纯语言对话</span>
                </button>
                <button
                  type="button"
                  class="cm-type-btn"
                  :class="{ active: form.modelType === 'multimodal' }"
                  @click="form.modelType = 'multimodal'"
                >
                  <span class="cm-type-icon">🖼️</span>
                  <span class="cm-type-label">多模态模型</span>
                  <span class="cm-type-desc">支持图像识别</span>
                </button>
              </div>
            </div>
            <div class="cm-field">
              <label>API Key <em v-if="!editingId">*</em></label>
              <div class="cm-pwd-row">
                <input
                  v-model="form.apiKey"
                  :type="showApiKey ? 'text' : 'password'"
                  :placeholder="editingId ? '留空则不修改' : '输入 API Key'"
                  :required="!editingId"
                  @input="onApiKeyInput"
                />
                <button type="button" class="cm-toggle-pwd" @click="showApiKey = !showApiKey">{{ showApiKey ? '隐藏' : '显示' }}</button>
              </div>
            </div>
            <div class="cm-row">
              <div class="cm-field cm-field-half">
                <label>最大 Token</label>
                <input v-model.number="form.maxTokens" type="number" placeholder="4096" />
              </div>
              <div class="cm-field cm-field-half">
                <label>温度</label>
                <input v-model.number="form.temperature" type="number" step="0.1" min="0" max="2" placeholder="0.7" />
              </div>
            </div>
            <div class="cm-form-actions">
              <button type="button" class="cm-btn cm-btn-cancel" @click="cancelForm">取消</button>
              <button type="submit" class="cm-btn cm-btn-save" :disabled="saving">
                {{ saving ? '保存中...' : (editingId ? '更新' : '添加') }}
              </button>
            </div>
          </form>
        </div>

        <div v-if="!showForm" class="cm-footer">
          <button class="cm-btn cm-btn-add-lg" @click="startAdd">+ 添加自定义模型</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { aiModelConfigService, type UserCustomModel } from '../services/aiModelConfig'

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
const showForm = ref(false)
const editingId = ref<number | null>(null)
const customModels = ref<UserCustomModel[]>([])
const showApiKey = ref(false)
const apiKeyChanged = ref(false)

const defaultForm = (): UserCustomModel => ({
  userId: props.userId,
  modelName: '',
  protocolType: 'openai',
  baseUrl: '',
  modelId: '',
  apiKey: '',
  modelType: 'text',
  maxTokens: undefined,
  temperature: undefined
})

const form = ref<UserCustomModel>(defaultForm())

const loadModels = async () => {
  loading.value = true
  try {
    const result = await aiModelConfigService.getUserCustomModels()
    customModels.value = (result || []).map((m: any) => ({
      id: m.id,
      userId: m.userId,
      modelName: m.modelName,
      protocolType: m.protocolType,
      baseUrl: m.baseUrl || '',
      modelId: m.modelId,
      modelType: m.modelType || 'text',
      apiKey: m.apiKey || '',
      maxTokens: m.maxTokens,
      temperature: m.temperature,
      isDefault: m.isDefault,
      status: m.status,
      fullIdentifier: m.fullIdentifier
    }))
  } catch {
    customModels.value = []
  } finally {
    loading.value = false
  }
}

const startAdd = () => {
  form.value = defaultForm()
  editingId.value = null
  showForm.value = true
  showApiKey.value = false
  apiKeyChanged.value = false
}

const startEdit = (model: UserCustomModel) => {
  form.value = { ...model, apiKey: '' }
  editingId.value = model.id ?? null
  showForm.value = true
  showApiKey.value = false
  apiKeyChanged.value = false
}

const cancelForm = () => {
  showForm.value = false
  editingId.value = null
}

const handleSubmit = async () => {
  saving.value = true
  try {
    const payload = { ...form.value }
    if (editingId.value && !apiKeyChanged.value) {
      payload.apiKey = ''
    }
    if (editingId.value) {
      await aiModelConfigService.updateCustomModel(editingId.value, payload)
    } else {
      await aiModelConfigService.createCustomModel(payload)
    }
    showForm.value = false
    editingId.value = null
    await loadModels()
    emit('changed')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (model: UserCustomModel) => {
  if (!model.id) return
  await aiModelConfigService.deleteCustomModel(model.id)
  await loadModels()
  emit('changed')
}

const handleClose = () => {
  showForm.value = false
  editingId.value = null
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
.cm-overlay {
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

.cm-modal {
  width: 480px;
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

.cm-close {
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
.cm-close svg { width: 16px; height: 16px; }
.cm-close:hover { background: rgba(255, 255, 255, 0.12); color: #ddd; }

.cm-title {
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

.cm-body {
  padding: 4px 22px 20px;
  overflow-y: auto;
  flex: 1;
}

.cm-list-header {
  margin-bottom: 10px;
}
.cm-list-count {
  font-size: 13px;
  color: #999;
  font-weight: 500;
}

.cm-card {
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
.cm-card:hover { border-color: rgba(108, 92, 231, 0.25); }

.cm-card-info { flex: 1; min-width: 0; }

.cm-card-name {
  font-size: 14px;
  font-weight: 500;
  color: #e8e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cm-card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.cm-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 4px;
  letter-spacing: 0.3px;
}
.tag-openai { background: rgba(108, 92, 231, 0.15); color: #a29bfe; }
.tag-anthropic { background: rgba(239, 83, 80, 0.12); color: #ef8b85; }

.cm-card-id {
  font-size: 12px;
  color: #777;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
}

.cm-card-url {
  font-size: 11px;
  color: #555;
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cm-card-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.cm-empty {
  text-align: center;
  padding: 36px 0 20px;
}
.cm-empty-icon { font-size: 36px; margin-bottom: 10px; opacity: 0.5; }
.cm-empty p { margin: 0; font-size: 14px; color: #888; }
.cm-empty-sub { font-size: 12px !important; color: #555; margin-top: 4px !important; }

.cm-form-wrap {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.cm-form-title {
  font-size: 14px;
  font-weight: 600;
  color: #ccc;
  margin: 0 0 14px;
}

.cm-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cm-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.cm-field label {
  font-size: 12px;
  font-weight: 500;
  color: #999;
}
.cm-field label em {
  color: #ef5350;
  font-style: normal;
  margin-left: 2px;
}

.cm-field input,
.cm-field select {
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
.cm-field input::placeholder { color: #555; }
.cm-field input:focus,
.cm-field select:focus {
  border-color: #6c5ce7;
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
}

.cm-row { display: flex; gap: 12px; }
.cm-field-half { flex: 1; }

.cm-pwd-row {
  display: flex;
  gap: 0;
}
.cm-pwd-row input {
  flex: 1;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.cm-toggle-pwd {
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
.cm-toggle-pwd:hover { color: #ccc; background: #2a2a36; }

.cm-type-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.cm-type-btn {
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
.cm-type-btn:hover {
  border-color: rgba(255, 255, 255, 0.15);
  background: #1e1e28;
  color: #bbb;
}

.cm-type-btn.active {
  border-color: #6c5ce7;
  background: rgba(108, 92, 231, 0.1);
  color: #e0e0f0;
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.08);
}

.cm-type-icon {
  font-size: 22px;
  line-height: 1;
  margin-bottom: 2px;
}

.cm-type-label {
  font-size: 13px;
  font-weight: 600;
}

.cm-type-desc {
  font-size: 11px;
  opacity: 0.55;
}

.cm-form-actions,
.cm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}
.cm-footer { justify-content: center; }

.cm-btn {
  padding: 9px 18px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.cm-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.cm-btn-edit {
  background: rgba(108, 92, 231, 0.12);
  color: #a29bfe;
}
.cm-btn-edit:hover:not(:disabled) { background: rgba(108, 92, 231, 0.22); }

.cm-btn-del {
  background: rgba(239, 83, 80, 0.1);
  color: #ef8b85;
}
.cm-btn-del:hover:not(:disabled) { background: rgba(239, 83, 80, 0.2); }

.cm-btn-cancel {
  background: rgba(255, 255, 255, 0.06);
  color: #aaa;
}
.cm-btn-cancel:hover { background: rgba(255, 255, 255, 0.1); }

.cm-btn-save {
  background: linear-gradient(135deg, #6c5ce7 0%, #5a4bd1 100%);
  color: #fff;
}
.cm-btn-save:hover:not(:disabled) { box-shadow: 0 4px 14px rgba(108, 92, 231, 0.35); transform: translateY(-1px); }

.cm-btn-add-lg {
  padding: 11px 28px;
  background: linear-gradient(135deg, #6c5ce7 0%, #5a4bd1 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.3px;
}
.cm-btn-add-lg:hover { box-shadow: 0 6px 20px rgba(108, 92, 231, 0.35); transform: translateY(-1px); }

@media (max-width: 520px) {
  .cm-modal {
    width: calc(100vw - 24px);
    max-height: 88vh;
  }
  .cm-title { padding-left: 16px; font-size: 16px; }
  .cm-body { padding: 14px 16px 18px; }
  .cm-close { top: 12px; right: 12px; }
  .cm-row { flex-direction: column; gap: 0; }
  .cm-field-half { flex: none; }
}
</style>
