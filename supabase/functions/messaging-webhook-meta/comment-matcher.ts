/**
 * Instagram comment → DM keyword matcher (pure logic).
 *
 * Isolado da Edge Function (sem deps Deno/Supabase) para ser testável via vitest.
 * A Edge Function importa com `./comment-matcher.ts`; os testes importam pelo
 * caminho do módulo. Mantém-se livre de globals de runtime de propósito.
 */

/** Regra de auto-resposta para comentários. */
export interface CommentAutoReplyRule {
  /** Palavras-chave que disparam a regra (case e acento-insensitive). */
  keywords: string[];
  /** Texto da DM privada enviada a quem comentou. */
  dmMessage: string;
  /** Resposta pública opcional ao comentário (ex: "Te mandei no direct!"). */
  publicReply?: string;
  /** Se definido, a regra só vale para comentários neste post (media id). */
  mediaId?: string;
}

/** Configuração de auto-resposta a comentários, lida de `channel.settings`. */
export interface CommentAutoReplyConfig {
  enabled?: boolean;
  rules?: CommentAutoReplyRule[];
}

/**
 * Normaliza texto para matching: minúsculas, remove acentos, troca tudo que não
 * for letra/dígito por espaço, colapsa espaços e envolve em espaços nas bordas.
 *
 * O envelope com espaços permite matching por palavra inteira via `includes`,
 * tratando pontuação grudada ("LINK!!!") e keywords de múltiplas palavras
 * ("eu quero") sem regex frágil. A remoção dos combining marks (U+0300–U+036F)
 * acontece logo após o NFD e antes do filtro [^a-z0-9], senão o acento viraria
 * espaço e quebraria a palavra ("informações" -> "informa co es").
 */
export function normalizeForMatch(text: string): string {
  const stripped = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacríticos (combining marks)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return ` ${stripped} `;
}

/**
 * Encontra a primeira regra cuja alguma keyword aparece como palavra inteira no
 * comentário. Respeita o filtro opcional de `mediaId`.
 *
 * @param commentText Texto bruto do comentário.
 * @param rules Regras configuradas.
 * @param mediaId Id do post onde o comentário foi feito (para filtro por regra).
 * @returns A regra correspondente, ou null se nenhuma casar.
 */
export function matchCommentRule(
  commentText: string,
  rules: CommentAutoReplyRule[] | undefined,
  mediaId?: string
): CommentAutoReplyRule | null {
  if (!rules?.length || !commentText) return null;

  const haystack = normalizeForMatch(commentText);

  for (const rule of rules) {
    if (rule.mediaId && rule.mediaId !== mediaId) continue;
    if (!rule.dmMessage) continue;

    for (const keyword of rule.keywords || []) {
      const needle = normalizeForMatch(keyword); // já vem com espaços nas bordas
      if (needle.trim().length === 0) continue;
      if (haystack.includes(needle)) {
        return rule;
      }
    }
  }

  return null;
}
