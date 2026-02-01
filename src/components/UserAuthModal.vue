<template>
  <div v-if="visible" class="auth-modal-overlay" @click.self="handleClose">
    <div class="auth-modal">
      <!-- 关闭按钮 -->
      <button class="close-btn" @click="handleClose">✕</button>

      <!-- 标题 -->
      <h2 class="auth-title">{{ isLogin ? '用户登录' : '用户注册' }}</h2>

      <!-- 登录表单 -->
      <form v-if="isLogin" class="auth-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label>账号</label>
          <input
            v-model="loginForm.loginIdentifier"
            type="text"
            placeholder="用户名/邮箱/手机号"
            required
          />
        </div>

        <div class="form-group">
          <label>密码</label>
          <input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            required
          />
        </div>

        <button type="submit" class="submit-btn" :disabled="isSubmitting">
          {{ isSubmitting ? '登录中...' : '登录' }}
        </button>

        <div class="form-footer">
          <span>还没有账号？</span>
          <a href="#" @click.prevent="isLogin = false">立即注册</a>
        </div>
      </form>

      <!-- 注册表单 -->
      <form v-else class="auth-form" @submit.prevent="handleRegister">
        <div class="form-group">
          <label>用户名 *</label>
          <input
            v-model="registerForm.username"
            type="text"
            placeholder="请输入用户名"
            required
            @blur="validateUsername"
          />
          <span v-if="usernameError" class="error-tip">{{ usernameError }}</span>
        </div>

        <div class="form-group">
          <label>密码 *</label>
          <input
            v-model="registerForm.password"
            type="password"
            placeholder="至少6位密码"
            required
            @blur="validatePassword"
          />
          <span v-if="passwordError" class="error-tip">{{ passwordError }}</span>
        </div>

        <div class="form-group">
          <label>确认密码 *</label>
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="再次输入密码"
            required
            @blur="validateConfirmPassword"
          />
          <span v-if="confirmPasswordError" class="error-tip">{{ confirmPasswordError }}</span>
        </div>

        <div class="form-group">
          <label>邮箱</label>
          <input
            v-model="registerForm.email"
            type="email"
            placeholder="请输入邮箱（选填）"
            @blur="validateEmail"
          />
          <span v-if="emailError" class="error-tip">{{ emailError }}</span>
        </div>

        <div class="form-group">
          <label>手机号</label>
          <input
            v-model="registerForm.phone"
            type="tel"
            placeholder="请输入手机号（选填）"
            @blur="validatePhone"
          />
          <span v-if="phoneError" class="error-tip">{{ phoneError }}</span>
          <span class="info-tip">*邮箱和手机号至少填写一个</span>
        </div>

        <button type="submit" class="submit-btn" :disabled="isSubmitting || !isFormValid">
          {{ isSubmitting ? '注册中...' : '注册' }}
        </button>

        <div class="form-footer">
          <span>已有账号？</span>
          <a href="#" @click.prevent="isLogin = true">立即登录</a>
        </div>
      </form>

      <!-- 错误提示 -->
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <!-- 成功提示 -->
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { authService } from '../services/authService'
import type { LoginRequest, RegisterRequest, UserInfo } from '../types/login'
import { getApiBaseUrl } from '../config'

// Props
interface Props {
  visible: boolean
  apiBaseUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  apiBaseUrl: getApiBaseUrl()
})

// Emits
const emit = defineEmits<{
  close: []
  loginSuccess: [userInfo: UserInfo]
  registerSuccess: [userInfo: UserInfo]
}>()

// 状态
const isLogin = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// 登录表单
const loginForm = ref<LoginRequest>({
  loginIdentifier: '',
  password: ''
})

// 注册表单
const registerForm = ref<RegisterRequest>({
  username: '',
  password: '',
  email: '',
  phone: ''
})

const confirmPassword = ref('')

// 验证错误
const usernameError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')
const emailError = ref('')
const phoneError = ref('')

// 表单验证状态
const isFormValid = computed(() => {
  return (
    !usernameError.value &&
    !passwordError.value &&
    !confirmPasswordError.value &&
    !emailError.value &&
    !phoneError.value &&
    registerForm.value.username &&
    registerForm.value.password &&
    confirmPassword.value &&
    (registerForm.value.email || registerForm.value.phone)
  )
})

// 设置API基础URL
watch(() => props.apiBaseUrl, (newUrl) => {
  authService.setBaseUrl(newUrl)
}, { immediate: true })

// 验证用户名
const validateUsername = async () => {
  const username = registerForm.value.username.trim()
  
  if (!username) {
    usernameError.value = '用户名不能为空'
    return
  }

  if (username.length < 3) {
    usernameError.value = '用户名至少3个字符'
    return
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    usernameError.value = '用户名只能包含字母、数字和下划线'
    return
  }

  // 检查用户名是否可用
  const available = await authService.checkUsername(username)
  if (!available) {
    usernameError.value = '用户名已被使用'
  } else {
    usernameError.value = ''
  }
}

// 验证密码
const validatePassword = () => {
  const password = registerForm.value.password

  if (!password) {
    passwordError.value = '密码不能为空'
    return
  }

  if (password.length < 6) {
    passwordError.value = '密码至少6位'
    return
  }

  passwordError.value = ''
}

// 验证确认密码
const validateConfirmPassword = () => {
  if (!confirmPassword.value) {
    confirmPasswordError.value = '请再次输入密码'
    return
  }

  if (confirmPassword.value !== registerForm.value.password) {
    confirmPasswordError.value = '两次密码不一致'
    return
  }

  confirmPasswordError.value = ''
}

// 验证邮箱
const validateEmail = async () => {
  const email = registerForm.value.email?.trim()

  if (!email) {
    emailError.value = ''
    return
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailError.value = '邮箱格式不正确'
    return
  }

  // 检查邮箱是否可用
  const available = await authService.checkEmail(email)
  if (!available) {
    emailError.value = '邮箱已被注册'
  } else {
    emailError.value = ''
  }
}

// 验证手机号
const validatePhone = async () => {
  const phone = registerForm.value.phone?.trim()

  if (!phone) {
    phoneError.value = ''
    return
  }

  if (!/^1[3-9]\d{9}$/.test(phone)) {
    phoneError.value = '手机号格式不正确'
    return
  }

  // 检查手机号是否可用
  const available = await authService.checkPhone(phone)
  if (!available) {
    phoneError.value = '手机号已被注册'
  } else {
    phoneError.value = ''
  }
}

// 处理登录
const handleLogin = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  isSubmitting.value = true

  try {
    const result = await authService.login(loginForm.value)

    if (result.code === 200 && result.data) {
      successMessage.value = '登录成功！'
      setTimeout(() => {
        emit('loginSuccess', result.data!)
        handleClose()
      }, 500)
    } else {
      errorMessage.value = result.msg || '登录失败'
    }
  } catch (error) {
    errorMessage.value = '登录失败，请稍后重试'
    console.error('[UserAuthModal] 登录失败:', error)
  } finally {
    isSubmitting.value = false
  }
}

// 处理注册
const handleRegister = async () => {
  // 先执行所有验证
  await validateUsername()
  validatePassword()
  validateConfirmPassword()
  if (registerForm.value.email) await validateEmail()
  if (registerForm.value.phone) await validatePhone()

  // 检查是否有错误
  if (!isFormValid.value) {
    errorMessage.value = '请检查表单输入'
    return
  }

  errorMessage.value = ''
  successMessage.value = ''
  isSubmitting.value = true

  try {
    const result = await authService.register(registerForm.value)

    if (result.code === 200 && result.data) {
      successMessage.value = '注册成功！'
      setTimeout(() => {
        emit('registerSuccess', result.data!)
        handleClose()
      }, 500)
    } else {
      errorMessage.value = result.msg || '注册失败'
    }
  } catch (error) {
    errorMessage.value = '注册失败，请稍后重试'
    console.error('[UserAuthModal] 注册失败:', error)
  } finally {
    isSubmitting.value = false
  }
}

// 关闭模态框
const handleClose = () => {
  // 重置表单
  loginForm.value = { loginIdentifier: '', password: '' }
  registerForm.value = { username: '', password: '', email: '', phone: '' }
  confirmPassword.value = ''
  
  // 重置错误信息
  usernameError.value = ''
  passwordError.value = ''
  confirmPasswordError.value = ''
  emailError.value = ''
  phoneError.value = ''
  errorMessage.value = ''
  successMessage.value = ''
  
  // 重置为登录模式
  isLogin.value = true
  
  emit('close')
}
</script>

<style scoped>
.auth-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.auth-modal {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  padding: 40px;
  width: 90%;
  max-width: 450px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 24px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

.auth-title {
  color: white;
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 30px;
  text-align: center;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.form-group input {
  padding: 12px 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 15px;
  transition: all 0.3s ease;
}

.form-group input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.form-group input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.15);
}

.error-tip {
  color: #ff6b6b;
  font-size: 12px;
  margin-top: -4px;
}

.info-tip {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  margin-top: -4px;
}

.submit-btn {
  padding: 14px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 10px;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(255, 255, 255, 0.3);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-footer {
  text-align: center;
  color: white;
  font-size: 14px;
  margin-top: 10px;
}

.form-footer a {
  color: white;
  font-weight: bold;
  text-decoration: underline;
  margin-left: 5px;
}

.form-footer a:hover {
  opacity: 0.8;
}

.error-message {
  background: rgba(255, 107, 107, 0.2);
  border: 2px solid #ff6b6b;
  color: white;
  padding: 12px;
  border-radius: 10px;
  text-align: center;
  margin-top: 15px;
  animation: shake 0.5s ease;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}

.success-message {
  background: rgba(81, 207, 102, 0.2);
  border: 2px solid #51cf66;
  color: white;
  padding: 12px;
  border-radius: 10px;
  text-align: center;
  margin-top: 15px;
  animation: fadeIn 0.3s ease;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .auth-modal {
    padding: 30px 20px;
    max-width: 95%;
  }

  .auth-title {
    font-size: 24px;
  }

  .form-group input {
    font-size: 14px;
  }
}
</style>
