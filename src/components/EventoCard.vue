<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import type { Evento } from '@/types';
import { formatCardDate } from '@/utils/format';

import AppIcon from './AppIcon.vue';
import CategoriaBadge from './CategoriaBadge.vue';
import EventoCover from './EventoCover.vue';

/**
 * Card de evento — porte do `EventoCard.tsx` do mobile.
 *
 * O card inteiro é um <RouterLink>, e não um handler de clique: isso dá de
 * graça o "abrir em nova aba" com ctrl/cmd+clique e o menu de contexto, que
 * é o que um usuário de web espera de um item de listagem. O botão de
 * favoritar fica por cima e chama `.prevent` para não navegar junto.
 */
const props = withDefaults(
  defineProps<{
    evento: Evento;
    favorito?: boolean;
    showFavoritoButton?: boolean;
  }>(),
  { favorito: false, showFavoritoButton: true },
);

defineEmits<{ 'toggle-favorito': [] }>();

const data = computed(() =>
  formatCardDate(props.evento.dataInicio, props.evento.horario),
);
</script>

<template>
  <article class="card">
    <RouterLink
      class="card__link"
      :to="{ name: 'detalhe-evento', params: { id: props.evento._id } }"
    >
      <div class="card__cover">
        <EventoCover
          :image-url="props.evento.imageUrl"
          :categoria="props.evento.categoria"
        />
        <div v-if="props.evento.categoria" class="card__badge">
          <CategoriaBadge :categoria="props.evento.categoria" size="sm" />
        </div>
      </div>

      <div class="card__body">
        <h3 class="card__title clamp-2">{{ props.evento.titulo }}</h3>

        <p v-if="data" class="card__row">
          <AppIcon name="calendar-outline" :size="15" color="var(--primary)" />
          <span>{{ data }}</span>
        </p>

        <p v-if="props.evento.local" class="card__row">
          <AppIcon name="location-outline" :size="15" color="var(--primary)" />
          <span class="clamp-1">{{ props.evento.local }}</span>
        </p>

        <span class="card__municipio">{{ props.evento.municipio }}</span>
      </div>
    </RouterLink>

    <button
      v-if="props.showFavoritoButton"
      type="button"
      class="card__fav"
      :aria-label="
        props.favorito
          ? `Remover ${props.evento.titulo} dos favoritos`
          : `Salvar ${props.evento.titulo} nos favoritos`
      "
      :aria-pressed="props.favorito"
      @click.prevent.stop="$emit('toggle-favorito')"
    >
      <AppIcon
        :name="props.favorito ? 'heart' : 'heart-outline'"
        :size="22"
        :color="props.favorito ? 'var(--heart)' : 'var(--text-primary)'"
      />
    </button>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-xl);
}

.card__link {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: inherit;
}

.card__cover {
  position: relative;
}

.card__badge {
  position: absolute;
  top: var(--space-sm);
  left: var(--space-sm);
}

.card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-xs);
  padding: var(--space-md);
}

.card__title {
  font-size: 18px;
  line-height: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.card__row {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  min-width: 0;
  width: 100%;
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  color: var(--text-secondary);
}

.card__municipio {
  margin-top: auto;
  padding: 4px var(--space-sm);
  border-radius: var(--radius-pill);
  background: var(--chip-bg);
  color: var(--chip-text);
  font-size: var(--fs-caption);
  line-height: var(--lh-caption);
  font-weight: 600;
}

.card__fav {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(2px);
  transition: transform 0.12s ease;
}

.card__fav:hover {
  transform: scale(1.08);
}

.card__fav:active {
  transform: scale(0.94);
}
</style>
