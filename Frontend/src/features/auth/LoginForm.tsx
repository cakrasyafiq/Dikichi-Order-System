import { useState, type FormEvent } from 'react';
import { TextField } from '@/components/ui/TextField';
import { LOGIN_LIMITS } from '@/constants/auth';
import { LOGIN_COPY } from '@/constants/staff';
import { describeError } from '@/lib/api/describeError';
import { validateLoginForm, type LoginFormErrors } from './loginSchema';
import { useLogin } from './useLogin';

export function LoginForm() {
  const login = useLogin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginFormErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // WHY: a second submit while a login is in flight would only repeat the slow password hash on the server.
    if (login.isPending) return;
    const checked = validateLoginForm({ username, password });
    setErrors(checked.ok ? {} : checked.errors);
    if (checked.ok) login.mutate(checked.data);
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <TextField
        id="username"
        label="Username"
        value={username}
        onChange={(value) => {
          setUsername(value);
          login.reset();
        }}
        autoComplete="username"
        maxLength={LOGIN_LIMITS.usernameMaxLength}
        error={errors.username}
      />
      <TextField
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={(value) => {
          setPassword(value);
          login.reset();
        }}
        autoComplete="current-password"
        maxLength={LOGIN_LIMITS.passwordMaxLength}
        error={errors.password}
      />
      {login.isError ? (
        <p
          role="alert"
          className="m-0 mb-3 rounded-sm border border-magenta p-3 text-[12.5px] font-semibold text-brand"
        >
          {describeError(login.error)}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={login.isPending}
        aria-busy={login.isPending}
        className="w-full rounded-full bg-magenta px-5 py-3 text-xs font-extrabold uppercase tracking-[0.03em] text-surface transition-colors duration-fast hover:bg-magenta-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {login.isPending ? LOGIN_COPY.submitting : LOGIN_COPY.submit}
      </button>
    </form>
  );
}
