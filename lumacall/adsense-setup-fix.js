const fs = require("fs");

function replace(path, from, to) {
  const source = fs.readFileSync(path, "utf8");
  if (!source.includes(from)) throw new Error("Trecho do AdSense não encontrado em " + path + ": " + from.slice(0, 120));
  fs.writeFileSync(path, source.replace(from, to));
}

replace(
  "app/layout.tsx",
  '    <html lang="pt-BR">\n      <body>{children}</body>\n    </html>',
  '    <html lang="pt-BR">\n      <head>\n        <script\n          async\n          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1493550858260583"\n          crossOrigin="anonymous"\n        />\n      </head>\n      <body>{children}</body>\n    </html>'
);

replace(
  "components/home/home-client.tsx",
  'Áudio, câmera, chat e compartilhamento de tela em alta qualidade. Sem instalação, sem cadastro e sem anúncios.',
  'Áudio, câmera, chat e compartilhamento de tela em alta qualidade. Sem instalação e sem cadastro.'
);

replace(
  "components/home/home-client.tsx",
  '["Sem cadastro", "Sem anúncios", "PC e celular", "Tela em até 1080p no PC"]',
  '["Sem cadastro", "Sem instalação", "PC e celular", "Tela em até 1080p no PC"]'
);

replace(
  "app/privacidade/page.tsx",
  '<p>A LumaCall foi criada para intermediar chamadas ao vivo com o mínimo de coleta possível. Não usamos anúncios, AdSense, Meta Pixel ou rastreadores publicitários.</p><p>Áudio, câmera e compartilhamento de tela não são gravados nem armazenados pela aplicação por padrão. O serviço usa o LiveKit para transportar mídia em tempo real e pode processar dados técnicos necessários para conectar participantes e manter a chamada.</p><p>O nome de exibição é salvo localmente no seu navegador para facilitar visitas futuras. As mensagens do chat são transmitidas em tempo real e não possuem histórico persistente nesta versão.</p><p>Não vendemos dados pessoais. Logs técnicos do provedor de hospedagem ou do serviço de mídia podem existir conforme a operação desses fornecedores.</p>',
  '<p>A LumaCall foi criada para intermediar chamadas ao vivo com o mínimo de coleta possível. A plataforma pode exibir publicidade fornecida pelo Google AdSense.</p><p>O Google e seus parceiros podem usar cookies, identificadores do dispositivo e outros dados técnicos para fornecer, medir e proteger anúncios, conforme as configurações de consentimento disponíveis e as políticas do próprio Google.</p><p>Áudio, câmera e compartilhamento de tela não são gravados nem armazenados pela aplicação por padrão. O serviço usa o LiveKit para transportar mídia em tempo real e pode processar dados técnicos necessários para conectar participantes e manter a chamada.</p><p>O nome de exibição é salvo localmente no seu navegador para facilitar visitas futuras. As mensagens do chat são transmitidas em tempo real e não possuem histórico persistente nesta versão.</p><p>A LumaCall não vende dados pessoais. Logs técnicos do provedor de hospedagem, do serviço de mídia e dos fornecedores de publicidade podem existir conforme a operação desses serviços.</p>'
);

replace(
  "app/termos/page.tsx",
  '<p>As chamadas não são gravadas pelo serviço por padrão. O serviço pode sofrer indisponibilidades, quedas de conexão ou limitações causadas pelo navegador, pela internet do usuário ou por fornecedores de infraestrutura.</p><p>Uso abusivo pode resultar em bloqueio técnico de acesso. Estes termos não inventam ou representam uma empresa, CNPJ ou endereço comercial inexistente.</p>',
  '<p>As chamadas não são gravadas pelo serviço por padrão. O serviço pode sofrer indisponibilidades, quedas de conexão ou limitações causadas pelo navegador, pela internet do usuário ou por fornecedores de infraestrutura.</p><p>A plataforma pode exibir anúncios fornecidos por terceiros, incluindo o Google AdSense. Anúncios e páginas acessadas por meio deles são de responsabilidade dos respectivos anunciantes e fornecedores.</p><p>Uso abusivo pode resultar em bloqueio técnico de acesso. Estes termos não inventam ou representam uma empresa, CNPJ ou endereço comercial inexistente.</p>'
);
