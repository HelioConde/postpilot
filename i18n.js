(() => {
  const storageKey = 'postpilot-language';
  const translations = {
    "Salvo neste dispositivo":"Saved on this device",
    "Entrar / sincronizar":"Sign in / sync",
    "SUA CONTA POSTPILOT":"YOUR POSTPILOT ACCOUNT",
    "Leve seus pacotes com você":"Take your content packs with you",
    "Entre para sincronizar seus projetos. Sem conta, o PostPilot continua funcionando neste dispositivo.":"Sign in to sync your projects. Without an account, PostPilot keeps working on this device.",
    "E-mail":"Email",
    "Senha":"Password",
    "Entrar":"Sign in",
    "Criar conta":"Create account",
    "Esqueci a senha":"Forgot password",
    "Conectado como":"Signed in as",
    "Sair da conta":"Sign out",
    "pacotes locais encontrados.":"local packs found.",
    "Importar para a conta":"Import to account",
    "ESTÚDIO DE CONTEÚDO PARA CRIADORES":"CONTENT STUDIO FOR CREATORS",
    "Um vídeo longo.\nUma semana de ideias.":"One long video.\nA week of ideas.",
    "Organize trechos, legendas e publicações a partir da transcrição do seu vídeo. Prepare seu pacote de conteúdo para revisar e publicar.":"Turn your video transcript into clips, captions, and posts. Prepare a content pack to review and publish.",
    "Conteúdo em movimento":"Content in motion",
    "Transforme uma gravação em conteúdo reaproveitável.":"Turn one recording into reusable content.",
    "Seu próximo vídeo":"Your next video",
    "Quanto mais contexto você incluir, melhores serão os rascunhos para revisar.":"The more context you include, the better the drafts will be.",
    "Tema do vídeo":"Video topic",
    "Ex.: como comecei meu negócio":"Ex.: how I started my business",
    "Transcrição ou resumo":"Transcript or summary",
    "Cole aqui uma transcrição ou descreva os pontos principais...":"Paste a transcript or describe the main points...",
    "Público-alvo":"Target audience",
    "Ex.: donos de pequenos negócios":"Ex.: small business owners",
    "Publicar em":"Publish on",
    "Plataformas do pacote":"Pack platforms",
    "Escolha uma ou mais. O PostPilot adapta o material para cada formato.":"Choose one or more. PostPilot adapts the material to each format.",
    "Tom de voz":"Tone of voice",
    "Natural e direto":"Natural and direct",
    "Didático":"Educational",
    "Bem-humorado":"Humorous",
    "Objetivo do conteúdo":"Content goal",
    "Gerar conversa":"Start conversations",
    "Alcançar novas pessoas":"Reach new people",
    "Apresentar um serviço":"Present a service",
    "Montar pacote":"Build content pack",
    "MÍDIA BETA":"MEDIA BETA",
    "Envie áudio ou vídeo para transcrever":"Upload audio or video to transcribe",
    "Disponível com conta. Até 6 MB nesta primeira versão; o arquivo fica privado.":"Available with an account. Up to 6 MB in this first version; the file stays private.",
    "Escolher mídia":"Choose media",
    "Trocar mídia":"Change media",
    "Remover mídia":"Remove media",
    "Cole uma transcrição/resumo ou envie uma mídia acima...":"Paste a transcript/summary or upload media above...",
    "É necessário informar texto ou enviar uma mídia para transcrição.":"Enter text or upload media for transcription.",
    "Informe uma transcrição/resumo ou envie uma mídia.":"Enter a transcript/summary or upload media.",
    "Enviando mídia privada…":"Uploading private media…",
    "Transcrevendo mídia…":"Transcribing media…",
    "Transcrição concluída.":"Transcription completed.",
    "Não foi possível transcrever. Use o campo de texto para continuar.":"Could not transcribe. Use the text field to continue.",
    "Transcrição indisponível. Cole um resumo para continuar.":"Transcription unavailable. Paste a summary to continue.",
    "Mídia não transcrita. Usando o texto informado.":"Media was not transcribed. Using the provided text.",
    "Formato de mídia não suportado.":"Unsupported media format.",
    "O arquivo deve ter no máximo 6 MB.":"The file must be at most 6 MB.",
    "Mídia vinculada":"Linked media",
    "CORTES":"CLIPS",
    "Sugestões de cortes":"Clip suggestions",
    "Baseadas nos timestamps da transcrição.":"Based on transcription timestamps.",
    "Corte":"Clip",
    "Carregando mídia privada…":"Loading private media…",
    "Não foi possível carregar a prévia da mídia.":"Could not load the media preview.",
    "Início":"Start",
    "Fim":"End",
    "Favoritar":"Favorite",
    "Desfavoritar":"Unfavorite",
    "Descartar":"Discard",
    "Restaurar":"Restore",
    "Corte atualizado.":"Clip updated.",
    "Não foi possível atualizar o corte.":"Could not update the clip.",
    "O fim do corte deve ser maior que o início.":"The clip end must be after the start.",

    "Melhorar com IA (beta)":"Improve with AI (beta)",
    "Disponível ao entrar na conta. Se a IA falhar, o PostPilot usa o gerador local automaticamente.":"Available after signing in. If AI fails, PostPilot automatically uses the local generator.",
    "Conteúdo melhorado com IA no backend.":"Content enhanced with backend AI.",
    "Gerando conteúdo com IA…":"Generating content with AI…",
    "IA indisponível. Usando o gerador local.":"AI unavailable. Using the local generator.",
    "Pacote de conteúdo":"Content pack",
    "Os últimos projetos aparecem aqui. Entre na sua conta para sincronizar entre dispositivos.":"Your latest projects appear here. Sign in to sync across devices.",
    "Resumo de produção":"Production summary",
    "Publicar hoje":"Publish today",
    "pacotes planejados":"planned packs",
    "Atrasados":"Overdue",
    "precisam de atenção":"need attention",
    "Próximos 7 dias":"Next 7 days",
    "no calendário":"on the calendar",
    "para continuar":"to continue",
    "Filtros avançados":"Advanced filters",
    "Plataforma":"Platform",
    "Objetivo":"Goal",
    "Origem":"Source",
    "Mídia":"Media",
    "Gerador local":"Local generator",
    "Com mídia":"With media",
    "Sem mídia":"Without media",
    "De":"From",
    "Até":"To",
    "Limpar filtros":"Clear filters",
    "Buscar":"Search",
    "Tema ou público":"Topic or audience",
    "Status":"Status",
    "Todos":"All",
    "Rascunhos":"Drafts",
    "Prontos":"Ready",
    "Publicados":"Published",
    "Rascunho":"Draft",
    "Pronto":"Ready",
    "Publicado":"Published",
    "Abrir":"Open",
    "Excluir":"Delete",
    "Nenhum pacote encontrado neste filtro.":"No content pack found for this filter.",
    "POSTPILOT GRATUITO":"FREE POSTPILOT",
    "Produza mais sem assinatura.":"Create more without a subscription.",
    "O PostPilot será mantido por anúncios discretos, sempre fora do formulário e dos pacotes de conteúdo.":"PostPilot will be supported by discreet ads, always outside the form and content packs.",
    "Publicidade":"Advertisement",
    "O gerador atual cria rascunhos locais por regras, sem IA externa nem processamento de vídeo. Ao entrar, seus projetos são sincronizados no backend.":"The current generator creates rule-based local drafts without external AI or video processing. When signed in, projects sync to the backend.",
    "O PostPilot funciona com gerador local por regras. Ao entrar, você também pode sincronizar projetos, enviar mídia privada e usar recursos de IA quando os serviços estiverem configurados.":"PostPilot works with a local rule-based generator. When signed in, you can also sync projects, upload private media, and use AI features when services are configured.",
    "Copiar":"Copy",
    "Copiar pacote completo":"Copy full pack",
    "Exportar .txt":"Export .txt",
    "Exportar":"Export",
    "Formato de exportação":"Export format",
    "Baixar":"Download",
    "Projeto sincronizado na sua conta.":"Project synced to your account.",
    "Projeto salvo neste dispositivo.":"Project saved on this device.",
    "O gerador atual usa regras locais, sem IA externa.":"The current generator uses local rules without external AI.",
    "Pacote copiado.":"Pack copied.",
    "Pacote exportado em .txt.":"Pack exported as .txt.",
    "Não foi possível copiar neste navegador.":"Could not copy in this browser.",
    "Escolha pelo menos uma plataforma.":"Choose at least one platform.",
    "Pacote salvo na sua conta.":"Pack saved to your account.",
    "Não foi possível sincronizar. Tente novamente.":"Could not sync. Try again.",
    "Pacote salvo neste dispositivo.":"Pack saved on this device.",
    "Projeto marcado como":"Project marked as",
    "Não foi possível atualizar o status.":"Could not update status.",
    "Excluir este pacote da sua conta?":"Delete this pack from your account?",
    "Excluir este pacote deste dispositivo?":"Delete this pack from this device?",
    "Pacote removido da sua conta.":"Pack removed from your account.",
    "Pacote removido deste dispositivo.":"Pack removed from this device.",
    "Não foi possível excluir o pacote.":"Could not delete the pack.",
    "Entrando…":"Signing in…",
    "Conta conectada.":"Account connected.",
    "Criando conta…":"Creating account…",
    "Conta criada e conectada.":"Account created and connected.",
    "Conta criada. Confirme o e-mail e depois entre.":"Account created. Confirm your email and then sign in.",
    "Informe um e-mail e uma senha com pelo menos 8 caracteres.":"Enter an email and a password with at least 8 characters.",
    "Informe seu e-mail primeiro.":"Enter your email first.",
    "Se o e-mail estiver cadastrado, enviaremos um link de recuperação.":"If the email is registered, we will send a recovery link.",
    "Você saiu da conta.":"You signed out.",
    "Sincronização indisponível. O modo local continua funcionando.":"Sync is unavailable. Local mode keeps working.",
    "Não foi possível verificar a sessão. O modo local continua disponível.":"Could not verify the session. Local mode is still available.",
    "Importando pacotes deste dispositivo…":"Importing packs from this device…",
    "Importação concluída.":"Import completed.",
    "Não foi possível concluir a importação. Os dados locais foram preservados.":"Could not complete the import. Local data was preserved.",
    "E-mail ou senha incorretos.":"Incorrect email or password.",
    "Confirme seu e-mail antes de entrar.":"Confirm your email before signing in.",
    "Este e-mail já possui conta.":"This email already has an account.",
    "Use uma senha com pelo menos 8 caracteres.":"Use a password with at least 8 characters.",
    "Não foi possível concluir. Confira os dados e tente novamente.":"Could not complete the action. Check your data and try again.",
    "Total":"Total",
    "Agendados":"Scheduled",
    "Taxa publicada":"Published rate",
    "Sem data":"No date",
    "Planejado para":"Planned for",
    "Público":"Audience",
    "plataforma":"platform",
    "plataformas":"platforms",
    "OBJETIVO":"GOAL",
    "TEMA":"TOPIC",
    "TOM":"TONE",
    "PÚBLICO":"AUDIENCE",
    "PLATAFORMA":"PLATFORM",
    "Gancho de 2 segundos":"2-second hook",
    "Texto na tela":"On-screen text",
    "Legenda curta":"Short caption",
    "Hashtags":"Hashtags",
    "Título":"Title",
    "Abertura":"Opening",
    "Descrição":"Description",
    "Gancho para Reels":"Reels hook",
    "Legenda":"Caption",
    "Carrossel / apoio":"Carousel / support",
    "EDIÇÃO":"EDITING",
    "Editando pacote":"Editing pack",
    "Cancelar edição":"Cancel editing",
    "PLANEJAMENTO":"PLANNING",
    "Calendário editorial":"Editorial calendar",
    "Veja o que está planejado para cada dia e abra o pacote sem procurar no histórico.":"See what is planned for each day and open the pack without searching the history.",
    "Navegação do calendário":"Calendar navigation",
    "Semana anterior":"Previous week",
    "Esta semana":"This week",
    "Próxima semana":"Next week",
    "Exportar calendário":"Export calendar",
    "Adicione uma data planejada antes de exportar.":"Add a planned date before exporting.",
    "Calendário exportado em .ics.":"Calendar exported as .ics.",
    "Livre":"Free",
    "Editar":"Edit",
    "Usar como modelo":"Use as template",
    "Excluir pacote":"Delete pack",
    "Salvar alterações":"Save changes",
    "Usando pacote como modelo":"Using pack as template",
    "Modelo carregado. Ajuste e gere um novo pacote.":"Template loaded. Adjust it and create a new pack.",
    "Pacote aberto para edição.":"Pack opened for editing.",
    "Edição cancelada.":"Editing cancelled.",
    "Alterações salvas na sua conta.":"Changes saved to your account.",
    "Alterações salvas neste dispositivo.":"Changes saved on this device.",
    "Checklist de publicação":"Publishing checklist",
    "Texto revisado":"Copy reviewed",
    "Mídia pronta":"Media ready",
    "Publicado na plataforma":"Published on platform",
    "concluídos":"completed",
    "Checklist":"Checklist",
    "Checklist atualizado.":"Checklist updated.",
    "Checklist completo. Você pode marcar o pacote como publicado.":"Checklist complete. You can mark the pack as published.",
    "Não foi possível atualizar o checklist.":"Could not update the checklist.",
    "Instalar app":"Install app",
    "Backup local":"Local backup",
    "Proteja os pacotes salvos neste dispositivo.":"Protect the packs saved on this device.",
    "Exportar backup":"Export backup",
    "Restaurar backup":"Restore backup",
    "Histórico de versões":"Version history",
    "Restaurar versão":"Restore version",
    "Versão restaurada.":"Version restored.",
    "Carregando histórico…":"Loading history…",
    "Não foi possível carregar o histórico.":"Could not load history.",
    "Nenhuma versão anterior ainda.":"No previous versions yet.",
    "Não foi possível restaurar a versão.":"Could not restore the version.",

    "Backup exportado.":"Backup exported.",
    "Backup restaurado.":"Backup restored.",
    "Arquivo de backup inválido.":"Invalid backup file.",
    "O arquivo de backup é muito grande.":"The backup file is too large.",
    "Restaurar este backup substituirá os pacotes locais atuais. Continuar?":"Restoring this backup will replace the current local packs. Continue?",
    "MODELO RÁPIDO":"QUICK TEMPLATE",
    "Comece com um briefing pronto":"Start with a ready-made brief",
    "O modelo ajusta público, objetivo, tom e plataformas. Tema e transcrição continuam seus.":"The template adjusts audience, goal, tone, and platforms. Your topic and transcript stay untouched.",
    "Modelo de conteúdo":"Content template",
    "Escolher modelo":"Choose template",
    "Educacional":"Educational",
    "Negócio local":"Local business",
    "Autoridade":"Authority",
    "Comunidade":"Community",
    "Aplicar":"Apply",
    "Modelo aplicado ao briefing.":"Template applied to the brief.",
    "Ajude a melhorar o PostPilot.":"Help improve PostPilot.",
    "Leva menos de um minuto. Não envie informações pessoais nem conteúdo privado de clientes.":"It takes less than a minute. Do not send personal information or private client content.",
    "Dar feedback":"Give feedback",
    "aguardando envio":"waiting to send",
    "FEEDBACK BETA":"BETA FEEDBACK",
    "Como está o PostPilot?":"How is PostPilot?",
    "Sua opinião ajuda a decidir o que corrigir e desenvolver primeiro.":"Your feedback helps decide what to fix and build first.",
    "Nota geral":"Overall rating",
    "Sobre o quê?":"About what?",
    "Facilidade de uso":"Ease of use",
    "Qualidade dos pacotes":"Pack quality",
    "Algo não funcionou":"Something did not work",
    "Ideia ou recurso":"Idea or feature",
    "Outro":"Other",
    "Comentário":"Comment",
    "O que funcionou bem ou o que deveríamos melhorar?":"What worked well or what should we improve?",
    "Não envie dados pessoais nem conteúdo privado.":"Do not send personal data or private content.",
    "Enviar feedback":"Send feedback",
    "Agora não":"Not now",
    "Confira a nota e o comentário.":"Check the rating and comment.",
    "Enviando feedback…":"Sending feedback…",
    "Feedback enviado. Obrigado!":"Feedback sent. Thank you!",
    "Feedback salvo. Vamos enviar automaticamente quando o serviço estiver disponível.":"Feedback saved. We will send it automatically when the service is available."
  };

  const reverse = Object.fromEntries(Object.entries(translations).map(([pt,en]) => [en,pt]));
  let activeLocale = localStorage.getItem(storageKey) === 'en' ? 'en' : 'pt-BR';
  let applying = false;
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();

  function dynamicTranslate(value,target){
    if(target === 'en'){
      let m=value.match(/^(\d+) plataformas?$/);
      if(m) return `${m[1]} platform${m[1] === '1' ? '' : 's'}`;
      m=value.match(/^Planejado para (.+)$/);
      if(m) return `Planned for ${m[1]}`;
      m=value.match(/^Projeto marcado como (.+)\.$/);
      if(m) return `Project marked as ${m[1]}.`;
      return value;
    }
    let m=value.match(/^(\d+) platforms?$/);
    if(m) return `${m[1]} plataforma${m[1] === '1' ? '' : 's'}`;
    return value;
  }

  function translateValue(value,target=activeLocale){
    if(typeof value !== 'string') return value;
    const leading=value.match(/^\s*/)?.[0] || '';
    const trailing=value.match(/\s*$/)?.[0] || '';
    const core=value.trim();
    if(!core) return value;
    let translated=target === 'en' ? translations[core] : reverse[core];
    if(!translated) translated=dynamicTranslate(core,target);
    return translated === core ? value : leading + translated + trailing;
  }

  function translateElement(root){
    if(!root || applying) return;
    applying=true;
    try{
      if(root.nodeType === Node.TEXT_NODE){
        const parent=root.parentElement;
        if(!parent || ['SCRIPT','STYLE','NOSCRIPT'].includes(parent.tagName)) return;
        if(activeLocale === 'pt-BR' && originalText.has(root)){
          root.nodeValue=originalText.get(root);
        } else {
          const next=translateValue(root.nodeValue);
          if(next !== root.nodeValue){
            if(!originalText.has(root)) originalText.set(root,root.nodeValue);
            root.nodeValue=next;
          }
        }
        return;
      }
      const element=root === document ? document.documentElement : root;
      if(!element?.querySelectorAll && element !== document.documentElement) return;
      const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
      let node;
      while((node=walker.nextNode())){
        const parent=node.parentElement;
        if(!parent || ['SCRIPT','STYLE','NOSCRIPT'].includes(parent.tagName)) continue;
        if(activeLocale === 'pt-BR' && originalText.has(node)){
          node.nodeValue=originalText.get(node);
        } else {
          const next=translateValue(node.nodeValue);
          if(next !== node.nodeValue){
            if(!originalText.has(node)) originalText.set(node,node.nodeValue);
            node.nodeValue=next;
          }
        }
      }
      const attrs=[element,...(element.querySelectorAll?.('[placeholder],[aria-label],[title]') || [])];
      attrs.forEach(el=>{
        ['placeholder','aria-label','title'].forEach(attr=>{
          if(!el?.hasAttribute?.(attr)) return;
          const before=el.getAttribute(attr);
          let saved=originalAttributes.get(el);
          if(!saved){saved={}; originalAttributes.set(el,saved);}
          if(activeLocale === 'pt-BR' && saved[attr] != null){
            el.setAttribute(attr,saved[attr]);
          } else {
            const after=translateValue(before);
            if(after !== before){
              if(saved[attr] == null) saved[attr]=before;
              el.setAttribute(attr,after);
            }
          }
        });
      });
    } finally {
      applying=false;
    }
  }

  function updateMeta(){
    const english=activeLocale === 'en';
    document.documentElement.lang=english ? 'en' : 'pt-BR';
    document.title=english ? 'PostPilot — Content in motion' : 'PostPilot — Conteúdo em movimento';
    const description=document.querySelector('meta[name="description"]');
    if(description) description.content=english
      ? 'Turn long-form video transcripts into clips, captions, and social media posts.'
      : 'Transforme transcrições de vídeos longos em ideias de cortes, legendas e publicações para redes sociais.';
    const ogTitle=document.querySelector('meta[property="og:title"]');
    if(ogTitle) ogTitle.content=document.title;
    const ogDescription=document.querySelector('meta[property="og:description"]');
    if(ogDescription) ogDescription.content=description?.content || '';
    const ogLocale=document.querySelector('meta[property="og:locale"]');
    if(ogLocale) ogLocale.content=english ? 'en_US' : 'pt_BR';
  }

  function updateControls(){
    document.querySelectorAll('[data-language]').forEach(button=>{
      const selected=button.dataset.language === activeLocale;
      button.classList.toggle('active',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
  }

  function setLocale(locale){
    activeLocale=locale === 'en' ? 'en' : 'pt-BR';
    localStorage.setItem(storageKey,activeLocale);
    updateMeta();
    translateElement(document.body);
    updateControls();
    window.dispatchEvent(new CustomEvent('app-language-change',{detail:{locale:activeLocale}}));
  }

  function locale(){return activeLocale;}
  function t(value){return translateValue(value,activeLocale);}

  function init(){
    document.querySelectorAll('[data-language]').forEach(button=>{
      button.addEventListener('click',()=>setLocale(button.dataset.language));
    });
    setLocale(activeLocale);
    const observer=new MutationObserver(mutations=>{
      if(applying) return;
      mutations.forEach(mutation=>{
        if(mutation.type === 'characterData') translateElement(mutation.target);
        mutation.addedNodes.forEach(node=>translateElement(node));
      });
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  }

  window.AppI18n=Object.freeze({setLocale,locale,t,apply:translateElement});
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
