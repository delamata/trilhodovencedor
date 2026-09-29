import Image from 'next/image';
import { cn } from '@/lib/utils';
import { BASE_PATH } from '@/lib/base-path';

/**
 * Símbolo da Videira (extraído de assets/logo-videira.png no repo do
 * Oikos — ver public/videira-icon.png), usado como marca do Trilho do
 * Vencedor em vez de um ícone genérico, para manter a identidade
 * visual da igreja.
 */
export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <Image
      // next/image com src em string (arquivo de public/) NÃO ganha o
      // basePath sozinho — diferente de import estático de imagem.
      src={`${BASE_PATH}/videira-icon.png`}
      alt=""
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      priority
    />
  );
}
