const STORAGE_KEY = 'sociopairs.v2';
const LEGACY_STORAGE_KEY = 'sociopairs.v1';
const CURRENT_USER_KEY = 'sociopairs.currentUser';
const USERNAME_RE = /^[A-Za-z][A-Za-z0-9]*$/;

const genderLabels = { female: 'Женский', male: 'Мужской' };
const oppositeGender = { female: 'male', male: 'female' };
const hairOptions = ['короткие', 'до плеч', 'от плеч до пояса', 'ниже пояса'];
const eyeOptions = ['карие', 'голубые', 'зелёные', 'серые', 'ореховые', 'другой'];
const todayKey = (date = new Date()) => date.toISOString().slice(0, 10);

const supabaseSettings = window.SOCIOPAIRS_SUPABASE || {};
const supabaseEnabled = Boolean(supabaseSettings.url && supabaseSettings.anonKey && window.supabase);
const supabaseClient = supabaseEnabled ? window.supabase.createClient(supabaseSettings.url, supabaseSettings.anonKey) : null;

let currentUser = localStorage.getItem(CURRENT_USER_KEY) || '';
let appState = { users: [], surveys: [] };
let dataStatus = supabaseEnabled ? 'Подключение к Supabase…' : 'Supabase не настроен: данные временно сохраняются в localStorage этого браузера.';

function loadLocalState() {
  const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  return JSON.parse(stored || '{"users":[],"surveys":[]}');
}

function saveLocalState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toAppUser(row) {
  return { username: row.username, gender: row.gender, isAdmin: row.is_admin, createdAt: row.created_at };
}

function toAppSurvey(row) {
  return { id: row.id, author: row.author, targetGender: row.target_gender, ageMin: row.age_min, ageMax: row.age_max, heightMin: row.height_min, heightMax: row.height_max, hairLength: row.hair_length, eyeColor: row.eye_color, style: row.style || '', notes: row.notes || '', createdAt: row.created_at };
}

async function loadState() {
  if (!supabaseClient) {
    appState = loadLocalState();
    return appState;
  }

  const [{ data: users, error: usersError }, { data: surveys, error: surveysError }] = await Promise.all([
    supabaseClient.from('sociopairs_users').select('*').order('created_at', { ascending: true }),
    supabaseClient.from('sociopairs_surveys').select('*').order('created_at', { ascending: false }),
  ]);
  if (usersError || surveysError) throw usersError || surveysError;
  appState = { users: users.map(toAppUser), surveys: surveys.map(toAppSurvey) };
  dataStatus = 'Данные синхронизируются и хранятся в Supabase.';
  return appState;
}

async function createUser(user) {
  if (!supabaseClient) {
    appState.users.push(user);
    saveLocalState(appState);
    return;
  }
  const { error } = await supabaseClient.from('sociopairs_users').insert({ username: user.username, gender: user.gender, is_admin: user.isAdmin, created_at: user.createdAt });
  if (error) throw error;
}

async function updateUserGender(username, gender) {
  if (!supabaseClient) {
    userByName(appState, username).gender = gender;
    saveLocalState(appState);
    return;
  }
  const { error } = await supabaseClient.from('sociopairs_users').update({ gender }).eq('username', username);
  if (error) throw error;
}

async function createSurvey(survey) {
  if (!supabaseClient) {
    appState.surveys.push(survey);
    saveLocalState(appState);
    return;
  }
  const { error } = await supabaseClient.from('sociopairs_surveys').insert({ author: survey.author, target_gender: survey.targetGender, age_min: survey.ageMin, age_max: survey.ageMax, height_min: survey.heightMin, height_max: survey.heightMax, hair_length: survey.hairLength, eye_color: survey.eyeColor, style: survey.style, notes: survey.notes, created_at: survey.createdAt });
  if (error) throw error;
}

function setCurrentUser(username) {
  currentUser = username;
  if (username) localStorage.setItem(CURRENT_USER_KEY, username);
  else localStorage.removeItem(CURRENT_USER_KEY);
  render();
}

function normalizeUsername(username) { return username.trim(); }
function userByName(state, username) { return state.users.find((user) => user.username.toLowerCase() === username.toLowerCase()); }
function average(values) { const nums = values.map(Number).filter(Number.isFinite); return nums.length ? Math.round(nums.reduce((sum, value) => sum + value, 0) / nums.length) : '—'; }
function averageDecimal(values, precision = 1) { const nums = values.map(Number).filter(Number.isFinite); if (!nums.length) return '—'; return (nums.reduce((sum, value) => sum + value, 0) / nums.length).toFixed(precision).replace('.0', ''); }
function mode(values) { const counts = values.filter(Boolean).reduce((acc, value) => { acc[value] = (acc[value] || 0) + 1; return acc; }, {}); const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]; return winner ? `${winner[0]} (${winner[1]})` : '—'; }
function rangeLabel(min, max, unit = '') { if (!min && !max) return '—'; if (min && max) return `${min}–${max}${unit}`; return min ? `от ${min}${unit}` : `до ${max}${unit}`; }
function displayAge(survey) { return survey.age || rangeLabel(survey.ageMin, survey.ageMax); }
function displayHeight(survey) { return survey.height || rangeLabel(survey.heightMin, survey.heightMax, ' см'); }
function numericCenter(survey, singleKey, minKey, maxKey) { if (Number.isFinite(Number(survey[singleKey]))) return Number(survey[singleKey]); const min = Number(survey[minKey]); const max = Number(survey[maxKey]); if (Number.isFinite(min) && Number.isFinite(max)) return (min + max) / 2; if (Number.isFinite(min)) return min; if (Number.isFinite(max)) return max; return NaN; }
function dailyCounts(surveys) { return surveys.reduce((acc, survey) => { const day = todayKey(new Date(survey.createdAt)); acc[day] = (acc[day] || 0) + 1; return acc; }, {}); }
function dailyStatsMarkup(surveys) { const rows = Object.entries(dailyCounts(surveys)).sort((a, b) => b[0].localeCompare(a[0])); if (!rows.length) return '<p>Пока нет добавленных симпатий.</p>'; return `<div class="table-wrap"><table><thead><tr><th>День</th><th>Добавлено понравившихся</th></tr></thead><tbody>${rows.map(([day, count]) => `<tr><td>${day}</td><td>${count}</td></tr>`).join('')}</tbody></table></div>`; }
function averageLikesPerUserPerDay(state) { const days = Object.keys(dailyCounts(state.surveys)); if (!state.users.length || !days.length) return '—'; return averageDecimal(days.map((day) => state.surveys.filter((survey) => todayKey(new Date(survey.createdAt)) === day).length / state.users.length)); }
function statsFor(surveys) { return [['Анкет', surveys.length], ['Средний возраст', average(surveys.map((survey) => numericCenter(survey, 'age', 'ageMin', 'ageMax')))], ['Средний рост', average(surveys.map((survey) => numericCenter(survey, 'height', 'heightMin', 'heightMax')))], ['Частая длина волос', mode(surveys.map((survey) => survey.hairLength))], ['Частый цвет глаз', mode(surveys.map((survey) => survey.eyeColor))], ['Частый стиль', mode(surveys.map((survey) => survey.style || 'не указан'))]]; }
function statsMarkup(surveys) { return `<div class="stats">${statsFor(surveys).map(([label, value]) => `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`).join('')}</div>`; }
function renderNav(user) { document.querySelector('#nav').innerHTML = user ? `<strong>@${user.username}</strong>${user.isAdmin ? '<button id="adminButton" class="secondary">Админ-панель</button>' : ''}<button id="logoutButton" class="ghost">Выйти</button>` : '<span class="hint">Войдите или зарегистрируйтесь</span>'; }
function renderAuth(user) { const section = document.querySelector('#authSection'); section.classList.toggle('hidden', Boolean(user)); section.innerHTML = user ? '' : document.querySelector('#authTemplate').innerHTML; }
function renderProfile(state, user) { const section = document.querySelector('#profileSection'); section.classList.toggle('hidden', !user); if (!user) return; const surveys = state.surveys.filter((survey) => survey.author === user.username); section.innerHTML = `<article class="card"><h2>Профиль</h2><form id="genderForm" class="form"><label>Ваш пол<select name="gender" required><option value="female" ${user.gender === 'female' ? 'selected' : ''}>Женский</option><option value="male" ${user.gender === 'male' ? 'selected' : ''}>Мужской</option></select></label><button class="secondary" type="submit">Сохранить пол</button></form></article><article class="card"><h2>Кто вам нравился чаще всего</h2>${statsMarkup(surveys)}</article><article class="card"><h2>Ваша статистика по дням</h2>${dailyStatsMarkup(surveys)}</article><article class="card"><h2>Ваши заполненные анкеты</h2>${surveys.length ? tableMarkup(surveys) : '<p>Анкет пока нет.</p>'}</article>`; }
function tableMarkup(surveys) { if (!surveys.length) return '<p>Анкет пока нет.</p>'; return `<div class="table-wrap"><table><thead><tr><th>Дата</th><th>Пол</th><th>Возраст</th><th>Рост</th><th>Волосы</th><th>Глаза</th><th>Стиль</th><th>Заметки</th></tr></thead><tbody>${surveys.map((survey) => `<tr><td>${new Date(survey.createdAt).toLocaleString('ru-RU')}</td><td>${genderLabels[survey.targetGender]}</td><td>${displayAge(survey)}</td><td>${displayHeight(survey)}</td><td>${survey.hairLength}</td><td>${survey.eyeColor}</td><td>${survey.style || '—'}</td><td>${survey.notes || '—'}</td></tr>`).join('')}</tbody></table></div>`; }
function renderSurvey(user) { const section = document.querySelector('#surveySection'); section.classList.add('hidden'); if (!user) return; const targetGender = oppositeGender[user.gender]; section.innerHTML = `<article class="card"><h2>Анкета симпатии: ${genderLabels[targetGender]}</h2><form id="surveyForm" class="form"><input type="hidden" name="targetGender" value="${targetGender}" /><div class="grid two"><fieldset><legend>Возраст</legend><div class="range-row"><label>От <input name="ageMin" type="number" min="16" max="99" required /></label><label>До <input name="ageMax" type="number" min="16" max="99" required /></label></div></fieldset><fieldset><legend>Рост, см</legend><div class="range-row"><label>От <input name="heightMin" type="number" min="120" max="230" required /></label><label>До <input name="heightMax" type="number" min="120" max="230" required /></label></div></fieldset><label>Длина волос <select name="hairLength" required>${hairOptions.map((option) => `<option>${option}</option>`).join('')}</select></label><label>Цвет глаз <select name="eyeColor" required>${eyeOptions.map((option) => `<option>${option}</option>`).join('')}</select></label></div><label>Стиль / субкультура <input name="style" maxlength="80" placeholder="например: casual, goth, sport" /></label><label>Дополнительные наблюдения <input name="notes" maxlength="160" placeholder="необязательно" /></label><button class="primary" type="submit">Сохранить анкету</button></form></article>`; }
function renderAdmin(state, user) { const section = document.querySelector('#adminSection'); section.classList.add('hidden'); section.innerHTML = user?.isAdmin ? `<article class="card"><h2>Админ-панель</h2><p>Усреднённые данные по всем аккаунтам, включая администратора.</p>${statsMarkup(state.surveys)}<div class="stats"><div class="stat"><span>Среднее число понравившихся в день на пользователя</span><strong>${averageLikesPerUserPerDay(state)}</strong></div></div><h3>Сколько понравившихся добавляли по дням</h3>${dailyStatsMarkup(state.surveys)}<h3>Все анкеты</h3>${tableMarkup(state.surveys)}</article>` : ''; }

function supabaseProjectHost() {
  try { return new URL(supabaseSettings.url).host; }
  catch { return 'неизвестный Supabase URL'; }
}

function storageErrorMessage(error) {
  const projectHint = `Сайт сейчас подключён к ${supabaseProjectHost()}. Если SQL-файл уже выполнен, проверьте, что repository secrets supabase_url и supabase_anonpublic взяты из этого же Supabase-проекта, затем заново запустите деплой GitHub Pages.`;
  const setupHint = `Откройте именно этот проект в Supabase → SQL Editor, выполните весь файл supabase-schema.sql, затем обновите страницу. ${projectHint}`;
  if (error?.code === 'PGRST205' || error?.message?.includes('schema cache') || error?.message?.includes('sociopairs_users')) {
    return `PostgREST не видит таблицы sociopairs в подключённом проекте. ${setupHint}`;
  }
  if (error?.code === '42501' || error?.message?.toLowerCase().includes('permission')) {
    return `У anon key нет прав на таблицы. Выполните актуальный supabase-schema.sql целиком. ${projectHint}`;
  }
  return error?.message || 'Неизвестная ошибка Supabase.';
}
function renderStatus() { document.querySelector('#dataStatus').textContent = dataStatus; }
async function render() { try { const state = await loadState(); const user = currentUser ? userByName(state, currentUser) : null; if (currentUser && !user) return setCurrentUser(''); renderStatus(); renderNav(user); renderAuth(user); renderProfile(state, user); renderSurvey(user); renderAdmin(state, user); } catch (error) { dataStatus = `Ошибка подключения к хранилищу: ${storageErrorMessage(error)}`; renderStatus(); } }
function validateRange(min, max, label) { if (Number(min) > Number(max)) { alert(`${label}: значение «от» не может быть больше значения «до».`); return false; } return true; }

async function runAction(action) { try { await action(); await render(); } catch (error) { alert(`Ошибка сохранения данных: ${storageErrorMessage(error)}`); } }

document.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));

  runAction(async () => {
    await loadState();
    if (form.id === 'registerForm') {
      const username = normalizeUsername(data.username);
      if (!USERNAME_RE.test(username)) return alert('Username должен начинаться с английской буквы и состоять только из английских букв и цифр.');
      if (userByName(appState, username)) return alert('Этот username уже занят.');
      const user = { username, gender: data.gender, isAdmin: appState.users.length === 0, createdAt: new Date().toISOString() };
      await createUser(user);
      setCurrentUser(username);
    }
    if (form.id === 'loginForm') {
      const username = normalizeUsername(data.username);
      const user = userByName(appState, username);
      if (!user) return alert('Пользователь не найден.');
      setCurrentUser(user.username);
    }
    if (form.id === 'genderForm') { await updateUserGender(currentUser, data.gender); alert('Пол сохранён.'); }
    if (form.id === 'surveyForm') {
      if (!validateRange(data.ageMin, data.ageMax, 'Возраст') || !validateRange(data.heightMin, data.heightMax, 'Рост')) return;
      await createSurvey({ ...data, ageMin: Number(data.ageMin), ageMax: Number(data.ageMax), heightMin: Number(data.heightMin), heightMax: Number(data.heightMax), author: currentUser, createdAt: new Date().toISOString() });
      alert('Анкета сохранена.');
    }
  });
});

document.addEventListener('click', (event) => {
  if (event.target.id === 'logoutButton') setCurrentUser('');
  if (event.target.id === 'likeButton') { if (!currentUser) return alert('Сначала войдите или зарегистрируйтесь.'); document.querySelector('#surveySection').classList.remove('hidden'); document.querySelector('#surveySection').scrollIntoView({ behavior: 'smooth' }); }
  if (event.target.id === 'adminButton') { document.querySelector('#adminSection').classList.toggle('hidden'); document.querySelector('#adminSection').scrollIntoView({ behavior: 'smooth' }); }
});

render();
