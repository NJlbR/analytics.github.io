function dailyDateKey(dateString) {
  return new Date(dateString).toISOString().slice(0, 10);
}

function formatDailyDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function dailyLikedCounts(surveys) {
  const counts = surveys.reduce((acc, survey) => {
    const day = dailyDateKey(survey.createdAt);
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .sort(([dayA], [dayB]) => dayB.localeCompare(dayA))
    .map(([day, count]) => ({ day, count }));
}

function averageLikedPerDay(surveys) {
  const days = dailyLikedCounts(surveys);
  if (!days.length) return '—';
  const total = days.reduce((sum, { count }) => sum + count, 0);
  return (total / days.length).toFixed(1);
}

function dailyLikedMarkup(surveys) {
  const days = dailyLikedCounts(surveys);
  if (!days.length) return '<p>Записей пока нет.</p>';

  return `<div class="table-wrap"><table><thead><tr><th>День</th><th>Добавлено понравившихся</th></tr></thead><tbody>${days.map(({ day, count }) => `
    <tr><td>${formatDailyDate(day)}</td><td><strong>${count}</strong></td></tr>
  `).join('')}</tbody></table></div>`;
}

const baseRenderProfile = window.renderProfile;
const baseRenderAdmin = window.renderAdmin;

window.renderProfile = function renderProfileWithDailyStats(state, user) {
  baseRenderProfile(state, user);
  if (!user) return;

  const section = document.querySelector('#profileSection');
  const surveys = state.surveys.filter((survey) => survey.author === user.username);
  const article = document.createElement('article');
  article.className = 'card';
  article.innerHTML = `
    <h2>Статистика добавления по дням</h2>
    <p>Сколько анкет «понравившихся» вы добавили в каждый день.</p>
    ${dailyLikedMarkup(surveys)}
  `;
  section.insertBefore(article, section.lastElementChild);
};

window.renderAdmin = function renderAdminWithDailyStats(state, user) {
  baseRenderAdmin(state, user);
  if (!user?.isAdmin) return;

  const adminCard = document.querySelector('#adminSection .card');
  const summary = document.createElement('div');
  summary.className = 'stats daily-summary';
  summary.innerHTML = `
    <div class="stat">
      <span>Среднее понравившихся в день</span>
      <strong>${averageLikedPerDay(state.surveys)}</strong>
    </div>
  `;
  adminCard.insertBefore(summary, adminCard.querySelector('.table-wrap'));
};

render();
