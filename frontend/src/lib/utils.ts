import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'INR', locale: string = 'en-IN') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function getCurrencySymbol(currency: string = 'INR', locale: string = 'en-IN') {
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);

    return parts.find((part) => part.type === 'currency')?.value || currency;
  } catch {
    return currency;
  }
}

export function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
