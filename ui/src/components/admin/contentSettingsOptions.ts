import type { DropdownOption } from './Dropdown';

export const ARTICLE_ACCESS_OPTIONS: DropdownOption[] = [
  { value: 'free', label: 'Free to read' },
  { value: 'paid', label: 'Pay to unlock' },
  { value: 'subscription', label: 'Subscribers only' },
];

export const MEDIA_ACCESS_OPTIONS: DropdownOption[] = [
  { value: 'public', label: 'Public' },
  { value: 'preview', label: 'Preview only' },
  { value: 'locked', label: 'Locked' },
];

export const MEDIA_PREVIEW_OPTIONS: DropdownOption[] = [
  { value: 'thumbnail', label: 'Thumbnail' },
  { value: 'watermarked', label: 'Watermarked' },
  { value: 'clip', label: 'Clip' },
  { value: 'poster', label: 'Poster' },
  { value: 'placeholder', label: 'Placeholder' },
  { value: 'none', label: 'None' },
];
