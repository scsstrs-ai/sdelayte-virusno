/* Общий набор для комнат второго этажа: шапка, рекорды, всплывашки, карточки, пауза, «Шеф рядом» */
(function () {
  'use strict';
  var PFX = 'sv:';
  var K = {};

  K.get = function (k, d) { try { var v = localStorage.getItem(PFX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  K.set = function (k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) {} };
  K.del = function (k) { try { localStorage.removeItem(PFX + k); } catch (e) {} };
  K.best = function (k) { return K.get('best:' + k, null); };
  // lowerIsBetter для времени; label попадает на дверь комнаты на этаже
  K.record = function (k, v, label, lowerIsBetter) {
    var b = K.best(k);
    var isNew = b == null || (lowerIsBetter ? v < b : v > b);
    if (isNew) { K.set('best:' + k, v); if (label) K.set('label:' + k, label); }
    return { best: isNew ? v : b, isNew: isNew };
  };
  K.fmt = function (n) { return Math.round(n).toLocaleString('ru-RU'); };
  K.tok = function (name) { return getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim(); };
  K.rand = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  K.shuffle = function (a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  K.reduced = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  K.FONT = "Onest, 'Segoe UI', system-ui, sans-serif";
  K.onTheme = function (fn) { try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fn); } catch (e) {} };

  // шапка комнаты
  K.mount = function (o) {
    var top = document.getElementById('kitTop');
    var back = o.back || { href: '../etazh/', label: 'Этаж' };
    top.innerHTML =
      '<a class="kit-logo" href="' + back.href + '">сделайте вирусно</a>' +
      '<div class="kit-room"><span>' + o.room + '</span><b>' + o.game + '</b></div>' +
      '<div class="kit-actions"><button class="kit-btn ghost" type="button" id="kitBossBtn" title="Клавиша Esc">Шеф рядом</button>' +
      '<a class="kit-btn" href="' + back.href + '">' + back.label + '</a></div>';
    document.getElementById('kitBossBtn').addEventListener('click', function () { K.boss(true); });
    if (o.stats) K.stats(o.stats);
  };
  K.stats = function (defs) {
    var box = document.getElementById('kitStats');
    if (!box) return;
    box.innerHTML = defs.map(function (d) {
      return '<div class="kit-stat"><span>' + d[1] + '</span><b id="kst-' + d[0] + '">' + (d[2] == null ? '—' : d[2]) + '</b></div>';
    }).join('');
  };
  K.stat = function (k, v) { var el = document.getElementById('kst-' + k); if (el) el.textContent = v; };
  K.action = function (label, fn) {
    var box = document.getElementById('kitStats');
    var b = document.createElement('button'); b.type = 'button'; b.className = 'kit-btn ghost'; b.textContent = label;
    b.addEventListener('click', fn); box.appendChild(b); return b;
  };

  // всплывашки сверху
  K.toast = function (text, ms) {
    var box = document.querySelector('.kit-toasts');
    if (!box) { box = document.createElement('div'); box.className = 'kit-toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    var t = document.createElement('div'); t.className = 'kit-toast'; t.textContent = text; box.appendChild(t);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300); }, ms || 2400);
  };

  // карточка поверх сцены: {stamp, title, text, nums:[[подпись, значение]], btns:[[текст, fn]]}
  K.card = function (o) {
    K.closeCard();
    var stage = document.querySelector('.kit-stage');
    var ov = document.createElement('div'); ov.className = 'kit-over'; ov.id = 'kitOver';
    var h = '<div class="kit-card" role="dialog" aria-modal="true">';
    if (o.stamp) h += '<div class="kit-stamp">' + o.stamp + '</div>';
    if (o.title) h += '<h2>' + o.title + '</h2>';
    if (o.text) h += '<p>' + o.text + '</p>';
    if (o.nums) h += '<div class="kit-nums">' + o.nums.map(function (n) { return '<div class="kit-num"><span>' + n[0] + '</span><b>' + n[1] + '</b></div>'; }).join('') + '</div>';
    h += '<div class="kit-card-btns">';
    (o.btns || []).forEach(function (b, i) { h += '<button type="button" class="kit-btn' + (i ? ' ghost' : '') + '" data-i="' + i + '">' + b[0] + '</button>'; });
    h += '</div></div>';
    ov.innerHTML = h; stage.appendChild(ov);
    Array.prototype.forEach.call(ov.querySelectorAll('[data-i]'), function (el) {
      el.addEventListener('click', function () { var b = o.btns[+el.getAttribute('data-i')]; K.closeCard(); if (b[1]) b[1](); });
    });
    var first = ov.querySelector('.kit-btn'); if (first) setTimeout(function () { first.focus(); }, 30);
  };
  K.closeCard = function () { var ov = document.getElementById('kitOver'); if (ov) ov.parentNode.removeChild(ov); };
  K.cardOpen = function () { return !!document.getElementById('kitOver'); };

  // пауза: игра ставит K.onPause = function (причина) {...}
  K.onPause = null;
  function pause(why) { if (typeof K.onPause === 'function') K.onPause(why); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause('hidden'); });
  window.addEventListener('blur', function () { pause('blur'); });

  // «Шеф рядом»: скучная таблица поверх всего
  var bossEl = null, oldTitle = '';
  function buildBoss() {
    var cols = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    var rows = [
      ['Показатель', 'Q1', 'Q2', 'Q3', 'Q4', 'План', '% плана', 'Отв.', ''],
      ['Охват, тыс.', '1 284', '1 412', '1 377', '1 520', '1 600', '95%', 'SMM', ''],
      ['Переходы на сайт', '18 420', '19 930', '17 860', '21 310', '22 000', '97%', 'SMM', ''],
      ['Заявки', '412', '448', '431', '502', '520', '97%', 'Продажи', ''],
      ['Квал. лиды', '201', '219', '207', '244', '260', '94%', 'Продажи', ''],
      ['CPL, руб.', '1 940', '1 870', '2 010', '1 820', '1 800', '101%', 'Маркетинг', ''],
      ['Бюджет, тыс. руб.', '780', '820', '832', '913', '900', '101%', 'Маркетинг', ''],
      ['ROMI, %', '146', '151', '139', '158', '160', '99%', 'Маркетинг', ''],
      ['', '', '', '', '', '', '', '', ''],
      ['Итого заявок', '', '', '', '1 793', '', '', '', ''],
      ['Комментарий', 'Q4 с учётом акции «Саморез месяца»', '', '', '', '', '', '', '']
    ];
    var html = '<div class="kb-title"><span>Отчёт_Q4_финал_v3.xlsx</span><span>Сохранено</span></div>' +
      '<div class="kb-menu"><span>Файл</span><span>Главная</span><span>Вставка</span><span>Разметка</span><span>Формулы</span><span>Данные</span><span>Рецензирование</span><span>Вид</span></div>' +
      '<div class="kb-fx"><b>F5</b><span>=СУММ(B5:E5)/4</span></div><div class="kb-grid"><table><colgroup><col style="width:36px"><col style="width:170px">';
    for (var c = 0; c < 8; c++) html += '<col style="width:92px">';
    html += '</colgroup><tr>';
    cols.forEach(function (c) { html += '<th>' + c + '</th>'; });
    html += '</tr>';
    for (var r = 0; r < 40; r++) {
      var row = rows[r] || ['', '', '', '', '', '', '', '', ''];
      html += '<tr' + (r === 0 ? ' class="h"' : '') + '><th>' + (r + 1) + '</th>';
      row.forEach(function (v, i) { html += '<td' + (i === 0 || i === 7 || (r === 10 && i === 1) ? ' class="l"' : '') + '>' + v + '</td>'; });
      html += '</tr>';
    }
    html += '</table></div><div class="kb-tabs"><span class="on">Свод</span><span>Каналы</span><span>Бюджет</span><button type="button" id="kbBack">Лист1</button></div>';
    bossEl = document.createElement('div'); bossEl.className = 'kit-boss'; bossEl.hidden = true; bossEl.innerHTML = html;
    document.body.appendChild(bossEl);
    bossEl.querySelector('#kbBack').addEventListener('click', function () { K.boss(false); });
  }
  K.boss = function (show) {
    if (!bossEl) buildBoss();
    if (show === undefined) show = bossEl.hidden;
    if (show === !bossEl.hidden) return;
    if (show) { pause('boss'); oldTitle = document.title; document.title = 'Отчёт_Q4_финал_v3.xlsx'; bossEl.hidden = false; }
    else { bossEl.hidden = true; document.title = oldTitle; }
  };
  K.bossOn = function () { return !!bossEl && !bossEl.hidden; };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); K.boss(); }
  });

  window.Kit = K;
})();
