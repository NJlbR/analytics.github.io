const STORAGE_KEY = 'sociopairs.v1';
const USERNAME_RE = /^[A-Za-z][A-Za-z0-9]*$/;

const genderLabels = { female: 'Женский', male: 'Мужской' };
const oppositeGender = { female: 'male', male: 'female' };
const hairOptions = ['короткие', 'до плеч', 'от плеч до пояса', 'ниже пояса'];
const eyeOptions = ['карие', 'голубые', 'зелёные', 'серые', 'ореховые', 'другой'];

let currentUser = localStorage.getItem('sociopairs.currentUser') || '';

function loadState() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"users":[],"surveys":[]}');
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setCurrentUser(username) {
  currentUser = username;
  if (username) localStorage.setItem('sociopairs.currentUser', username);
  else localStorage.removeItem('sociopairs.currentUser');
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

function mode(values) {
  const counts = values.filter(Boolean).reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
  const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return winner ? `${winner[0]} (${winner[1]})` : '—';
}

function statsFor(surveys) {
  return [
    ['Анкет', surveys.length],
    ['Средний возраст', average(surveys.map((survey) => survey.age))],
    ['Средний рост', average(surveys.map((survey) => survey.height))],
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

function dateKey(dateString) {
  return new Date(dateString).toISOString().slice(0, 10);
}

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function dailyCounts(surveys) {
  const counts = surveys.reduce((acc, survey) => {
    const day = dateKey(survey.createdAt);
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .sort(([dayA], [dayB]) => dayB.localeCompare(dayA))
    .map(([day, count]) => ({ day, count }));
}

function averageLikesPerDay(surveys) {
  const days = dailyCounts(surveys);
  if (!days.length) return '—';
  const total = days.reduce((sum, { count }) => sum + count, 0);
  return (total / days.length).toFixed(1);
}

function dailyStatsMarkup(surveys) {
  const days = dailyCounts(surveys);
  if (!days.length) return '<p>Записей пока нет.</p>';

  return `<div class="table-wrap"><table><thead><tr><th>День</th><th>Добавлено понравившихся</th></tr></thead><tbody>${days.map(({ day, count }) => `
    <tr><td>${formatDate(day)}</td><td><strong>${count}</strong></td></tr>
  `).join('')}</tbody></table></div>`;
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
      <h2>Статистика добавления по дням</h2>
      <p>Сколько анкет «понравившихся» вы добавили в каждый день.</p>
      ${dailyStatsMarkup(surveys)}
    </article>
    <article class="card">
      <h2>Ваши заполненные анкеты</h2>
      ${surveys.length ? tableMarkup(surveys) : '<p>Анкет пока нет.</p>'}
    </article>`;
}

function tableMarkup(surveys) {
  return `<div class="table-wrap"><table><thead><tr><th>Дата</th><th>Пол</th><th>Возраст</th><th>Рост</th><th>Волосы</th><th>Глаза</th><th>Стиль</th><th>Заметки</th></tr></thead><tbody>${surveys.map((survey) => `
    <tr><td>${new Date(survey.createdAt).toLocaleString('ru-RU')}</td><td>${genderLabels[survey.targetGender]}</td><td>${survey.age}</td><td>${survey.height}</td><td>${survey.hairLength}</td><td>${survey.eyeColor}</td><td>${survey.style || '—'}</td><td>${survey.notes || '—'}</td></tr>
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
          <label>Возраст <input name="age" type="number" min="16" max="99" required /></label>
          <label>Рост, см <input name="height" type="number" min="120" max="230" required /></label>
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
  section.innerHTML = user?.isAdmin ? `<article class="card"><h2>Админ-панель</h2><p>Усреднённые данные по всем аккаунтам, включая администратора.</p>${statsMarkup(state.surveys)}<div class="stats daily-summary"><div class="stat"><span>Среднее понравившихся в день</span><strong>${averageLikesPerDay(state.surveys)}</strong></div></div><h3>Все анкеты</h3>${tableMarkup(state.surveys)}</article>` : '';
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
    state.surveys.push({ ...data, age: Number(data.age), height: Number(data.height), author: currentUser, createdAt: new Date().toISOString() });
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
