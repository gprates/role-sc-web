<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { extractErrorMessage } from '@/services/api';
import { COMENTARIO_MAX_LENGTH, type Comentario } from '@/types';
import { formatRelativeTime } from '@/utils/format';

import AppIcon from './AppIcon.vue';
import AppSpinner from './AppSpinner.vue';
import BaseSheet from './BaseSheet.vue';
import EmptyState from './EmptyState.vue';

/**
 * Sheet de comentários do evento — porte do `ComentariosModal.tsx` do mobile.
 *
 * O estado da lista mora no `useComentarios` da tela de detalhe (que precisa do
 * total para o contador da barra de ações mesmo com o modal fechado); este
 * componente é só a apresentação, e recebe dados e ações por prop.
 *
 * O mesmo campo serve para escrever e para editar: quando `editando` está
 * preenchido ele muda de rótulo e ganha um "cancelar", em vez de abrir um
 * segundo input — evita dois lugares diferentes para digitar a mesma coisa.
 */
const props = defineProps<{
  open: boolean;
  comentarios: Comentario[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  onLoadMore: () => Promise<void>;
  onCriar: (texto: string) => Promise<void>;
  onEditar: (comentarioId: string, texto: string) => Promise<void>;
  onExcluir: (comentarioId: string) => Promise<void>;
  onToggleCurtida: (comentario: Comentario) => Promise<void>;
}>();

const emit = defineEmits<{ close: [] }>();

const toast = useToast();
const { confirm } = useConfirm();

const draft = ref('');
const editando = ref<Comentario | null>(null);
const enviando = ref(false);

const input = ref<HTMLTextAreaElement | null>(null);
const lista = ref<HTMLElement | null>(null);

const podeEnviar = computed(() => draft.value.trim().length > 0 && !enviando.value);

// Fechar e reabrir recomeça do zero: um rascunho de meia hora atrás (ou pior,
// uma edição pendente de um comentário que nem está mais na tela) reaparecendo
// sem contexto confunde mais do que ajuda.
watch(
  () => props.open,
  (open) => {
    if (open) return;
    draft.value = '';
    editando.value = null;
    enviando.value = false;
  },
);

const iniciarEdicao = async (comentario: Comentario) => {
  editando.value = comentario;
  draft.value = comentario.texto;
  await nextTick();
  input.value?.focus();
};

const cancelarEdicao = () => {
  editando.value = null;
  draft.value = '';
};

const confirmarExclusao = async (comentario: Comentario) => {
  const ok = await confirm({
    title: 'Excluir comentário',
    message: 'Essa ação não pode ser desfeita.',
    confirmLabel: 'Excluir',
    destructive: true,
  });
  if (!ok) return;

  // Se o comentário que estava sendo editado é o que foi excluído, o campo
  // precisa sair do modo edição — senão o "salvar" tentaria atualizar algo
  // que não existe mais.
  if (editando.value?._id === comentario._id) cancelarEdicao();

  try {
    await props.onExcluir(comentario._id);
  } catch (err) {
    toast.error('Comentários', extractErrorMessage(err));
  }
};

const handleToggleCurtida = async (comentario: Comentario) => {
  try {
    await props.onToggleCurtida(comentario);
  } catch (err) {
    toast.error('Comentários', extractErrorMessage(err));
  }
};

const handleEnviar = async () => {
  const texto = draft.value.trim();
  if (!texto || enviando.value) return;

  enviando.value = true;
  try {
    if (editando.value) {
      await props.onEditar(editando.value._id, texto);
      editando.value = null;
    } else {
      await props.onCriar(texto);
      // Lista é ordenada do mais novo para o mais antigo, então o recém-criado
      // entra no topo — rolar até lá dá o retorno visual de que foi publicado.
      await nextTick();
      lista.value?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    draft.value = '';
  } catch (err) {
    // Mantém o texto no campo: forçar o usuário a redigitar depois de uma
    // falha de rede seria a pior parte da experiência.
    toast.error('Comentários', extractErrorMessage(err));
  } finally {
    enviando.value = false;
  }
};

/**
 * Enter publica, Shift+Enter quebra linha. É a convenção de qualquer campo de
 * comentário na web — e o mobile não precisa disso porque lá o teclado tem um
 * botão de enviar próprio.
 */
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || event.shiftKey) return;
  event.preventDefault();
  void handleEnviar();
};

const inicial = (nome: string): string => nome?.[0]?.toUpperCase() ?? '?';

const titulo = computed(() =>
  props.total > 0 ? `Comentários (${props.total})` : 'Comentários',
);
</script>

<template>
  <BaseSheet :open="props.open" :title="titulo" @close="emit('close')">
    <div ref="lista" class="lista">
      <div v-if="props.loading" class="lista__center">
        <AppSpinner :size="36" />
      </div>

      <EmptyState
        v-else-if="props.error"
        icon="cloud-offline-outline"
        title="Não foi possível carregar"
        :subtitle="props.error"
      />

      <EmptyState
        v-else-if="props.comentarios.length === 0"
        icon="chatbubble-outline"
        title="Nenhum comentário ainda"
        subtitle="Seja o primeiro a comentar sobre esse evento."
      />

      <template v-else>
        <article v-for="c in props.comentarios" :key="c._id" class="comment">
          <img
            v-if="c.autor.avatarUrl"
            class="comment__avatar"
            :src="c.autor.avatarUrl"
            :alt="`Foto de ${c.autor.nome}`"
            loading="lazy"
          />
          <span v-else class="comment__avatar comment__avatar--initial" aria-hidden="true">
            {{ inicial(c.autor.nome) }}
          </span>

          <div class="comment__body">
            <div class="comment__head">
              <span class="comment__autor t-body-bold">{{ c.autor.nome }}</span>
              <span class="comment__tempo t-caption">
                {{ formatRelativeTime(c.criadoEm) }}
                <!-- O selo sai da presença de `editadoEm`, não de um boolean à
                     parte — assim ele nunca contradiz a data mostrada. -->
                <template v-if="c.editadoEm"> · editado</template>
              </span>
            </div>

            <p class="comment__texto t-body">{{ c.texto }}</p>

            <!-- Só o autor vê editar/excluir. O backend também barra (403),
                 então isto é conveniência de UI, não a trava de segurança. -->
            <div v-if="c.meu" class="comment__acoes">
              <button type="button" class="comment__acao" @click="iniciarEdicao(c)">
                <AppIcon name="pencil" :size="13" />
                <span>Editar</span>
              </button>
              <button
                type="button"
                class="comment__acao comment__acao--danger"
                @click="confirmarExclusao(c)"
              >
                <AppIcon name="trash-outline" :size="13" />
                <span>Excluir</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            class="comment__curtida"
            :class="{ 'comment__curtida--ativa': c.curtidoPorMim }"
            :aria-pressed="c.curtidoPorMim"
            :aria-label="c.curtidoPorMim ? 'Descurtir comentário' : 'Curtir comentário'"
            @click="handleToggleCurtida(c)"
          >
            <AppIcon
              :name="c.curtidoPorMim ? 'heart' : 'heart-outline'"
              :size="18"
              :color="c.curtidoPorMim ? 'var(--heart)' : 'var(--text-muted)'"
            />
            <!-- O contador some no zero: um "0" pendurado em todo comentário
                 só faz ruído. -->
            <span v-if="c.curtidas > 0" class="comment__curtida-count t-caption">
              {{ c.curtidas }}
            </span>
          </button>
        </article>

        <div v-if="props.loadingMore" class="lista__more">
          <AppSpinner :size="24" label="Carregando mais comentários" />
        </div>

        <button
          v-else-if="props.hasMore"
          type="button"
          class="lista__more-btn t-caption-bold"
          @click="props.onLoadMore()"
        >
          Carregar mais comentários
        </button>
      </template>
    </div>

    <template #footer>
      <div class="composer">
        <div v-if="editando" class="composer__editando">
          <AppIcon name="pencil" :size="14" color="var(--primary)" />
          <span class="composer__editando-text t-caption">Editando comentário</span>
          <button type="button" class="composer__cancel t-caption-bold" @click="cancelarEdicao">
            Cancelar
          </button>
        </div>

        <div class="composer__row">
          <textarea
            ref="input"
            v-model="draft"
            class="composer__input"
            rows="1"
            :maxlength="COMENTARIO_MAX_LENGTH"
            :disabled="enviando"
            placeholder="Escreva um comentário..."
            aria-label="Escreva um comentário"
            @keydown="onKeydown"
          />
          <button
            type="button"
            class="composer__send"
            :disabled="!podeEnviar"
            :aria-label="editando ? 'Salvar edição' : 'Publicar comentário'"
            @click="handleEnviar"
          >
            <span v-if="enviando" class="composer__spinner app-spin" aria-hidden="true" />
            <AppIcon
              v-else
              :name="editando ? 'checkmark' : 'send'"
              :size="18"
              color="var(--text-on-primary)"
            />
          </button>
        </div>
      </div>
    </template>
  </BaseSheet>
</template>

<style scoped>
.lista {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-sm) var(--space-xl);
}

.lista__center,
.lista__more {
  display: flex;
  justify-content: center;
  padding-block: var(--space-xxl);
}

.lista__more {
  padding-block: var(--space-md);
}

.lista__more-btn {
  align-self: center;
  padding: var(--space-xs) var(--space-md);
  border-radius: var(--radius-pill);
  background: var(--chip-bg);
  color: var(--chip-text);
}

.comment {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
}

.comment__avatar {
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 50%;
  object-fit: cover;
  background: var(--surface-muted);
}

.comment__avatar--initial {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-avatar);
  color: var(--text-on-primary);
  font-weight: 700;
}

.comment__body {
  flex: 1;
  min-width: 0;
}

.comment__head {
  display: flex;
  align-items: baseline;
  gap: var(--space-xs);
}

.comment__autor {
  color: var(--text-primary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment__tempo {
  flex: none;
  color: var(--text-muted);
}

.comment__texto {
  margin-top: 2px;
  color: var(--text-secondary);
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.comment__acoes {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-xxs);
}

.comment__acao {
  display: flex;
  align-items: center;
  gap: var(--space-xxs);
  color: var(--text-muted);
  font-size: var(--fs-caption);
  line-height: var(--lh-caption);
  font-weight: 600;
}

.comment__acao:hover {
  color: var(--primary);
}

.comment__acao--danger:hover {
  color: var(--danger);
}

.comment__curtida {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 28px;
  padding-top: 2px;
  color: var(--text-muted);
}

.comment__curtida--ativa .comment__curtida-count {
  color: var(--heart);
}

/* ==========================================================================
   Campo de escrita
   ========================================================================== */
/* Ocupa o rodapé inteiro do sheet — o slot distribui os filhos com `flex: 1`,
   e aqui só existe um. */
.composer {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0;
}

.composer__editando {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.composer__editando-text {
  flex: 1;
  color: var(--primary);
}

.composer__cancel {
  color: var(--text-muted);
}

.composer__row {
  display: flex;
  align-items: flex-end;
  gap: var(--space-sm);
}

.composer__input {
  flex: 1;
  min-width: 0;
  max-height: 110px;
  padding: var(--space-sm) var(--space-md);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  outline: none;
  resize: none;
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  color: var(--text-primary);
  /* `field-sizing` cresce com o texto nos browsers que já o têm; onde não há,
     o campo fica de uma linha e rola, que é um degradê aceitável. */
  field-sizing: content;
}

.composer__input::placeholder {
  color: var(--text-muted);
}

.composer__input:focus {
  border-color: var(--primary);
}

.composer__send {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex: none;
  border-radius: 50%;
  background: var(--primary);
  transition: opacity 0.15s ease;
}

.composer__send:disabled {
  opacity: 0.4;
}

.composer__spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--text-on-primary);
  border-top-color: transparent;
  border-radius: 50%;
}
</style>
