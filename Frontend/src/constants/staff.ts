import type { StaffRole } from './auth';
import { ROUTES } from './routes';

export const ROLE_HOME: Readonly<Record<StaffRole, string>> = {
  MASTER: ROUTES.master,
  CASHIER: ROUTES.cashier,
  KITCHEN: ROUTES.kitchen,
};

export const ROLE_LABELS: Readonly<Record<StaffRole, string>> = {
  MASTER: 'Master',
  CASHIER: 'Cashier',
  KITCHEN: 'Kitchen',
};

export const LOGIN_COPY = {
  title: 'Staff Login',
  welcome: 'Sign in to manage orders, the kitchen, or the menu.',
  submit: 'Sign In',
  submitting: 'Signing in...',
  back: 'Back to ordering',
} as const;

export const ALL_OUTLETS_LABEL = 'All outlets';

// WHY: the dashboards arrive in later steps, so each role page says what is coming instead of staying blank.
export const DASHBOARD_PLACEHOLDERS: Readonly<
  Record<StaffRole, { title: string; description: string }>
> = {
  CASHIER: {
    title: 'Cashier dashboard',
    description: 'Order queue, edit and accept orders, take payments, and mark dishes sold out.',
  },
  KITCHEN: {
    title: 'Kitchen dashboard',
    description: 'Preparing and ready queues, plus marking dishes sold out.',
  },
  MASTER: {
    title: 'Master dashboard',
    description: 'Manage outlets, tables, and menu items.',
  },
};
