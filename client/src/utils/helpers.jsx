import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

export const formatDate = (date) => {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d, yyyy');
};

export const formatRelative = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const getTypeIcon = (type) => {
  const icons = {
    article: '📄', tweet: '𝕏', image: '🖼️',
    video: '▶️', pdf: '📕', note: '📝', link: '🔗',
  };
  return icons[type] || '🔗';
};

export const getTypeColor = (type) => {
  const map = {
    article: 'var(--type-article)',
    tweet: 'var(--type-tweet)',
    image: 'var(--type-image)',
    video: 'var(--type-video)',
    pdf: 'var(--type-pdf)',
    note: 'var(--type-note)',
    link: 'var(--type-link)',
  };
  return map[type] || 'var(--text-tertiary)';
};

export const getClusterColor = (cluster) => {
  const map = {
    technology: 'var(--cluster-technology)',
    design: 'var(--cluster-design)',
    science: 'var(--cluster-science)',
    business: 'var(--cluster-business)',
    health: 'var(--cluster-health)',
    philosophy: 'var(--cluster-philosophy)',
    culture: 'var(--cluster-culture)',
    productivity: 'var(--cluster-productivity)',
    general: 'var(--cluster-general)',
  };
  return map[cluster] || 'var(--cluster-general)';
};

export const getDomain = (url) => {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
};

export const truncate = (str, len = 60) => {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '…' : str;
};

export const generateAvatarUrl = (name) => {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return `https://ui-avatars.com/api/?name=${initials}&background=2D6A4F&color=fff&bold=true&size=64`;
};
