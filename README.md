# PostPilot

Estúdio de conteúdo para criadores. A partir de tema e transcrição, organiza ganchos, ideias de cortes, legenda, CTA e hashtags.

## Estado atual

- modo local sem conta;
- Supabase Auth por e-mail/senha;
- sincronização de projetos no `pizzaria-db`;
- importação de rascunhos locais para a conta;
- histórico e exclusão protegidos por RLS;
- snapshot dos pacotes em `postpilot_outputs`;
- geração simultânea para Instagram, TikTok e YouTube Shorts;
- entregáveis específicos por plataforma com cópia individual;
- exportação do pacote completo em arquivo `.txt`;
- fluxo de produção por status: rascunho, pronto e publicado;
- GitHub Pages + CI;
- SEO básico com canonical e Open Graph.

O gerador atual usa regras locais. Processamento de vídeo, transcrição automática e geração por IA externa ainda não estão ligados; quando forem adicionados, chaves privadas devem ficar em backend/Edge Function.

## Backend

Tabelas:
- `postpilot_projects`
- `postpilot_outputs`
- `product_subscriptions`

Veja `FULLSTACK.md` para arquitetura e próximos passos.


## Idiomas

- PT-BR é o idioma principal, padrão e fallback.
- Inglês está disponível pelo seletor PT/EN no topo.
- A preferência fica salva no navegador.
- Os pacotes gerados, CTAs, rótulos e exportações acompanham o idioma ativo.

## Planejamento editorial

Cada pacote pode registrar público-alvo e data planejada de publicação. O histórico possui busca por tema/público, filtro de status e um resumo com total, prontos, agendados e taxa de publicação. Esses campos também são sincronizados no Supabase.

## Monetização

O PostPilot permanece gratuito e está preparado para anúncios responsivos fora do formulário e dos pacotes de conteúdo. A integração fica desativada até existirem Publisher ID e slot reais.
