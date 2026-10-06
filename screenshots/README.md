# Visual snapshots

Estas imagens são geradas automaticamente pela workflow **Visual Snapshot**.

- `postpilot-desktop.png`: página inteira em 1440 px.
- `postpilot-mobile.png`: página inteira em 390 px.
- `visual-state.json`: metadados da última captura.

A Action sobrescreve as imagens mais recentes em vez de criar um novo PNG a cada execução. O histórico do GitHub preserva as versões anteriores, então é possível acompanhar a evolução visual sem inflar desnecessariamente o repositório.

A captura usa o próprio código do `main` servido localmente no runner, portanto ela representa exatamente a versão do commit que disparou a workflow.
