(function () {
  var allChannels = [];
  var loginState = { phase: 'phone', user: '' };
  var charactersList = document.getElementById('charactersList');
  var searchBar = document.getElementById('searchBar');
  var genreFilter = document.getElementById('genreFilter');
  var langFilter = document.getElementById('langFilter');
  var catchupFilter = document.getElementById('catchupFilter');
  var loginModal = document.getElementById('loginModal');
  var loginContent = document.getElementById('loginContent');
  var loginButton = document.getElementById('loginButton');
  var refreshButton = document.getElementById('refreshButton');
  var logoutButton = document.getElementById('logoutButton');
  function openModal(id) { var el = document.getElementById(id); if (el) el.classList.remove('hidden'); }
  function closeModal(id) { var el = document.getElementById(id); if (el) el.classList.add('hidden'); }
  window.openLoginModal = function () { loginState = { phase: 'phone', user: '' }; renderLoginForm(); openModal('loginModal'); };
  window.openLogoutModal = function () { openModal('logoutModal'); };
  window.openRefreshModal = function () { openModal('refreshModal'); };
  window.openPlaylistModal = function () { var urlInput = document.getElementById('playlistUrl'); if (urlInput) urlInput.value = window.location.origin + '/playlist'; openModal('playlistModal'); };
  window.closeModal = closeModal;
  function renderLoginForm() {
    if (loginState.phase === 'phone') {
      loginContent.innerHTML = '<h2 class="text-2xl font-bold mb-4 gradient-text">Secure Login</h2>' + '<p class="text-gray-400 mb-6">Access premium content with your credentials</p>' + '<input type="tel" id="phoneInput" maxlength="10" placeholder="Enter mobile number" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 mb-4 focus:outline-none focus:ring-2 focus:ring-pink-500" />' + '<div class="flex justify-end gap-2"><button onclick="closeModal(\'loginModal\')" class="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">Cancel</button><button id="getOtpBtn" class="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg transition-colors">Get OTP</button></div>';
      document.getElementById('getOtpBtn').addEventListener('click', sendLogin);
      document.getElementById('phoneInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') sendLogin(); });
    } else if (loginState.phase === 'otp') {
      loginContent.innerHTML = '<h2 class="text-2xl font-bold mb-4 gradient-text">Enter OTP</h2>' + '<p class="text-gray-400 mb-6">OTP sent to ' + loginState.user + '</p>' + '<input type="text" id="otpInput" maxlength="6" placeholder="Enter OTP" class="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 mb-4 focus:outline-none focus:ring-2 focus:ring-pink-500" />' + '<div class="flex justify-end gap-2"><button onclick="closeModal(\'loginModal\')" class="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">Cancel</button><button id="verifyBtn" class="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg transition-colors">Verify</button></div>';
      document.getElementById('verifyBtn').addEventListener('click', sendVerify);
      document.getElementById('otpInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') sendVerify(); });
    } else if (loginState.phase === 'loggedIn') {
      loginContent.innerHTML = '<h2 class="text-2xl font-bold mb-4 gradient-text">User Details</h2>' + '<div class="mb-4"><p class="text-gray-400">Logged in as:</p><p class="text-gray-100 font-semibold">' + loginState.user + '</p></div>' + '<div class="flex justify-end gap-2"><button onclick="closeModal(\'loginModal\')" class="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">Close</button></div>';
    }
  }
  function setLoading(btnId, loading) { var btn = document.getElementById(btnId); if (!btn) return; if (loading) { btn.dataset.originalText = btn.textContent; btn.textContent = 'Loading...'; btn.disabled = true; } else { btn.textContent = btn.dataset.originalText || btn.textContent; btn.disabled = false; } }
  function sendLogin() {
    var phone = document.getElementById('phoneInput').value.trim();
    if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) { alert('Please enter a valid 10-digit mobile number'); return; }
    setLoading('getOtpBtn', true);
    fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'username=' + encodeURIComponent(phone) })
      .then(function (r) { return r.json(); })
      .then(function (data) { setLoading('getOtpBtn', false); if (data.status === 'success') { loginState = { phase: 'otp', user: phone }; renderLoginForm(); } else { alert(data.message || 'Failed to send OTP'); } })
      .catch(function (err) { setLoading('getOtpBtn', false); alert('Error: ' + err.message); });
  }
  function sendVerify() {
    var otp = document.getElementById('otpInput').value.trim();
    if (!otp || otp.length < 4) { alert('Please enter a valid OTP'); return; }
    setLoading('verifyBtn', true);
    fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'user=' + encodeURIComponent(loginState.user) + '&otp=' + encodeURIComponent(otp) })
      .then(function (r) { return r.json(); })
      .then(function (data) { setLoading('verifyBtn', false); if (data.status === 'success') { loginState = { phase: 'loggedIn', user: loginState.user }; renderLoginForm(); updateAuthUI(true); } else { alert(data.message || 'Verification failed'); } })
      .catch(function (err) { setLoading('verifyBtn', false); alert('Error: ' + err.message); });
  }
  window.performLogout = function () {
    fetch('/api/logout', { method: 'POST' }).then(function (r) { return r.json(); })
      .then(function () { loginState = { phase: 'phone', user: '' }; updateAuthUI(false); closeModal('logoutModal'); })
      .catch(function () { loginState = { phase: 'phone', user: '' }; updateAuthUI(false); closeModal('logoutModal'); });
  };
  window.performRefresh = function () {
    fetch('/api/refresh', { method: 'POST' }).then(function (r) { return r.json(); })
      .then(function (data) { if (data.status === 'success') { updateAuthUI(true); closeModal('refreshModal'); alert('Token refreshed successfully'); } else { updateAuthUI(false); alert(data.message || 'Refresh failed'); } })
      .catch(function (err) { alert('Error: ' + err.message); });
  };
  function getCookie(name) { var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)')); return match ? match[2] : null; }
  function checkAuthState() {
    var creds = getCookie('jiotv_creds');
    if (creds) { updateAuthUI(true); return; }
    fetch('/api/refresh').then(function (r) { if (r.ok) { updateAuthUI(true); } else { updateAuthUI(false); } })
      .catch(function () { updateAuthUI(false); });
  }
  function updateAuthUI(loggedIn) {
    if (loggedIn) { loginButton.style.display = 'none'; refreshButton.style.display = ''; logoutButton.style.display = ''; }
    else { loginButton.style.display = ''; refreshButton.style.display = 'none'; logoutButton.style.display = 'none'; }
  }
  window.copyPlaylistUrl = function () { var urlInput = document.getElementById('playlistUrl'); if (!urlInput) return; urlInput.select(); urlInput.setSelectionRange(0, 99999); if (navigator.clipboard) { navigator.clipboard.writeText(urlInput.value).then(function () { alert('Playlist URL copied to clipboard'); }); } else { document.execCommand('copy'); alert('Playlist URL copied to clipboard'); } };
  function escapeHtml(text) { var div = document.createElement('div'); div.appendChild(document.createTextNode(text)); return div.innerHTML; }
  function renderChannels(channels) {
    charactersList.innerHTML = '';
    if (!channels.length) { charactersList.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500"><span class="iconify text-4xl mb-2" data-icon="mdi:magnify-close"></span><p>No channels found</p></div>'; return; }
    var fragment = document.createDocumentFragment();
    channels.forEach(function (ch, i) {
      var card = document.createElement('div');
      card.className = 'card-hover rounded-xl p-4 border cursor-pointer text-center';
      card.setAttribute('data-aos', 'fade-up');
      card.setAttribute('data-aos-delay', String(Math.min(i * 20, 200)));
      var logoSrc = ch.logoUrl ? ch.logoUrl : 'https://ik.imagekit.io/techiesneh/tv_logo/default.png';
      var catchupBadge = ch.isCatchupAvailable === 'y' ? '<span class="absolute top-2 right-2 bg-green-600 text-xs px-2 py-0.5 rounded-full font-semibold">Catchup</span>' : '';
      card.innerHTML = '<div class="relative">' + catchupBadge + '<img src="' + escapeHtml(logoSrc) + '" alt="' + escapeHtml(ch.channel_name) + '" class="w-16 h-16 mx-auto mb-2 object-contain rounded-lg" loading="lazy" onerror="this.src=\'https://ik.imagekit.io/techiesneh/tv_logo/default.png\'" /></div>' + '<p class="text-sm font-medium text-gray-200 truncate">' + escapeHtml(ch.channel_name) + '</p>';
      card.addEventListener('click', function () { window.location.href = 'details.html?id=' + encodeURIComponent(ch.channel_id) + '&name=' + encodeURIComponent(ch.channel_name) + '&catchup=' + encodeURIComponent(ch.isCatchupAvailable || 'n'); });
      fragment.appendChild(card);
    });
    charactersList.appendChild(fragment);
  }
  function getFilteredChannels() {
    var search = (searchBar.value || '').toLowerCase().trim();
    var genre = genreFilter.value; var lang = langFilter.value; var catchup = catchupFilter.value;
    return allChannels.filter(function (ch) {
      if (search && ch.channel_name.toLowerCase().indexOf(search) === -1) return false;
      if (genre && ch.channelCategoryId !== genre) return false;
      if (lang && ch.channelLanguageId !== lang) return false;
      if (catchup === 'y' && ch.isCatchupAvailable !== 'y') return false;
      if (catchup === 'n' && ch.isCatchupAvailable === 'y') return false;
      return true;
    });
  }
  function applyFilters() { renderChannels(getFilteredChannels()); }
  function populateFilters(channels) {
    var genres = {}; var langs = {};
    channels.forEach(function (ch) { if (ch.channelCategoryId && ch.channelCategoryId !== '') genres[ch.channelCategoryId] = ch.channelCategoryId; if (ch.channelLanguageId && ch.channelLanguageId !== '') langs[ch.channelLanguageId] = ch.channelLanguageId; });
    genreFilter.innerHTML = '<option value="">All Genres</option>';
    Object.keys(genres).sort().forEach(function (id) { var opt = document.createElement('option'); opt.value = id; opt.textContent = id; genreFilter.appendChild(opt); });
    langFilter.innerHTML = '<option value="">All Languages</option>';
    Object.keys(langs).sort().forEach(function (id) { var opt = document.createElement('option'); opt.value = id; opt.textContent = id; langFilter.appendChild(opt); });
  }
  function fetchChannels() {
    charactersList.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500"><div class="inline-block animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent mb-4"></div><p>Loading channels...</p></div>';
    fetch('https://jioappsd.akamaized.net/appconfig/v3/getchannelslist?langId=6')
      .then(function (r) { return r.json(); })
      .then(function (data) { if (data && Array.isArray(data)) { allChannels = data; populateFilters(data); renderChannels(data); } else { throw new Error('Invalid channel data'); } })
      .catch(function (err) { charactersList.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500"><span class="iconify text-4xl mb-2" data-icon="mdi:alert-circle-outline"></span><p>Failed to load channels.</p><p class="text-sm text-gray-600 mt-2">' + escapeHtml(err.message) + '</p></div>'; });
  }
  searchBar.addEventListener('input', applyFilters);
  genreFilter.addEventListener('change', applyFilters);
  langFilter.addEventListener('change', applyFilters);
  catchupFilter.addEventListener('change', applyFilters);
  checkAuthState();
  fetchChannels();
})();
