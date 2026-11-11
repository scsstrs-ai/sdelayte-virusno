/* Квестовый движок «Сделайте вирусно»: стороны, грейды, задания от сотрудников, диалоги, нервы, концовки */
(function () {
  'use strict';
  var K = window.Kit;
  var KV = window.KV = { quests: {}, sides: {} };
  var GRADES = ['Стажёр', 'Джуниор', 'Мидл', 'Сеньор', 'Лид'];
  // нервы на старте, как часто пишет начальство (с), уровень подсказок, сколько нервов съедает сообщение
  var CFG = [null, { nerves: 90, ping: 40, hint: 2, cost: 4 }, { nerves: 80, ping: 30, hint: 1, cost: 5 }, { nerves: 75, ping: 25, hint: 0, cost: 5 }, { nerves: 65, ping: 20, hint: 0, cost: 6 }, { nerves: 60, ping: 15, hint: 0, cost: 6 }];
  var BURNOUT = { stamp: 'Больничный', title: 'Нервы кончились', text: 'Телефон выключен, ноутбук закрыт. Задание подождёт, а вы отдохнёте. Квест можно переиграть с тем же грейдом.' };
  KV.GRADES = GRADES; KV.CFG = CFG;
  KV.quest = function (q) { KV.quests[q.id] = q; };
  KV.side = function (id, o) { o.id = id; KV.sides[id] = o; };

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function initials(n) { return String(n).split(/\s+/).map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase(); }
  function mmss(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

  KV.boot = function () {
    var qs = new URLSearchParams(location.search), side = KV.sides[qs.get('side') || 'client'];
    if (!side || !window.KVOffice[side.office]) { location.href = '../'; return; }
    var qid = qs.get('q'), Q = qid && KV.quests[qid] && KV.quests[qid].side === side.id ? KV.quests[qid] : null;
    var prog = K.get('kv:prog:' + side.id, { done: {}, grade: 1 });
    var stage = document.getElementById('stage'), cv = document.getElementById('cv'), actBtn = document.getElementById('act');

    var W = new Iso.World({
      canvas: cv, stage: stage, cols: side.cols, rows: side.rows, ext: 0, top: 110, start: [1, 1],
      minZoom: (window.innerWidth > 700 ? 0.74 : 0.66), maxZoom: 1.1, font: K.FONT,
      blocked: function () { return dlgOpen || K.cardOpen() || K.bossOn(); },
      onNear: function (s) {
        if (!s || dlgOpen) { actBtn.hidden = true; return; }
        actBtn.hidden = false;
        actBtn.innerHTML = '<kbd>E</kbd>' + (s.look ? 'Поговорить: ' + esc(s.name) : esc(s.label || s.game || ''));
      },
      onTalk: onTalk, onSpot: onSpot
    });
    var office = window.KVOffice[side.office](W, window.KVF(W));
    W.o.bg = office.bg || '#3C3430';
    W.player.look = office.look; W.player.x = office.start[0]; W.player.y = office.start[1];
    (office.lights || []).forEach(function (L) { W.lights.push(L); });
    W.spots = Object.keys(office.spots).map(function (k) { return office.spots[k]; });
    Object.keys(office.npcs).forEach(function (k) { office.npcs[k].talkable = true; });

    // ——— состояние прохождения ———
    var runKey = Q ? 'kv:run:' + side.id + ':' + Q.id : null, run = null;
    function freshRun() {
      var c = CFG[Q.grade], m = {};
      if (Q.meters) Object.keys(Q.meters).forEach(function (k) { m[k] = Q.meters[k].v; });
      return { f: { keep: Object.assign({}, prog.keep || {}) }, nerves: Q.nerves || c.nerves, meters: m, items: [], started: false, over: false, pt: 0, left: Q.timer ? Q.timer.sec : 0, cool: -99 };
    }
    function save() { if (run && !run.over) K.set(runKey, run); }

    // ——— интерфейс ———
    var log = el('div', 'kv-log'); log.hidden = true; stage.appendChild(log);
    log.addEventListener('click', function () { log.classList.toggle('min'); });
    var dlg = el('div', 'kv-dlg'); dlg.hidden = true; stage.appendChild(dlg);
    var dlgOpen = false, curPick = null, curCount = 0, quiz = null;

    function who(id) {
      if (id === 'me') return { name: side.hero, role: Q ? 'вы, ' + GRADES[Q.grade - 1].toLowerCase() : 'вы', color: '#E62020' };
      if (id === 'phone') return { name: 'Телефон', role: 'сообщение', color: '#1C1313' };
      var n = office.npcs[id];
      if (n) return { name: n.name, role: n.role, color: n.look.shirt === '#FFFFFF' ? '#5B6B80' : n.look.shirt };
      var p = Q && Q.people && Q.people[id];
      return p || { name: id, role: '', color: '#5B6B80' };
    }
    function render(w, text, choices, onPick) {
      dlg.innerHTML = '<div class="kv-ava" style="background:' + w.color + '">' + esc(initials(w.name)) + '</div>' +
        '<div class="kv-who"><b>' + esc(w.name) + '</b><span>' + esc(w.role || '') + '</span></div>' +
        '<div class="kv-text">' + esc(text) + '</div><div class="kv-ch"></div>';
      var box = dlg.querySelector('.kv-ch');
      choices.forEach(function (c, i) {
        var b = el('button', null, '<i>' + (i + 1) + '</i><span>' + esc(c.t) + (c.note ? '<small>' + esc(c.note) + '</small>' : '') + '</span>');
        b.type = 'button'; b.addEventListener('click', function () { onPick(i); }); box.appendChild(b);
      });
      dlg.hidden = false; dlgOpen = true; curPick = onPick; curCount = choices.length;
      W.keys = {}; actBtn.hidden = true; W.player.path = null;
      dlg.scrollTop = 0;
    }
    function close() { dlg.hidden = true; dlgOpen = false; curPick = null; quiz = null; update(); if (W.near && W.o.onNear) W.o.onNear(W.near); }
    function say(id, text) { render(who(id), text, [{ t: 'Понятно' }], close); }

    function showNode(id) {
      var n = Q.nodes[id];
      if (!n) { close(); return; }
      if (n.type === 'quiz') { startQuiz(n); return; }
      var text = typeof n.text === 'function' ? n.text(run.f, api) : n.text;
      var all = n.choices || [], list = [];
      all.forEach(function (c, i) { if ((!c.if || c.if(run.f, api)) && !(c.once && run.f['_' + id + i])) list.push({ c: c, i: i }); });
      if (!list.length) list = [{ c: { t: 'Дальше', go: n.next }, i: -1 }];
      render(who(n.who), text, list.map(function (x) { return x.c; }), function (k) { pick(list[k].c, id, list[k].i); });
    }
    function pick(c, nodeId, idx) {
      if (c.once) run.f['_' + nodeId + idx] = 1;
      if (c.set) Object.keys(c.set).forEach(function (k) { run.f[k] = c.set[k]; });
      if (c.item) item(c.item);
      if (c.m) Object.keys(c.m).forEach(function (k) { meter(k, c.m[k]); });
      if (c.toast) K.toast(c.toast, 3200);
      if (c.time && Q.timer) { run.left = Math.max(0, run.left + c.time); K.toast(c.time < 0 ? 'Минус ' + mmss(-c.time) + ' до срока' : 'Плюс ' + mmss(c.time) + ' к сроку'); hud(); }
      if (c.keep) keep(c.keep);
      if (c.fn) c.fn(run.f, api);
      if (c.n) nerves(c.n);
      save();
      if (run.over) return;
      if (c.end) { finish(c.end); return; }
      if (c.go) showNode(c.go); else close();
    }
    function startQuiz(n) { quiz = { n: n, i: 0, score: 0 }; quizStep(); }
    function quizStep() {
      var n = quiz.n, w = who(n.who);
      if (quiz.i >= n.items.length) {
        var ok = quiz.score >= (n.pass || n.items.length), res = (ok ? n.win : n.lose) || {};
        var sc = quiz.score, txt = ((ok ? n.winText : n.loseText) || 'Итог: {score} из {total}.').replace('{score}', sc).replace('{total}', n.items.length);
        quiz = null;
        render(w, txt, [{ t: 'Дальше' }], function () { pick(res, 'quiz', 0); });
        return;
      }
      var it = n.items[quiz.i];
      render(w, (n.title ? n.title + ' · ' + (quiz.i + 1) + ' из ' + n.items.length + '\n\n' : '') + it.q, it.a.map(function (t) { return { t: t }; }), function (k) {
        var right = k === it.ok; if (right) quiz.score++; else if (n.miss) nerves(n.miss);
        if (run.over) return;
        render(w, (right ? 'Верно. ' : 'Мимо. ') + (it.why || ''), [{ t: 'Дальше' }], function () { quiz.i++; quizStep(); });
      });
    }

    // ——— шкалы ———
    function nerves(d) {
      if (!run) return;
      run.nerves = Math.max(0, Math.min(100, run.nerves + d));
      var b = document.getElementById('kst-nerves');
      if (b && d) { b.classList.remove('kv-up', 'kv-down'); void b.offsetWidth; b.classList.add(d > 0 ? 'kv-up' : 'kv-down'); }
      hud();
      if (run.nerves <= 0 && !run.over) finish('burnout');
    }
    function meter(k, d) {
      if (!run || run.meters[k] == null) return;
      run.meters[k] = Math.max(0, Math.min(100, run.meters[k] + d)); hud();
      if (run.meters[k] <= 0 && Q.meters[k].end && !run.over) finish(Q.meters[k].end);
    }
    function item(s) {
      var add = s.charAt(0) !== '-', name = s.replace(/^[+-]/, '');
      var i = run.items.indexOf(name);
      if (add && i < 0) { run.items.push(name); K.toast('В руках: ' + name); }
      if (!add && i >= 0) run.items.splice(i, 1);
      renderLog();
    }
    function keep(o) { prog.keep = prog.keep || {}; Object.keys(o).forEach(function (k) { prog.keep[k] = o[k]; run.f.keep[k] = o[k]; }); K.set('kv:prog:' + side.id, prog); }
    var api = {
      set: function (k, v) { run.f[k] = v; save(); update(); }, n: nerves, m: meter, item: item,
      meter: function (k) { return run.meters[k]; }, nerves: function () { return run.nerves; },
      keep: function (k, v) { var o = {}; o[k] = v; keep(o); }, time: function (d) { if (Q.timer) { run.left = Math.max(0, run.left + d); hud(); } },
      has: function (s) { return run.items.indexOf(s) >= 0; }, toast: function (s) { K.toast(s, 3200); },
      end: function (id) { finish(id); }, show: function (id) { showNode(id); }, grade: function () { return Q.grade; }
    };

    function bar(v) { return '<span class="kv-bar' + (v < 30 ? ' low' : '') + '"><i style="width:' + Math.round(v) + '%"></i></span>' + Math.round(v); }
    function hud() {
      if (!Q || !run) return;
      var nb = document.getElementById('kst-nerves'); if (nb) nb.innerHTML = bar(run.nerves);
      K.stat('grade', GRADES[Q.grade - 1]);
      K.stat('day', run.f.day || Q.day || Q.when);
      Object.keys(run.meters).forEach(function (k) { var e = document.getElementById('kst-m_' + k); if (e) e.innerHTML = bar(run.meters[k]); });
      if (Q.timer) K.stat('timer', mmss(run.left));
    }
    function stepDone(s) { return typeof s.done === 'function' ? !!s.done(run.f, api) : !!run.f[s.done]; }
    function renderLog() {
      if (!Q || !run || run.over) { log.hidden = true; return; }
      log.hidden = false;
      var html = '<div class="kv-when">' + esc(GRADES[Q.grade - 1]) + ' · задание от: ' + esc(who(Q.giver).name) + '</div><h4>' + esc(Q.title) + '</h4>';
      if (!run.started) html += '<p class="kv-sub">Задание выдаёт ' + esc(who(Q.giver).name) + ', над головой знак «!». Нажмите на него.</p>';
      else {
        var open = -1;
        html += '<ul>' + (Q.steps || []).map(function (s, i) { var d = stepDone(s); if (!d && open < 0) open = i; return '<li class="' + (d ? 'done' : i === open ? 'cur' : '') + '">' + esc(s.t) + '</li>'; }).join('') + '</ul>';
        if (CFG[Q.grade].hint >= 2 && Q.tip) { var tp = Q.tip(run.f, api); if (tp) html += '<p class="kv-tip">' + esc(tp) + '</p>'; }
      }
      if (run.items.length) html += '<div class="kv-items">' + run.items.map(function (s) { return '<span>' + esc(s) + '</span>'; }).join('') + '</div>';
      log.innerHTML = html;
    }
    function update() {
      var f = run ? run.f : {}, list = [];
      Object.keys(office.npcs).forEach(function (id) {
        var n = office.npcs[id], vis = !n.hidden;
        if (Q && Q.show && Q.show[id]) vis = !!Q.show[id](f);
        n.mark = null; if (vis) list.push(n);
      });
      W.npcs = list;
      Object.keys(office.spots).forEach(function (id) { office.spots[id].mark = null; });
      if (Q && run && !run.over) {
        if (!run.started) { if (office.npcs[Q.giver]) office.npcs[Q.giver].mark = '!'; }
        else if (CFG[Q.grade].hint >= 1 && Q.hint) (Q.hint(f, api) || []).forEach(function (id) { if (office.npcs[id]) office.npcs[id].mark = '?'; else if (office.spots[id]) office.spots[id].mark = '?'; });
      }
      hud(); renderLog();
    }

    // ——— разговоры и предметы ———
    function ambient(n) {
      if (!n.lines || !n.lines.length) return;
      n.li = ((n.li == null ? -1 : n.li) + 1) % n.lines.length;
      render(who(n.id), n.lines[n.li], [{ t: 'Понятно' }], close);
    }
    function onTalk(n) {
      if (dlgOpen || K.cardOpen()) return;
      if (!Q || !run || run.over) { ambient(n); return; }
      if (!run.started) {
        if (n.id === Q.giver) { run.started = true; save(); update(); showNode(Q.start); return; }
        ambient(n); return;
      }
      var r = Q.talk && Q.talk[n.id] ? Q.talk[n.id](run.f, api) : null;
      if (r) showNode(r); else ambient(n);
    }
    function onSpot(s) {
      if (dlgOpen || K.cardOpen()) return;
      if (Q && run && run.started && !run.over && Q.use && Q.use[s.id]) { var r = Q.use[s.id](run.f, api); if (r) { showNode(r); return; } }
      if (s.id === 'exit') {
        K.card({ stamp: 'Выход', title: 'Выйти во двор?', text: 'Задание никуда не денется: прогресс сохранится в этом браузере.',
          btns: [['Во двор', function () { location.href = '../dvor/'; }], ['Остаться']] });
        return;
      }
      if (s.id === 'cooler' || s.id === 'coffee') {
        if (run && W.t - run.cool < 60) { say('me', 'Вы пили меньше минуты назад. Кулер смотрит с осуждением.'); return; }
        if (run) { run.cool = W.t; nerves(10); }
        say('me', s.id === 'coffee' ? 'Кофе. Горячий, крепкий, ваш. Нервы +10.' : 'Бульк. Стакан холодной воды. Нервы +10.'); return;
      }
      if (s.id === 'fridge') {
        if (run && !run.f._syrok) { run.f._syrok = 1; nerves(5); save(); say('me', 'Сырок для сотрудников. Ровно один, как написано. Нервы +5.'); }
        else say('me', 'На холодильнике написано: «По одному!». Вы своё взяли.');
        return;
      }
      if (s.id === 'pc') {
        render(who('me'), office.defaults.pc, [{ t: 'Открыть «Контент-план» в новой вкладке' }, { t: 'Закрыть' }], function (i) { if (i === 0) window.open('../kontent-plan/', '_blank'); close(); });
        return;
      }
      var d = office.defaults[s.id];
      if (Array.isArray(d)) { s.li = ((s.li == null ? -1 : s.li) + 1) % d.length; d = d[s.li]; }
      say('me', d || s.label || '');
    }

    // ——— сообщения начальства и таймер ———
    setInterval(function () {
      if (!Q || !run || !run.started || run.over || K.cardOpen() || K.bossOn() || document.hidden) return;
      if (Q.timer && (Q.timer.live || !dlgOpen)) { run.left -= 1; hud(); if (run.left <= 0) { finish(Q.timer.end); return; } }
      if (dlgOpen) return;
      var c = CFG[Q.grade];
      run.pt += 1;
      if (run.pt >= (Q.ping || c.ping)) {
        run.pt = 0;
        var msgs = Q.pings || ['Ну что там?'];
        run.pi = ((run.pi || 0) + 1) % msgs.length;
        K.toast('📱 ' + who(Q.pingFrom || Q.giver).name + ': ' + msgs[run.pi], 3400);
        nerves(-(Q.pingCost || c.cost));
      }
      save();
    }, 1000);

    // ——— концовка ———
    function finish(endId) {
      if (run.over) return;
      run.over = true; dlg.hidden = true; dlgOpen = false;
      var e = endId === 'burnout' ? ((Q.endings && Q.endings.burnout) || BURNOUT) : Q.endings[endId];
      var promoted = false;
      if (endId !== 'burnout') {
        prog.done[Q.id] = { e: endId, stamp: e.stamp };
        if (prog.grade < Q.grade + 1) { prog.grade = Math.min(5, Q.grade + 1); promoted = Q.grade < 5; }
        K.set('kv:prog:' + side.id, prog);
        K.set('label:kvest-' + side.id, GRADES[Math.min(5, prog.grade) - 1]);
      }
      K.del(runKey);
      var text = typeof e.text === 'function' ? e.text(run.f) : e.text;
      if (endId !== 'burnout' && Q.grade < 5) text += '<br><br><b>Повышение.</b> Теперь вы ' + GRADES[Q.grade].toLowerCase() + '.';
      if (endId !== 'burnout' && Q.grade === 5) text += '<br><br><b>Вы прошли путь от стажёра до лида.</b>';
      var idx = side.quests.indexOf(Q.id), next = side.quests[idx + 1], btns = [];
      if (endId === 'burnout') btns.push(['Переиграть', function () { K.del(runKey); location.reload(); }]);
      else if (next && KV.quests[next]) btns.push(['Следующий квест', function () { location.href = '?side=' + side.id + '&q=' + next; }]);
      btns.push(['К списку квестов', function () { location.href = '?side=' + side.id; }]);
      if (endId !== 'burnout') btns.push(['Сыграть ещё раз', function () { location.reload(); }]);
      K.card({ stamp: e.stamp, title: e.title, text: text, nums: [['Нервы', Math.round(run.nerves)], ['Грейд', GRADES[Math.max(Q.grade, Math.min(5, prog.grade)) - 1]]], btns: btns });
      update();
    }

    // ——— меню стороны ———
    function menu() {
      var ov = el('div', 'kit-over kv-menu'), html = '<div class="kit-card kv-menu-card"><div class="kit-stamp">' + esc(side.name) + '</div><h2>' + esc(side.title) + '</h2><p>' + esc(side.about) + '</p><ol class="kv-qs">';
      side.quests.forEach(function (id, i) {
        var q = KV.quests[id], done = prog.done[id];
        html += '<li class="' + (done ? 'done' : q ? 'open' : 'lock') + '"><span class="kv-g">' + GRADES[i] + '</span><div><b>' + (q ? esc(q.title) : 'Квест ещё пишут') + '</b><small>' +
          (q ? esc(q.when) + ' · выдаёт ' + esc(who(q.giver).name) : 'Скоро') + (done ? ' · концовка «' + esc(done.stamp) + '»' : '') + '</small></div>' +
          (q ? '<a class="kit-btn" href="?side=' + side.id + '&q=' + id + '">' + (done ? 'Ещё раз' : 'Играть') + '</a>' : '') + '</li>';
      });
      html += '</ol><p class="kv-note">Квесты идут по грейдам, от стажёра до лида. Начать можно с любого.</p><div class="kit-card-btns"><a class="kit-btn ghost" href="../">Сменить сторону</a><a class="kit-btn ghost" href="../dvor/">Во двор</a></div></div>';
      ov.innerHTML = html; stage.appendChild(ov);
    }

    // ——— запуск ———
    var stats = [['nerves', 'Нервы'], ['grade', 'Грейд'], ['day', 'Когда']];
    if (Q && Q.meters) Object.keys(Q.meters).forEach(function (k) { stats.push(['m_' + k, Q.meters[k].label]); });
    if (Q && Q.timer) stats.push(['timer', Q.timer.label || 'Осталось']);
    K.mount({ room: side.name + ' · ' + side.hero, game: Q ? Q.title : 'Квесты', back: { href: '../dvor/', label: 'Во двор' }, stats: Q ? stats : [] });
    K.action('Квесты', function () { location.href = '?side=' + side.id; });
    actBtn.addEventListener('click', function () { if (W.near) W.arrive(W.near); });
    window.addEventListener('keydown', function (e) {
      if (!dlgOpen || K.bossOn() || K.cardOpen()) return;
      var d = parseInt(e.key, 10);
      if (d >= 1 && d <= curCount) { e.preventDefault(); curPick(d - 1); }
      else if ((e.key === 'Enter' || e.key === ' ') && curCount === 1) { e.preventDefault(); curPick(0); }
    });
    K.onPause = function () { W.keys = {}; };
    W.resize();
    if (window.ResizeObserver) new ResizeObserver(function () { W.resize(); }).observe(stage);
    W.bind(); W.start();

    if (!Q) { update(); menu(); return; }
    var saved = K.get(runKey, null);
    function begin(r) { run = r; update(); }
    var intro = esc(Q.intro) + '<br><br>Задание выдаёт <b>' + esc(who(Q.giver).name) + '</b>, ' + esc(who(Q.giver).role) + '. Ищите знак «!».';
    if (saved && saved.f && !saved.over) {
      run = saved; update();
      K.card({ stamp: GRADES[Q.grade - 1] + ' · ' + Q.when, title: Q.title, text: intro, btns: [['Продолжить', function () {}], ['Начать заново', function () { K.del(runKey); begin(freshRun()); }]] });
    } else {
      begin(freshRun());
      K.card({ stamp: GRADES[Q.grade - 1] + ' · ' + Q.when, title: Q.title, text: intro, btns: [['Начать', function () {}]] });
    }
    window.__kv = { get run() { return run; }, W: W, office: office, Q: Q, talk: onTalk, use: function (id) { onSpot(office.spots[id]); },
      choose: function (i) { if (curPick) curPick(i); }, get dlg() { return dlgOpen ? dlg.querySelector('.kv-text').textContent : null; },
      get choices() { return dlgOpen ? Array.prototype.map.call(dlg.querySelectorAll('.kv-ch button span'), function (b) { return b.firstChild.textContent; }) : []; } };
  };
})();
