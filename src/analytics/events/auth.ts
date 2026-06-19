import { getPostHog } from '../posthog';

export const authEvents = {
  signupCompleted(props: { method: 'email' | 'google' }) {
    getPostHog().capture('auth_signup_completed', props);
  },

  loginSucceeded(props: { method: 'email' | 'google' }) {
    getPostHog().capture('auth_login_succeeded', props);
  },

  loginFailed(props: { reason: string }) {
    getPostHog().capture('auth_login_failed', { reason: props.reason });
  },

  logoutClicked() {
    getPostHog().capture('auth_logout_clicked');
  },

  passwordResetRequested() {
    getPostHog().capture('auth_password_reset_requested');
  },

  otpVerified() {
    getPostHog().capture('auth_otp_verified');
  },
};
