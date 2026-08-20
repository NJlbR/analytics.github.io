const STORAGE_KEY = 'sociopairs.v2';
const LEGACY_STORAGE_KEY = 'sociopairs.v1';
const CURRENT_USER_KEY = 'sociopairs.currentUser';
const USERNAME_RE = /^[A-Za-z][A-Za-z0-9]*$/;

const genderLabels = { female: 'Женский', male: 'Мужской' };
const oppositeGender = { female: 'male', male: 'female' };
const hairOptions = ['короткие', 'до плеч', 'от плеч до пояса', 'ниже пояса'];
const eyeOptions = ['карие', 'голубые', 'зелёные', 'серые', 'ореховые', 'другой'];
const todayKey = (date = new Date()) => date.toISOString().slice(0, 10);

let currentUser = localStorage.getItem(CURRENT_USER_KEY) || '';

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  return JSON.parse(stored || '{"users":[],"surveys":[]}');
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setCurrentUser(username) {
  currentUser = username;
  if (username) localStorage.setItem(CURRENT_USER_KEY, username);
  else localStorage.removeItem(CURRENT_USER_KEY);
  render();
}

function normalizeUsername(username) {
  return username.trim();
}

function userByName(state, username) {
  return state.users.find((user) => user.username.toLowerCase() === username.toLowerCase());
}

function average(values) {
  const nums = values.map(Number).filter(Number.isFinite);
  return nums.length ? Math.round(nums.reduce((sum, value) => sum + value, 0) / nums.length) : '—';
}

function averageDecimal(values, precision = 1) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (!nums.length) return '—';
  return (nums.reduce((sum, value) => sum + value, 0) / nums.length).toFixed(precision).replace('.0', '');
}

function mode(values) {
  const counts = values.filter(Boolean).reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
  const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return winner ? `${winner[0]} (${winner[1]})` : '—';
}

function rangeLabel(min, max, unit = '') {
  if (!min && !max) return '—';
  if (min && max) return `${min}–${max}${unit}`;
  return min ? `от ${min}${unit}` : `до ${max}${unit}`;
}

function displayAge(survey) {
  return survey.age || rangeLabel(survey.ageMin, survey.ageMax);
}

function displayHeight(survey) {
  return survey.height || rangeLabel(survey.heightMin, survey.heightMax, ' см');
}

function numericCenter(survey, singleKey, minKey, maxKey) {
  if (Number.isFinite(Number(survey[singleKey]))) return Number(survey[singleKey]);
  const min = Number(survey[minKey]);
  const max = Number(survey[maxKey]);
  if (Number.isFinite(min) && Number.isFinite(max)) return (min + max) / 2;
  if (Number.isFinite(min)) return min;
  if (Number.isFinite(max)) return max;
  return NaN;
}

function dailyCounts(surveys) {
  return surveys.reduce((acc, survey) => {
    const day = todayKey(new Date(survey.createdAt));
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});
}

function dailyStatsMarkup(surveys) {
  const rows = Object.entries(dailyCounts(surveys)).sort((a, b) => b[0].localeCompare(a[0]));
  if (!rows.length) return '<p>Пока нет добавленных симпатий.</p>';
  return `<div class="table-wrap"><table><thead><tr><th>День</th><th>Добавлено понравившихся</th></tr></thead><tbody>${rows.map(([day, count]) => `<tr><td>${day}</td><td>${count}</td></tr>`).join('')}</tbody></table></div>`;
}

function averageLikesPerUserPerDay(state) {
  const days = Object.keys(dailyCounts(state.surveys));
  if (!state.users.length || !days.length) return '—';
  return averageDecimal(days.map((day) => state.surveys.filter((survey) => todayKey(new Date(survey.createdAt)) === day).length / state.users.length));
}

function statsFor(surveys) {
  return [
    ['Анкет', surveys.length],
    ['Средний возраст', average(surveys.map((survey) => numericCenter(survey, 'age', 'ageMin', 'ageMax')))],
    ['Средний рост', average(surveys.map((survey) => numericCenter(survey, 'height', 'heightMin', 'heightMax')))],
    ['Частая длина волос', mode(surveys.map((survey) => survey.hairLength))],
    ['Частый цвет глаз', mode(surveys.map((survey) => survey.eyeColor))],
    ['Частый стиль', mode(surveys.map((survey) => survey.style || 'не указан'))],
  ];
}

function statsMarkup(surveys) {
  return `<div class="stats">${statsFor(surveys).map(([label, value]) => `
    <div class="stat"><span>${label}</span><strong>${value}</strong></div>
  `).join('')}</div>`;
}

function renderNav(user) {
  document.querySelector('#nav').innerHTML = user
    ? `<strong>@${user.username}</strong>${user.isAdmin ? '<button id="adminButton" class="secondary">Админ-панель</button>' : ''}<button id="logoutButton" class="ghost">Выйти</button>`
    : '<span class="hint">Войдите или зарегистрируйтесь</span>';
}

function renderAuth(user) {
  const section = document.querySelector('#authSection');
  section.classList.toggle('hidden', Boolean(user));
  section.innerHTML = user ? '' : document.querySelector('#authTemplate').innerHTML;
}

function renderProfile(state, user) {
  const section = document.querySelector('#profileSection');
  section.classList.toggle('hidden', !user);
  if (!user) return;
  const surveys = state.surveys.filter((survey) => survey.author === user.username);
  section.innerHTML = `
    <article class="card">
      <h2>Профиль</h2>
      <form id="genderForm" class="form">
        <label>Ваш пол
          <select name="gender" required>
            <option value="female" ${user.gender === 'female' ? 'selected' : ''}>Женский</option>
            <option value="male" ${user.gender === 'male' ? 'selected' : ''}>Мужской</option>
          </select>
        </label>
        <button class="secondary" type="submit">Сохранить пол</button>
      </form>
    </article>
    <article class="card">
      <h2>Кто вам нравился чаще всего</h2>
      ${statsMarkup(surveys)}
    </article>
    <article class="card">
      <h2>Ваша статистика по дням</h2>
      ${dailyStatsMarkup(surveys)}
    </article>
    <article class="card">
      <h2>Ваши заполненные анкеты</h2>
      ${surveys.length ? tableMarkup(surveys) : '<p>Анкет пока нет.</p>'}
    </article>`;
}

function tableMarkup(surveys) {
  if (!surveys.length) return '<p>Анкет пока нет.</p>';
  return `<div class="table-wrap"><table><thead><tr><th>Дата</th><th>Пол</th><th>Возраст</th><th>Рост</th><th>Волосы</th><th>Глаза</th><th>Стиль</th><th>Заметки</th></tr></thead><tbody>${surveys.map((survey) => `
    <tr><td>${new Date(survey.createdAt).toLocaleString('ru-RU')}</td><td>${genderLabels[survey.targetGender]}</td><td>${displayAge(survey)}</td><td>${displayHeight(survey)}</td><td>${survey.hairLength}</td><td>${survey.eyeColor}</td><td>${survey.style || '—'}</td><td>${survey.notes || '—'}</td></tr>
  `).join('')}</tbody></table></div>`;
}

function renderSurvey(user) {
  const section = document.querySelector('#surveySection');
  section.classList.add('hidden');
  if (!user) return;
  const targetGender = oppositeGender[user.gender];
  section.innerHTML = `
    <article class="card">
      <h2>Анкета симпатии: ${genderLabels[targetGender]}</h2>
      <form id="surveyForm" class="form">
        <input type="hidden" name="targetGender" value="${targetGender}" />
        <div class="grid two">
          <fieldset><legend>Возраст</legend><div class="range-row"><label>От <input name="ageMin" type="number" min="16" max="99" required /></label><label>До <input name="ageMax" type="number" min="16" max="99" required /></label></div></fieldset>
          <fieldset><legend>Рост, см</legend><div class="range-row"><label>От <input name="heightMin" type="number" min="120" max="230" required /></label><label>До <input name="heightMax" type="number" min="120" max="230" required /></label></div></fieldset>
          <label>Длина волос <select name="hairLength" required>${hairOptions.map((option) => `<option>${option}</option>`).join('')}</select></label>
          <label>Цвет глаз <select name="eyeColor" required>${eyeOptions.map((option) => `<option>${option}</option>`).join('')}</select></label>
        </div>
        <label>Стиль / субкультура <input name="style" maxlength="80" placeholder="например: casual, goth, sport" /></label>
        <label>Дополнительные наблюдения <input name="notes" maxlength="160" placeholder="необязательно" /></label>
        <button class="primary" type="submit">Сохранить анкету</button>
      </form>
    </article>`;
}

function renderAdmin(state, user) {
  const section = document.querySelector('#adminSection');
  section.classList.add('hidden');
  section.innerHTML = user?.isAdmin ? `<article class="card"><h2>Админ-панель</h2><p>Усреднённые данные по всем аккаунтам, включая администратора.</p>${statsMarkup(state.surveys)}<div class="stats"><div class="stat"><span>Среднее число понравившихся в день на пользователя</span><strong>${averageLikesPerUserPerDay(state)}</strong></div></div><h3>Сколько понравившихся добавляли по дням</h3>${dailyStatsMarkup(state.surveys)}<h3>Все анкеты</h3>${tableMarkup(state.surveys)}</article>` : '';
}

function render() {
  const state = loadState();
  const user = currentUser ? userByName(state, currentUser) : null;
  if (currentUser && !user) setCurrentUser('');
  renderNav(user);
  renderAuth(user);
  renderProfile(state, user);
  renderSurvey(user);
  renderAdmin(state, user);
}

function validateRange(min, max, label) {
  if (Number(min) > Number(max)) {
    alert(`${label}: значение «от» не может быть больше значения «до».`);
    return false;
  }
  return true;
}

document.addEventListener('submit', (event) => {
  event.preventDefault();
  const state = loadState();
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));

  if (form.id === 'registerForm') {
    const username = normalizeUsername(data.username);
    if (!USERNAME_RE.test(username)) return alert('Username должен начинаться с английской буквы и состоять только из английских букв и цифр.');
    if (userByName(state, username)) return alert('Этот username уже занят.');
    const user = { username, gender: data.gender, isAdmin: state.users.length === 0, createdAt: new Date().toISOString() };
    state.users.push(user);
    saveState(state);
    setCurrentUser(username);
  }

  if (form.id === 'loginForm') {
    const username = normalizeUsername(data.username);
    const user = userByName(state, username);
    if (!user) return alert('Пользователь не найден.');
    setCurrentUser(user.username);
  }

  if (form.id === 'genderForm') {
    const user = userByName(state, currentUser);
    user.gender = data.gender;
    saveState(state);
    alert('Пол сохранён.');
    render();
  }

  if (form.id === 'surveyForm') {
    if (!validateRange(data.ageMin, data.ageMax, 'Возраст') || !validateRange(data.heightMin, data.heightMax, 'Рост')) return;
    state.surveys.push({ ...data, ageMin: Number(data.ageMin), ageMax: Number(data.ageMax), heightMin: Number(data.heightMin), heightMax: Number(data.heightMax), author: currentUser, createdAt: new Date().toISOString() });
    saveState(state);
    alert('Анкета сохранена.');
    render();
  }
});

document.addEventListener('click', (event) => {
  if (event.target.id === 'logoutButton') setCurrentUser('');
  if (event.target.id === 'likeButton') {
    if (!currentUser) return alert('Сначала войдите или зарегистрируйтесь.');
    document.querySelector('#surveySection').classList.remove('hidden');
    document.querySelector('#surveySection').scrollIntoView({ behavior: 'smooth' });
  }
  if (event.target.id === 'adminButton') {
    document.querySelector('#adminSection').classList.toggle('hidden');
    document.querySelector('#adminSection').scrollIntoView({ behavior: 'smooth' });
  }
});

render();
