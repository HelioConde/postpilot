# PostPilot

Estúdio de conteúdo para criadores. A partir de tema e transcrição, organiza ganchos, ideias de cortes, legenda, CTA e hashtags.

## Estado atual

- modo local sem conta;
- Supabase Auth por e-mail/senha;
- sincronização de projetos no `pizzaria-db`;
- importação de rascunhos locais para a conta;
- histórico e exclusão protegidos por RLS;
- snapshot dos pacotes em `postpilot_outputs`;
- GitHub Pages + CI;
- SEO básico com canonical e Open Graph.

O gerador atual usa regras locais. Processamento de vídeo, transcrição automática e geração por IA externa ainda não estão ligados; quando forem adicionados, chaves privadas devem ficar em backend/Edge Function.

## Backend

Tabelas:
- `postpilot_projects`
- `postpilot_outputs`
- `product_subscriptions`

Veja `FULLSTACK.md` para arquitetura e próximos passos.
