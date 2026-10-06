/* O Google às vezes prende uma chamada ~2 min e devolve erro 500 (DEADLINE_EXCEEDED ao carregar o
 * projeto) — medido 10–17% das chamadas em 29/09/2026; as outras respondem em 1–4 s.
 * Em vez de esperar, se a chamada não responder em poucos segundos, dispara OUTRA em paralelo
 * (até 3 no total) e fica com a primeira que responder. A presa é abandonada.
 * Leituras: paralelo depois de 6 s. Gravações: só depois que o servidor passou a entender o rid
 * (PU_CFG.SERVIDOR_RID = true, Apps Script v23) — o rid faz a 2ª chamada devolver o resultado da 1ª
 * em vez de gravar de novo. Sem isso, gravação espera 45 s antes de repetir. */
var CHAMADA_LEITURA = { vdf_abrir: 1, vdf_iniciar: 1, vdf_buscarPlaca: 1, vdf_carregarCard: 1, vdf_lerDocumento: 1, vdf_lerAnexoCard: 1, vdf_lerFornecimento: 1, vdf_lerFornecimentoAnexo: 1 };
var CHAMADA_LONGA = { vdf_lerDocumento: 1, vdf_lerAnexoCard: 1, vdf_subirArquivo: 1, vdf_lerFornecimento: 1, vdf_lerFornecimentoAnexo: 1, vdf_padronizarAnexos: 1 };
function novoRid() { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10); }
function avisoLento(txt) {
  var d = $('avisoLento');
  if (!d) {
    if (!txt) return;
    d = document.createElement('div'); d.id = 'avisoLento';
    d.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:9999;max-width:92vw;padding:10px 16px;border-radius:8px;background:#333;color:#fff;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.3)';
    document.body.appendChild(d);
  }
  d.textContent = txt || ''; d.style.display = txt ? 'block' : 'none';
}
function chamar(fn) {
  var args = Array.prototype.slice.call(arguments, 1);
  var leitura = !!CHAMADA_LEITURA[fn], longa = !!CHAMADA_LONGA[fn];
  var ridOk = !!(window.PU_CFG && PU_CFG.SERVIDOR_RID);
  var paralelo = leitura || ridOk;
  /* espera antes de disparar a próxima tentativa */
  var espera = paralelo ? (longa ? 25000 : (leitura ? 6000 : 15000)) : (longa ? 75000 : 45000);
  /* 05/10/2026: gravação de card com peça nova levou 23 s no servidor DEPOIS de o Google segurar o pedido
   * ~2 min — o formulário desistiu em 90 s ("não confirmou") e o card atualizou em seguida. Gravação agora
   * espera até 4 min, avisando o tempo; repetir é seguro (rid: o servidor não grava duas vezes). */
  var limiteTotal = longa ? 150000 : (leitura ? 90000 : 240000), maxTent = 3, t0 = Date.now();
  var corpo = { fn: fn, args: args };
  if (!leitura) corpo.rid = novoRid();
  corpo = JSON.stringify(corpo);

  return new Promise(function (resolver, rejeitar) {
    var fim = false, disparadas = 0, falhas = 0, ctls = [], relogios = [], ultimoErro = null;
    function encerrar() {
      fim = true; avisoLento('');
      relogios.forEach(clearTimeout);
      ctls.forEach(function (c) { try { c && c.abort(); } catch (e) {} });
    }
    function erroFinal(msg) {
      if (fim) return; encerrar();
      if (/^(Error: )?LOGIN:/.test(msg)) { guardar('vd_token', null); TOKEN = ''; if (PU) avisarPai({ vd: 'login' }); telaLogin(); }
      rejeitar(new Error(msg.replace(/^(Error: )?(LOGIN: )?/, '')));
    }
    function falhaDeRede(e) {
      falhas++; ultimoErro = e;
      if (fim) return;
      if (disparadas < maxTent) { if (paralelo || falhas >= disparadas) disparar(); return; }
      if (falhas >= disparadas) {
        erroFinal(leitura ? 'Sem conexão com o servidor. Tente de novo.'
          : 'O servidor não confirmou a gravação. Confira o card antes de repetir — repetir é seguro, o sistema não grava duas vezes.');
      }
    }
    function disparar() {
      if (fim || disparadas >= maxTent) return;
      disparadas++;
      if (disparadas > 1) avisoLento('O servidor do Google demorou a responder. Tentando de novo (' + disparadas + '/' + maxTent + ')…');
      var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      ctls.push(ctl);
      var eu = disparadas;
      fetch(PU_CFG.URL_APP, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: corpo, signal: ctl ? ctl.signal : undefined })
        .then(function (r) {
          if (r.status >= 500) throw new Error('500');
          return r.text();
        })
        .then(function (t) {
          if (fim) return;
          var j; try { j = JSON.parse(t); } catch (e) { throw new Error('resposta inválida'); }
          if (j.ok) { encerrar(); resolver(j.r); return; }
          erroFinal(j.erro || 'Erro no servidor');
        })
        .catch(function (e) { if (!fim) falhaDeRede(e); });
      /* sem resposta a tempo: paralelo dispara outra e deixa esta correr; sequencial aborta e repete */
      relogios.push(setTimeout(function () {
        if (fim) return;
        if (paralelo) disparar();
        else { try { ctl && ctl.abort(); } catch (e) {} }
      }, espera));
    }
    relogios.push(setTimeout(function () {
      erroFinal(leitura ? 'Sem conexão com o servidor. Tente de novo.'
        : 'O servidor do Google não respondeu em 4 minutos. O pedido PODE ter sido gravado: abra o card e confira. Se não estiver lá, repita — é seguro, o sistema não grava duas vezes.');
    }, limiteTotal));
    if (!leitura) {
      /* gravação demorando: mostra o tempo para a pessoa não achar que travou */
      var relAviso = setInterval(function () {
        if (fim) { clearInterval(relAviso); return; }
        var seg = Math.round((Date.now() - t0) / 1000);
        if (seg >= 40) avisoLento('O servidor do Google está demorando (' + Math.floor(seg / 60) + ' min ' + (seg % 60) + ' s). Aguardando até 4 min — não feche; o pedido não é gravado duas vezes.');
      }, 5000);
      relogios.push(relAviso);
    }
    disparar();
  });
}
function lerLocal() {
  var p = {};
  location.search.replace(/^\?/, '').split('&').forEach(function (kv) {
    if (!kv) return; var i = kv.indexOf('=');
    var k = decodeURIComponent(i < 0 ? kv : kv.slice(0, i)), v = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' '));
    p[k] = v;
  });
  return { parameter: p, hash: location.hash.replace(/^#/, '') };
}

