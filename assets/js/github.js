// Simple GitHub repo + PR viewer using the public REST API.
// Works for public repos without authentication. For private repos or higher rate limits, provide a token.

document.addEventListener('DOMContentLoaded', function () {
  var usernameInput = document.getElementById('gh-username');
  var tokenInput = document.getElementById('gh-token');
  var loadBtn = document.getElementById('load-btn');
  var reposList = document.getElementById('repos-list');
  var messages = document.getElementById('gh-messages');

  loadBtn.addEventListener('click', function () {
    var username = String(usernameInput.value || '').trim();
    var token = String(tokenInput.value || '').trim();
    if (!username) {
      showMessage('Please enter a GitHub username.', true);
      return;
    }
    reposList.innerHTML = '';
    showMessage('Loading repositories...', false);
    fetchRepos(username, token)
      .then(function (repos) {
        if (!repos || repos.length === 0) {
          showMessage('No public repositories found for ' + username + '.', true);
          return;
        }
        showMessage('', false);
        repos.forEach(renderRepoCard.bind(null, token));
      })
      .catch(function (err) {
        showMessage('Error loading repositories: ' + err.message, true);
        console.error(err);
      });
  });

  function showMessage(msg, isError) {
    messages.innerHTML = msg ? '<div class="message">' + escapeHtml(msg) + '</div>' : '';
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});
  }

  function fetchRepos(username, token) {
    var url = 'https://api.github.com/users/' + encodeURIComponent(username) + '/repos?per_page=100&sort=updated';
    return fetchWithOptionalAuth(url, token)
      .then(checkStatus)
      .then(function (r) { return r.json(); });
  }

  function renderRepoCard(token, repo) {
    var card = document.createElement('div');
    card.className = 'card';

    var title = document.createElement('h3');
    title.className = 'repo-title';
    title.innerHTML = '<a href="' + repo.html_url + '" target="_blank" rel="noopener noreferrer">' +
      escapeHtml(repo.full_name) + '</a>';
    card.appendChild(title);

    var meta = document.createElement('div');
    meta.className = 'repo-meta';
    meta.textContent = (repo.private ? 'Private' : 'Public') + ' · ' + (repo.language || 'Unknown language') + ' · Updated ' + new Date(repo.updated_at).toLocaleString();
    card.appendChild(meta);

    var desc = document.createElement('p');
    desc.textContent = repo.description || '';
    card.appendChild(desc);

    var prContainer = document.createElement('div');
    prContainer.textContent = 'Loading open pull requests...';
    card.appendChild(prContainer);

    // Insert card into DOM before we fetch PRs, so the user sees progress
    reposList.appendChild(card);

    // Fetch open PRs for the repo
    var parts = repo.full_name.split('/');
    var owner = parts[0], name = parts[1];
    var pullsUrl = 'https://api.github.com/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(name) + '/pulls?per_page=50&state=open';

    fetchWithOptionalAuth(pullsUrl, token)
      .then(function (resp) {
        if (resp.status === 404) return [];
        return checkStatus(resp).then(function (r) { return r.json(); });
      })
      .then(function (pulls) {
        prContainer.innerHTML = '';
        if (!pulls || pulls.length === 0) {
          prContainer.textContent = 'No open pull requests.';
          return;
        }
        var ul = document.createElement('ul');
        ul.className = 'pr-list';
        pulls.forEach(function (p) {
          var li = document.createElement('li');
          li.innerHTML = '<a href="' + p.html_url + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(p.title) + '</a> — by ' + escapeHtml(p.user.login);
          ul.appendChild(li);
        });
        prContainer.appendChild(ul);
      })
      .catch(function (err) {
        prContainer.textContent = 'Error loading PRs: ' + err.message;
      });
  }

  function fetchWithOptionalAuth(url, token) {
    var headers = { 'Accept': 'application/vnd.github+json' };
    if (token) {
      headers['Authorization'] = 'token ' + token;
    }
    return fetch(url, { headers: headers });
  }

  function checkStatus(response) {
    if (response.ok) return response;
    // Convert common errors to helpful messages
    if (response.status === 401) throw new Error('Unauthorized — invalid or missing token.');
    if (response.status === 403) {
      var limit = response.headers.get('X-RateLimit-Remaining');
      if (limit === '0') {
        var reset = response.headers.get('X-RateLimit-Reset');
        var when = reset ? new Date(parseInt(reset, 10) * 1000) : null;
        throw new Error('Rate limit exceeded. Reset at: ' + (when ? when.toLocaleString() : 'unknown time.'));
      }
      throw new Error('Forbidden — you may not have permission to access this resource.');
    }
    if (response.status === 404) throw new Error('Resource not found (404).');
    throw new Error('HTTP error: ' + response.status);
  }
});
