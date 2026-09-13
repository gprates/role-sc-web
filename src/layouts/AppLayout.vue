<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';

import AppIcon, { type IconName } from '@/components/AppIcon.vue';
import AppLogo from '@/components/AppLogo.vue';
import { useAuthStore } from '@/stores/auth.store';
import { useFavoritosStore } from '@/stores/favoritos.store';

/**
 * Casca do app autenticado — equivalente ao `AppNavigator` (bottom tabs) do
 * mobile.
 *
 * É aqui que mora a maior adaptação de proporção do site:
 *   · até 767px  → a mesma tab bar flutuante do app, fixa no rodapé
 *   · 768px+     → as abas sobem para um header fixo no topo
 *
 * Uma pill flutuante de três abas centralizada num monitor de 1920px pareceria
 * um app esticado; um header é o que a web espera. O vocabulário visual é o
 * mesmo nos dois casos (mesmo ícone, mesmo gradiente no item ativo).
 */
interface TabDef {
  name: string;
  label: string;
  icon: IconName;
  /** Rotas-filhas que também acendem esta aba (ex.: /perfil/editar). */
  matches?: string[];
}

const TABS: TabDef[] = [
  { name: 'home', label: 'Eventos', icon: 'calendar-outline', matches: ['detalhe-evento'] },
  { name: 'favoritos', label: 'Favoritos', icon: 'heart-outline' },
  {
    name: 'perfil',
    label: 'Perfil',
    icon: 'person-outline',
    matches: ['editar-perfil', 'alterar-senha'],
  },
];

const route = useRoute();
const auth = useAuthStore();
const favoritos = useFavoritosStore();

const activeTab = computed(() => {
  const current = String(route.name ?? '');
  const tab = TABS.find(
    (t) => t.name === current || (t.matches?.includes(current) ?? false),
  );
  return tab?.name ?? 'home';
});

const inicial = computed(() => auth.user?.nome?.[0]?.toUpperCase() ?? '?');
</script>

<template>
  <div class="shell">
    <!-- Moldura decorativa nos cantos inferiores: só em telas largas. -->
    <img
      class="decor decor--renda"
      src="/images/renda-de-bilro.png"
      alt=""
      aria-hidden="true"
      draggable="false"
    />
    <img
      class="decor decor--violao"
      src="/images/violao.png"
      alt=""
      aria-hidden="true"
      draggable="false"
    />

    <!-- Header: só a partir de 768px. -->
    <header class="header">
      <div class="header__inner content-shell">
        <RouterLink :to="{ name: 'home' }" class="header__brand">
          <AppLogo :size="44" />
          <span class="header__brand-name">Rolê SC</span>
        </RouterLink>

        <nav class="header__nav" aria-label="Navegação principal">
          <RouterLink
            v-for="tab in TABS"
            :key="tab.name"
            :to="{ name: tab.name }"
            class="header__link"
            :class="{ 'header__link--active': activeTab === tab.name }"
            :aria-current="activeTab === tab.name ? 'page' : undefined"
          >
            <AppIcon :name="tab.icon" :size="18" />
            <span>{{ tab.label }}</span>
            <span
              v-if="tab.name === 'favoritos' && favoritos.total > 0"
              class="header__badge"
            >
              {{ favoritos.total }}
            </span>
          </RouterLink>
        </nav>

        <RouterLink :to="{ name: 'perfil' }" class="header__avatar" aria-label="Meu perfil">
          <img v-if="auth.user?.avatarUrl" :src="auth.user.avatarUrl" alt="" />
          <span v-else>{{ inicial }}</span>
        </RouterLink>
      </div>
    </header>

    <main class="main">
      <RouterView v-slot="{ Component, route: childRoute }">
        <Transition name="route-fade" mode="out-in">
          <component :is="Component" :key="childRoute.path" />
        </Transition>
      </RouterView>
    </main>

    <!-- Tab bar flutuante: só abaixo de 768px, idêntica à do app. -->
    <nav class="tabbar" aria-label="Navegação principal">
      <div class="tabbar__pill">
        <RouterLink
          v-for="tab in TABS"
          :key="tab.name"
          :to="{ name: tab.name }"
          class="tabbar__tab"
          :aria-current="activeTab === tab.name ? 'page' : undefined"
        >
          <span
            class="tabbar__icon"
            :class="{ 'tabbar__icon--active': activeTab === tab.name }"
          >
            <AppIcon
              :name="tab.icon"
              :size="22"
              :color="activeTab === tab.name ? 'var(--text-on-primary)' : 'var(--text-muted)'"
            />
          </span>
          <span
            class="tabbar__label"
            :class="{ 'tabbar__label--active': activeTab === tab.name }"
          >
            {{ tab.label }}
          </span>
        </RouterLink>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.main {
  flex: 1;
  /* Espaço para a tab bar flutuante não cobrir o fim do conteúdo. */
  padding-bottom: calc(var(--tabbar-height) + var(--space-lg));
}

/* ==========================================================================
   Decoração dos cantos (renda de bilro e violão)
   ==========================================================================
   Fixas na tela, porque são moldura e não conteúdo. `z-index: -1` as coloca
   acima do gradiente do body (`body::before`, também -1, mas anterior no DOM)
   e abaixo de tudo o que rola: os cards passam por cima delas no scroll.
   Abaixo de 1280px não sobra margem ao lado da coluna de conteúdo e elas
   cobririam os cards, então somem. */
.decor {
  display: none;
}

@media (min-width: 1280px) {
  .decor {
    position: fixed;
    bottom: 0;
    z-index: -1;
    display: block;
    height: auto;
    pointer-events: none;
    user-select: none;
  }

  /* Cortadas pela borda da tela, como se continuassem para fora. */
  .decor--renda {
    left: 0;
    width: clamp(180px, 13vw, 260px);
    transform: translate(-28%, 34%) rotate(-8deg);
  }

  .decor--violao {
    right: 0;
    width: clamp(90px, 6.5vw, 130px);
    transform: translate(12%, 16%) rotate(8deg);
  }
}

/* ==========================================================================
   Mobile — tab bar flutuante (porte do CustomTabBar do AppNavigator.tsx)
   ========================================================================== */
.header {
  display: none;
}

.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-header);
  padding: var(--space-xs) var(--space-md)
    max(var(--space-xs), env(safe-area-inset-bottom));
}

.tabbar__pill {
  display: flex;
  background: var(--surface);
  border-radius: var(--radius-xxl);
  padding: var(--space-xs) var(--space-sm);
  box-shadow: var(--shadow-xl);
}

.tabbar__tab {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xxs);
  padding-block: var(--space-xs);
  color: inherit;
}

.tabbar__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  transition: background 0.18s ease;
}

.tabbar__icon--active {
  background: var(--gradient-primary-diag);
}

.tabbar__label {
  font-size: var(--fs-caption);
  line-height: var(--lh-caption);
  font-weight: 600;
  color: var(--text-muted);
}

.tabbar__label--active {
  color: var(--primary);
}

/* ==========================================================================
   Tablet / desktop — header fixo no topo
   ========================================================================== */
@media (min-width: 768px) {
  .tabbar {
    display: none;
  }

  .main {
    padding-bottom: var(--space-xxl);
  }

  .header {
    position: sticky;
    top: 0;
    z-index: var(--z-header);
    display: block;
    height: var(--header-height);
    background: color-mix(in srgb, var(--surface) 82%, transparent);
    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(10px);
  }

  .header__inner {
    display: flex;
    align-items: center;
    gap: var(--space-lg);
    height: 100%;
  }

  .header__brand {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    color: var(--text-primary);
  }

  .header__brand-name {
    font-size: var(--fs-title);
    line-height: 1;
    font-weight: 700;
    color: var(--primary);
  }

  .header__nav {
    display: flex;
    gap: var(--space-xxs);
    margin-left: auto;
  }

  .header__link {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-md);
    border-radius: var(--radius-pill);
    color: var(--text-secondary);
    font-size: var(--fs-caption);
    line-height: var(--lh-caption);
    font-weight: 600;
    transition:
      background 0.15s ease,
      color 0.15s ease;
  }

  .header__link:hover {
    background: var(--chip-bg);
    color: var(--chip-text);
  }

  .header__link--active,
  .header__link--active:hover {
    background: var(--gradient-primary);
    color: var(--text-on-primary);
  }

  .header__badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding-inline: 6px;
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--primary);
    font-size: var(--fs-micro);
    line-height: 1;
  }

  .header__link:not(.header__link--active) .header__badge {
    background: var(--primary);
    color: var(--text-on-primary);
  }

  .header__avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    overflow: hidden;
    background: var(--gradient-avatar);
    color: var(--text-on-primary);
    font-weight: 700;
    flex: none;
  }

  .header__avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
</style>
