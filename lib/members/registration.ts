/** Validation des champs du formulaire d'inscription. */

export type RegistrationInput = {
  firstName: string
  lastName: string
  email: string
  password: string
  postalCode: string
  commune: string
  phone?: string
}

export type RegistrationPayload = {
  first_name: string
  last_name: string
  email: string
  password: string
  postal_code: string
  commune: string
  phone: string | null
  full_name: string
}

const SWISS_NPA = /^\d{4}$/

export function validateRegistration(input: RegistrationInput): string | null {
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  const email = input.email.trim().toLowerCase()
  const postalCode = input.postalCode.trim()
  const commune = input.commune.trim()
  const phone = input.phone?.trim() ?? ''

  if (firstName.length < 2) return 'Le prénom doit contenir au moins 2 caractères.'
  if (lastName.length < 2) return 'Le nom doit contenir au moins 2 caractères.'
  if (!email || !email.includes('@')) return 'Adresse e-mail invalide.'
  if (input.password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.'
  if (!SWISS_NPA.test(postalCode)) return 'Le NPA doit comporter 4 chiffres (ex. 1966).'
  if (commune.length < 2) return 'Indiquez votre commune.'
  if (phone && phone.replace(/\D/g, '').length < 9) {
    return 'Numéro de téléphone invalide (9 chiffres minimum).'
  }

  return null
}

export function normalizeRegistration(input: RegistrationInput): RegistrationPayload {
  const first_name = input.firstName.trim()
  const last_name = input.lastName.trim()
  const phoneRaw = input.phone?.trim() ?? ''

  return {
    first_name,
    last_name,
    email: input.email.trim().toLowerCase(),
    password: input.password,
    postal_code: input.postalCode.trim(),
    commune: input.commune.trim(),
    phone: phoneRaw || null,
    full_name: `${first_name} ${last_name}`.trim(),
  }
}
