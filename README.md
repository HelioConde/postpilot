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


## PWA e backup local

O PostPilot pode ser instalado como PWA. Depois da primeira abertura, o shell principal fica em cache e o modo local continua disponível sem internet; autenticação e sincronização continuam exigindo conexão.

Quem trabalha sem conta também pode exportar e restaurar um backup JSON dos pacotes locais. O arquivo pode conter transcrições e conteúdo do usuário e deve ser armazenado com cuidado.


## Templates e feedback beta

Os modelos rápidos configuram público-alvo, objetivo, tom e plataformas para cenários educacional, negócio local, autoridade e comunidade, sem substituir o tema nem a transcrição do criador.

O feedback beta coleta somente nota, categoria e comentário. Não envia e-mail, transcrição nem conteúdo dos pacotes. Se o backend estiver indisponível, os registros ficam em uma fila local de até 20 itens e são reenviados quando a conexão volta.


## Homologação RLS

O isolamento do Supabase foi homologado tecnicamente com duas identidades autenticadas simuladas dentro de uma transação. Cada identidade viu somente 1 projeto/output próprio, 0 registros da outra conta, não conseguiu alterar ou excluir dados alheios e conseguiu modificar os próprios. O teste terminou com `ROLLBACK`, sem deixar usuários ou dados QA no banco.

A etapa restante é humana: cadastro, confirmação de e-mail, login, recuperação de senha e sessão em navegadores reais.
