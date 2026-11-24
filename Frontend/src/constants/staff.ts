import { ROUTES } from './routes';

export const ADMIN_HOME = ROUTES.admin;

export const LOGIN_COPY = {
  title: 'Outlet Admin Login',
  welcome: 'Sign in with your Outlet ID and password to manage orders, kitchen queue, tables, and menu stock.',
  submit: 'Sign In',
  submitting: 'Signing in...',
  back: 'Back to ordering',
} as const;
