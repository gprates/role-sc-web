import { ref } from 'vue';

import { useToast } from '@/composables/useToast';
import { extractErrorMessage } from '@/services/api';
import {
  AvatarInvalidTypeError,
  AvatarTooLargeError,
  avatarService,
} from '@/services/avatar.service';
import { useAuthStore } from '@/stores/auth.store';
import { AVATAR_ACCEPTED_MIME_TYPES, AVATAR_MAX_SIZE_BYTES } from '@/types';

/**
 * Fluxo de troca de avatar na web.
 *
 * No mobile o hook equivalente abre um Alert com "Tirar foto / Galeria" e pede
 * permissões nativas. Na web nada disso existe: um `<input type="file">`
 * cobre os dois casos — o próprio sistema operacional oferece a câmera quando
 * o dispositivo tem uma.
 */
export const useAvatarUpload = () => {
  const auth = useAuthStore();
  const toast = useToast();
  const uploading = ref(false);
  const inputRef = ref<HTMLInputElement | null>(null);

  /** `accept` do input, derivado da mesma lista que o backend valida. */
  const acceptAttr = AVATAR_ACCEPTED_MIME_TYPES.join(',');

  const openPicker = () => {
    if (uploading.value) return;
    inputRef.value?.click();
  };

  const handleFileChange = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    // Zera o input antes de qualquer await: sem isso, escolher o MESMO arquivo
    // de novo não dispara `change` e o usuário acha que o site travou.
    input.value = '';
    if (!file) return;

    uploading.value = true;
    try {
      const newUrl = await avatarService.uploadAvatar(file);
      await auth.patchUser({ avatarUrl: newUrl });
      toast.success('Foto atualizada', 'Sua nova foto de perfil já está no ar.');
    } catch (err) {
      if (err instanceof AvatarTooLargeError) {
        toast.error(
          'Imagem muito grande',
          `A imagem precisa ter no máximo ${AVATAR_MAX_SIZE_BYTES / 1024 / 1024}MB.`,
        );
        return;
      }
      if (err instanceof AvatarInvalidTypeError) {
        toast.error(
          'Tipo de imagem não suportado',
          'Aceitamos apenas JPG, PNG, WebP e GIF.',
        );
        return;
      }
      toast.error('Não foi possível enviar a foto', extractErrorMessage(err));
    } finally {
      uploading.value = false;
    }
  };

  return { uploading, inputRef, acceptAttr, openPicker, handleFileChange };
};
