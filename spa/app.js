// Простой SPA-клиент на GramJS (браузер), минимальный функционал
// ВНИМАНИЕ: хранит сессию в localStorage, API ID/Hash вшиты по запросу пользователя.

(async function(){
  const apiId = 27919961; // из запроса пользователя
  const apiHash = 'e97411eeea1c0c5ae0720c9a546f57e8';
  const storeKey = 'mpg_session';

  const $ = (id) => document.getElementById(id);
  const status = $('status');
  const phoneEl = $('phone');
  const codeEl = $('code');
  const pwEl = $('pw');
  const btnSendCode = $('sendCode');
  const btnConfirm = $('confirm');
  const app = $('app');
  const auth = $('auth');
  const dialogsEl = $('dialogs');
  const btnLoadDialogs = $('loadDialogs');
  const btnLogout = $('logout');
  const messagesEl = $('messages');
  const msgEl = $('msg');
  const btnSend = $('send');
  const chatBox = $('chat');

  function setStatus(t){ status.textContent = t || ''; }

  if (!window.telegram || !window.telegram.GramJs) {
    setStatus('GramJS не загрузился. Проверьте доступ к CDN.');
    return;
  }

  const { TelegramClient } = window.telegram.GramJs;
  const { StringSession } = window.telegram.GramJs.sessions;
  const { Api } = window.telegram.GramJs;

  const saved = localStorage.getItem(storeKey) || '';
  const stringSession = new StringSession(saved);
  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });

  async function ensureConnected(){
    if (!client.connected) {
      await client.connect();
    }
  }

  async function startIfAuthorized(){
    await ensureConnected();
    try {
      const me = await client.getMe();
      if (me) {
        setStatus('Авторизовано');
        auth.style.display = 'none';
        app.style.display = '';
        return true;
      }
    } catch(e) {
      // not authorized
    }
    return false;
  }

  // Пробуем восстановить сессию
  try {
    if (saved) {
      await startIfAuthorized();
    }
  } catch(e) {}

  btnSendCode.onclick = async () => {
    try {
      setStatus('Отправляю код...');
      await ensureConnected();
      const phone = phoneEl.value.trim();
      if (!phone) { setStatus('Укажите телефон'); return; }
      await client.sendCode({ apiId, apiHash, phoneNumber: phone });
      $('codeRow').style.display = '';
      $('pwRow').style.display = '';
      btnConfirm.style.display = '';
      setStatus('Код отправлен. Введите код и, при необходимости, пароль 2FA.');
    } catch(e) {
      setStatus('Ошибка отправки кода: ' + (e?.message || e));
    }
  };

  btnConfirm.onclick = async () => {
    try {
      setStatus('Подтверждаю вход...');
      await ensureConnected();
      const phone = phoneEl.value.trim();
      const code = codeEl.value.trim();
      const pw = pwEl.value;
      await client.signIn({ apiId, apiHash, phoneNumber: phone, phoneCode: code, password: pw || undefined });
      // Сохраняем сессию
      const ss = client.session.save();
      localStorage.setItem(storeKey, ss);
      await startIfAuthorized();
    } catch(e) {
      setStatus('Ошибка входа: ' + (e?.message || e));
    }
  };

  btnLoadDialogs.onclick = async () => {
    try {
      setStatus('Загружаю диалоги...');
      await ensureConnected();
      const res = await client.getDialogs({ limit: 30 });
      dialogsEl.innerHTML = '';
      res.forEach((d) => {
        const title = d?.title || (d?.entity?.firstName || '') + ' ' + (d?.entity?.lastName || '');
        const div = document.createElement('div');
        div.className = 'item';
        div.textContent = title || 'Без названия';
        div.onclick = () => openChat(d);
        dialogsEl.appendChild(div);
      });
      setStatus('');
    } catch(e) {
      setStatus('Ошибка загрузки диалогов: ' + (e?.message || e));
    }
  };

  let currentPeer = null;
  async function openChat(dialog){
    try {
      await ensureConnected();
      currentPeer = dialog.entity;
      chatBox.style.display = '';
      messagesEl.innerHTML = '';
      const history = await client.getMessages(currentPeer, { limit: 30 });
      history.forEach((m) => {
        const div = document.createElement('div');
        div.className = 'msg';
        div.textContent = (m?.senderId ? '' : '') + (m?.message || '[media]');
        messagesEl.appendChild(div);
      });
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } catch(e) {
      setStatus('Ошибка открытия чата: ' + (e?.message || e));
    }
  }

  btnSend.onclick = async () => {
    try {
      if (!currentPeer) return;
      const text = msgEl.value.trim();
      if (!text) return;
      await client.sendMessage(currentPeer, { message: text });
      msgEl.value = '';
      const div = document.createElement('div');
      div.className = 'msg';
      div.textContent = text;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } catch(e) {
      setStatus('Ошибка отправки: ' + (e?.message || e));
    }
  };

  btnLogout.onclick = async () => {
    try {
      await ensureConnected();
      await client.invoke(new Api.auth.LogOut());
    } catch(e) {}
    try { localStorage.removeItem(storeKey); } catch(e) {}
    window.location.reload();
  };
})();


