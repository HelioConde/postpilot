# Visual snapshots

Estas imagens são geradas automaticamente pela workflow **Visual Snapshot**.

- `postpilot-desktop.png`: página inteira em 1440 px.
- `postpilot-mobile.png`: página inteira em 390 px.
- `postpilot-tablet.png`: página inteira em 768 px.
- `postpilot-mobile-en.png`: home mobile em inglês para detectar problemas de tradução/overflow.
- `postpilot-desktop-populated.png`: estado desktop com um pacote criado pela própria UI.
- `postpilot-mobile-populated.png`: estado mobile com um pacote criado pela própria UI.
- `visual-state.json`: metadados da última captura.

A Action sobrescreve as imagens mais recentes em vez de criar um novo PNG a cada execução. O histórico do GitHub preserva as versões anteriores, então é possível acompanhar a evolução visual sem inflar desnecessariamente o repositório.

A captura usa o próprio código do `main` servido localmente no runner, portanto ela representa exatamente a versão do commit que disparou a workflow.
