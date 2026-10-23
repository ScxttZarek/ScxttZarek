# LumaCall V2 — provisionamento

Esta migração não deve ser executada no site antigo. O V2 está isolado em /nova.
1. Instalar Neon Postgres em Vercel Marketplace > projeto lunacall > Storage.
2. Confirmar DATABASE_URL em Preview; não copiar valores secretos em mensagens.
3. Executar o arquivo lumacall/v2/schema.sql no editor SQL do Neon.
4. Validar /nova, nomes únicos, código secreto, foto, convite, limite 6/6, chat e voz antes de trocar a home principal.
5. Sem email, o código secreto não tem recuperação automática; guardar com segurança.
6. OHenrique, UserQubo, NandoBC0, Shine e Aldron continuam protegidos por RESERVED_*_CODE.
7. Avatar WEBP comprimido 256px, limitado a 120KiB em PostgreSQL nesta fase.
8. Antes de lançamento amplo: backup, limites globais de login e plano de recuperação de conta.