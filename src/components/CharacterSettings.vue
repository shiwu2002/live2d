<template>
  <div v-if="visible" class="character-overlay" @click.self="handleClose">
    <div class="character-modal">
      <button class="close-btn" @click="handleClose">✕</button>
      <h2 class="modal-title">角色设置</h2>

      <div class="tab-bar">
        <button :class="['tab', activeTab === 'info' && 'active']" @click="activeTab = 'info'">角色信息</button>
        <button :class="['tab', activeTab === 'voice' && 'active']" @click="activeTab = 'voice'; loadVoices()">音色配置</button>
      </div>

      <div v-if="activeTab === 'info'" class="tab-content">
        <form class="char-form" @submit.prevent="handleSave">
          <div class="form-group">
            <label>角色名称 <span class="required">*</span></label>
            <input v-model="form.name" type="text" placeholder="给角色起个名字" required />
          </div>
          <div class="form-group">
            <label>性别</label>
            <select v-model="form.gender">
              <option value="">不设置</option>
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div class="form-group">
            <label>角色描述</label>
            <textarea v-model="form.description" rows="2" placeholder="简单描述这个角色"></textarea>
          </div>
          <div class="form-group">
            <label>背景故事</label>
            <textarea v-model="form.background" rows="2" placeholder="角色的背景故事"></textarea>
          </div>
          <div class="form-group">
            <label>性格特点</label>
            <input v-model="form.personalityTraits" type="text" placeholder="如：温柔、傲娇、抽象" />
          </div>
          <div class="form-group">
            <label>行事风格</label>
            <input v-model="form.behaviorStyle" type="text" placeholder="如：懒、积极、神秘" />
          </div>
          <div class="form-group">
            <label>语言特点</label>
            <input v-model="form.languageStyle" type="text" placeholder="如：简单粗暴、文艺、毒舌" />
          </div>
          <div class="form-group">
            <label>输出格式说明</label>
            <textarea v-model="form.outputFormat" rows="2" placeholder="AI 回复的格式要求"></textarea>
          </div>
          <div class="form-group">
            <label>完整系统提示词</label>
            <textarea v-model="form.systemPrompt" rows="4" placeholder="自定义完整的 system prompt，优先级最高"></textarea>
          </div>
          <div class="form-group">
            <label>角色图片</label>
            <div class="upload-area">
              <div class="image-preview-list">
                <div v-for="(url, idx) in imageList" :key="idx" class="image-preview-item">
                  <img :src="url" alt="" />
                  <button type="button" class="remove-btn" @click="removeImage(idx)">✕</button>
                </div>
                <button type="button" class="upload-add-btn" @click="triggerImageInput" :disabled="uploadingImage">
                  {{ uploadingImage ? '上传中...' : '+ 上传图片' }}
                </button>
              </div>
              <input
                ref="imageInputRef"
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                multiple
                style="display: none"
                @change="handleImageUpload"
              />
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="handleClose">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>

      <div v-if="activeTab === 'voice'" class="tab-content">
        <div v-if="!userId" class="empty-tip">请先登录后再配置音色</div>
        <template v-else>
          <div class="voice-section">
            <h3>克隆音色</h3>
            <p class="section-desc">上传一段音频文件（wav/mp3/m4a），系统将克隆该音色用于语音对话</p>
            <div class="upload-area">
              <div v-if="audioFileName" class="audio-file-info">
                <span class="audio-file-name">📎 {{ audioFileName }}</span>
                <button type="button" class="remove-btn" @click="clearAudioFile">✕</button>
              </div>
              <button type="button" class="btn btn-outline" @click="triggerAudioInput" :disabled="uploadingAudio || cloningVoice">
                {{ uploadingAudio ? '上传中...' : (audioFileName ? '重新选择' : '选择音频文件') }}
              </button>
              <input
                ref="audioInputRef"
                type="file"
                accept="audio/wav,audio/mp3,audio/mpeg,audio/x-m4a,audio/mp4"
                style="display: none"
                @change="handleAudioSelect"
              />
            </div>
            <button
              class="btn btn-primary"
              style="margin-top: 12px"
              :disabled="cloningVoice || !uploadedAudioUrl"
              @click="handleCloneVoice"
            >
              {{ cloningVoice ? '克隆中...' : '开始克隆' }}
            </button>
          </div>

          <div class="voice-section">
            <h3>已克隆的音色</h3>
            <div v-if="loadingVoices" class="loading-tip">加载中...</div>
            <div v-else-if="voices.length === 0" class="empty-tip">暂无克隆音色</div>
            <div v-else class="voice-list">
              <div v-for="v in voices" :key="v.voiceId" class="voice-item">
                <div class="voice-info">
                  <span class="voice-name">{{ v.voiceName || v.voiceId }}</span>
                  <span v-if="currentVoiceId === v.voiceId" class="voice-badge">使用中</span>
                </div>
                <div class="voice-actions">
                  <button
                    v-if="currentVoiceId !== v.voiceId"
                    class="btn btn-sm btn-primary"
                    @click="handleUseVoice(v.voiceId)"
                  >使用</button>
                  <button class="btn btn-sm btn-danger" @click="handleDeleteVoice(v.voiceId)">删除</button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div v-if="message" class="message" :class="message.type">{{ message.text }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { characterService } from '../services/characterService'
import { uploadService } from '../services/uploadService'
import type { CharacterInfoDto, CharacterInfo, Voice } from '../types/character'

const props = defineProps<{
  visible: boolean
  userId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', character: CharacterInfo): void
}>()

const activeTab = ref<'info' | 'voice'>('info')
const saving = ref(false)
const cloningVoice = ref(false)
const loadingVoices = ref(false)
const uploadingImage = ref(false)
const uploadingAudio = ref(false)
const voices = ref<Voice[]>([])
const currentVoiceId = ref<string>('')
const message = ref<{ text: string; type: 'success' | 'error' } | null>(null)

const imageInputRef = ref<HTMLInputElement>()
const audioInputRef = ref<HTMLInputElement>()
const imageList = ref<string[]>([])
const audioFileName = ref('')
const uploadedAudioUrl = ref('')

const form = ref<CharacterInfoDto>({
  userId: '',
  name: '',
  gender: '',
  description: '',
  background: '',
  personalityTraits: '',
  behaviorStyle: '',
  languageStyle: '',
  outputFormat: '',
  systemPrompt: '',
  images: '',
})

const showMessage = (text: string, type: 'success' | 'error') => {
  message.value = { text, type }
  setTimeout(() => { message.value = null }, 3000)
}

const loadCharacter = async () => {
  if (!props.userId) return
  try {
    const res = await characterService.getByUserId(props.userId)
    if (res.code === 200 && res.data) {
      const c = res.data
      form.value = {
        userId: c.userId,
        name: c.name || '',
        gender: c.gender || '',
        description: c.description || '',
        background: c.background || '',
        personalityTraits: c.personalityTraits || '',
        behaviorStyle: c.behaviorStyle || '',
        languageStyle: c.languageStyle || '',
        outputFormat: c.outputFormat || '',
        systemPrompt: c.systemPrompt || '',
        images: c.images || '',
      }
      currentVoiceId.value = c.voice || ''
      imageList.value = c.images ? c.images.split(',').map((s: string) => s.trim()).filter(Boolean) : []
    }
  } catch (e) {
    console.error('加载角色失败:', e)
  }
}

const loadVoices = async () => {
  if (!props.userId) return
  loadingVoices.value = true
  try {
    const res = await characterService.listVoices(props.userId)
    if (res.code === 200 && res.data) {
      voices.value = res.data
    }
  } catch (e) {
    console.error('加载音色列表失败:', e)
  } finally {
    loadingVoices.value = false
  }
}

const triggerImageInput = () => {
  imageInputRef.value?.click()
}

const handleImageUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  uploadingImage.value = true
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > 10 * 1024 * 1024) {
        showMessage(`${file.name} 超过 10MB 限制`, 'error')
        continue
      }
      const res = await uploadService.uploadImage(file)
      if (res.code === 200 && res.data) {
        imageList.value.push(res.data)
      } else {
        showMessage(`${file.name} 上传失败: ${res.msg || '未知错误'}`, 'error')
      }
    }
    form.value.images = imageList.value.join(',')
  } catch (e: any) {
    showMessage(e.message || '图片上传失败', 'error')
  } finally {
    uploadingImage.value = false
    input.value = ''
  }
}

const removeImage = (index: number) => {
  imageList.value.splice(index, 1)
  form.value.images = imageList.value.join(',')
}

const triggerAudioInput = () => {
  audioInputRef.value?.click()
}

const handleAudioSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size > 50 * 1024 * 1024) {
    showMessage('音频文件超过 50MB 限制', 'error')
    input.value = ''
    return
  }

  audioFileName.value = file.name
  uploadingAudio.value = true
  try {
    const res = await uploadService.uploadAudio(file)
    if (res.code === 200 && res.data) {
      uploadedAudioUrl.value = res.data
      showMessage('音频上传成功', 'success')
    } else {
      showMessage(`音频上传失败: ${res.msg || '未知错误'}`, 'error')
      audioFileName.value = ''
    }
  } catch (e: any) {
    showMessage(e.message || '音频上传失败', 'error')
    audioFileName.value = ''
  } finally {
    uploadingAudio.value = false
    input.value = ''
  }
}

const clearAudioFile = () => {
  audioFileName.value = ''
  uploadedAudioUrl.value = ''
}

const handleSave = async () => {
  if (!props.userId || !form.value.name) return
  saving.value = true
  try {
    form.value.userId = props.userId
    form.value.images = imageList.value.join(',')
    const res = await characterService.saveOrUpdate(form.value)
    if (res.code === 200) {
      showMessage('保存成功', 'success')
      const fullRes = await characterService.getByUserId(props.userId)
      if (fullRes.code === 200 && fullRes.data) {
        emit('saved', fullRes.data)
      }
    } else {
      showMessage(res.msg || '保存失败', 'error')
    }
  } catch (e: any) {
    showMessage(e.message || '保存失败', 'error')
  } finally {
    saving.value = false
  }
}

const handleCloneVoice = async () => {
  if (!props.userId || !uploadedAudioUrl.value) return
  cloningVoice.value = true
  try {
    const res = await characterService.updateVoice(props.userId, uploadedAudioUrl.value)
    if (res.code === 200 && res.data) {
      currentVoiceId.value = res.data
      showMessage(`音色克隆成功: ${res.data}`, 'success')
      clearAudioFile()
      loadVoices()
    } else {
      showMessage(res.msg || '克隆失败', 'error')
    }
  } catch (e: any) {
    showMessage(e.message || '克隆失败', 'error')
  } finally {
    cloningVoice.value = false
  }
}

const handleUseVoice = async (voiceId: string) => {
  if (!props.userId) return
  try {
    const charRes = await characterService.getByUserId(props.userId)
    if (charRes.code === 200 && charRes.data) {
      const updateData: CharacterInfoDto = {
        userId: charRes.data.userId,
        name: charRes.data.name,
        gender: charRes.data.gender || undefined,
        description: charRes.data.description || undefined,
        background: charRes.data.background || undefined,
        personalityTraits: charRes.data.personalityTraits || undefined,
        behaviorStyle: charRes.data.behaviorStyle || undefined,
        languageStyle: charRes.data.languageStyle || undefined,
        outputFormat: charRes.data.outputFormat || undefined,
        systemPrompt: charRes.data.systemPrompt || undefined,
        images: charRes.data.images || undefined,
      }
      await characterService.update(updateData)
      currentVoiceId.value = voiceId
      showMessage('已切换音色', 'success')
    }
  } catch (e: any) {
    showMessage(e.message || '切换音色失败', 'error')
  }
}

const handleDeleteVoice = async (voiceId: string) => {
  if (!props.userId) return
  try {
    const res = await characterService.deleteVoice(props.userId, voiceId)
    if (res.code === 200) {
      if (currentVoiceId.value === voiceId) {
        currentVoiceId.value = ''
      }
      showMessage('已删除音色', 'success')
      loadVoices()
    } else {
      showMessage(res.msg || '删除失败', 'error')
    }
  } catch (e: any) {
    showMessage(e.message || '删除失败', 'error')
  }
}

const handleClose = () => {
  emit('close')
}

watch(() => props.visible, (val) => {
  if (val && props.userId) {
    loadCharacter()
    activeTab.value = 'info'
    clearAudioFile()
  }
})
</script>

<style scoped>
.character-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.character-modal {
  background: #fff;
  border-radius: 16px;
  width: 520px;
  max-width: 95vw;
  max-height: 85vh;
  overflow-y: auto;
  padding: 28px 32px;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: #f0f0f0;
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #e0e0e0;
}

.modal-title {
  margin: 0 0 20px;
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.tab-bar {
  display: flex;
  gap: 0;
  margin-bottom: 20px;
  border-bottom: 2px solid #e9ecef;
}

.tab {
  flex: 1;
  padding: 10px 16px;
  border: none;
  background: none;
  font-size: 15px;
  font-weight: 500;
  color: #999;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}

.tab.active {
  color: #667eea;
  border-bottom-color: #667eea;
}

.tab:hover {
  color: #667eea;
}

.tab-content {
  min-height: 200px;
}

.char-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: #555;
}

.required {
  color: #f44336;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group textarea {
  resize: vertical;
}

.upload-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.image-preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.image-preview-item {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  border: 1.5px solid #e9ecef;
}

.image-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-preview-item .remove-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border-radius: 50%;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.upload-add-btn {
  width: 72px;
  height: 72px;
  border: 2px dashed #d0d0d0;
  border-radius: 8px;
  background: #fafafa;
  color: #999;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-add-btn:hover:not(:disabled) {
  border-color: #667eea;
  color: #667eea;
  background: #f0f3ff;
}

.upload-add-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.audio-file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f0f3ff;
  border-radius: 8px;
  border: 1.5px solid #c5cae9;
}

.audio-file-name {
  flex: 1;
  font-size: 14px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audio-file-info .remove-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: #e0e0e0;
  color: #666;
  border-radius: 50%;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;
}

.audio-file-info .remove-btn:hover {
  background: #f44336;
  color: #fff;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #f0f0f0;
  color: #666;
}

.btn-secondary:hover:not(:disabled) {
  background: #e0e0e0;
}

.btn-outline {
  padding: 10px 20px;
  border: 1.5px solid #667eea;
  border-radius: 8px;
  background: #fff;
  color: #667eea;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline:hover:not(:disabled) {
  background: #f0f3ff;
}

.btn-outline:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-danger {
  background: #f44336;
  color: #fff;
}

.btn-danger:hover:not(:disabled) {
  background: #d32f2f;
}

.voice-section {
  margin-bottom: 24px;
}

.voice-section h3 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.section-desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: #999;
}

.voice-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.voice-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 10px;
  border: 1.5px solid #e9ecef;
}

.voice-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.voice-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.voice-badge {
  font-size: 11px;
  padding: 2px 8px;
  background: #4caf50;
  color: #fff;
  border-radius: 10px;
  font-weight: 600;
}

.voice-actions {
  display: flex;
  gap: 8px;
}

.empty-tip,
.loading-tip {
  text-align: center;
  padding: 24px;
  color: #999;
  font-size: 14px;
}

.message {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  z-index: 3000;
  animation: slideUp 0.3s ease;
}

.message.success {
  background: #4caf50;
  color: #fff;
}

.message.error {
  background: #f44336;
  color: #fff;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
</style>
