/** Limite photo de profil — assez large pour photos smartphone, raisonnable pour le stockage. */
export const AVATAR_MAX_BYTES = 8 * 1024 * 1024

export const AVATAR_MAX_MB = AVATAR_MAX_BYTES / (1024 * 1024)

export function avatarTooLargeMessage(sizeBytes: number): string {
  const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(1)
  return `La photo est trop lourde (${sizeMb} Mo). Taille maximum : ${AVATAR_MAX_MB} Mo.`
}

export function isAvatarFileTooLarge(sizeBytes: number): boolean {
  return sizeBytes > AVATAR_MAX_BYTES
}
