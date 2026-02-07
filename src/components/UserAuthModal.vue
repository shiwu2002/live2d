<template>
  <div v-if="visible" class="auth-modal-overlay" @click.self="handleClose">
    <div class="auth-modal">
      <!-- 关闭按钮 -->
      <button class="close-btn" @click="handleClose">✕</button>

      <!-- 标题 -->
      <h2 class="auth-title">
        {{
          isForgotPassword
            ? '找回密码'
            : isLogin
              ? '用户登录'
              : '用户注册'
        }}
      </h2>

      <!-- 登录表单 -->
      <form v-if="!isForgotPassword && isLogin" class="auth-form" @submit.prevent="handleLogin">
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
          <a href="#" @click.prevent="switchToRegister">立即注册</a>
          <span style="margin-left: 10px">忘记密码？</span>
          <a href="#" @click.prevent="switchToForgot">找回密码</a>
        </div>
      </form>

      <!-- 注册表单 -->
      <form v-else-if="!isForgotPassword && !isLogin" class="auth-form" @submit.prevent="handleRegister">
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
          <label>邮箱 *</label>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input
              v-model="registerForm.email"
              type="email"
              placeholder="请输入邮箱（必填）"
              required
              @blur="validateEmail"
              style="flex: 1"
            />
            <button
              type="button"
              class="submit-btn"
              style="padding: 10px 12px"
              :disabled="isSubmitting || !canSendRegisterCode || regCodeCountdown > 0"
              @click="sendRegisterEmailCode"
            >
              {{ regCodeCountdown > 0 ? `重新发送(${regCodeCountdown}s)` : '发送验证码' }}
            </button>
          </div>
          <span v-if="emailError" class="error-tip">{{ emailError }}</span>
        </div>

        <div class="form-group">
          <label>邮箱验证码 *</label>
          <input
            v-model="registerForm.code"
            type="text"
            inputmode="numeric"
            placeholder="请输入邮箱验证码"
            required
          />
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
        </div>

        <button type="submit" class="submit-btn" :disabled="isSubmitting || !isRegisterFormValid">
          {{ isSubmitting ? '注册中...' : '注册' }}
        </button>

        <div class="form-footer">
          <span>已有账号？</span>
          <a href="#" @click.prevent="switchToLogin">立即登录</a>
        </div>
      </form>

      <!-- 找回密码表单 -->
      <form v-else class="auth-form" @submit.prevent="handleResetPasswordByEmail">
        <div class="form-group">
          <label>邮箱 *</label>
          <div style="display: flex; gap: 8px; align-items: center;">
            <input
              v-model="resetForm.email"
              type="email"
              placeholder="请输入注册邮箱"
              required
              @blur="validateResetEmail"
              style="flex: 1"
            />
            <button
              type="button"
              class="submit-btn"
              style="padding: 10px 12px"
              :disabled="isSubmitting || !canSendResetCode || resetCodeCountdown > 0"
              @click="sendResetEmailCode"
            >
              {{ resetCodeCountdown > 0 ? `重新发送(${resetCodeCountdown}s)` : '发送验证码' }}
            </button>
          </div>
          <span v-if="resetEmailError" class="error-tip">{{ resetEmailError }}</span>
        </div>

        <div class="form-group">
          <label>邮箱验证码 *</label>
          <input
            v-model="resetForm.code"
            type="text"
            inputmode="numeric"
            placeholder="请输入邮箱验证码"
            required
          />
        </div>

        <div class="form-group">
          <label>新密码 *</label>
          <input
            v-model="resetForm.newPassword"
            type="password"
            placeholder="至少6位密码"
            required
            @blur="validateResetNewPassword"
          />
          <span v-if="resetNewPasswordError" class="error-tip">{{ resetNewPasswordError }}</span>
        </div>

        <div class="form-group">
          <label>确认新密码 *</label>
          <input
            v-model="resetConfirmPassword"
            type="password"
            placeholder="再次输入新密码"
            required
            @blur="validateResetConfirmPassword"
          />
          <span v-if="resetConfirmPasswordError" class="error-tip">{{ resetConfirmPasswordError }}</span>
        </div>

        <button type="submit" class="submit-btn" :disabled="isSubmitting || !isResetFormValid">
          {{ isSubmitting ? '重置中...' : '重置密码' }}
        </button>

        <div class="form-footer">
          <span>想起密码了？</span>
          <a href="#" @click.prevent="switchToLogin">返回登录</a>
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
import type {
  LoginRequest,
  RegisterRequest,
  ResetPasswordByEmailRequest,
  UserInfo
} from '../types/login'
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
const isForgotPassword = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// 登录表单
const loginForm = ref<LoginRequest>({
  loginIdentifier: '',
  password: ''
})

// 注册表单（邮箱与验证码为必填）
const registerForm = ref<RegisterRequest>({
  username: '',
  password: '',
  email: '',
  phone: '',
  code: ''
})

const confirmPassword = ref('')

// 找回密码表单
const resetForm = ref<ResetPasswordByEmailRequest>({
  email: '',
  code: '',
  newPassword: ''
})
const resetConfirmPassword = ref('')

// 发送验证码控制
const regCodeCountdown = ref(0)
const resetCodeCountdown = ref(0)
let regTimer: number | null = null
let resetTimer: number | null = null
const canSendRegisterCode = ref(true)
const canSendResetCode = ref(true)

// 验证错误
const usernameError = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')
const emailError = ref('')
const phoneError = ref('')

const resetEmailError = ref('')
const resetNewPasswordError = ref('')
const resetConfirmPasswordError = ref('')

// 表单验证状态（注册）
const isRegisterFormValid = computed(() => {
  return (
    !usernameError.value &&
    !passwordError.value &&
    !confirmPasswordError.value &&
    !emailError.value &&
    !phoneError.value &&
    registerForm.value.username &&
    registerForm.value.password &&
    confirmPassword.value &&
    registerForm.value.email &&
    registerForm.value.code !== ''
  )
})

// 表单验证状态（找回）
const isResetFormValid = computed(() => {
  return (
    !resetEmailError.value &&
    !resetNewPasswordError.value &&
    !resetConfirmPasswordError.value &&
    resetForm.value.email &&
    resetForm.value.code &&
    resetForm.value.newPassword &&
    resetConfirmPassword.value &&
    resetForm.value.newPassword === resetConfirmPassword.value
  )
})

// 设置API基础URL
watch(() => props.apiBaseUrl, (newUrl) => {
  authService.setBaseUrl(newUrl)
}, { immediate: true })

// 视图切换
const switchToRegister = () => {
  isLogin.value = false
  isForgotPassword.value = false
  clearMessages()
}
const switchToLogin = () => {
  isLogin.value = true
  isForgotPassword.value = false
  clearMessages()
}
const switchToForgot = () => {
  isForgotPassword.value = true
  isLogin.value = false
  clearMessages()
}

// 清理提示
const clearMessages = () => {
  errorMessage.value = ''
  successMessage.value = ''
}

// 验证用户名（仅前端基本格式校验，后端会统一验证）
const validateUsername = () => {
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

  usernameError.value = ''
}

// 验证密码（注册）
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

// 验证确认密码（注册）
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

// 验证邮箱（注册，仅前端基本格式校验）
const validateEmail = () => {
  const email = registerForm.value.email?.trim()

  if (!email) {
    emailError.value = '邮箱为必填项'
    return
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailError.value = '邮箱格式不正确'
    return
  }

  emailError.value = ''
}

// 验证手机号（注册，仅前端基本格式校验）
const validatePhone = () => {
  const phone = registerForm.value.phone?.trim()

  if (!phone) {
    phoneError.value = ''
    return
  }

  if (!/^1[3-9]\d{9}$/.test(phone)) {
    phoneError.value = '手机号格式不正确'
    return
  }

  phoneError.value = ''
}

// 验证邮箱（找回）
const validateResetEmail = () => {
  const email = resetForm.value.email?.trim()
  if (!email) {
    resetEmailError.value = '邮箱为必填项'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    resetEmailError.value = '邮箱格式不正确'
    return
  }
  resetEmailError.value = ''
}

// 验证新密码（找回）
const validateResetNewPassword = () => {
  const pwd = resetForm.value.newPassword
  if (!pwd) {
    resetNewPasswordError.value = '新密码不能为空'
    return
  }
  if (pwd.length < 6) {
    resetNewPasswordError.value = '新密码至少6位'
    return
  }
  resetNewPasswordError.value = ''
}

// 验证确认新密码（找回）
const validateResetConfirmPassword = () => {
  if (!resetConfirmPassword.value) {
    resetConfirmPasswordError.value = '请再次输入新密码'
    return
  }
  if (resetConfirmPassword.value !== resetForm.value.newPassword) {
    resetConfirmPasswordError.value = '两次密码不一致'
    return
  }
  resetConfirmPasswordError.value = ''
}

// 发送注册邮箱验证码
const sendRegisterEmailCode = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  validateEmail()
  if (emailError.value) {
    errorMessage.value = emailError.value
    return
  }

  if (!registerForm.value.email) {
    errorMessage.value = '请先填写邮箱'
    return
  }

  try {
    const resp = await authService.sendEmailCode(registerForm.value.email)
    if (resp.code === 200) {
      successMessage.value = '验证码已发送，请查收邮件'
      startRegCountdown(60)
    } else {
      errorMessage.value = resp.msg || '验证码发送失败'
    }
  } catch (e) {
    console.error('[UserAuthModal] 发送注册验证码失败:', e)
    errorMessage.value = '验证码发送失败，请稍后重试'
  }
}

// 发送找回密码邮箱验证码
const sendResetEmailCode = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  validateResetEmail()
  if (resetEmailError.value) {
    errorMessage.value = resetEmailError.value
    return
  }

  if (!resetForm.value.email) {
    errorMessage.value = '请先填写邮箱'
    return
  }

  try {
    const resp = await authService.sendResetEmailCode(resetForm.value.email)
    if (resp.code === 200) {
      successMessage.value = '验证码已发送，请查收邮件'
      startResetCountdown(60)
    } else {
      errorMessage.value = resp.msg || '验证码发送失败'
    }
  } catch (e) {
    console.error('[UserAuthModal] 发送找回验证码失败:', e)
    errorMessage.value = '验证码发送失败，请稍后重试'
  }
}

// 倒计时控制
const startRegCountdown = (sec: number) => {
  regCodeCountdown.value = sec
  canSendRegisterCode.value = true
  if (regTimer) {
    window.clearInterval(regTimer)
    regTimer = null
  }
  regTimer = window.setInterval(() => {
    regCodeCountdown.value -= 1
    if (regCodeCountdown.value <= 0 && regTimer) {
      window.clearInterval(regTimer)
      regTimer = null
    }
  }, 1000)
}

const startResetCountdown = (sec: number) => {
  resetCodeCountdown.value = sec
  canSendResetCode.value = true
  if (resetTimer) {
    window.clearInterval(resetTimer)
    resetTimer = null
  }
  resetTimer = window.setInterval(() => {
    resetCodeCountdown.value -= 1
    if (resetCodeCountdown.value <= 0 && resetTimer) {
      window.clearInterval(resetTimer)
      resetTimer = null
    }
  }, 1000)
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
  validateUsername()
  validatePassword()
  validateConfirmPassword()
  validateEmail()
  if (registerForm.value.phone) validatePhone()

  // 检查是否有错误
  if (!isRegisterFormValid.value) {
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

// 通过邮箱验证码重置密码
const handleResetPasswordByEmail = async () => {
  validateResetEmail()
  validateResetNewPassword()
  validateResetConfirmPassword()

  if (!isResetFormValid.value) {
    errorMessage.value = '请检查表单输入'
    return
  }

  errorMessage.value = ''
  successMessage.value = ''
  isSubmitting.value = true

  try {
    const result = await authService.resetPasswordByEmail(resetForm.value)
    if (result.code === 200) {
      successMessage.value = '密码重置成功，请使用新密码登录'
      setTimeout(() => {
        switchToLogin()
      }, 800)
    } else {
      errorMessage.value = result.msg || '重置密码失败'
    }
  } catch (error) {
    console.error('[UserAuthModal] 重置密码失败:', error)
    errorMessage.value = '重置密码失败，请稍后重试'
  } finally {
    isSubmitting.value = false
  }
}

// 关闭模态框
const handleClose = () => {
  // 重置表单
  loginForm.value = { loginIdentifier: '', password: '' }
  registerForm.value = { username: '', password: '', email: '', phone: '', code: '' }
  confirmPassword.value = ''
  resetForm.value = { email: '', code: '', newPassword: '' }
  resetConfirmPassword.value = ''

  // 清理倒计时
  if (regTimer) {
    window.clearInterval(regTimer)
    regTimer = null
  }
  if (resetTimer) {
    window.clearInterval(resetTimer)
    resetTimer = null
  }
  regCodeCountdown.value = 0
  resetCodeCountdown.value = 0

  // 重置错误信息
  usernameError.value = ''
  passwordError.value = ''
  confirmPasswordError.value = ''
  emailError.value = ''
  phoneError.value = ''
  resetEmailError.value = ''
  resetNewPasswordError.value = ''
  resetConfirmPasswordError.value = ''
  errorMessage.value = ''
  successMessage.value = ''

  // 重置为登录模式
  isLogin.value = true
  isForgotPassword.value = false

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
