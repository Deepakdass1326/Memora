// Pure JS class merger — no external deps needed (Memora uses Vanilla CSS, not Tailwind)
export function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}
