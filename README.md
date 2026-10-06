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


## QA no navegador

O PostPilot possui Browser E2E em Chromium cobrindo o fluxo local crítico: briefing com público/data, geração multiplataforma, painel de produção, busca, mudança de status, exportação .txt, troca PT/EN e smoke responsivo em 360 px, 768 px e 1440 px.

O primeiro run dessa suíte passou integralmente no GitHub Actions.


## Calendário editorial e edição

O PostPilot possui uma visão semanal de segunda a domingo baseada na data planejada de publicação. Pacotes agendados podem ser abertos diretamente pelo calendário.

Pacotes existentes também podem ser editados no mesmo formulário sem criar outro projeto. A ação **Usar como modelo** reutiliza briefing, plataformas, tom e objetivo, mas inicia um novo rascunho e não herda a data de publicação para evitar duplicações acidentais.


## Checklist de publicação

Cada plataforma do pacote possui um checklist próprio com três etapas: texto revisado, mídia pronta e publicado na plataforma. O progresso fica persistido no modo local e na nuvem sem gerar novos snapshots de conteúdo a cada clique.
