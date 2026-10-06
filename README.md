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
- exportação do pacote completo em `.txt`, `.md`, `.json` e `.csv`;
- fluxo de produção por status: rascunho, pronto e publicado;
- GitHub Pages + CI;
- SEO com canonical, Open Graph, sitemap e páginas institucionais bilíngues;
- dashboard de foco, analytics locais e filtros avançados;
- calendário semanal/mensal com filtro por plataforma, drag-and-drop e exportação .ics;
- histórico de até 10 versões por projeto com restauração;
- upload privado de mídia com TUS, progresso, retomada e cancelamento;
- player privado com tamanho/duração da mídia;
- editor de transcrição com timestamps;
- editor de cortes com favorito, descarte e ajuste de início/fim;
- regeneração parcial de campos do pacote;
- publicação assistida por plataforma;
- snapshots visuais automáticos desktop/mobile salvos em `screenshots/`.

O gerador local continua sendo o fallback padrão. As Edge Functions de IA e transcrição já estão implantadas no Supabase; a ativação real desses provedores depende apenas das credenciais privadas correspondentes.

## Backend

Tabelas:
- `postpilot_projects`
- `postpilot_outputs`
- `postpilot_project_versions`
- `product_subscriptions`

Storage:
- `postpilot-media` (privado, RLS por usuário)

Edge Functions:
- `postpilot-beta-feedback`
- `postpilot-generate`
- `postpilot-transcribe`

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

O PostPilot possui Browser E2E em Chromium cobrindo o fluxo local crítico e as evoluções de produto: briefing, geração, busca/filtros, dashboard, analytics, status, exportações, calendário, versionamento, regeneração parcial, editor de transcrição/cortes, publicação assistida, PT/EN e smoke responsivo.

A workflow Visual Snapshot captura a página inteira em desktop, tablet e mobile e mantém as imagens atuais versionadas no GitHub.


## Upload de mídia e transcrição

Usuários autenticados podem selecionar áudio ou vídeo para um pacote. A primeira versão aceita arquivos privados de até 6 MB nos formatos MP3/MP4/WAV/WebM/MOV. O upload vai para o bucket privado `postpilot-media`, isolado por pasta do usuário com RLS. O cliente já usa TUS resumível, com progresso, retomada e cancelamento, deixando a arquitetura pronta para aumentar o limite depois da validação do provedor de transcrição.

A Edge Function `postpilot-transcribe` baixa somente arquivos do próprio usuário e envia a mídia a um endpoint de transcrição configurado no backend. A resposta pode incluir segmentos com timestamps; quando disponíveis, o PostPilot cria sugestões de cortes com início, fim e trecho recomendado.

Configuração privada esperada:
- `POSTPILOT_TRANSCRIBE_API_URL`
- `POSTPILOT_TRANSCRIBE_API_KEY`
- `POSTPILOT_TRANSCRIBE_MODEL`

Sem esses segredos, o upload continua protegido e o usuário pode seguir usando transcrição/resumo manual; a transcrição automática não é apresentada como concluída.

## Geração por IA no backend

O PostPilot possui integração opcional com a Edge Function `postpilot-generate`, já implantada no Supabase. A chave do fornecedor nunca fica no navegador: URL, modelo e credencial são lidos apenas dos segredos `POSTPILOT_AI_API_URL`, `POSTPILOT_AI_MODEL` e `POSTPILOT_AI_API_KEY` no backend.

A IA exige sessão autenticada, valida origem, briefing e plataformas, e devolve um pacote estruturado por plataforma. A migration e a Edge Function já estão em produção; a ativação real depende somente de configurar os segredos do fornecedor. Se o fornecedor estiver indisponível, o frontend faz fallback para o gerador local.

## Exportações

Cada pacote pode ser baixado em TXT para leitura rápida, Markdown para documentos e publicação, JSON para integrações/backup estruturado e CSV para planilhas. As exportações respeitam o idioma ativo, mantêm os entregáveis separados por plataforma e, quando existirem, incluem metadados de mídia, segmentos com timestamps e sugestões de cortes com estado de favorito/descarte.

## Integração com calendários externos

O planejamento editorial pode ser exportado em `.ics` usando o padrão iCalendar. Cada pacote com data planejada vira um evento de dia inteiro com tema, plataformas, status e público. O arquivo pode ser importado no Google Calendar, Outlook, Apple Calendar e outros aplicativos compatíveis sem conceder acesso à conta do usuário.

## Calendário editorial e edição

O PostPilot possui visão semanal e mensal, filtro por plataforma, drag-and-drop para reagendar e abertura direta dos pacotes planejados.

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


## Edição avançada e histórico

Pacotes guardam até 10 versões editoriais restauráveis. Campos individuais podem receber novas versões sem regenerar o pacote inteiro. Quando uma transcrição contém timestamps, o PostPilot oferece editor por segmento, navegação pelo player e operações de dividir/mesclar. Sugestões de cortes podem ser ajustadas, favoritedas ou descartadas.

## Publicação assistida e analytics

Cada plataforma oferece a ação **Copiar e abrir**, que copia o material preparado e abre o ambiente oficial da rede para o usuário concluir a postagem. O PostPilot não publica automaticamente sem autorização da plataforma.

Os analytics locais mostram plataforma mais usada, objetivo dominante, percentual de pacotes com mídia/IA e atividade recente, sem depender de APIs sociais.

## QA visual

A workflow `Visual Snapshot` usa Playwright/Chromium para gerar `screenshots/postpilot-desktop.png`, `screenshots/postpilot-tablet.png` e `screenshots/postpilot-mobile.png`. As capturas também são salvas como artifact por 30 dias, permitindo revisar visualmente cada evolução.


## Health checks e proteção de uso

Usuários autenticados veem no painel da conta se IA e transcrição estão configuradas. Os checks usam as próprias Edge Functions com `action: "health"`, sem revelar URL, modelo ou chaves privadas.

Limites iniciais:
- geração por IA: 20 requisições por usuário/hora;
- transcrição: 10 requisições por usuário/hora.

A contagem é atômica via `postpilot_consume_usage` e armazenada em `postpilot_private.postpilot_usage_limits`, fora do schema público. Apenas `service_role` executa a RPC privilegiada. As Edge Functions também usam timeout de fornecedor (30 s para IA e 120 s para transcrição).

Se a transcrição não estiver configurada, a mídia privada pode continuar vinculada ao projeto quando houver um resumo manual. Se o fornecedor falhar depois do upload, o arquivo fica preservado para nova tentativa em vez de ser apagado ou reenviado.


## Gates de qualidade

O repositório possui camadas complementares de QA:

- **Static QA:** sintaxe, contratos importantes, migrations obrigatórias e budgets de tamanho dos assets locais;
- **Browser E2E:** fluxos reais em Chromium;
- **axe-core:** varredura WCAG 2 A/AA e 2.1 A/AA, bloqueando violações sérias/críticas;
- **Lighthouse QA:** acessibilidade e SEO com score mínimo 0,90, além de alertas de performance, best practices, FCP, LCP e CLS;
- **Visual Snapshot:** capturas full-page em desktop, tablet e mobile.

Os relatórios do Lighthouse são mantidos como artifact por 30 dias.


## Chaves Supabase

As Edge Functions preferem o modelo atual de chaves do Supabase:

- `SUPABASE_PUBLISHABLE_KEYS["default"]` para criar clientes que validam a sessão do usuário;
- `SUPABASE_SECRET_KEYS["default"]` para operações internas privilegiadas, como quota e feedback.

`SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` permanecem apenas como fallback de compatibilidade temporário enquanto o projeto migra completamente para o novo modelo de API keys. Nenhuma secret key é exposta no frontend.
