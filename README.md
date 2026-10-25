<div align="center">
  <h1>🎬 PostPilot</h1>
  <p><strong>Planeje, organize e revise conteúdos para redes sociais a partir de ideias e transcrições.</strong></p>
  <p><img alt="Status" src="https://img.shields.io/badge/status-MVP%20em%20homologa%C3%A7%C3%A3o-64748b"> <img alt="Web" src="https://img.shields.io/badge/HTML%20%2B%20JavaScript-Web-F7DF1E?logo=javascript&logoColor=black"></p>
  <p><a href="https://helioconde.github.io/postpilot/"><strong>Abrir versão web</strong></a> · <a href="RELEASE_V1.md"><strong>Relatório do MVP</strong></a> · <a href="SECURITY.md"><strong>Segurança</strong></a></p>
</div>

## Para que serve?

O **PostPilot** é um estúdio de preparação de conteúdo: ajuda a transformar um tema ou transcrição em **ganchos, sugestões de cortes, roteiros, legendas, CTAs e hashtags**. O objetivo é organizar ideias e acelerar a revisão, não publicar automaticamente conteúdo sem intervenção humana.

**O núcleo local de preparação está implementado.** Serviços remotos de IA e transcrição dependem de configuração, integração segura e testes ponta a ponta; quando indisponíveis, a experiência pode oferecer sugestões locais/demonstrativas identificadas.

## Fluxo do criador

```text
Ideia ou transcrição
        ↓
Contexto (público, canal e objetivo)
        ↓
Rascunho de conteúdo
        ↓
Revisão humana e edição
        ↓
Exportação / planejamento editorial
```

| Área | O que permite |
| --- | --- |
| Ideação | Ganchos, títulos, roteiro e estrutura da publicação |
| Texto | Legendas, chamadas para ação e hashtags |
| Vídeos | Planejamento de cortes e referências da transcrição |
| Organização | Calendário, checklist e histórico local |
| Exportação | Saídas para continuar em outras ferramentas |
| Conta | Integração Supabase opcional, sujeita à configuração |

**Cuidados importantes:** conteúdo curto demais não deve gerar a falsa impressão de um pacote pronto. Sugestões automáticas precisam ser revisadas, inclusive quanto a direitos de imagem, áudio e privacidade.

## Como executar localmente

```bash
git clone https://github.com/HelioConde/postpilot.git
cd postpilot
python -m http.server 8000
```

Abra `http://localhost:8000`. Para verificação de interface com Playwright:

```bash
npm install
npm run test:e2e
npm run test:a11y
```

Os provedores externos de IA/transcrição e a sincronização exigem configuração separada. **Executar o frontend não os ativa automaticamente.**

## Estado de desenvolvimento

**MVP local em validação.** O lançamento com serviços de IA/transcrição reais depende de configuração de fornecedores, limites de uso, política de privacidade, proteção de dados e homologação com usuários.

Para preservar os detalhes técnicos: [Arquitetura](FULLSTACK.md) · [Relatório](RELEASE_V1.md) · [Segurança](SECURITY.md) · [Histórico completo do README](docs/README_HISTORY_2026-10-25.md).

Desenvolvido por [Hélio Conde](https://github.com/HelioConde).
