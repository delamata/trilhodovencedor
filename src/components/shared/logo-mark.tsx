import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Símbolo da Videira (extraído de assets/logo-videira.png no repo do
 * Oikos — ver public/videira-icon.png), usado como marca do Trilho do
 * Vencedor em vez de um ícone genérico, para manter a identidade
 * visual da igreja.
 */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/videira-icon.png"
      alt=""
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      priority
    />
  );
}
