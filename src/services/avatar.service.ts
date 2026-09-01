import api from './api';
import {
  AVATAR_ACCEPTED_MIME_TYPES,
  AVATAR_MAX_SIZE_BYTES,
  type AvatarMimeType,
  type ConfirmAvatarResponse,
  type RequestAvatarUploadResponse,
} from '@/types';

export class AvatarTooLargeError extends Error {
  constructor(public readonly sizeBytes: number) {
    super(
      `Imagem muito grande (${(sizeBytes / 1024 / 1024).toFixed(1)}MB). ` +
        `O limite é ${AVATAR_MAX_SIZE_BYTES / 1024 / 1024}MB.`,
    );
    this.name = 'AvatarTooLargeError';
  }
}

export class AvatarInvalidTypeError extends Error {
  constructor(public readonly mimeType: string) {
    super(`Tipo de imagem não suportado: ${mimeType}.`);
    this.name = 'AvatarInvalidTypeError';
  }
}

const isAcceptedMime = (mime: string): mime is AvatarMimeType =>
  (AVATAR_ACCEPTED_MIME_TYPES as readonly string[]).includes(mime);

const extToMime = (ext: string | undefined): AvatarMimeType | null => {
  switch (ext?.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return null;
  }
};

/**
 * Inferência de MIME. O browser costuma preencher `File.type` corretamente,
 * mas ainda tratamos dois casos: a variante errada `image/jpg` e o `type`
 * vazio (acontece com alguns arquivos vindos de gerenciadores de arquivos),
 * quando caímos na extensão do nome.
 */
const inferMimeType = (file: File): AvatarMimeType | null => {
  if (file.type) {
    if (file.type === 'image/jpg') return 'image/jpeg';
    if (isAcceptedMime(file.type)) return file.type;
  }
  return extToMime(file.name.split('.').pop());
};

export const avatarService = {
  /**
   * Fluxo completo de upload do avatar (3 etapas, transparente pro chamador):
   *
   *   1. POST /users/me/avatar/upload-url  → presigned URL + key
   *   2. PUT direto no S3                  → o arquivo nunca passa pela Lambda
   *   3. POST /users/me/avatar/confirm     → backend valida (HEAD) e grava avatarUrl
   *
   * Devolve a URL pública final, já com o cache busting `?v=` (RN18).
   *
   * O PUT usa `fetch` cru de propósito: a instância do axios injetaria
   * `Authorization` e `baseURL`, e mandar o header de auth da nossa API para
   * o S3 faz a assinatura da presigned URL não bater (403 SignatureDoesNotMatch).
   */
  async uploadAvatar(file: File): Promise<string> {
    const mimeType = inferMimeType(file);
    if (!mimeType) {
      throw new AvatarInvalidTypeError(file.type || 'desconhecido');
    }
    if (file.size > AVATAR_MAX_SIZE_BYTES) {
      throw new AvatarTooLargeError(file.size);
    }

    // Etapa 1 — pedir a URL assinada.
    const { data: uploadData } = await api.post<RequestAvatarUploadResponse>(
      '/users/me/avatar/upload-url',
      { contentType: mimeType, sizeBytes: file.size },
    );

    // Etapa 2 — PUT no S3 com EXATAMENTE os headers que o backend usou para
    // assinar. Qualquer divergência (inclusive no Content-Type) invalida a
    // assinatura.
    const putResponse = await fetch(uploadData.uploadUrl, {
      method: 'PUT',
      headers: uploadData.headers,
      body: file,
    });

    if (!putResponse.ok) {
      console.warn(
        `[avatar] S3 PUT falhou (HTTP ${putResponse.status})`,
        await putResponse.text().catch(() => ''),
      );
      throw new Error(
        `Falha no upload para o S3 (HTTP ${putResponse.status}). Tente novamente.`,
      );
    }

    // Etapa 3 — confirmar com o backend.
    const { data: confirmData } = await api.post<ConfirmAvatarResponse>(
      '/users/me/avatar/confirm',
      { key: uploadData.key },
    );

    return confirmData.avatarUrl;
  },
};
