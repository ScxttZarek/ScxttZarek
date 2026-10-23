# LumaCall V2 — provisionamento

A V2 é a página principal do LumaCall; /nova é a mesma interface. O banco PostgreSQL armazena as contas, servidores e mensagens.
1. Instalar Neon Postgres em Vercel Marketplace > projeto lunacall > Storage.
2. Confirmar DATABASE_URL em Preview; não copiar valores secretos em mensagens.
3. Executar o arquivo lumacall/v2/schema.sql no editor SQL do Neon.
4. Validar /nova, nomes únicos, código secreto, foto, convite, limite 6/6, chat e voz antes de trocar a home principal.
5. Sem email, o código secreto não tem recuperação automática; guardar com segurança.
6. Não há nomes reservados. OHenrique, UserQubo, NandoBC0, Shine e Aldron podem ser cadastrados como qualquer outro nome disponível; nenhum cadastro ganha tag especial automaticamente. As tags continuam no modelo de dados para eventual atribuição administrativa. O índice UNIQUE em name_key impede duplicatas. Não existem contas nem servidores pré-criados.
7. Avatar WEBP comprimido 256px, limitado a 120KiB em PostgreSQL nesta fase.
8. Antes de lançamento amplo: backup, limites globais de login e plano de recuperação de conta.