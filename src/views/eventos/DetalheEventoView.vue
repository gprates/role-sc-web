<script setup lang="ts">
import { computed, onMounted, ref, toRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AppIcon, { type IconName } from '@/components/AppIcon.vue';
import AppSpinner from '@/components/AppSpinner.vue';
import CategoriaBadge from '@/components/CategoriaBadge.vue';
import ComentariosModal from '@/components/ComentariosModal.vue';
import EventoCover from '@/components/EventoCover.vue';
import { useComentarios } from '@/composables/useComentarios';
import { useToast } from '@/composables/useToast';
import { extractErrorMessage } from '@/services/api';
import { eventoService } from '@/services/evento.service';
import { useFavoritosStore } from '@/stores/favoritos.store';
import type { Evento } from '@/types';
import { formatLongDate, formatShortDate } from '@/utils/format';
import { openExternal } from '@/utils/platform';
import { compartilharEvento } from '@/utils/share';

/** T08 — Detalhe do evento (porte de DetalheEventoScreen.tsx). */
const props = defineProps<{ id: string }>();

const router = useRouter();
const route = useRoute();
const toast = useToast();
const favoritos = useFavoritosStore();

const evento = ref<Evento | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

// Já nasce aberto quando a navegação veio do ícone de comentário do card,
// que aponta para `?comentarios=1`.
const comentariosOpen = ref(route.query.comentarios === '1');

/**
 * Montado aqui, e não dentro do modal, porque o contador da barra de ações
 * precisa do total mesmo com o modal fechado.
 */
const comentarios = useComentarios(toRef(props, 'id'));

const loadEvento = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await eventoService.getById(props.id);
    evento.value = res.data;
  } catch (err) {
    error.value = extractErrorMessage(err);
  } finally {
    loading.value = false;
  }
};

onMounted(loadEvento);
watch(() => props.id, loadEvento);

const favorito = computed(() =>
  evento.value ? favoritos.isFavorito(evento.value._id) : false,
);

const handleToggleFavorito = async () => {
  if (!evento.value) return;
  try {
    await favoritos.toggle(evento.value);
  } catch (err) {
    toast.error('Favoritos', extractErrorMessage(err));
  }
};

const handleShare = async () => {
  if (!evento.value) return;
  const result = await compartilharEvento(evento.value);
  if (result === 'copied') {
    toast.success('Link copiado', 'O link do evento foi copiado para a área de transferência.');
  } else if (result === 'failed') {
    toast.error('Não foi possível compartilhar', 'Copie o endereço da publicação original.');
  }
};

/** Linhas do cartão de informações, montadas só com o que o evento tem. */
const infoRows = computed(() => {
  const e = evento.value;
  if (!e) return [];

  const rows: { icon: IconName; label: string; value: string }[] = [
    { icon: 'calendar-outline', label: 'INÍCIO', value: formatLongDate(e.dataInicio) },
  ];
  if (e.dataFim) {
    rows.push({
      icon: 'calendar-outline',
      label: 'TÉRMINO',
      value: formatLongDate(e.dataFim),
    });
  }
  if (e.horario) {
    rows.push({ icon: 'time-outline', label: 'HORÁRIO', value: e.horario });
  }
  if (e.local) {
    rows.push({ icon: 'location-outline', label: 'LOCAL', value: e.local });
  }
  return rows;
});
</script>

<template>
  <div class="detalhe">
    <div v-if="loading" class="detalhe__center">
      <AppSpinner :size="40" />
    </div>

    <div v-else-if="error || !evento" class="detalhe__center">
      <p class="detalhe__error t-body">{{ error ?? 'Evento não encontrado' }}</p>
      <button type="button" class="t-body-bold detalhe__back-btn" @click="router.back()">
        Voltar
      </button>
    </div>

    <template v-else>
      <div class="hero">
        <EventoCover
          :image-url="evento.imageUrl"
          :categoria="evento.categoria"
          ratio="16 / 9"
          loading="eager"
        />
        <button
          type="button"
          class="hero__back"
          aria-label="Voltar"
          @click="router.back()"
        >
          <AppIcon name="arrow-back" :size="22" color="var(--text-primary)" />
        </button>
      </div>

      <div class="detalhe__body content-shell">
        <div class="detalhe__main">
          <div class="tags">
            <CategoriaBadge :categoria="evento.categoria" />
            <span class="tags__municipio">{{ evento.municipio }}</span>
          </div>

          <h1 class="detalhe__title t-display">{{ evento.titulo }}</h1>

          <section v-if="evento.descricao" class="detalhe__section detalhe__section--desktop">
            <h2 class="t-subtitle">Sobre o evento</h2>
            <p class="detalhe__description t-body">{{ evento.descricao }}</p>
          </section>

          <button type="button" class="source-link" @click="openExternal(evento.url)">
            <AppIcon name="open-outline" :size="18" color="var(--primary)" />
            <span class="t-body-bold">Ver publicação original</span>
          </button>

          <p class="detalhe__timestamp t-caption">
            Publicado em {{ formatShortDate(evento.processedAt) }} · Fonte:
            {{ evento.site }}
          </p>
        </div>

        <aside class="detalhe__aside">
          <div class="info-card">
            <template v-for="(row, index) in infoRows" :key="row.label">
              <span v-if="index > 0" class="info-card__divider" />
              <div class="info-row">
                <span class="info-row__icon">
                  <AppIcon :name="row.icon" :size="20" color="var(--primary)" />
                </span>
                <div>
                  <p class="info-row__label t-micro">{{ row.label }}</p>
                  <p class="info-row__value t-body-bold">{{ row.value }}</p>
                </div>
              </div>
            </template>
          </div>
        </aside>
      </div>

      <!--
        Barra de ações: favoritar, comentar, compartilhar — nessa ordem, igual
        ao app. Fixa no rodapé no mobile, no fluxo do conteúdo no desktop.

        O coração é o MESMO gesto do coração do EventoCard (favoritar), com o
        mesmo ícone e a mesma cor. Antes esta barra tinha cinco botões, três
        deles falsos: um coração de "curtida" mockada em 187, um "Eu vou" que
        só abria um toast de "em breve", e um marcador de página para favoritar
        — ou seja, dois símbolos diferentes para a ideia de salvar.
      -->
      <div class="actionbar">
        <div class="actionbar__inner content-shell">
          <button
            type="button"
            class="actionbar__item"
            :class="{ 'actionbar__item--favorito': favorito }"
            :aria-pressed="favorito"
            :aria-label="favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'"
            @click="handleToggleFavorito"
          >
            <AppIcon
              :name="favorito ? 'heart' : 'heart-outline'"
              :size="22"
              :color="favorito ? 'var(--heart)' : undefined"
            />
            <span class="t-micro">Favoritar</span>
          </button>

          <button
            type="button"
            class="actionbar__item"
            aria-label="Ver comentários"
            @click="comentariosOpen = true"
          >
            <AppIcon name="chatbubble-outline" :size="22" />
            <span class="t-micro">{{ comentarios.total.value }}</span>
          </button>

          <button
            type="button"
            class="actionbar__item"
            aria-label="Compartilhar evento"
            @click="handleShare"
          >
            <AppIcon name="share-social-outline" :size="22" />
            <span class="t-micro">Compartilhar</span>
          </button>
        </div>
      </div>

      <ComentariosModal
        :open="comentariosOpen"
        :comentarios="comentarios.comentarios.value"
        :loading="comentarios.loading.value"
        :loading-more="comentarios.loadingMore.value"
        :error="comentarios.error.value"
        :total="comentarios.total.value"
        :has-more="comentarios.hasMore.value"
        :on-load-more="comentarios.loadMore"
        :on-criar="comentarios.criar"
        :on-editar="comentarios.editar"
        :on-excluir="comentarios.excluir"
        :on-toggle-curtida="comentarios.toggleCurtida"
        @close="comentariosOpen = false"
      />
    </template>
  </div>
</template>

<style scoped>
.detalhe {
  /* Espaço para a barra de ações fixa. A folga da tab bar já vem do AppLayout. */
  padding-bottom: 80px;
}

.detalhe__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  min-height: 60dvh;
  padding: var(--space-xl);
}

.detalhe__error {
  color: var(--danger);
  text-align: center;
}

.detalhe__back-btn {
  color: var(--primary);
  padding: var(--space-sm) var(--space-lg);
}

.hero {
  position: relative;
}

.hero__back {
  position: absolute;
  top: var(--space-md);
  left: var(--space-md);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: var(--shadow-sm);
}

.detalhe__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding-top: var(--space-xl);
}

.detalhe__main {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.tags__municipio {
  padding: 6px var(--space-md);
  border-radius: var(--radius-md);
  background: var(--chip-bg);
  color: var(--chip-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 600;
}

.detalhe__title {
  color: var(--text-primary);
}

.detalhe__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
}

.detalhe__description {
  color: var(--text-secondary);
  line-height: 24px;
  white-space: pre-line;
}

.source-link {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  align-self: flex-start;
  margin-top: var(--space-xs);
  color: var(--primary);
}

.detalhe__timestamp {
  color: var(--text-muted);
}

.info-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-md);
  background: var(--surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
}

.info-card__divider {
  height: 1px;
  background: var(--border);
  margin-block: 4px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding-block: 6px;
}

.info-row__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: 50%;
  background: var(--surface-muted);
}

.info-row__label {
  color: var(--text-muted);
}

.info-row__value {
  margin-top: 2px;
  color: var(--text-primary);
}

/* ==========================================================================
   Barra de ações
   ========================================================================== */
/**
 * No mobile ela fica acima da tab bar flutuante, não colada no rodapé.
 * (No app as duas se sobrepõem — a tab bar flutua por cima da barra de ações.
 * Numa tela de toque grande isso passa; com cursor do mouse, não.)
 */
.actionbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: var(--tabbar-height);
  z-index: var(--z-actionbar);
  background: var(--surface);
  border-top: 1px solid var(--border);
}

.actionbar__inner {
  display: flex;
  padding-block: var(--space-sm);
}

.actionbar__item {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding-block: var(--space-xs);
  color: var(--text-secondary);
  transition: color 0.15s ease;
}

.actionbar__item:hover {
  color: var(--primary);
}

/* Só o rótulo muda de cor: o ícone já recebe `--heart` pela prop `color`, e
   deixar os dois vermelhos pesaria demais na barra. */
.actionbar__item--favorito,
.actionbar__item--favorito:hover {
  color: var(--heart);
}

/* ==========================================================================
   Desktop: hero contido, duas colunas, barra de ações no fluxo
   ========================================================================== */
@media (min-width: 768px) {
  .detalhe {
    padding-bottom: var(--space-xxl);
  }

  .hero {
    max-width: var(--content-max);
    margin: var(--space-lg) auto 0;
    padding-inline: var(--space-xl);
  }

  .hero :deep(.cover) {
    border-radius: var(--radius-xxl);
    box-shadow: var(--shadow-lg);
  }

  .hero__back {
    top: calc(var(--space-md) + var(--space-lg));
    left: calc(var(--space-xl) + var(--space-md));
  }

  .detalhe__body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    align-items: start;
    gap: var(--space-xxl);
  }

  .actionbar {
    position: static;
    max-width: var(--content-max);
    margin: var(--space-xl) auto 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-xxl);
    box-shadow: var(--shadow-md);
  }

  .actionbar__inner {
    padding-inline: var(--space-md);
  }
}

@media (min-width: 1024px) {
  .detalhe__body {
    grid-template-columns: minmax(0, 1fr) 360px;
  }
}
</style>
