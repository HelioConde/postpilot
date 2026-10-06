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
- [ ] Homologar autenticação e isolamento no Supabase real.

## P1 — diferenciação

- [ ] Templates de conteúdo por objetivo/nicho.
- [ ] Calendário editorial visual semanal.
- [ ] Reaproveitar um pacote como modelo.
- [ ] Editar pacote gerado sem recriar o projeto.
- [ ] Checklist de publicação por plataforma.
- [ ] Backup/restauração no modo local.
- [ ] Feedback beta dentro do produto.
- [ ] PWA e modo offline.

## P2 — após validação com usuários

- [ ] Edge Function para geração por IA com chave privada no backend.
- [ ] Upload de vídeo/áudio e transcrição automática.
- [ ] Sugestões de cortes com timestamps.
- [ ] Exportações adicionais (Markdown/CSV/JSON).
- [ ] Integração opcional com calendário externo.
- [ ] Publicação assistida por plataforma quando APIs e políticas permitirem.

## Regra de priorização

Não adicionar processamento de vídeo pesado, cobrança ou automação de publicação antes de validar o fluxo: briefing → pacote multiplataforma → revisão → planejamento → publicação.
