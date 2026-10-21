import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Categorias opcionais do consentimento. `necessary` nunca e aceita do
 * cliente: cookies essenciais (sessao e CSRF) nao dependem de consentimento.
 */
export class ConsentDecisionDto {
  @IsOptional()
  @IsBoolean()
  analytics?: boolean;

  @IsOptional()
  @IsBoolean()
  marketing?: boolean;
}
