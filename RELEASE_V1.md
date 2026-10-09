# PostPilot IA — encerramento técnico e gates externos do MVP 1.0

**Revisado:** 09/10/2026  
**Status:** funcionalidades principais do MVP implementadas e revisadas. **O produto ainda não está homologado para lançamento público**: faltam provedores/testes reais de IA e transcrição, validação humana de Auth e reforço de propriedade da relação output → projeto. O modo local de criação está disponível.

## Produto implementado

- [x] Fluxo briefing → pacote por Instagram, TikTok e YouTube Shorts → revisão → planejamento → publicação assistida.
- [x] Proteção contra contexto insuficiente no gerador local.
- [x] Modo local sem conta; sincronização opcional via Supabase Auth.
- [x] Modelos, planejamento editorial semanal/mensal, calendário ICS, histórico de edições e versões.
- [x] Exportação TXT/MD/CSV/JSON e backup/restauração de projetos locais.
- [x] Upload privado com limites, transcrição/cortes editáveis e infraestrutura de IA/transcrição server-side.
- [x] PT-BR como padrão, inglês secundário, páginas legais, responsividade desktop/tablet/mobile.
- [x] Estrutura de anúncios presente, **desativada** sem aprovação e IDs de AdSense.
- [x] Publicação assistida por copiar e abrir as redes, não postagem automática sem autorização.

## Segurança — verificação de 09/10

- [x] Supabase `pizzaria-db` (`bnlvvsjgpywpbfhwdcan`) ativo e saudável.
- [x] Três Edge Functions `postpilot-beta-feedback`, `postpilot-generate`, `postpilot-transcribe` ativas no servidor.
- [x] Tabelas `postpilot_projects`, `postpilot_outputs`, `postpilot_project_versions` e `postpilot_beta_feedback` possuem RLS.
- [x] Policies de projetos/outputs/versões limitam acesso a `auth.uid() = user_id`, inclusive criação de versões apenas sob projeto próprio.
- [x] `postpilot_beta_feedback` não tem leitura direta `anon`/`authenticated`; alerta INFO `rls_enabled_no_policy` esperado por ser acessado pela função privilegiada.
- [x] PWA `postpilot-shell-v2`: cache somente de arquivos públicos do PostPilot e sua pasta, sem URLs personalizadas com parâmetros, sem apagar caches de outros projetos do GitHub Pages.
- [x] `live-update.js` atualiza apenas o worker e apaga apenas caches `postpilot-shell-*`.
- [x] Novos testes de regressão para URLs privadas, caches de outros sites, ativação de nova versão e shell offline.
- [x] QA estático reforçado para impedir retorno ao cache de escopo global.
- [x] Auditoria adicional confirmou **zero saídas e zero versões com proprietário divergente** no banco.
- [ ] **P0 antes de liberar beta público:** completar a policy `postpilot_outputs` para exigir também propriedade do `project_id` em INSERT/UPDATE, e testar A ≠ B. A policy `postpilot_outputs_owner_all` hoje verifica somente o proprietário da própria saída. Tentativa de aplicar o reforço automaticamente foi bloqueada pela segurança da ferramenta; não foi realizada alteração de DDL neste ponto. [Issue #8](https://github.com/HelioConde/postpilot/issues/8).

## Correção das falhas de E2E anteriores

- [x] Teste de páginas legais passou a selecionar a versão exata PT/EN, em vez de selecionar os dois parágrafos simultaneamente.
- [x] Teste de mostrar/ocultar senha usa cliente Supabase simulado sem sessão: em modo puramente local o formulário de login é corretamente oculto, portanto não deve ser testado nesse estado.
- [x] [Browser E2E — **46 de 46 testes aprovados** após as correções](https://github.com/HelioConde/postpilot/actions/runs/37945201211), incluindo 3 novos testes PWA.
- [x] Static QA após a correção: https://github.com/HelioConde/postpilot/actions/runs/37945231696
- [x] Live Update QA após a correção: https://github.com/HelioConde/postpilot/actions/runs/37945231518
- [x] [Capturas full-page desktop/tablet/mobile, estados preenchidos, EN e conta — aprovadas](https://github.com/HelioConde/postpilot/actions/runs/37945028166) e registradas em [visual-state.json](screenshots/visual-state.json) em 09/10/2026.
- [x] [Lighthouse QA aprovado](https://github.com/HelioConde/postpilot/actions/runs/37945028197) na revisão de segurança.
- [x] [CodeQL aprovado](https://github.com/HelioConde/postpilot/actions/runs/37945201066) após os novos testes.
- [x] [GitHub Pages publicado](https://github.com/HelioConde/postpilot/actions/runs/37945258528) com as correções de código; observar novas publicações após commits de documentação.

## Gates externos e testes humanos

- [ ] Definir fornecedor de IA e configurar `POSTPILOT_AI_API_URL`, `POSTPILOT_AI_MODEL`, `POSTPILOT_AI_API_KEY` como segredos server-side.
- [ ] Definir fornecedor de transcrição e configurar `POSTPILOT_TRANSCRIBE_API_URL`, `POSTPILOT_TRANSCRIBE_MODEL`, `POSTPILOT_TRANSCRIBE_API_KEY`.
- [ ] Testar fluxo real mídia → upload privado → transcrição → cortes → pacote, com limites de tempo, tamanho, custo e rate limiting.
- [ ] Validar cadastro, confirmação de e-mail, reset de senha, renovação de sessão, logout e isolamento entre duas contas/dispositivos reais.
- [ ] Aplicar e validar o reforço P0 de associação owner-output/project antes do lançamento público.
- [ ] Testar feedback beta com conta real e instalação PWA num dispositivo compatível.
- [ ] Confirmar publicação correta no GitHub Pages do SHA final.
- [ ] Ativar anúncios somente após rede aprovar e fornecer IDs e mecanismo adequado de privacidade/consentimento.

## Regras de manutenção

Não expandir com editor de vídeo pesado, APIs de publicação direta ou novos módulos antes dos gates acima. Permitir apenas correções P0/P1, segurança, acessibilidade e feedback documentado.

**Status adequado:** *MVP técnico do modo local concluído; produto de IA/transcrição real ainda pendente*. Não anunciar um serviço de IA completo enquanto a infraestrutura externa estiver desconfigurada.

Site: https://helioconde.github.io/postpilot/  
Pendências: https://github.com/HelioConde/postpilot/issues/8  
Repositório: https://github.com/HelioConde/postpilot
