<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import { useToast } from '@/composables/useToast';
import type { Evento } from '@/types';
import { formatCardDate } from '@/utils/format';
import { compartilharEvento } from '@/utils/share';

import AppIcon from './AppIcon.vue';
import CategoriaBadge from './CategoriaBadge.vue';
import EventoCover from './EventoCover.vue';

/**
 * Card de evento — porte do `EventoCard.tsx` do mobile.
 *
 * A área principal é um <RouterLink>, e não um handler de clique: isso dá de
 * graça o "abrir em nova aba" com ctrl/cmd+clique e o menu de contexto, que é o
 * que um usuário de web espera de um item de listagem.
 *
 * As ações (favoritar, comentários, compartilhar) ficam fora desse link, e não
 * aninhadas nele como os Pressables do mobile: o coração é sobreposto e usa
 * `.prevent.stop` para não navegar junto; comentários e compartilhar vivem no
 * rodapé, irmão do link.
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

const toast = useToast();

const data = computed(() =>
  formatCardDate(props.evento.dataInicio, props.evento.horario),
);

/**
 * Rota do ícone de comentários: o detalhe já abre com o modal aberto.
 * `abrirComentarios` vai na query e não em params porque precisa sobreviver a
 * um F5 ou a um link colado — params de rota não nomeados se perdem no reload.
 */
const rotaDetalhe = computed(() => ({
  name: 'detalhe-evento',
  params: { id: props.evento._id },
}));

const rotaComentarios = computed(() => ({
  ...rotaDetalhe.value,
  query: { comentarios: '1' },
}));

const handleShare = async () => {
  const result = await compartilharEvento(props.evento);
  if (result === 'copied') {
    toast.success('Copiado!');
  } else {
    toast.error('Não foi possível copiar', 'Seu navegador bloqueou o acesso à área de transferência.');
  }
};
</script>

<template>
  <article class="card">
    <RouterLink class="card__link" :to="rotaDetalhe">
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
      </div>
    </RouterLink>

    <!--
      O rodapé fica FORA do <RouterLink> do card: o ícone de comentários é ele
      próprio um link, e <a> dentro de <a> é HTML inválido — o browser fecha o
      primeiro sozinho e a árvore sai diferente da escrita aqui. No mobile isso
      não aparece porque Pressables aninham sem restrição.
    -->
    <div class="card__footer">
      <span class="card__municipio">{{ props.evento.municipio }}</span>

      <div class="card__acoes">
        <RouterLink
          class="card__acao"
          :to="rotaComentarios"
          :aria-label="`Ver comentários de ${props.evento.titulo}`"
        >
          <AppIcon name="chatbubble-outline" :size="16" />
          <span class="card__acao-count">{{ props.evento.totalComentarios ?? 0 }}</span>
        </RouterLink>

        <button
          type="button"
          class="card__acao"
          :aria-label="`Compartilhar ${props.evento.titulo}`"
          @click="handleShare"
        >
          <AppIcon name="share-social-outline" :size="16" />
        </button>
      </div>
    </div>

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
/**
 * `width/height: 100%` fazem o card preencher a célula da grade. Sem isso ele
 * encolhe até o conteúdo e dois cards lado a lado terminam em alturas
 * diferentes — quem tem título de duas linhas, ou local preenchido, fica mais
 * alto que o vizinho. Com o card esticado, é o `flex: 1` do link que absorve a
 * sobra e mantém o rodapé alinhado entre todos.
 */
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--surface);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  transition: box-shadow 0.16s ease;
}

/* Só a sombra reage ao hover. O card também subia 2px, mas numa grade densa
   isso faz o cursor sair de cima do card ao passar perto da borda — ele sobe,
   perde o hover, desce, reganha: o card "treme" enquanto o mouse atravessa a
   lista. A sombra dá o mesmo retorno sem mexer na geometria. */
.card:hover {
  box-shadow: var(--shadow-xl);
}

/* `flex: 1` no link (e não `height: 100%`) porque o rodapé agora é irmão dele:
   é o link que estica e empurra o rodapé para a base do card. */
.card__link {
  display: flex;
  flex: 1;
  flex-direction: column;
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
  /* Padding inferior menor: o rodapé, agora irmão, traz o seu próprio. */
  padding: var(--space-md) var(--space-md) var(--space-xs);
}

/* `min-height` de duas linhas: o título é clampado em 2, então reservar o
   espaço das duas faz as linhas de data/local começarem na mesma altura em
   todos os cards da mesma fileira, em vez de dançarem conforme o título. */
.card__title {
  font-size: 18px;
  line-height: 24px;
  min-height: 48px;
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

.card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-xs);
  padding: 0 var(--space-md) var(--space-md);
}

.card__municipio {
  padding: 4px var(--space-sm);
  border-radius: var(--radius-pill);
  background: var(--chip-bg);
  color: var(--chip-text);
  font-size: var(--fs-caption);
  line-height: var(--lh-caption);
  font-weight: 600;
}

.card__acoes {
  display: flex;
  align-items: center;
  gap: var(--space-xxs);
}

.card__acao {
  display: flex;
  align-items: center;
  gap: var(--space-xxs);
  padding: 4px var(--space-xs);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  transition:
    color 0.15s ease,
    background 0.15s ease;
}

.card__acao:hover {
  color: var(--primary);
  background: var(--surface-muted);
}

.card__acao-count {
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
