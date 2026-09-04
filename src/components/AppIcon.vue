<script setup lang="ts">
import type { Component } from 'vue';
import { computed } from 'vue';

/**
 * Ícones — os MESMOS Ionicons que o app mobile usa (@expo/vector-icons).
 *
 * `unplugin-icons` resolve cada `~icons/ion/*` em um componente Vue com o SVG
 * inline, em build time. Não há requisição em runtime, nem fonte de ícones
 * para baixar: só o path do ícone entra no bundle.
 *
 * Centralizar o mapa aqui mantém os templates com a mesma cara do React Native
 * (`<AppIcon name="heart-outline" />` ↔ `<Ionicons name="heart-outline" />`)
 * e deixa um único arquivo para editar quando um ícone novo for preciso.
 */
import IconAlertCircle from '~icons/ion/alert-circle';
import IconAlertCircleOutline from '~icons/ion/alert-circle-outline';
import IconArrowForward from '~icons/ion/arrow-forward';
import IconArrowBack from '~icons/ion/arrow-back';
import IconBookmark from '~icons/ion/bookmark';
import IconBookmarkOutline from '~icons/ion/bookmark-outline';
import IconCalendarOutline from '~icons/ion/calendar-outline';
import IconCamera from '~icons/ion/camera';
import IconChatbubbleOutline from '~icons/ion/chatbubble-outline';
import IconCheckbox from '~icons/ion/checkbox';
import IconCheckmarkCircle from '~icons/ion/checkmark-circle';
import IconCheckmarkCircleOutline from '~icons/ion/checkmark-circle-outline';
import IconChevronDown from '~icons/ion/chevron-down';
import IconChevronForward from '~icons/ion/chevron-forward';
import IconClose from '~icons/ion/close';
import IconCloseCircle from '~icons/ion/close-circle';
import IconColorPaletteOutline from '~icons/ion/color-palette-outline';
import IconCreateOutline from '~icons/ion/create-outline';
import IconEllipseOutline from '~icons/ion/ellipse-outline';
import IconEyeOffOutline from '~icons/ion/eye-off-outline';
import IconEyeOutline from '~icons/ion/eye-outline';
import IconFlowerOutline from '~icons/ion/flower-outline';
import IconFootballOutline from '~icons/ion/football-outline';
import IconHeart from '~icons/ion/heart';
import IconHeartOutline from '~icons/ion/heart-outline';
import IconInformationCircleOutline from '~icons/ion/information-circle-outline';
import IconLeafOutline from '~icons/ion/leaf-outline';
import IconLocationOutline from '~icons/ion/location-outline';
import IconLockClosed from '~icons/ion/lock-closed';
import IconLockClosedOutline from '~icons/ion/lock-closed-outline';
import IconLogOutOutline from '~icons/ion/log-out-outline';
import IconLogoGoogle from '~icons/ion/logo-google';
import IconMailOutline from '~icons/ion/mail-outline';
import IconMedkitOutline from '~icons/ion/medkit-outline';
import IconOpenOutline from '~icons/ion/open-outline';
import IconOptionsOutline from '~icons/ion/options-outline';
import IconPersonOutline from '~icons/ion/person-outline';
import IconPricetagOutline from '~icons/ion/pricetag-outline';
import IconRadioButtonOff from '~icons/ion/radio-button-off';
import IconRadioButtonOn from '~icons/ion/radio-button-on';
import IconRefreshOutline from '~icons/ion/refresh-outline';
import IconRestaurantOutline from '~icons/ion/restaurant-outline';
import IconSchoolOutline from '~icons/ion/school-outline';
import IconSearch from '~icons/ion/search';
import IconSend from '~icons/ion/send';
import IconShareSocialOutline from '~icons/ion/share-social-outline';
import IconSquareOutline from '~icons/ion/square-outline';
import IconSunnyOutline from '~icons/ion/sunny-outline';
import IconTimeOutline from '~icons/ion/time-outline';

const ICONS = {
  'alert-circle': IconAlertCircle,
  'alert-circle-outline': IconAlertCircleOutline,
  'arrow-back': IconArrowBack,
  'arrow-forward': IconArrowForward,
  bookmark: IconBookmark,
  'bookmark-outline': IconBookmarkOutline,
  'calendar-outline': IconCalendarOutline,
  camera: IconCamera,
  'chatbubble-outline': IconChatbubbleOutline,
  checkbox: IconCheckbox,
  'checkmark-circle': IconCheckmarkCircle,
  'checkmark-circle-outline': IconCheckmarkCircleOutline,
  'chevron-down': IconChevronDown,
  'chevron-forward': IconChevronForward,
  close: IconClose,
  'close-circle': IconCloseCircle,
  'color-palette-outline': IconColorPaletteOutline,
  'create-outline': IconCreateOutline,
  'ellipse-outline': IconEllipseOutline,
  'eye-off-outline': IconEyeOffOutline,
  'eye-outline': IconEyeOutline,
  'flower-outline': IconFlowerOutline,
  'football-outline': IconFootballOutline,
  heart: IconHeart,
  'heart-outline': IconHeartOutline,
  'information-circle-outline': IconInformationCircleOutline,
  'leaf-outline': IconLeafOutline,
  'location-outline': IconLocationOutline,
  'lock-closed': IconLockClosed,
  'lock-closed-outline': IconLockClosedOutline,
  'log-out-outline': IconLogOutOutline,
  'logo-google': IconLogoGoogle,
  'mail-outline': IconMailOutline,
  'medkit-outline': IconMedkitOutline,
  'open-outline': IconOpenOutline,
  'options-outline': IconOptionsOutline,
  'person-outline': IconPersonOutline,
  'pricetag-outline': IconPricetagOutline,
  'radio-button-off': IconRadioButtonOff,
  'radio-button-on': IconRadioButtonOn,
  'refresh-outline': IconRefreshOutline,
  'restaurant-outline': IconRestaurantOutline,
  'school-outline': IconSchoolOutline,
  search: IconSearch,
  send: IconSend,
  'share-social-outline': IconShareSocialOutline,
  'square-outline': IconSquareOutline,
  'sunny-outline': IconSunnyOutline,
  'time-outline': IconTimeOutline,
} satisfies Record<string, Component>;

export type IconName = keyof typeof ICONS;

const props = withDefaults(
  defineProps<{
    name: IconName;
    /** Tamanho em px — mesma unidade do `size` do <Ionicons>. */
    size?: number | string;
    /** Cor. Por padrão herda a cor do texto do elemento pai. */
    color?: string;
  }>(),
  { size: 20, color: undefined },
);

const component = computed(() => ICONS[props.name]);
const dimension = computed(() =>
  typeof props.size === 'number' ? `${props.size}px` : props.size,
);
</script>

<template>
  <component
    :is="component"
    class="app-icon"
    :style="{ width: dimension, height: dimension, color: props.color }"
    aria-hidden="true"
    focusable="false"
  />
</template>

<style scoped>
.app-icon {
  flex: none;
  display: block;
}
</style>
