# LumaCall — matriz de QA e gates de release (18/11/2026)

> **Estado:** roteiro de validação, não um certificado de segurança ou de lançamento. Todos os cenários marcados como MANUAL PENDENTE devem ser executados por testadores autorizados em ambiente de teste antes do merge ou da liberação pública.

## Identificação do release candidate

- GitHub: `ScxttZarek/ScxttZarek`, pasta `lumacall/`.
- Produção na auditoria: branch `main`, commit `8d1fac7c93b4105600ad1093fbee54f94cc2830c`.
- Branch de segurança em desenvolvimento: `lumacall-privacy-boundaries-20261118`.
- Pull Request: https://github.com/ScxttZarek/ScxttZarek/pull/1 (draft até aprovação).
- Banco principal Neon: **LumaCall V2**, branch `main`; **NÃO EXECUTAR TESTES MUTANTES NESSA BRANCH**.
- Branch de banco isolada preexistente: `lumacall-hardening-validation-20261118`.
- Mecanismo de geração: `source.part*.b64` → `source.tgz` → patches na sequência do `preinstall` → `v2-bootstrap-preview.js` copia `v2/` e `v3/` para as rotas reais.
- Os testes e o build **não** comprovam comportamento com equipamentos reais.

## Testes automatizados disponíveis

Execute a partir de `lumacall/`:

```bash
npm ci
npm run test
npm run build
```

`npm run build` já começa com `npm run test` antes da compilação Next.js. Não utilize códigos secretos ou conexões reais a contas de usuários no ambiente de CI de testes. O arquivo `tests/route-contract.test.cjs` transpila handlers de TypeScript e injeta dependências simuladas para testar resultados HTTP sem tocar no banco; `tests/security-regression.test.cjs` e os demais fornecem guardas de regressão estática.

## Matriz mínima de testes manuais

Use **contas descartáveis** em um ambiente isolado e registre resultado, data, versão, navegador, dispositivo e evidência. Nunca use o usuário real banido ou conteúdo de chats privados para simular ataques.

| ID | Caso | Resultado esperado | Status |
|---|---|---|---|
| SEC-01 | Usuário sem sessão tenta ler mensagens de canal | 401; nenhuma mensagem é revelada | MANUAL PENDENTE |
| SEC-02 | Membro sem permissão tenta abrir canal privado | 403; histórico inacessível | MANUAL PENDENTE |
| SEC-03 | Membro perde acesso durante a leitura de mensagens | Nenhum conteúdo novo exibido após revogação | MANUAL PENDENTE |
| SEC-04 | Canal privado é arquivado | Histórico não aparece em `#geral` ou outro canal | MANUAL PENDENTE |
| SEC-05 | Admin tenta tornar público um canal que já foi privado | Operação recusada, mesmo sem mensagens | MANUAL PENDENTE |
| SEC-06 | Convite de usuário banido em maiúsculas/minúsculas e com espaços | Entrada recusada em todas as variações | MANUAL PENDENTE |
| SEC-07 | Gestor de cargos tenta atribuir a si privilégios superiores | 403; cargos não alterados | MANUAL PENDENTE |
| SEC-08 | Moderador bane participante já conectado à LiveKit | Associação encerrada e participante desconectado; verificar tokens ainda válidos | MANUAL PENDENTE |
| SEC-09 | Endpoint legado `/api/v2/voice` é invocado | Não fornece um atalho inseguro para obter token | MANUAL PENDENTE |
| SEC-10 | Dois administradores tornam um canal público/privado simultaneamente | Nenhuma operação pode reclassificar um canal privado como público | MANUAL PENDENTE |
| SEC-11 | Arquivar canal de voz com sessão LiveKit ativa | A sala é encerrada; histórico não é publicado em outro canal | MANUAL PENDENTE |
| SEC-12 | Revogar um cargo de um canal privado de voz com uma chamada ativa | Apenas quem perdeu todos os direitos é desconectado; outros permanecem | MANUAL PENDENTE |
| SEC-13 | Revogar um cargo do membro durante uma chamada privada | Permissão efetiva é reavaliada; acesso perdido desconecta | MANUAL PENDENTE |
| SEC-14 | Excluir cargo concedendo acesso a um canal de voz | Sessões que perderam acesso são revogadas; demais preservadas | MANUAL PENDENTE |
| SEC-15 | Tentar reconectar com token LiveKit emitido antes do arquivamento ou da revogação | Não permitir continuidade do acesso revogado; testar dentro da validade do token | MANUAL PENDENTE |
| SEC-16 | Simular falha de remoção de participante no LiveKit em ambiente isolado | Administrador vê aviso explícito de desconexão não confirmada | MANUAL PENDENTE |
| MSG-01 | Enviar mensagem durante mudança de canal | Mensagem só é publicada no canal autorizado | MANUAL PENDENTE |
| MSG-02 | Carregar página anterior do histórico com mais de 100 registros | Sem duplicatas; scroll preservado; mensagens recentes mantidas | MANUAL PENDENTE |
| MSG-03 | Reagir enquanto autorização do canal é removida | Reação negada após revogação | MANUAL PENDENTE |
| DM-01 | Bloqueio entre duas contas durante envio de mensagem | Envio posterior recusado nos dois sentidos | MANUAL PENDENTE |
| DM-02 | Trocar de conversa antes do retorno de um envio ou GET | Nenhuma mensagem aparece no DM errado | MANUAL PENDENTE |
| DM-03 | Carregar mais de 100 mensagens privadas | Paginação estável sem perdas ou duplicações | MANUAL PENDENTE |
| CALL-01 | Chamada com 1 participante | Entrar/sair sem microfone/câmera presos | MANUAL PENDENTE |
| CALL-02 | Chamada com 2 participantes | Áudio bidirecional; mute/unmute; câmera; reconexão | MANUAL PENDENTE |
| CALL-03 | Chamada com 3 participantes | Qualidade sustentável e estados coerentes | MANUAL PENDENTE |
| CALL-04 | Chamada com 6 participantes | Respeito ao limite; áudio e vídeo estáveis | MANUAL PENDENTE |
| CALL-05 | Tela compartilhada 16:9, 16:10, 4:3, ultrawide | Sem corte; `object-fit: contain` quando apropriado | MANUAL PENDENTE |
| CALL-06 | Compartilhamento encerrado pelo navegador | Previews e visualizadores fechados corretamente | MANUAL PENDENTE |
| CALL-07 | Trocar chat geral/chamada e retornar | Sem crash nem remount indevido de mídia | MANUAL PENDENTE |
| CALL-08 | Chat da chamada com histórico acima de 100 mensagens | Cursor, carregamento, rolagem e novas mensagens corretos | MANUAL PENDENTE |
| UX-01 | Zoom 50%, 75%, 90%, 100%, 125%, 150%, 200% | Layout utilizável; botões críticos acessíveis | MANUAL PENDENTE |
| UX-02 | Viewports 320×568, 390×844, 768×1024, 1366×768, 1920×1080 | Sem overflow ou elementos inacessíveis | MANUAL PENDENTE |
| UX-03 | Chrome/Edge/Firefox, teclado e leitor de tela básico | Navegação, foco e controles acessíveis | MANUAL PENDENTE |
| PWA-01 | Instalar no Windows e Android | Manifest/ícones/login/navegação corretos | MANUAL PENDENTE |
| OPS-01 | Verificar logs de erros e custos após teste | Sem novas falhas de runtime não resolvidas | MANUAL PENDENTE |

## Checklist de liberação

1. Revisar o diff da PR e confirmar que `main` não se moveu inesperadamente.
2. Rodar `npm run test`, `npm run build` e revisar todo o log Vercel, não somente o status READY.
3. Conferir configurações e existência das funções SQL `v2_join_server` e `v3_can_read_channel` sem ler dados sensíveis.
4. Concluir os testes manuais acima, registrar evidências e resolver falhas.
5. Conferir desempenho e rate limiting em múltiplas instâncias; o limitador local atual ainda requer revisão antes de liberar publicamente.
6. Preparar ponto de restauração e plano de rollback. Evitar alterações destrutivas de dados.
7. Solicitar aprovação explícita para qualquer alteração de banco em produção ou publicação de release não aprovado.
8. Publicar somente código revisado; verificar alias/commit em produção e inspecionar logs.
9. Após cada novo deployment, consultar **apenas** alertas Vercel recebidos depois de `2026-11-18T06:52:11Z`, relacionando o **SHA do corpo do e-mail** com o deployment. Alertas de commits antigos podem chegar atrasados.
10. Marcar pronto para lançamento público somente após os gates e as evidências necessárias.

## Resultado das validações automatizadas desta etapa

- Na candidata `944d434e1e536dd8ee14fec2f39e272c47fab7c6c`, a Vercel reportou 74 testes aprovados e 0 falhas na rotina de build. A Preview ficou READY.
- O conjunto inclui testes executáveis dos handlers com o RoomServiceClient simulado para verificar encerramento de salas, revogação de grants, remoção/exclusão de cargos e falhas parciais.
- O Neon confirmou os planos SQL de consulta de permissão, exclusão de grant e UPDATE com proteção atômica via EXPLAIN em branch de teste, sem ANALYZE nem gravações.
- **Essas validações não substituem a verificação de chamadas reais e concorrência entre LiveKit e Neon.** Todos os testes da matriz acima permanecem manuais pendentes.

## Riscos não resolvidos

- A verificação de autorização na mesma instrução SQL reduz janelas entre consulta e gravação, mas **não é uma prova formal contra todas as corridas entre transações**. Confirmar cenários concorrentes isolados.
- Tokens LiveKit emitidos previamente e revogação imediata exigem teste com mídia e moderação reais.
- Encerrar salas LiveKit e remover participantes bloqueia sessões presentes, mas tokens previamente emitidos exigem verificação de não reutilização durante sua validade (TTL atual de 10 minutos). Não declarar revogação absoluta sem testes.
- Revogações concorrentes com autorização/entrada ainda exigem testes de integração sob concorrência real; a checagem no SQL e a limpeza em chamadas reduzem, mas não zeram todas as janelas entre serviços.
- Mensagens usam polling; não anunciar WebSocket/SSE/tempo real genuíno sem implementação comprovada.
- Limitação de taxa em memória não basta, sozinha, para proteger várias instâncias serverless contra abuso distribuído.
- Testes de contrato com mocks não substituem integração real com Neon, LiveKit ou testes em Android/iOS.
