export type PasswordCriterion = {
  id: string
  label: string
  met: boolean
}

export function getPasswordCriteria(password: string): PasswordCriterion[] {
  return [
    {
      id: 'length',
      label: 'Au moins 8 caractères',
      met: password.length >= 8,
    },
  ]
}

export function isPasswordValid(password: string): boolean {
  return getPasswordCriteria(password).every(c => c.met)
}

export function passwordsMatch(password: string, confirm: string): boolean {
  return confirm.length > 0 && password === confirm
}
