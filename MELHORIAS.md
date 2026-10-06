# Melhorias — PostPilot

Atualizado em 2026-10-06.

O objetivo é validar o menor estúdio de conteúdo realmente útil para criadores antes de adicionar IA externa ou processamento de vídeo.

## P0 — lançamento

- [x] Gerar pacotes para Instagram, TikTok e YouTube Shorts.
- [x] Modo local sem conta.
- [x] Supabase Auth e sincronização de projetos.
- [x] RLS para dados privados.
- [x] Fluxo rascunho → pronto → publicado.
- [x] Exportação .txt e cópia por plataforma.
- [x] PT-BR principal + inglês.
- [x] Monetização preparada por anúncios, desativada até existir configuração real.
- [x] Público-alvo e data planejada de publicação.
- [x] Busca e resumo de produção.
- [x] Browser E2E para o fluxo local crítico: briefing editorial, geração, busca, status, exportação e PT/EN.
- [x] Smoke responsivo automatizado em 360 px, 768 px e 1440 px sem overflow horizontal.
- [x] Homologar isolamento RLS no Supabase real com duas identidades autenticadas em transação e rollback.
- [ ] Homologar cadastro, confirmação de e-mail, login, recuperação de senha e sessão com conta humana real.

## P1 — diferenciação

- [x] Templates rápidos por objetivo/nicho que configuram público, objetivo, tom e plataformas sem substituir tema/transcrição.
- [x] Calendário editorial visual semanal com navegação e abertura direta dos pacotes agendados.
- [x] Reaproveitar um pacote como modelo sem alterar o original e sem herdar a data de publicação.
- [x] Editar pacote existente no mesmo formulário, preservando ID e status no modo local e na nuvem.
- [x] Checklist de publicação por plataforma com texto revisado, mídia pronta e publicação, persistido localmente e no Supabase.
- [x] Backup/restauração JSON validado no modo local, com sanitização e limite de 20 pacotes.
- [x] Feedback beta com nota, categoria e comentário, fila offline e Edge Function privada ativa no Supabase.
- [x] PWA instalável com app shell em cache e criação local disponível offline após a primeira abertura.

## P2 — após validação com usuários

- [ ] Geração por IA real. Migration, Edge Function, UI, persistência e fallback concluídos; falta somente configurar `POSTPILOT_AI_API_URL`, `POSTPILOT_AI_API_KEY` e `POSTPILOT_AI_MODEL`.
- [x] Upload privado de vídeo/áudio com limite inicial de 6 MB, formatos validados, bucket privado e RLS por usuário.
- [ ] Transcrição automática. Edge Function implantada; falta configurar os segredos do fornecedor de transcrição.
- [x] Sugestões e editor de cortes com timestamps, favorito, descarte, ajuste de início/fim e navegação pelo player. Validação com mídia real depende do fornecedor de transcrição ativo.
- [x] Exportações adicionais (Markdown/CSV/JSON).
- [x] Exportações estruturadas incluem mídia, segmentos de transcrição, cortes, favoritos e descartes.
- [x] Integração opcional com calendário externo via exportação iCalendar (.ics), compatível com Google Calendar, Outlook e Apple Calendar.
- [x] Publicação assistida: copiar conteúdo preparado e abrir Instagram, TikTok ou YouTube Studio para conclusão manual. Integração direta via APIs fica para uma etapa futura dependente de aprovação das plataformas.

## Regra de priorização

Não adicionar processamento de vídeo pesado, cobrança ou automação de publicação antes de validar o fluxo: briefing → pacote multiplataforma → revisão → planejamento → publicação.


## P3 — produto e operação

- [x] Dashboard de prioridades: publicar hoje, atrasados, próximos 7 dias e rascunhos.
- [x] Filtros avançados por plataforma, objetivo, tom, origem, mídia e período.
- [x] Analytics locais de produção sem depender de APIs sociais.
- [x] Calendário semanal/mensal com filtro por plataforma e drag-and-drop.
- [x] Histórico de até 10 versões por projeto com restauração.
- [x] Regeneração parcial de campos sem reconstruir o pacote inteiro.
- [x] Player privado para mídia sincronizada.
- [x] Editor de transcrição por timestamp com editar/dividir/mesclar.
- [x] Editor persistente de cortes.
- [x] Upload TUS resumível com progresso, retomada e cancelamento; limite continua 6 MB até validar o provedor de transcrição.
- [x] Páginas bilíngues Sobre, Privacidade, Termos e Contato + sitemap.
- [x] Visual Snapshot automático desktop/tablet/mobile salvo no GitHub.
- [x] Health check autenticado para IA/transcrição no painel da conta.
- [x] Quota por usuário: 20 gerações de IA/h e 10 transcrições/h, com contador atômico em schema privado.
- [x] Painel da conta mostra quota restante e horário de renovação sem consumir requisições.
- [x] Timeout de fornecedor: 30 s IA e 120 s transcrição.
- [x] Upload preservado quando a transcrição falha ou está indisponível; evita apagar/repetir envio.
- [x] QA visual inicial aplicado: correção do progresso 0%, card do hero e newline literal.
- [x] Acessibilidade básica: skip link, foco visível, navegação por teclado e respeito a prefers-reduced-motion.
- [x] Auditoria automática de acessibilidade com axe-core no Browser E2E.
- [x] Lighthouse CI com metas de acessibilidade/SEO e alertas de performance/Core Web Vitals.
- [x] Budgets de tamanho para app.js, style.css, index.html, i18n.js e total crítico.
- [x] Dependabot semanal para npm e GitHub Actions.
- [x] `package-lock.json` versionado e atualizado automaticamente; Browser E2E/Visual Snapshot usam `npm ci`.
- [x] Playwright atualizado e validado na versão 1.63.0 com lockfile consistente.
- [x] Static QA valida consistência de `package.json` + `package-lock.json`.
- [x] Portabilidade de dados da conta: export JSON de projetos, versões e outputs sob RLS, sem mídia privada/credenciais.
- [x] CodeQL para análise de segurança JavaScript.
- [x] Edge Functions migradas para preferir as novas chaves publishable/secret do Supabase, mantendo fallback legado temporário.
- [x] Contraste secundário ajustado para WCAG AA após auditoria axe.
- [ ] Aumentar limite real de mídia acima de 6 MB após confirmar limite global do Storage + limite do fornecedor de transcrição.
- [x] Limpeza automática de mídia órfã: ao sincronizar a conta, arquivos privados sem projeto correspondente são removidos após retenção conservadora de 30 dias.
- [ ] Homologação humana de Auth em navegadores reais.
- [ ] Ativar Publisher ID/slot real do AdSense.
- [ ] Integrações diretas de postagem via APIs oficiais, somente após aprovação/escopos necessários.

## Bloqueios externos atuais

1. **IA:** faltam os 3 segredos do fornecedor.
2. **Transcrição:** faltam os 3 segredos do fornecedor.
3. **Auth humano:** exige uma conta/e-mail real para confirmação e recuperação.
4. **Ads:** exige Publisher ID e slot reais.
5. **Postagem direta:** depende de credenciais, escopos e aprovação das plataformas.
